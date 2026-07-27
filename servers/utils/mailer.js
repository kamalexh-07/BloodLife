const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

/**
 * Sends the OTP email. If EMAIL_USER/EMAIL_PASS aren't configured, or sending
 * fails (e.g. no network, bad credentials), this logs the OTP to the server
 * console instead of throwing — so the forgot-password flow keeps working in
 * local/dev environments without email configured. In production, real
 * SMTP credentials should always be set so this fallback is never relied on.
 */
async function sendOtpEmail(to, otp) {
  const t = getTransporter();

  if (!t) {
    console.warn(`[mailer] EMAIL_USER/EMAIL_PASS not configured — OTP for ${to}: ${otp}`);
    return { delivered: false };
  }

  try {
    await t.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Your BloodLife password reset code',
      text: `Your BloodLife OTP code is ${otp}. It expires in 2 minutes. If you didn't request this, you can safely ignore this email.`,
    });
    return { delivered: true };
  } catch (err) {
    console.error('[mailer] Failed to send OTP email, falling back to console log:', err.message);
    console.warn(`[mailer] OTP for ${to}: ${otp}`);
    return { delivered: false };
  }
}

module.exports = { sendOtpEmail };
