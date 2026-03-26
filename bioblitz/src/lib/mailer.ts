import nodemailer from "nodemailer";

/**
 * ZeptoMail SMTP transport.
 *
 * Env vars:
 *   ZEPTOMAIL_TOKEN  – SMTP password (API token from your Mail Agent)
 *   ZEPTOMAIL_FROM   – verified sender address (e.g. digest@bblitz.net)
 *
 * ZeptoMail SMTP config (fixed for all accounts):
 *   Host: smtp.zeptomail.com
 *   Port: 587 (STARTTLS)
 *   Username: emailapikey  (literal string, same for everyone)
 *   Password: your ZeptoMail API token
 */

const token = process.env.ZEPTOMAIL_TOKEN || "";
const fromAddress = process.env.ZEPTOMAIL_FROM || "";
const fromName = "BioBlitz";

if (!token) {
  console.warn("[mailer] ZEPTOMAIL_TOKEN not set — emails will fail.");
}
if (!fromAddress) {
  console.warn("[mailer] ZEPTOMAIL_FROM not set — emails will fail.");
}

const transporter = nodemailer.createTransport({
  host: "smtp.zeptomail.com",
  port: 587,
  secure: false,
  auth: {
    user: "emailapikey",
    pass: token,
  },
  tls: {
    rejectUnauthorized: true,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const from = opts.from || `${fromName} <${fromAddress}>`;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
