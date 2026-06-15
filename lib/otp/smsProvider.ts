export type SmsProviderResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

type SmsSender = (phone: string, code: string) => Promise<SmsProviderResult>;

let testSender: SmsSender | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimeoutMs() {
  const parsed = Number(process.env.SMS_TIMEOUT_MS || "10000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

async function postSms(phone: string, code: string): Promise<SmsProviderResult & { retryable: boolean }> {
  const url = process.env.SMS_PROVIDER_URL;
  const apiKey = process.env.SMS_API_KEY;

  if (!url || !apiKey) {
    return { success: false, error: "SMS_PROVIDER_NOT_CONFIGURED", retryable: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        to: phone,
        code,
        from: process.env.SMS_FROM_NUMBER,
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => null) as {
      success?: boolean;
      messageId?: string;
      error?: string;
    } | null;

    if (!response.ok) {
      return {
        success: false,
        error: body?.error || `SMS_PROVIDER_HTTP_${response.status}`,
        retryable: response.status >= 500,
      };
    }

    return {
      success: body?.success !== false,
      messageId: body?.messageId,
      error: body?.error,
      retryable: body?.success === false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMS_PROVIDER_ERROR";
    return {
      success: false,
      error: message,
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendSms(phone: string, code: string): Promise<SmsProviderResult> {
  if (testSender) {
    return testSender(phone, code).catch((error) => ({
      success: false,
      error: error instanceof Error ? error.message : "SMS_PROVIDER_ERROR",
    }));
  }

  const firstAttempt = await postSms(phone, code);
  if (firstAttempt.success || !firstAttempt.retryable) {
    return {
      success: firstAttempt.success,
      messageId: firstAttempt.messageId,
      error: firstAttempt.error,
    };
  }

  await sleep(3000);
  const secondAttempt = await postSms(phone, code);
  return {
    success: secondAttempt.success,
    messageId: secondAttempt.messageId,
    error: secondAttempt.error,
  };
}

export function setSmsSenderForTests(sender: SmsSender | null) {
  testSender = sender;
}
