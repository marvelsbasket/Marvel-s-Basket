export interface SellerNotificationProps {
  name: string;
  storeName: string;
  applicationId?: string;
  reason?: string;
  documentType?: string;
  status?: string;
}

const baseStyles = `
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
    background: linear-gradient(135deg, #0B5D2A 0%, #15803D 100%);
    padding: 30px 40px;
    text-align: center;
    color: #ffffff;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
  }
  .header p {
    margin: 6px 0 0;
    font-size: 14px;
    opacity: 0.9;
  }
  .content {
    padding: 36px 40px;
  }
  .badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    margin: 12px 0;
  }
  .badge-success { background-color: #dcfce7; color: #15803d; }
  .badge-warning { background-color: #fef9c3; color: #854d0e; }
  .badge-danger { background-color: #fee2e2; color: #b91c1c; }
  .badge-info { background-color: #e0f2fe; color: #0369a1; }
  .info-box {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    margin: 20px 0;
  }
  .footer {
    padding: 24px 40px;
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
    color: #64748b;
    text-align: center;
  }
`;

export function renderSellerApplicationSubmittedEmail({
  name,
  storeName,
  applicationId,
}: SellerNotificationProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Marvel's Basket</h1>
      <p>Seller Partner Program</p>
    </div>
    <div class="content">
      <h2>Application Received</h2>
      <p>Dear ${name},</p>
      <p>Thank you for applying to sell on Marvel's Basket! We have successfully received your seller application for <strong>${storeName}</strong>.</p>
      <div class="info-box">
        <p><strong>Application ID:</strong> ${applicationId || 'N/A'}</p>
        <p><strong>Status:</strong> <span class="badge badge-warning">PENDING VERIFICATION</span></p>
        <p>Our merchant compliance team is reviewing your business information and KYC documents. The review typically takes 1–2 business days.</p>
      </div>
      <p>You can track your application status at any time by logging in to the partner portal.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Marvel's Basket. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `Marvel's Basket — Seller Application Received\n\nDear ${name},\n\nWe have received your application for ${storeName} (ID: ${applicationId || 'N/A'}). Our team is reviewing your documents.\n\nThank you,\nMarvel's Basket Team`;

  return { html, text };
}

export function renderSellerApprovedEmail({ name, storeName }: SellerNotificationProps): {
  html: string;
  text: string;
} {
  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Marvel's Basket</h1>
      <p>Seller Partner Program</p>
    </div>
    <div class="content">
      <h2>Congratulations! Your Store is Approved</h2>
      <p>Dear ${name},</p>
      <p>Great news! Your seller application for <strong>${storeName}</strong> has been approved by the Marvel's Basket compliance team.</p>
      <div class="info-box">
        <p><strong>Account Status:</strong> <span class="badge badge-success">APPROVED ACTIVE</span></p>
        <p>Your store is now active on the platform. You can now access your seller dashboard, manage store details, and prepare for receiving customer orders.</p>
      </div>
      <p>Welcome to the Marvel's Basket merchant family!</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Marvel's Basket. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `Marvel's Basket — Store Approved\n\nDear ${name},\n\nCongratulations! Your store ${storeName} has been approved and is now active on Marvel's Basket.\n\nWelcome aboard,\nMarvel's Basket Team`;

  return { html, text };
}

export function renderSellerRejectedEmail({ name, storeName, reason }: SellerNotificationProps): {
  html: string;
  text: string;
} {
  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Marvel's Basket</h1>
      <p>Seller Partner Program</p>
    </div>
    <div class="content">
      <h2>Seller Application Update</h2>
      <p>Dear ${name},</p>
      <p>Thank you for your interest in selling on Marvel's Basket. After reviewing your application for <strong>${storeName}</strong>, our compliance team has requested changes before approval.</p>
      <div class="info-box">
        <p><strong>Status:</strong> <span class="badge badge-danger">ACTION REQUIRED</span></p>
        <p><strong>Reason for feedback:</strong></p>
        <p style="color: #b91c1c; font-weight: 500;">${reason || 'Required information or documents are incomplete or need correction.'}</p>
      </div>
      <p>You can easily log in, update the highlighted information or re-upload rejected documents, and resubmit your application for verification.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Marvel's Basket. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `Marvel's Basket — Application Update\n\nDear ${name},\n\nYour application for ${storeName} requires attention.\nReason: ${reason || 'Incomplete details'}\nPlease log in to correct and resubmit.\n\nMarvel's Basket Team`;

  return { html, text };
}

export function renderSellerSuspendedEmail({ name, storeName, reason }: SellerNotificationProps): {
  html: string;
  text: string;
} {
  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Marvel's Basket</h1>
      <p>Seller Partner Program</p>
    </div>
    <div class="content">
      <h2>Store Suspension Notice</h2>
      <p>Dear ${name},</p>
      <p>This is to inform you that your store <strong>${storeName}</strong> has been temporarily suspended by Marvel's Basket administration.</p>
      <div class="info-box">
        <p><strong>Status:</strong> <span class="badge badge-danger">SUSPENDED</span></p>
        <p><strong>Reason:</strong> ${reason || 'Administrative policy or regulatory review.'}</p>
        <p>While suspended, your store cannot receive new customer orders.</p>
      </div>
      <p>Please contact merchant support at support@marvelsbasket.com to address this issue and discuss reactivation.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Marvel's Basket. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `Marvel's Basket — Store Suspension Notice\n\nDear ${name},\n\nYour store ${storeName} has been temporarily suspended.\nReason: ${reason || 'Policy review'}\nPlease contact support@marvelsbasket.com for assistance.`;

  return { html, text };
}

export function renderSellerReactivatedEmail({ name, storeName }: SellerNotificationProps): {
  html: string;
  text: string;
} {
  const html = `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Marvel's Basket</h1>
      <p>Seller Partner Program</p>
    </div>
    <div class="content">
      <h2>Store Reactivated</h2>
      <p>Dear ${name},</p>
      <p>We are pleased to inform you that your store <strong>${storeName}</strong> has been reactivated by Marvel's Basket administration.</p>
      <div class="info-box">
        <p><strong>Status:</strong> <span class="badge badge-success">APPROVED ACTIVE</span></p>
        <p>Your store is now fully operational and ready to accept new orders.</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Marvel's Basket. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `Marvel's Basket — Store Reactivated\n\nDear ${name},\n\nYour store ${storeName} has been reactivated and is now operational.\n\nMarvel's Basket Team`;

  return { html, text };
}
