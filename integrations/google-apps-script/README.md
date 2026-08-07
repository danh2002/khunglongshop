# Google Apps Script order sync gateway

This script manages only the `Đơn hàng đồng bộ` tab. It must never modify the
legacy `Tháng 8/2026` tab (`sheetId: 0`). Test deployment against a copy of the
workbook before production.

## Script Properties

Configure these values in **Project Settings → Script Properties**. Never put
them in cells or commit their real values:

- `SYNC_SECRET`: the same high-entropy secret configured in Vercel.
- `APP_WEBHOOK_URL`: production URL ending in
  `/api/integrations/google-sheets/orders/webhook`.
- `SPREADSHEET_ID`: target workbook ID.
- `MANAGED_TAB_NAME`: `Đơn hàng đồng bộ`.

## Deployment

1. Create a bound Apps Script project in the target workbook or copy
   `Code.gs` into an approved standalone project.
2. Configure Script Properties.
3. Run `setupManagedSheet()` against a non-production workbook copy twice.
   Both calls must return the same sheet ID, create no duplicate validation or
   protections, and leave `Tháng 8/2026` unchanged.
4. Add an installable **On edit** trigger for `installedOnEdit`.
5. Deploy as a web app executed as the owner. Copy the HTTPS deployment URL to
   `GOOGLE_SHEETS_WEB_APP_URL` in Vercel.
6. Restrict workbook and Apps Script project access to operational staff.

All `UrlFetchApp.fetch()` calls use `muteHttpExceptions: true`, check the HTTP
status explicitly, and log only the status/event ID. Apps Script does not retry
failed edits; the application cron reconciles them.

## Rotation and rollback

Rotate `SYNC_SECRET` in Apps Script and Vercel during the same maintenance
window, then redeploy both sides. To roll back, disable the installable trigger
and the Vercel order-sync cron before removing the web-app deployment. Pending
database sync state is intentionally retained for a later retry.
