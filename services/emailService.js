const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send password reset email with a styled HTML template
 * @param {string} toEmail  - recipient email address
 * @param {string} resetUrl - full reset link e.g. http://localhost:5173/reset-password/<token>
 */
const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Reset Your Password</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

            <!-- Header -->
            <tr>
              <td style="background:#1d4ed8;padding:32px 40px;text-align:center;">
                <table cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;">
                      <span style="font-size:22px;">🖨️</span>
                    </td>
                    <td style="padding-left:12px;">
                      <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PrintFlow</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px 40px 32px;">
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Reset Your Password</h1>
                <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7;">
                  You requested to reset your password. Click the button below to create a new password.
                  This link will expire in <strong>1 hour</strong>.
                </p>

                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                  <tr>
                    <td style="background:#1d4ed8;border-radius:12px;">
                      <a href="${resetUrl}" target="_blank"
                        style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                        Reset Password →
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Fallback link -->
                <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">If the button doesn't work, copy and paste this link:</p>
                <p style="margin:0 0 28px;font-size:12px;color:#1d4ed8;word-break:break-all;">
                  <a href="${resetUrl}" style="color:#1d4ed8;">${resetUrl}</a>
                </p>

                <!-- Security notice -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;">
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                    🔒 <strong>Security tip:</strong> If you didn't request this, you can safely ignore this email.
                    Your password will not be changed.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">
                  © 2024 PrintFlow Labs. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"PrintFlow" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset Your Password — PrintFlow',
    html,
  });
};

module.exports = { sendPasswordResetEmail };
