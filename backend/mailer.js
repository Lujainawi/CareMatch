const nodemailer = require("nodemailer");

function makeTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true", // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

async function sendVerificationEmail(toEmail, code) {
    if (!toEmail || !String(toEmail).trim()) {
        throw new Error("Missing recipient email (toEmail)");
    }

    const transporter = makeTransporter();


    const from = process.env.MAIL_FROM || process.env.SMTP_USER;

    const subject = "CareMatch: Your verification code";
    const text = `Your CareMatch verification code is: ${code} \n\n This code will expire soon`

    return transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text,
    });
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!toEmail || !String(toEmail).trim()) {
    throw new Error("Missing recipient email (toEmail)");
  }

  const transporter = makeTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const subject = "CareMatch: Reset your password";
  const text =
    `We received a request to reset your password.\n\n` +
    `Reset link: ${resetUrl}\n\n` +
    `If you didn't request this, you can ignore this email.`;

  return transporter.sendMail({ from, to: toEmail, subject, text });
}


module.exports = { sendVerificationEmail, sendPasswordResetEmail };