import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for port 465 (SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify connection on startup (optional but helpful for debugging)
export const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ Mail server ready");
    return true;
  } catch (err) {
    console.error("❌ Mail server connection failed:", err);
    return false;
  }
};