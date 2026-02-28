/**
 * @file server.js
 * @description The main entry point of the CareMatch backend.
 * This file sets up the Express server, handles API routing, security, authentication, and file uploads.
 * @notes
 * - Security: Implements Bcrypt for password hashing and Rate Limiting to prevent brute-force attacks.
 * - Authentication: Uses session-based auth and Multi-Factor Authentication (MFA) via email.
 * - Database: Connects to MySQL to manage users and help requests.
 * - Storage: Handles local image uploads using Multer.
 *
 * Extra notes for reviewers:
 * - Environment variables are loaded from .env during local development (dotenv).
 * - The default session store (MemoryStore) is OK for development, but not recommended for production.
 */

const express = require('express');
const path = require('path');
const db = require('./db');
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const multer = require("multer");
const fs = require("fs");

// Load environment variables
require("dotenv").config();

const { sendVerificationEmail, sendPasswordResetEmail, sendVolunteerInterestEmail } = require('./mailer');
const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE CONFIGURATION ---

// JSON Body Parser: Limits payload size to 200kb for security
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));

// RATE LIMITER: Protects authentication routes from brute-force/spamming
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// STRICT LIMITER: Used for sensitive operations like password resets
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

// SESSION MANAGEMENT: Configures how the server remembers logged-in users
app.use(session({
  name: 'carematch.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,  // Prevents client-side JS from reading the cookie (Security)
    sameSite: 'lax',
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, //7 days
  },
}));


// SERVING STATIC FILES: Connects the server to the frontend and uploads folder
app.use(express.static(path.join(__dirname, '../frontend')));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- UTILITY FUNCTIONS ---

// Reserved for future: prompts for generating preset AI images per topic.
const PROMPTS_BY_TOPIC = {
  health: "A warm, hopeful illustration about healthcare support and community help. No text.",
  education: "A bright illustration about learning support and school supplies. No text.",
  arts: "A colorful illustration about arts activities for children. No text.",
  technology: "A friendly illustration about technology help and digital inclusion. No text.",
  basic_needs: "A kind illustration about food, clothing, and basic needs support. No text.",
  social: "A supportive illustration about community volunteering and social help. No text.",
  other: "A general illustration about charity and helping hands. No text.",
};

// Belong to Contact Us in Section 6
app.post("/api/contact", (req, res) => {
  // Later: save to DB / send email
  console.log("Contact message:", req.body);
  res.json({ status: "ok" });
});

// Helps keep email format consistent in the database
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Security tools for generating OTP codes and tokens
function generate6DigitCode() {return String(Math.floor(100000 + Math.random() * 900000));}
function generateVerifyToken() {return crypto.randomBytes(32).toString('hex');}
function generateMfaToken() {return crypto.randomBytes(32).toString('hex');}
function generateResetToken() {return crypto.randomBytes(32).toString('hex');}

// Hash helper for storing reset tokens safely.
function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// UI helper: return a masked email.
function maskEmail(email) {
  const [name, domain] = String(email || '').split("@");
  if (!domain) return '';
  const shown = name.slice(0, 2);
  return `${shown}***@${domain}`;
}

// ---  SYSTEM HEALTH ROUTES ---

// Test route – to check if the backend is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CareMatch backend is running' });
});

// Test route – checks if Node can connect to MySQL
app.get('/api/test-db', async (req, res) => {
  try {
    // Simple query just to test the connection
    const [rows] = await db.query('SELECT 1 AS test');
    res.json({ status: 'ok', db: rows });
  } catch (err) {
    console.error('DB test error:', err.code, err.message);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// --------------------------
// GUEST DONATIONS (one-time, demo)
// --------------------------

// POST /api/guest-donations
app.post("/api/guest-donations", async (req, res) => {
  try {
    const amountRaw = req.body?.amount;
    const payment_method = String(req.body?.payment_method || "").trim();

    const donor_name = String(req.body?.donor_name || "").trim() || null;
    const donor_email = String(req.body?.donor_email || "").trim() || null;
    const donor_phone = String(req.body?.donor_phone || "").trim() || null;

    const amount = Number(amountRaw);

    // Basic validation (server-side)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return res.status(400).json({ ok: false, message: "Invalid amount." });
    }
    if (!["card", "bit"].includes(payment_method)) {
      return res.status(400).json({ ok: false, message: "Invalid payment method." });
    }

    // Optional email format check (simple)
    if (donor_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donor_email)) {
      return res.status(400).json({ ok: false, message: "Invalid email." });
    }

    // DEMO ONLY: do not process real payments / do not store card details
    const status = "demo_success";

    const [result] = await db.query(
      `INSERT INTO guest_donations
        (amount, payment_method, donor_name, donor_email, donor_phone, status, created_at)
       VALUES
        (?, ?, ?, ?, ?, ?, NOW())`,
      [amount, payment_method, donor_name, donor_email, donor_phone, status]
    );

    return res.status(201).json({
      ok: true,
      donationId: result.insertId,
      status,
    });
  } catch (err) {
    console.error("POST /api/guest-donations error:", err);
    return res.status(500).json({ ok: false, message: "Something went wrong." });
  }
});

// GET /api/guest-donations/stats
app.get("/api/guest-donations/stats", async (req, res) => {
  try {
    const [totalsRows] = await db.query(
      `SELECT COUNT(*) AS total_count,
              COALESCE(SUM(amount), 0) AS total_amount
       FROM guest_donations
       WHERE status='demo_success'`
    );

    const [byMethodRows] = await db.query(
      `SELECT payment_method,
              COUNT(*) AS cnt,
              COALESCE(SUM(amount), 0) AS sum_amount
       FROM guest_donations
       WHERE status='demo_success'
       GROUP BY payment_method`
    );

    return res.json({
      ok: true,
      totals: totalsRows[0],
      byMethod: byMethodRows,
    });
  } catch (err) {
    console.error("GET /api/guest-donations/stats error:", err);
    return res.status(500).json({ ok: false, message: "Something went wrong." });
  }
});

// ---  AUTHENTICATION ROUTES (Signup, Email Verify, Login, MFA) ---

// Signup: Hashes passwords and sends a verification email
app.post('/api/auth/signup', async (req, res) => {
  try {
    const full_name = String(req.body?.full_name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!full_name || !email || !password || password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Invalid input.' });
    }

    // 1) אם כבר יש משתמש קיים ב-users (כלומר כבר אומת בעבר) -> חסימה
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      return res.status(400).json({ message: 'Signup failed.' });
    }

    // 2) אם יש הרשמה בהמתנה (pending) שעדיין לא used ועוד לא פג תוקף -> נחדש קוד ונחזיר אותו verifyToken
    const [pending] = await db.query(
      `SELECT id, verify_token, expires_at, used_at
       FROM email_verifications
       WHERE email = ?
       ORDER BY id DESC
       LIMIT 1`,
      [email]
    );

    if (pending.length && !pending[0].used_at) {
      const [expCheck] = await db.query('SELECT NOW() > ? AS expired', [pending[0].expires_at]);
      if (!expCheck[0].expired) {
        const newCode = generate6DigitCode();
        const newHash = await bcrypt.hash(newCode, 10);

        await db.query(
          `UPDATE email_verifications
           SET code_hash = ?, attempts = 0, expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
           WHERE id = ?`,
          [newHash, pending[0].id]
        );

        await sendVerificationEmail(email, newCode);
        return res.status(200).json({ ok: true, verifyToken: pending[0].verify_token });
      }
    }

    // 3) ליצור pending חדש בתוך email_verifications (בלי users עדיין)
    const password_hash = await bcrypt.hash(password, 10);

    const code = generate6DigitCode();
    const code_hash = await bcrypt.hash(code, 10);
    const verifyToken = generateVerifyToken();

    await db.query(
      `INSERT INTO email_verifications
         (user_id, email, full_name, password_hash, verify_token, code_hash, expires_at, attempts, used_at, created_at)
       VALUES
         (NULL, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, NULL, NOW())`,
      [email, full_name, password_hash, verifyToken, code_hash]
    );



    await sendVerificationEmail(email, code);

    return res.status(201).json({ ok: true, verifyToken });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});



// POST /api/auth/email/verify
app.post('/api/auth/email/verify', async (req, res) => {
  try {
    const verifyToken = String(req.body?.verifyToken || '').trim();
    const code = String(req.body?.code || '').trim();

    if (!verifyToken || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Invalid input.' });
    }

    const [rows] = await db.query(
      `SELECT id, user_id, email, full_name, password_hash, code_hash, expires_at, attempts, used_at
       FROM email_verifications
       WHERE verify_token = ?
       LIMIT 1`,
      [verifyToken]
    );

    if (!rows.length) return res.status(400).json({ message: 'Invalid code.' });

    const rec = rows[0];

    if (rec.used_at) return res.status(400).json({ message: 'Invalid code.' });

    const [expCheck] = await db.query('SELECT NOW() > ? AS expired', [rec.expires_at]);
    if (expCheck[0].expired) return res.status(400).json({ message: 'Code expired.' });

    if (rec.attempts >= 5) return res.status(429).json({ message: 'Too many attempts.' });

    const ok = await bcrypt.compare(code, rec.code_hash);

    // increment attempts no matter what (simple protection)
    await db.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?', [rec.id]);

    if (!ok) return res.status(400).json({ message: 'Invalid code.' });

    
    if (!rec.email || !rec.full_name || !rec.password_hash) {
      return res.status(400).json({ message: 'Invalid code.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [rec.email]);
    if (existing.length) {
      
      await db.query('UPDATE email_verifications SET used_at = NOW(), user_id = ? WHERE id = ?', [
        existing[0].id,
        rec.id,
      ]);
      req.session.regenerate(async (err) => {
        if (err) return res.status(500).json({ message: 'Something went wrong.' });
        const userId = existing[0].id;
        const [[u]] = await db.query(
          "SELECT id, email, role FROM users WHERE id=? LIMIT 1",
          [userId]
        );
        req.session.userId = u.id;              
        req.session.user = { id: u.id, email: u.email, role: u.role }; 
         return res.json({ ok: true });
        });
        return;
    }

    // ליצור user רק עכשיו (אחרי אימות)
    const [ins] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_type, region, created_at, email_verified_at)
       VALUES (?, ?, ?, 'user', 'person', 'north', NOW(), NOW())`,
      [rec.full_name, rec.email, rec.password_hash]
    );

    const newUserId = ins.insertId;

    // mark used + לקשר את ה-verification למשתמש החדש
    await db.query(
      'UPDATE email_verifications SET used_at = NOW(), user_id = ? WHERE id = ?',
      [newUserId, rec.id]
    );

    // Create session now (so Signup+Verify goes straight to chat)
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: 'Something went wrong.' });
      req.session.userId = newUserId;
      req.session.user = { id: newUserId, email: rec.email, role: "user" }; // ✅ כי יצרתם 'user'
    return res.json({ ok: true });
  });

  } catch (err) {
    console.error('verify error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});

// POST /api/auth/email/resend
app.post('/api/auth/email/resend', async (req, res) => {
  try {
    const verifyToken = String(req.body?.verifyToken || '').trim();
    if (!verifyToken) return res.status(400).json({ message: 'Invalid input.' });

    const [rows] = await db.query(
      `SELECT id, email, used_at
       FROM email_verifications
       WHERE verify_token = ?
       LIMIT 1`,
      [verifyToken]
    );

    if (!rows.length) return res.status(400).json({ message: 'Cannot resend.' });
    if (rows[0].used_at) return res.status(400).json({ message: 'Already verified.' });

    const email = rows[0].email;
    if (!email) return res.status(400).json({ message: 'Cannot resend.' });

    const newCode = generate6DigitCode();
    const newHash = await bcrypt.hash(newCode, 10);

    await db.query(
      `UPDATE email_verifications
       SET code_hash = ?, attempts = 0, expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
       WHERE id = ?`,
      [newHash, rows[0].id]
    );

    await sendVerificationEmail(email, newCode);

    return res.json({ ok: true });
  } catch (err) {
    console.error('resend error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});



/* --- AUTH: LOGIN + LOGOUT + ME --- */

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      // generic message reduces enumeration
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const [rows] = await db.query(
      `SELECT id, email, password_hash, email_verified_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );      

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Only after correct password, we can say "not verified"
    if (!user.email_verified_at) {
      return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED' });
    }

    // Create MFA challenge
    const code = generate6DigitCode();
    const code_hash = await bcrypt.hash(code, 10);
    const mfaToken = generateMfaToken();

    await db.query(
      `INSERT INTO mfa_challenges (user_id, mfa_token, channel, code_hash, expires_at, attempts, used_at, created_at)
       VALUES (?, ?, 'email', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0, NULL, NOW())`,
      [user.id, mfaToken, code_hash]
    );

    const recipientEmail = user.email || email; // fallback to input email if needed

    try {
      await sendVerificationEmail(recipientEmail, code);
    } catch (mailErr) {
      console.error("send mail failed:", mailErr);

      await db.query("DELETE FROM mfa_challenges WHERE mfa_token = ?", [mfaToken]);

      return res.status(500).json({ message: "Could not send verification code. Please try again." });
    }


    return res.json({
      ok: true,
      mfaRequired: true,
      mfaToken,
      channels: ['email'],
      maskedEmail: maskEmail(user.email),
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});


// POST /api/auth/mfa/verify
app.post('/api/auth/mfa/verify', async (req, res) => {
  try {
    const mfaToken = String(req.body?.mfaToken || '').trim();
    const code = String(req.body?.code || '').trim();

    if (!mfaToken || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Invalid input.' });
    }

    const [rows] = await db.query(
      `SELECT id, user_id, code_hash, expires_at, attempts, used_at
       FROM mfa_challenges
       WHERE mfa_token = ?
       LIMIT 1`,
      [mfaToken]
    );

    if (!rows.length) return res.status(400).json({ message: 'Invalid code.' });

    const rec = rows[0];
    if (rec.used_at) return res.status(400).json({ message: 'Invalid code.' });

    const [expCheck] = await db.query('SELECT NOW() > ? AS expired', [rec.expires_at]);
    if (expCheck[0].expired) return res.status(400).json({ message: 'Code expired.' });

    if (rec.attempts >= 5) return res.status(429).json({ message: 'Too many attempts.' });

    const ok = await bcrypt.compare(code, rec.code_hash);

    await db.query('UPDATE mfa_challenges SET attempts = attempts + 1 WHERE id = ?', [rec.id]);

    if (!ok) return res.status(400).json({ message: 'Invalid code.' });

    await db.query('UPDATE mfa_challenges SET used_at = NOW() WHERE id = ?', [rec.id]);

    // Create session only now
   req.session.regenerate(async (err) => {
    if (err) return res.status(500).json({ message: 'Something went wrong.' });
    const [[u]] = await db.query(
      "SELECT id, email, role FROM users WHERE id=? LIMIT 1",
      [rec.user_id]
    );

   req.session.userId = u.id;
   req.session.user = { id: u.id, email: u.email, role: u.role }; // ✅ כאן נקבע role סופי
  return res.json({ ok: true });
});
  } catch (err) {
    console.error('mfa verify error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});

// POST /api/auth/mfa/resend
app.post('/api/auth/mfa/resend', async (req, res) => {
  try {
    const mfaToken = String(req.body?.mfaToken || '').trim();
    if (!mfaToken) return res.status(400).json({ message: 'Invalid input.' });

    const [rows] = await db.query(
      `SELECT id, user_id, used_at
       FROM mfa_challenges
       WHERE mfa_token = ?
       LIMIT 1`,
      [mfaToken]
    );

    if (!rows.length) return res.status(400).json({ message: 'Cannot resend.' });
    if (rows[0].used_at) return res.status(400).json({ message: 'Already verified.' });

    const [userRows] = await db.query('SELECT email FROM users WHERE id = ? LIMIT 1', [rows[0].user_id]);
    if (!userRows.length) return res.status(400).json({ message: 'Cannot resend.' });

    const email = userRows[0].email;

    const newCode = generate6DigitCode();
    const newHash = await bcrypt.hash(newCode, 10);

    await db.query(
      `UPDATE mfa_challenges
       SET code_hash = ?, attempts = 0, expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
       WHERE id = ?`,
      [newHash, rows[0].id]
    );

    await sendVerificationEmail(email, newCode);

    return res.json({ ok: true });
  } catch (err) {
    console.error('mfa resend error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});


// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ ok: false });
  return res.json({ ok: true, ...req.session.user }); 
  // מחזיר: { ok: true, id, email, role }
});


// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// --------------------------
// REQUESTS: create + list
// --------------------------
function requireAuth(req, res, next) {
  // Simple middleware to protect routes that require a logged-in user (session-based)
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated." });
  next();
}
// Admin-only middleware
function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "Not logged in" });
  if (req.session.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
  next();
}


// Allowed values are validated server-side (reduces invalid data and helps security)
const ALLOWED = {
  help_type: ["money", "volunteer", "service"],
  category: ["nursing_home", "ngo", "school", "hospital", "orphanage", "private", "other"],
  target_group: ["elderly", "children", "youth", "families", "patients", "refugees", "general"],
  topic: ["health", "education", "arts", "technology", "basic_needs", "social", "other"],
  region: ["north", "center", "south", "jerusalem", "east"],
  status: ["open", "in_progress", "closed"],
};

// POST /api/requests
app.post("/api/requests", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const help_type = String(req.body?.help_type || "").trim();
    const category = String(req.body?.category || "").trim();
    const target_group = String(req.body?.target_group || "").trim();
    const topic = String(req.body?.topic || "").trim();
    const region = String(req.body?.region || "").trim();
    const title = String(req.body?.title || "").trim();
    const full_description = String(req.body?.full_description || "").trim();

    // --- image fields (optional) ---
    let image_source = String(req.body?.image_source || "").trim() || null;
    const image_key = String(req.body?.image_key || "").trim() || null;
    const image_url = String(req.body?.image_url || "").trim() || null;
    

    if (image_source === "ai_preset") image_source = "ai";
    if (image_source === "upload") image_source = "internal";

    const IMAGE_SOURCES = ["internal", "cloudinary", "ai"];
    if (image_source && !IMAGE_SOURCES.includes(image_source)) {
      return res.status(400).json({ message: "Invalid image_source." });
    }

    if (image_url && image_url.length > 500) {
      return res.status(400).json({ message: "Invalid image_url." });
    }
    if (image_key && image_key.length > 100) {
      return res.status(400).json({ message: "Invalid image_key." });
    }

    let amount_needed = req.body?.amount_needed;
    const is_money_request = help_type === "money" ? 1 : 0;

    // Validate select inputs (only allow known values)
    if (!ALLOWED.help_type.includes(help_type)) return res.status(400).json({ message: "Invalid help_type." });
    if (!ALLOWED.category.includes(category)) return res.status(400).json({ message: "Invalid category." });
    if (!ALLOWED.target_group.includes(target_group)) return res.status(400).json({ message: "Invalid target_group." });
    if (!ALLOWED.topic.includes(topic)) return res.status(400).json({ message: "Invalid topic." });
    if (!ALLOWED.region.includes(region)) return res.status(400).json({ message: "Invalid region." });
    if (!title || title.length > 255) return res.status(400).json({ message: "Invalid title." });
    if (!full_description) return res.status(400).json({ message: "Invalid description." });

    // Only money requests require amount_needed
    if (is_money_request) {
      const n = Number(amount_needed);
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: "Invalid amount_needed." });
      amount_needed = n;
    } else {
      amount_needed = null;
    }

    // short_summary optional: take first 160 chars from description
    const short_summary = full_description.slice(0, 160);

    const [result] = await db.query(
      `INSERT INTO requests
        (user_id, help_type, category, target_group, topic, region, title, short_summary, full_description, amount_needed, is_money_request, image_url, image_source, image_key, status, created_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW())`,
      [
        userId,
        help_type,
        category,
        target_group,
        topic,
        region,
        title,
        short_summary,
        full_description,
        amount_needed,
        is_money_request,
        image_url,
        image_source,
        image_key,
      ]
    );

    return res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error("POST /api/requests error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
});

// GET /api/requests
app.get("/api/requests", requireAuth, async (req, res) => {
  try {
    const { region, topic, category, help_type, status, mine } = req.query;

    let sql = `
    SELECT id, user_id, help_type, category, target_group, topic, region,
       title, short_summary, full_description, amount_needed, status,
       image_url, image_source, image_key,
       created_at
      FROM requests
      WHERE 1=1
    `;
    const params = [];

    // "mine=1" shows only the logged-in user's requests
    if (mine === "1") {
      sql += " AND user_id = ?";
      params.push(req.session.userId);
    }
    if (region && ALLOWED.region.includes(region)) {
      sql += " AND region = ?";
      params.push(region);
    }
    if (topic && ALLOWED.topic.includes(topic)) {
      sql += " AND topic = ?";
      params.push(topic);
    }
    if (category && ALLOWED.category.includes(category)) {
      sql += " AND category = ?";
      params.push(category);
    }
    if (help_type && ALLOWED.help_type.includes(help_type)) {
      sql += " AND help_type = ?";
      params.push(help_type);
    }
    if (status === "all") {
      // no status filter (show all statuses)
    } else if (status && ALLOWED.status.includes(status)) {
      sql += " AND status = ?";
      params.push(status);
    } else if (mine !== "1") {
      // default only for "all requests" when no status provided
      sql += " AND status = 'open'";
    }    

    sql += " ORDER BY created_at DESC LIMIT 200";

    const [rows] = await db.query(sql, params);
    return res.json({ ok: true, rows });
  } catch (err) {
    console.error("GET /api/requests error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
});

// Close (soft-delete) a request - owner only (or admin)
app.patch("/api/requests/:id/status", requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const nextStatus = String(req.body?.status || "").trim();

    const allowed = ["open", "in_progress", "closed"];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Load owner
    const [rows] = await db.query(
      "SELECT id, user_id FROM requests WHERE id = ? LIMIT 1",
      [requestId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ message: "Request not found" });

    const isOwner = Number(row.user_id) === Number(req.session.userId);
    const isAdmin = req.session?.user?.role === "admin"; // אם אצלך נשמר role ב-session

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await db.query("UPDATE requests SET status = ? WHERE id = ?", [
      nextStatus,
      requestId,
    ]);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/admin/metrics", requireAdmin, async (req, res) => {
  try {
    const [[donUser]] = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM donations WHERE donation_type='money'"
    );
    const [[donGuest]] = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM guest_donations WHERE status='demo_success'"
    );
    const [[reqCount]] = await db.query("SELECT COUNT(*) AS total FROM requests");

    res.json({
      ok: true,
      totalDonations: Number(donUser.total) + Number(donGuest.total),
      totalRequests: Number(reqCount.total),
      totalOrganizations: 14
    });
  } catch (e) {
    console.error("GET /api/admin/metrics error:", e);
    res.status(500).json({ ok: false, message: "Something went wrong." });
  }
});

// Admin: Users list + request_count
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.account_type,
        u.region,
        u.created_at,
        COUNT(r.id) AS request_count
      FROM users u
      LEFT JOIN requests r ON r.user_id = u.id
      GROUP BY u.id, u.full_name, u.email, u.phone, u.role, u.account_type, u.region, u.created_at
      ORDER BY u.created_at DESC
      LIMIT 200
    `);

    res.json({ ok: true, rows });
  } catch (e) {
    console.error("GET /api/admin/users error:", e);
    res.status(500).json({ ok: false, message: "Something went wrong." });
  }
});



// GET /api/admin/charts/donations-by-month
app.get("/api/admin/charts/donations-by-month", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ym, SUM(total_amount) AS total
      FROM (
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COALESCE(SUM(amount),0) AS total_amount
        FROM guest_donations
        WHERE status='demo_success'
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')

        UNION ALL

        SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COALESCE(SUM(amount),0) AS total_amount
        FROM donations
        WHERE donation_type='money'
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ) t
      GROUP BY ym
      ORDER BY ym ASC
      LIMIT 24
    `);

    res.json({ ok: true, rows });
  } catch (e) {
    console.error("donations-by-month error:", e);
    res.status(500).json({ ok: false });
  }
});


// GET /api/admin/charts/requests-by-region
app.get("/api/admin/charts/requests-by-region", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT region, COUNT(*) AS cnt
      FROM requests
      GROUP BY region
      ORDER BY cnt DESC
    `);

    res.json({ ok: true, rows });
  } catch (e) {
    console.error("requests-by-region error:", e);
    res.status(500).json({ ok: false });
  }
});
// Admin: Delete user (cascade deletes requests/donations via FK)
app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isFinite(targetId)) {
      return res.status(400).json({ ok: false, message: "Bad id." });
    }

    // prevent deleting yourself
    if (req.session.user?.id === targetId) {
      return res.status(400).json({ ok: false, message: "You can't delete your own account." });
    }

    const [[u]] = await db.query("SELECT id, role FROM users WHERE id=? LIMIT 1", [targetId]);
    if (!u) return res.status(404).json({ ok: false, message: "User not found." });
    if (u.role === "admin") return res.status(400).json({ ok: false, message: "Cannot delete admin." });

    await db.query("DELETE FROM users WHERE id=?", [targetId]);
    return res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/users/:id error:", e);
    res.status(500).json({ ok: false, message: "Something went wrong." });
  }
});

// POST /api/requests/:id/contact
app.post("/api/requests/:id/contact", requireAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isFinite(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Invalid request id." });
    }

    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const phone = String(req.body?.phone || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!message || message.length < 5 || message.length > 2000) {
      return res.status(400).json({ message: "Invalid message." });
    }

    // 1) Load request
    const [[reqRow]] = await db.query(
      `SELECT id, user_id, title, region, category, status
       FROM requests
       WHERE id = ?
       LIMIT 1`,
      [requestId]
    );
    if (!reqRow) return res.status(404).json({ message: "Request not found." });

    if (reqRow.status === "closed") {
      return res.status(400).json({ message: "This request is closed." });
    }

    // ✅ Lock after first: only allow if status === open
    if (reqRow.status !== "open") {
      return res.status(409).json({ message: "This request is pending decision." });
    }

    // 2) Owner email
    const [[owner]] = await db.query(
      `SELECT email, full_name
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [reqRow.user_id]
    );
    if (!owner?.email) return res.status(500).json({ message: "Request owner email not found." });

    // 3) Donor from session (optional)
    const [[donor]] = await db.query(
      `SELECT email, full_name
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.session.userId]
    );

    const payload = {
      requestTitle: reqRow.title,
      requestRegion: reqRow.region,
      requestCategory: reqRow.category,
      donorName: name || donor?.full_name || "CareMatch user",
      donorEmail: email || donor?.email || "",
      donorPhone: phone || "",
      message,
    };

    // ✅ 4) Atomic update: save pending volunteer + set in_progress only if still open
    const [upd] = await db.query(
      `UPDATE requests
       SET status = 'in_progress',
           pending_volunteer_name  = ?,
           pending_volunteer_email = ?,
           pending_volunteer_phone = ?,
           pending_volunteer_msg   = ?,
           pending_volunteer_at    = NOW()
       WHERE id = ? AND status = 'open'`,
      [
        payload.donorName,
        payload.donorEmail,
        payload.donorPhone,
        payload.message,
        requestId
      ]
    );

    // If 0 rows updated => someone else locked it first
    if (!upd.affectedRows) {
      return res.status(409).json({ message: "This request is pending decision." });
    }

    // 5) Send email (if this fails, rollback the lock so the request isn't stuck)
    try {
      await sendVolunteerInterestEmail(owner.email, payload);
    } catch (mailErr) {
      console.error("sendVolunteerInterestEmail failed:", mailErr);

      await db.query(
        `UPDATE requests
         SET status='open',
             pending_volunteer_name=NULL,
             pending_volunteer_email=NULL,
             pending_volunteer_phone=NULL,
             pending_volunteer_msg=NULL,
             pending_volunteer_at=NULL
         WHERE id=? AND status='in_progress'`,
        [requestId]
      );

      return res.status(500).json({ message: "Could not send email. Please try again." });
    }

    return res.json({ ok: true, status: "in_progress" });
  } catch (err) {
    console.error("POST /api/requests/:id/contact error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
});

async function requireOwnerOrAdmin(req, res, next) {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isFinite(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "Invalid request id." });
    }

    const [[row]] = await db.query(
      "SELECT id, user_id, status FROM requests WHERE id=? LIMIT 1",
      [requestId]
    );
    if (!row) return res.status(404).json({ message: "Request not found." });

    const isOwner = Number(row.user_id) === Number(req.session.userId);
    const isAdmin = req.session?.user?.role === "admin";

    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Not allowed." });

    // keep for later use
    req._reqRow = row;
    next();
  } catch (e) {
    console.error("requireOwnerOrAdmin error:", e);
    return res.status(500).json({ message: "Server error." });
  }
}

// ACCEPT: close the request (it will disappear from open lists)
app.post("/api/requests/:id/accept", requireAuth, requireOwnerOrAdmin, async (req, res) => {
  const requestId = Number(req.params.id);

  if (req._reqRow.status !== "in_progress") {
    return res.status(400).json({ message: "Request is not pending." });
  }

  await db.query(
    `UPDATE requests
     SET status='closed'
     WHERE id=? AND status='in_progress'`,
    [requestId]
  );

  return res.json({ ok: true, status: "closed" });
});

// REJECT: reopen + clear pending volunteer fields
app.post("/api/requests/:id/reject", requireAuth, requireOwnerOrAdmin, async (req, res) => {
  const requestId = Number(req.params.id);

  if (req._reqRow.status !== "in_progress") {
    return res.status(400).json({ message: "Request is not pending." });
  }

  await db.query(
    `UPDATE requests
     SET status='open',
         pending_volunteer_name=NULL,
         pending_volunteer_email=NULL,
         pending_volunteer_phone=NULL,
         pending_volunteer_msg=NULL,
         pending_volunteer_at=NULL
     WHERE id=? AND status='in_progress'`,
    [requestId]
  );

  return res.json({ ok: true, status: "open" });
});

// POST /api/auth/password/forgot
app.post('/api/auth/password/forgot', resetLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    // Always return {ok:true} to avoid revealing whether the email exists in our DB
    const genericOk = () => res.json({ ok: true });

    if (!email) return genericOk();

    const [rows] = await db.query(
      `SELECT id, email, email_verified_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) return genericOk();

    const user = rows[0];

    if (!user.email_verified_at) return genericOk();

    // Remove previous unused reset tokens for this user
    await db.query(
      `DELETE FROM password_reset_tokens
       WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    );

    const token = generateResetToken();
    const token_hash = sha256Hex(token);

    // Store only the token hash in DB 
    await db.query(
      `INSERT INTO password_reset_tokens
       (user_id, token_hash, expires_at, attempts, used_at, created_at)
       VALUES
       (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, NULL, NOW())`,
      [user.id, token_hash]
    );

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/pages/resetPassword.html?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (mailErr) {
      console.error("reset mail failed:", mailErr);
      await db.query("DELETE FROM password_reset_tokens WHERE token_hash = ?", [token_hash]);
    }

    return genericOk();
  } catch (err) {
    console.error('forgot password error:', err);
    return res.json({ ok: true });
  }
});

// POST /api/auth/password/reset
app.post('/api/auth/password/reset', resetLimiter, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!token || newPassword.length < 8) {
      return res.status(400).json({ message: 'Invalid input.' });
    }

    const token_hash = sha256Hex(token);

    const [rows] = await db.query(
      `SELECT id, user_id, expires_at, attempts, used_at
       FROM password_reset_tokens
       WHERE token_hash = ?
       LIMIT 1`,
      [token_hash]
    );

    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired link.' });

    const rec = rows[0];
    if (rec.used_at) return res.status(400).json({ message: 'Invalid or expired link.' });

    const [expCheck] = await db.query('SELECT NOW() > ? AS expired', [rec.expires_at]);
    if (expCheck[0].expired) return res.status(400).json({ message: 'Invalid or expired link.' });

    if (rec.attempts >= 5) return res.status(429).json({ message: 'Too many attempts. Try again later.' });

    await db.query('UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = ?', [rec.id]);

    const password_hash = await bcrypt.hash(newPassword, 10);

    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, rec.user_id]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [rec.id]);

    if (req.session) {
      return req.session.destroy(() => res.json({ ok: true }));
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('reset password error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});

// --- Uploads (local) ---
// Multer handles local image uploads (size/type limited for safety).
const uploadDir = path.join(__dirname, "uploads", "user");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".png";
    const name = `u_${req.session.userId}_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

app.post("/api/uploads/image", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  // public URL served by: app.use("/uploads", express.static(...))
  const image_url = `/uploads/user/${req.file.filename}`;

  return res.json({
    ok: true,
    image_url,
    image_source: "internal",
    image_key: req.file.filename,
  });
});




// Start listening for incoming HTTP requests
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});