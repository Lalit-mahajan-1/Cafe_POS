import { transporter } from "@/lib/mail/transporter";
import { basicTemplate } from "@/lib/mail/templates";
import { SendMailInput } from "@/lib/validations/mail";

export const mailService = {
  async sendMail({ to, subject, body }: SendMailInput) {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body,                          // Plain text fallback
      html: basicTemplate(subject, body),  // HTML version
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  },

  /**
   * Send to multiple recipients at once
   */
  async sendBulkMail(recipients: string[], subject: string, body: string) {
    const results = await Promise.allSettled(
      recipients.map((to) => this.sendMail({ to, subject, body }))
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return { sent, failed, total: recipients.length };
  },
};