import nodemailer from "nodemailer";

export const sendReceiptEmail = async (order: any) => {
  if (!order.customer?.email) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const fromName = process.env.SMTP_FROM_NAME || "Cafe POS";
  const fromEmail = process.env.SMTP_USER;

  if (!fromEmail) {
    console.error("Missing SMTP_USER in environment variables. Please restart your Next.js server.");
    return;
  }

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const receiptHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #C86446; text-align: center;">${fromName}</h1>
      <p style="text-align: center; color: #777;">Thank you for your order!</p>
      
      <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-top: 20px;">
        <h2 style="font-size: 18px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          Order Receipt: ${order.orderNumber}
        </h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="border-bottom: 1px solid #eee; text-align: left;">
              <th style="padding: 8px 0; color: #555;">Item</th>
              <th style="padding: 8px 0; color: #555; text-align: right;">Qty</th>
              <th style="padding: 8px 0; color: #555; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${order.items
              .map(
                (item: any) => `
              <tr style="border-bottom: 1px solid #f9f9f9;">
                <td style="padding: 10px 0;">
                  ${item.product?.name || "Item"}
                </td>
                <td style="padding: 10px 0; text-align: right;">x${item.quantity}</td>
                <td style="padding: 10px 0; text-align: right;">${formatMoney(item.lineTotal)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <p style="margin: 5px 0; color: #555;">Subtotal: <strong>${formatMoney(order.subtotal)}</strong></p>
          <p style="margin: 5px 0; color: #555;">Tax: <strong>${formatMoney(order.taxAmount)}</strong></p>
          ${
            order.discount > 0
              ? `<p style="margin: 5px 0; color: #10b981;">Discount: <strong>-${formatMoney(order.discount)}</strong></p>`
              : ""
          }
          <h3 style="margin: 15px 0 0 0; font-size: 20px; color: #C86446;">Total: ${formatMoney(order.total)}</h3>
        </div>
      </div>
      
      <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
        This is an automated receipt from ${fromName}.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: order.customer.email,
      subject: `Your Receipt from ${fromName} (${order.orderNumber})`,
      html: receiptHtml,
    });
    console.log(`Receipt email sent to ${order.customer.email}`);
  } catch (error) {
    console.error("Failed to send receipt email:", error);
  }
};
