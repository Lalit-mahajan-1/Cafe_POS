/**
 * Wraps plain text body in nice HTML template
 */
export const basicTemplate = (subject: string, body: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;">${subject}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;color:#333333;line-height:1.6;">
              <div style="white-space:pre-wrap;">${body}</div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px;text-align:center;color:#888888;font-size:12px;">
              <p style="margin:0;">Sent via Odoo App</p>
              <p style="margin:5px 0 0 0;">© ${new Date().getFullYear()} All rights reserved</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;