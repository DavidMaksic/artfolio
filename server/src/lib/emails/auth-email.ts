interface SignInEmailProps {
   otp: string;
   magicLinkUrl: string;
}

export function buildSignInEmail({
   otp,
   magicLinkUrl,
}: SignInEmailProps): string {
   return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;padding:48px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">
                Sign in to Artfolio
              </h1>
              <p style="margin:0 0 32px;font-size:15px;color:#666;">
                Use the button below, or enter the code manually.
              </p>

              <!-- Magic link button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${magicLinkUrl}"
                      style="display:inline-block;background:#111;color:#fff;font-size:15px;
                             font-weight:600;text-decoration:none;padding:14px 32px;
                             border-radius:8px;letter-spacing:0.01em;">
                      Sign in to Artfolio
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:13px;color:#999;text-align:center;">
                Or enter this code on the sign-in page
              </p>

              <!-- OTP display -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#f3f4f6;border-radius:8px;
                                padding:16px 32px;font-size:32px;font-weight:700;
                                letter-spacing:12px;color:#111;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#aaa;text-align:center;">
                This code expires in 10 minutes. If you didn't request this, you can ignore this email.
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

export function buildWelcomeEmail(name: string): string {
   return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;padding:48px;">
          <tr>
            <td>
              <h1 style="margin:0 0 16px;font-size:24px;color:#111;">
                Welcome to Artfolio${name ? `, ${name.split(' ')[0]}` : ''}! 🎨
              </h1>
              <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">
                Your portfolio is ready. Start sharing your work with the world.
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
