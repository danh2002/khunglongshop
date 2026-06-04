type SetCompleteEmailInput = {
  setName: string;
  rewardCode: string;
};

export function buildSetCompleteEmail({ setName, rewardCode }: SetCompleteEmailInput) {
  return {
    subject: `🦕 Bộ sưu tập ${setName} hoàn chỉnh!`,
    text: [
      `Chúc mừng! Bạn đã hoàn chỉnh bộ sưu tập ${setName}.`,
      "",
      `Reward code của bạn: ${rewardCode}`,
      "",
      "Hãy mở game Đảo Khủng Long, vào mục nhập mã thưởng, rồi nhập reward code này để nhận phần thưởng.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717;">
        <h1>🦕 Bộ sưu tập ${setName} hoàn chỉnh!</h1>
        <p>Chúc mừng! Bạn đã hoàn chỉnh bộ sưu tập <strong>${setName}</strong>.</p>
        <div style="margin: 20px 0; padding: 18px; background: #070707; color: #ff6a00; font-size: 24px; font-weight: 900; text-align: center; letter-spacing: 2px;">
          ${rewardCode}
        </div>
        <p>Hãy mở game Đảo Khủng Long, vào mục nhập mã thưởng, rồi nhập reward code này để nhận phần thưởng.</p>
      </div>
    `,
  };
}

export async function sendSetCompleteEmail(userEmail: string, setName: string, rewardCode: string) {
  const email = buildSetCompleteEmail({ setName, rewardCode });

  console.log("Set complete email ready", {
    to: userEmail,
    subject: email.subject,
    rewardCode,
  });

  return email;
}
