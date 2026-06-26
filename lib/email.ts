import { Resend } from "resend";
import { OtpEmail } from "./email-templates/otp";

export type EmailProviderResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

type EmailSender = (to: string, code: string) => Promise<EmailProviderResult>;

let testSender: EmailSender | null = null;

export async function sendOtpEmail(to: string, code: string): Promise<EmailProviderResult> {
  if (testSender) {
    return testSender(to, code).catch((error) => ({
      success: false,
      error: error instanceof Error ? error.message : "EMAIL_PROVIDER_ERROR",
    }));
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { success: false, error: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      subject: "Mã xác thực Khủng Long Shop",
      html: OtpEmail({ code }),
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "EMAIL_PROVIDER_ERROR",
    };
  }
}

export function setEmailSenderForTests(sender: EmailSender | null) {
  testSender = sender;
}
