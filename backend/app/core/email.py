from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

fastmail = FastMail(conf)

async def send_password_reset_email(email: str, full_name: str, reset_token: str):
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">

              <!-- Header -->
              <tr>
                <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2a;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#4f46e5;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                        <span style="color:white;font-size:20px;">⬛</span>
                      </td>
                      <td style="padding-left:12px;">
                        <span style="color:#ffffff;font-size:18px;font-weight:700;">DataVis</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px;">Reset your password</h1>
                  <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
                    Hi {full_name}, we received a request to reset the password for your DataVis account.
                    This link expires in <strong style="color:#ffffff;">15 minutes</strong>.
                  </p>

                  <!-- CTA -->
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#4f46e5;border-radius:10px;">
                        <a href="{reset_url}"
                           style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                          Reset Password →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="color:#6b7280;font-size:13px;margin:28px 0 0;">
                    If you didn't request this, you can safely ignore this email.
                    Your password will not be changed.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 40px;border-top:1px solid #2a2a2a;">
                  <p style="color:#4b5563;font-size:12px;margin:0;">
                    © 2025 DataVis Platform. This is an automated email, please do not reply.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Reset your DataVis password",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )

    await fastmail.send_message(message)