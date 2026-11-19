export interface PasswordResetTemplateProps {
  name: string;
  resetToken: string;
  expiryMinutes: number;
}

export function renderPasswordResetEmail({
  name,
  resetToken,
  expiryMinutes,
}: PasswordResetTemplateProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — Marvel's Basket</title>
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
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      padding: 30px 40px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
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
    .token-container {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin: 24px 0;
    }
    .token-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 18px;
      font-weight: 700;
      color: #0369a1;
      word-break: break-all;
    }
    .token-expiry {
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
    }
    .security-notice {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      border-radius: 4px;
      margin: 24px 0;
      font-size: 13px;
      color: #991b1b;
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
      <p>Password Reset Request</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${escapeHtml(name)},</div>
      <div class="message">
        We received a request to reset your password for your Marvel's Basket account. Please use the following password reset verification token to set a new password:
      </div>
      <div class="token-container">
        <div class="token-code">${escapeHtml(resetToken)}</div>
        <div class="token-expiry">Valid for ${expiryMinutes} minutes</div>
      </div>
      <div class="security-notice">
        <strong>Important:</strong> If you did not request a password reset, please ignore this email or contact support immediately. Your account remains secure.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Marvel's Basket. All rights reserved.<br>
      This is an automated system notification.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Marvel's Basket — Password Reset Request

Hello ${name},

We received a request to reset your Marvel's Basket account password. Use the following reset token:

${resetToken}

This token is valid for ${expiryMinutes} minutes.

If you did not request this, please ignore this email.

— Marvel's Basket Security Team
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
