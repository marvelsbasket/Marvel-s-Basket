export interface VerificationOtpTemplateProps {
  name: string;
  otp: string;
  expiryMinutes: number;
}

export function renderVerificationOtpEmail({
  name,
  otp,
  expiryMinutes,
}: VerificationOtpTemplateProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email — Marvel's Basket</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #1e293b;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      padding: 30px 40px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 36px 40px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
    }
    .otp-container {
      background-color: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #059669;
      margin: 0;
    }
    .otp-expiry {
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
    }
    .security-notice {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 4px;
      margin: 24px 0;
      font-size: 13px;
      color: #92400e;
      line-height: 1.5;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Marvel's Basket</h1>
      <p>Hyperlocal Grocery & Daily Essentials</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${escapeHtml(name)},</div>
      <div class="message">
        Thank you for joining Marvel's Basket! To complete your registration and verify your email address, please use the One-Time Password (OTP) below:
      </div>
      <div class="otp-container">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">Valid for ${expiryMinutes} minutes</div>
      </div>
      <div class="security-notice">
        <strong>Security Notice:</strong> Never share this OTP with anyone. Marvel's Basket employees will never ask for your verification code via phone, SMS, or email. If you did not initiate this request, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Marvel's Basket (Marvel's Techworks). All rights reserved.<br>
      This is an automated system notification. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Marvel's Basket — Verify Your Email Address

Hello ${name},

Thank you for joining Marvel's Basket! Your One-Time Password (OTP) for email verification is:

${otp}

This OTP is valid for ${expiryMinutes} minutes.

Security Notice: Never share this OTP with anyone. Marvel's Basket employees will never ask for your code. If you did not initiate this request, please ignore this email.

— Marvel's Basket Team
  `.trim();

  return { html, text };
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
