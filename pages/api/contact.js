// pages/api/contact.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { name, email, subject, message, consent } = req.body || {};

  // Basic validation
  if (
    !name ||
    !email ||
    !subject ||
    !message ||
    consent !== true // must have ticked the checkbox
  ) {
    return res.status(400).json({ ok: false, error: "Invalid submission" });
  }

  // Build the email content you'll receive
  const textBody = `
New contact form submission from FinToolbox:

Name: ${name}
Email: ${email}
Subject: ${subject}
Consent to store message? ${consent ? "Yes" : "No"}

Message:
${message}
`;

  try {
    // Create transporter using SMTP creds from env vars.
    // These creds depend on which provider you're using.
    // Example assumes you're using Google Workspace or Gmail SMTP.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,        // e.g. "smtp.gmail.com"
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,                       // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,      // "hello@fintoolbox.com.au"
        pass: process.env.SMTP_PASS,      // the app password / SMTP password
      },
    });

    // Send the email to you
    await transporter.sendMail({
      from: `"FinToolbox Contact" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO || "hello@fintoolbox.com.au",
      replyTo: email, // so you can hit reply and answer the person
      subject: `[FinToolbox Contact] ${subject}`,
      text: textBody,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Contact form sendMail error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to send email" });
  }
}
