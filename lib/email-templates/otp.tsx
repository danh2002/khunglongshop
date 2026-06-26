type OtpEmailProps = {
  code: string;
};

export function OtpEmail({ code }: OtpEmailProps) {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mã xác thực Khủng Long Shop</title>
  </head>
  <body style="margin:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#f7f7f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0b;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#151515;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px;text-align:center;">
                <div style="color:#E8430A;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Khủng Long Shop</div>
                <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;color:#ffffff;">Mã xác thực đăng ký</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;text-align:center;">
                <p style="margin:0 0 18px;color:#d7d7d7;font-size:15px;line-height:1.6;">
                  Cảm ơn bạn đã tạo tài khoản. Nhập mã bên dưới để hoàn tất đăng ký tại Khủng Long Shop.
                </p>
                <div style="display:inline-block;background:#E8430A;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:.18em;padding:14px 22px;border-radius:10px;">
                  ${code}
                </div>
                <p style="margin:20px 0 0;color:#bdbdbd;font-size:14px;line-height:1.6;">
                  Mã này hết hạn sau 10 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
