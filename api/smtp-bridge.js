import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { to, subject, html, text, secret } = req.body || {};

  // Verify internal shared secret
  const expectedSecret = process.env.SMTP_BRIDGE_SECRET || "incidentmind-internal-smtp-secret-key-999";
  if (secret !== expectedSecret) {
    return res.status(403).json({ error: "Unauthorized. Invalid bridge secret." });
  }

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      error: "Missing required fields: to, subject, and html/text are required.",
    });
  }

  const smtpUser = process.env.SMTP_USER || "yokeshkumar192007@gmail.com";
  const smtpPass = (process.env.SMTP_PASSWORD || "cpeoaixnvhuoaoqk").replace(/\s+/g, "");

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // SSL port 465
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `IncidentMind AI <${smtpUser}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject: subject,
      text: text || undefined,
      html: html || undefined,
    });

    return res.status(200).json({
      success: true,
      channel: "google_smtp",
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response,
    });
  } catch (error) {
    console.error("Google SMTP Bridge delivery error:", error);
    return res.status(500).json({
      success: false,
      channel: "google_smtp",
      error: error.message || "Failed to deliver email via Google SMTP",
    });
  }
}
