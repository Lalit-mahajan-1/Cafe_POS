import { z } from "zod";

export const sendMailSchema = z.object({
  to: z.string().email("Invalid recipient email"),
  subject: z.string().min(1, "Subject required").max(200, "Subject too long"),
  body: z.string().min(1, "Body required").max(10000, "Body too long"),
});

export type SendMailInput = z.infer<typeof sendMailSchema>;