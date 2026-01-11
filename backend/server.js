// backend/server.js
const express = require('express');
const path = require('path');
const db = require('./db');
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const fs = require("fs");
const OpenAI = require("openai");


const { sendVerificationEmail, sendPasswordResetEmail } = require('./mailer');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json({ limit: "200kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
});


app.use('/api/auth', authLimiter);

//Session middleware (cookie based sessions)
app.use(session({
  name: 'carematch.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, //7 days
  },
}));

// Serve frontend files (HTML, CSS, JS) as static files
app.use(express.static(path.join(__dirname, '../frontend')));

// serve generated uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPTS_BY_TOPIC = {
  health: "A warm, hopeful illustration about healthcare support and community help. No text.",
  education: "A bright illustration about learning support and school supplies. No text.",
  arts: "A colorful illustration about arts activities for children. No text.",
  technology: "A friendly illustration about technology help and digital inclusion. No text.",
  basic_needs: "A kind illustration about food, clothing, and basic needs support. No text.",
  social: "A supportive illustration about community volunteering and social help. No text.",
  other: "A general illustration about charity and helping hands. No text.",
};

app.post("/api/images/generate", requireAuth, aiLimiter, async (req, res) => {
  try {
    const topic = String(req.body?.topic || "other").trim();
    if (!ALLOWED.topic.includes(topic)) {
      return res.status(400).json({ message: "Invalid topic." });
    }

    const prompt = PROMPTS_BY_TOPIC[topic] || PROMPTS_BY_TOPIC.other;

    // Generate (base64)
    const r = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    const b64 = r.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ message: "No image returned." });

    const buf = Buffer.from(b64, "base64");

    const dir = path.join(__dirname, "uploads", "ai");
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `ai_${Date.now()}_${Math.random().toString(16).slice(2)}.png`;
    const abs = path.join(dir, fileName);
    fs.writeFileSync(abs, buf);

    const image_url = `/uploads/ai/${fileName}`;
    return res.json({
      ok: true,
      image_url,
      image_source: "ai",
      image_key: fileName.replace(".png", ""),
    });
  } catch (err) {
    console.error("AI generate error:", err);
    return res.status(500).json({ message: "AI generation failed." });
  }
});


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

// Belong to Contact Us in Section 6
app.post("/api/contact", (req, res) => {
  // Later: save to DB / send email
  console.log("Contact message:", req.body);
  res.json({ status: "ok" });
});

//Normalize an email for consistent storage/lookup (trim spaces + lowercase)
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Generate a random 6-digit numeric code (as a string) for email/OTP verification
function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Generate a cryptographically strong random token (64 hex chars) to identify a verification session
function generateVerifyToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateMfaToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}


function maskEmail(email) {
  const [name, domain] = String(email || '').split("@");
  if (!domain) return '';
  const shown = name.slice(0, 2);
  return `${shown}***@${domain}`;
}


/* --------------------------
   AUTH: SIGNUP + EMAIL VERIFY
   Requires table: email_verifications
-------------------------- */


// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const full_name = String(req.body?.full_name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!full_name || !email || !password || password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Invalid input.' });
    }
    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      return res.status(400).json({ message: 'Signup failed.' });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, account_type, region, created_at, email_verified_at)
       VALUES (?, ?, ?, 'user', 'person', 'north', NOW(), NULL)`,
      [full_name, email, password_hash]
    );

    const userId = result.insertId;

    //Create verification record
    const code = generate6DigitCode();
    const code_hash = await bcrypt.hash(code, 10);
    const verifyToken = generateVerifyToken();


    await db.query(
      `INSERT INTO email_verifications (user_id, verify_token, code_hash, expires_at, attempts, used_at, created_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, NULL, NOW())`,
      [userId, verifyToken, code_hash]
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
      `SELECT id, user_id, code_hash, expires_at, attempts, used_at
       FROM email_verifications
       WHERE verify_token = ?
       LIMIT 1`,
      [verifyToken]
    );

    if (!rows.length) return res.status(400).json({ message: 'Invalid code.' });

    const rec = rows[0];

    if (rec.used_at) return res.status(400).json({ message: 'Invalid code.' });

    // expired?
    const [expCheck] = await db.query('SELECT NOW() > ? AS expired', [rec.expires_at]);
    if (expCheck[0].expired) return res.status(400).json({ message: 'Code expired.' });

    if (rec.attempts >= 5) return res.status(429).json({ message: 'Too many attempts.' });

    const ok = await bcrypt.compare(code, rec.code_hash);

    // increment attempts no matter what (simple protection)
    await db.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?', [rec.id]);

    if (!ok) return res.status(400).json({ message: 'Invalid code.' });

    // mark used + verify user
    await db.query('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [rec.id]);
    await db.query('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [rec.user_id]);

    // Create session now (so Signup+Verify goes straight to chat)
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: 'Something went wrong.' });
      req.session.userId = rec.user_id;
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
      `SELECT id, user_id, used_at
       FROM email_verifications
       WHERE verify_token = ?
       LIMIT 1`,
      [verifyToken]
    );

    if (!rows.length) return res.status(400).json({ message: 'Cannot resend.' });
    if (rows[0].used_at) return res.status(400).json({ message: 'Already verified.' });

    const [userRows] = await db.query('SELECT email FROM users WHERE id = ? LIMIT 1', [rows[0].user_id]);
    if (!userRows.length) return res.status(400).json({ message: 'Cannot resend.' });

    const email = userRows[0].email;

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

/* --------------------------
   AUTH: LOGIN + LOGOUT + ME
-------------------------- */

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
      `SELECT id, password_hash, email_verified_at
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

      // חשוב: לא להשאיר challenge תקוע אם לא נשלח מייל
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
// POST /api/auth/mfa/verify  (OTP ok -> create session)
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
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: 'Something went wrong.' });
      req.session.userId = rec.user_id;
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
  if (!req.session.userId) return res.status(401).json({ ok: false });
  return res.json({ ok: true, userId: req.session.userId });
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
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated." });
  next();
}

const ALLOWED = {
  help_type: ["money", "volunteer", "service"],
  category: ["nursing_home", "ngo", "school", "hospital", "orphanage", "private", "other"],
  target_group: ["elderly", "children", "youth", "families", "patients", "refugees", "general"],
  topic: ["health", "education", "arts", "technology", "basic_needs", "social", "other"],
  region: ["north", "center", "south", "jerusalem", "east"],
  status: ["open", "in_progress", "closed"],
};

// POST /api/requests  (when user chooses "I need help")
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

    if (!ALLOWED.help_type.includes(help_type)) return res.status(400).json({ message: "Invalid help_type." });
    if (!ALLOWED.category.includes(category)) return res.status(400).json({ message: "Invalid category." });
    if (!ALLOWED.target_group.includes(target_group)) return res.status(400).json({ message: "Invalid target_group." });
    if (!ALLOWED.topic.includes(topic)) return res.status(400).json({ message: "Invalid topic." });
    if (!ALLOWED.region.includes(region)) return res.status(400).json({ message: "Invalid region." });
    if (!title || title.length > 255) return res.status(400).json({ message: "Invalid title." });
    if (!full_description) return res.status(400).json({ message: "Invalid description." });

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

// GET /api/requests?region=&topic=&category=&help_type=&status=&mine=1
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
    if (status && ALLOWED.status.includes(status)) {
      sql += " AND status = ?";
      params.push(status);
    } else {
      // default: only open requests
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



// POST /api/auth/password/forgot
app.post('/api/auth/password/forgot', resetLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

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

    await db.query(
      `DELETE FROM password_reset_tokens
       WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    );

    const token = generateResetToken();
    const token_hash = sha256Hex(token);

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

    // להעלות attempts לפני כל דבר נוסף
    await db.query('UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = ?', [rec.id]);

    const password_hash = await bcrypt.hash(newPassword, 10);

    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, rec.user_id]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [rec.id]);

    // אם המשתמש היה מחובר בדפדפן הזה — עדיף לנתק אותו (session invalidate)
    if (req.session) {
      return req.session.destroy(() => res.json({ ok: true }));
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('reset password error:', err);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});


// Start listening for incoming HTTP requests
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});