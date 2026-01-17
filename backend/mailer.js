/**
 * @file mailer.js
 * @description Email utility module using Nodemailer and SMTP.
 * This module handles all outgoing communications, including MFA codes and password resets.
 * * @security_notes
 * - Credentials are never hardcoded; they are pulled from process.env for security.
 * - Supports both secure (port 465) and STARTTLS (port 587) connections.
 */

const nodemailer = require("nodemailer");

// Initialize environment variables
require("dotenv").config();

/**
 * --- 1. TRANSPORTER CONFIGURATION ---
 * Creates a connection to the SMTP server (e.g., Gmail, SendGrid, Mailtrap).
 */
function makeTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        // Port 465 usually requires `secure: true`; port 587 usually uses STARTTLS with `secure: false`.
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}


/**
 * --- 2. VERIFICATION & MFA EMAILS ---
 * Sends a 6-digit One-Time Password (OTP).
 * Used during Signup and every Login (MFA).
 * * @param {string} toEmail - The recipient's address.
 * @param {string} code - The 6-digit code generated in server.js.
 */
async function sendVerificationEmail(toEmail, code) {
    // Basic validation (avoid sending to empty/invalid values)
    if (!toEmail || !String(toEmail).trim()) {
        throw new Error("Missing recipient email (toEmail)");
    }

    const transporter = makeTransporter();

    // If MAIL_FROM is not set, fall back to SMTP_USER
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;

    const subject = "CareMatch: Your verification code";
    const text = `Your CareMatch verification code is: ${code} \n\n This code will expire soon`

    // Nodemailer accepts message fields like: from, to, subject, text, html, attachments, etc.
    return transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text,
    });
}

/**
 * --- 3. PASSWORD RESET EMAILS ---
 * Sends a unique link with a secure token to allow password recovery.
 * * @param {string} toEmail - The recipient's address.
 * @param {string} resetUrl - The full URL containing the secure reset token.
 */
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