var MANAGED_HEADERS = [
  "Order ID",
  "Mã đơn",
  "Tên khách hàng",
  "Số điện thoại",
  "Email",
  "Địa chỉ giao hàng",
  "Sản phẩm + số lượng",
  "Tổng tiền",
  "Trạng thái đơn",
  "Thời gian đặt",
  "DB Revision",
  "Sheet Revision",
  "Sync Error",
];
var STATUS_LABELS = ["Chờ thanh toán", "Đang xử lý", "Hoàn thành", "Đã hủy"];
var LEGACY_SHEET_ID = 0;
var LEGACY_SHEET_NAME = "Tháng 8/2026";

function getSyncProperties_() {
  var properties = PropertiesService.getScriptProperties();
  var config = {
    secret: properties.getProperty("SYNC_SECRET"),
    appWebhookUrl: properties.getProperty("APP_WEBHOOK_URL"),
    spreadsheetId: properties.getProperty("SPREADSHEET_ID"),
    tabName: properties.getProperty("MANAGED_TAB_NAME") || "Đơn hàng đồng bộ",
  };
  if (!config.secret || !config.appWebhookUrl || !config.spreadsheetId) {
    throw new Error("SYNC_CONFIG_INVALID");
  }
  return config;
}

function bytesToHex_(bytes) {
  return bytes
    .map(function (value) {
      var normalized = value < 0 ? value + 256 : value;
      return ("0" + normalized.toString(16)).slice(-2);
    })
    .join("");
}

function sign_(timestamp, eventId, rawBody, secret) {
  return bytesToHex_(
    Utilities.computeHmacSha256Signature(
      timestamp + "\n" + eventId + "\n" + rawBody,
      secret,
      Utilities.Charset.UTF_8
    )
  );
}

function safeEqual_(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  var difference = 0;
  for (var index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function setupManagedSheet() {
  var config = getSyncProperties_();
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var legacy = spreadsheet.getSheetByName(LEGACY_SHEET_NAME);
  if (legacy && legacy.getSheetId() !== LEGACY_SHEET_ID) {
    throw new Error("LEGACY_SHEET_ID_MISMATCH");
  }
  var sheet = spreadsheet.getSheetByName(config.tabName);
  if (!sheet) sheet = spreadsheet.insertSheet(config.tabName);
  if (sheet.getSheetId() === LEGACY_SHEET_ID || sheet.getName() === LEGACY_SHEET_NAME) {
    throw new Error("LEGACY_SHEET_PROTECTED");
  }

  var currentHeaders = sheet.getRange(1, 1, 1, MANAGED_HEADERS.length).getDisplayValues()[0];
  var hasHeaders = currentHeaders.some(function (value) { return value !== ""; });
  if (hasHeaders && JSON.stringify(currentHeaders) !== JSON.stringify(MANAGED_HEADERS)) {
    throw new Error("MANAGED_HEADERS_MISMATCH");
  }
  if (!hasHeaders) sheet.getRange(1, 1, 1, MANAGED_HEADERS.length).setValues([MANAGED_HEADERS]);
  if (sheet.getFrozenRows() === 0) sheet.setFrozenRows(1);
  if (sheet.getFrozenColumns() === 0) sheet.setFrozenColumns(2);
  sheet.hideColumns(1);
  sheet.hideColumns(11, 3);

  var statusRange = sheet.getRange(2, 9, Math.max(sheet.getMaxRows() - 1, 1), 1);
  if (!statusRange.getDataValidation()) {
    statusRange.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(STATUS_LABELS, true)
        .setAllowInvalid(false)
        .build()
    );
  }
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), MANAGED_HEADERS.length).createFilter();
  sheet.getRange(2, 4, sheet.getMaxRows() - 1, 1).setNumberFormat("@");
  sheet.getRange(2, 8, sheet.getMaxRows() - 1, 1).setNumberFormat("#,##0 [$₫-vi-VN]");
  sheet.getRange(2, 10, sheet.getMaxRows() - 1, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");

  var protectedDescriptions = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).map(function (item) {
    return item.getDescription();
  });
  ["A:H", "J:M"].forEach(function (columns) {
    var description = "DB-owned order sync " + columns;
    if (protectedDescriptions.indexOf(description) === -1) {
      sheet.getRange(columns).protect().setDescription(description).setWarningOnly(true);
    }
  });
  return { sheetId: sheet.getSheetId(), tabName: sheet.getName() };
}

function findOrderRow_(sheet, orderId) {
  if (sheet.getLastRow() < 2) return 0;
  var match = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(orderId)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : 0;
}

function rowValues_(row) {
  return [
    row.orderId,
    row.orderNumber,
    row.customerName,
    row.phone,
    row.email,
    row.shippingAddress,
    row.products,
    row.total,
    row.status,
    new Date(row.createdAt),
    row.dbRevision,
    row.sheetRevision,
    row.syncError || "",
  ];
}

function upsertOrders_(sheet, rows) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    return rows.map(function (row) {
      var rowNumber = findOrderRow_(sheet, row.orderId);
      if (!rowNumber) rowNumber = Math.max(sheet.getLastRow() + 1, 2);
      var currentRevision = Number(sheet.getRange(rowNumber, 11).getValue() || 0);
      if (currentRevision > row.dbRevision) {
        return { orderId: row.orderId, revision: row.dbRevision, ok: false, errorCode: "STALE_DB_REVISION" };
      }
      sheet.getRange(rowNumber, 1, 1, MANAGED_HEADERS.length).setValues([rowValues_(row)]);
      return { orderId: row.orderId, revision: row.dbRevision, ok: true };
    });
  } finally {
    lock.releaseLock();
  }
}

function listChangedStatuses_(sheet, limit) {
  var count = Math.min(Math.max(Number(limit || 100), 1), 100);
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, Math.min(sheet.getLastRow() - 1, count), MANAGED_HEADERS.length)
    .getValues()
    .map(function (values) {
      return {
        orderId: String(values[0]),
        statusLabel: String(values[8]),
        dbRevision: Number(values[10] || 0),
        sheetRevision: Number(values[11] || 0),
      };
    })
    .filter(function (row) { return row.orderId && row.sheetRevision > 0; });
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var config = getSyncProperties_();
    var envelope = JSON.parse(e.postData.contents || "{}");
    var rawPayload = JSON.stringify(envelope.payload);
    var expected = sign_(envelope.timestamp, envelope.eventId, rawPayload, config.secret);
    var age = Math.abs(Date.now() - new Date(envelope.timestamp).getTime());
    if (age > 5 * 60 * 1000 || !safeEqual_(expected, envelope.signature)) {
      return jsonResponse_({ error: "UNAUTHORIZED" });
    }
    var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(config.tabName);
    if (!sheet || sheet.getSheetId() === LEGACY_SHEET_ID) return jsonResponse_({ error: "MANAGED_SHEET_MISSING" });
    if (envelope.payload.action === "upsertOrders") {
      return jsonResponse_({ acknowledgements: upsertOrders_(sheet, envelope.payload.rows || []) });
    }
    if (envelope.payload.action === "listChangedStatuses") {
      return jsonResponse_({ changes: listChangedStatuses_(sheet, envelope.payload.limit) });
    }
    return jsonResponse_({ error: "ACTION_INVALID" });
  } catch (error) {
    console.error("ORDER_SHEET_SCRIPT_ERROR");
    return jsonResponse_({ error: "ORDER_SHEET_SCRIPT_ERROR" });
  }
}

function installedOnEdit(e) {
  var config = getSyncProperties_();
  var range = e.range;
  var sheet = range.getSheet();
  if (sheet.getName() !== config.tabName || sheet.getSheetId() === LEGACY_SHEET_ID) return;
  if (range.getRow() < 2 || range.getColumn() !== 9 || range.getNumRows() !== 1) return;
  var statusLabel = String(range.getValue());
  if (STATUS_LABELS.indexOf(statusLabel) === -1) return;
  var rowNumber = range.getRow();
  var orderId = String(sheet.getRange(rowNumber, 1).getValue());
  var dbRevision = Number(sheet.getRange(rowNumber, 11).getValue() || 0);
  var sheetRevisionCell = sheet.getRange(rowNumber, 12);
  var sheetRevision = Number(sheetRevisionCell.getValue() || 0) + 1;
  sheetRevisionCell.setValue(sheetRevision);
  var eventId = Utilities.getUuid();
  var rawBody = JSON.stringify({ orderId: orderId, dbRevision: dbRevision, sheetRevision: sheetRevision, statusLabel: statusLabel });
  var timestamp = new Date().toISOString();
  var signature = sign_(timestamp, eventId, rawBody, config.secret);
  var response = UrlFetchApp.fetch(config.appWebhookUrl, {
    method: "post",
    contentType: "application/json",
    payload: rawBody,
    muteHttpExceptions: true,
    headers: {
      "x-order-sync-timestamp": timestamp,
      "x-order-sync-event-id": eventId,
      "x-order-sync-signature": signature,
    },
  });
  var statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    console.error("ORDER_SHEET_WEBHOOK_FAILED status=" + statusCode + " eventId=" + eventId);
    sheet.getRange(rowNumber, 13).setValue("WEBHOOK_FAILED_" + statusCode);
  } else {
    sheet.getRange(rowNumber, 13).clearContent();
  }
}
