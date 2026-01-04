// backend/server.js
const express = require('express');
const path = require('path');
const db = require('./db');
const session = require('express-session');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');


const { sendVerificationEmail } = require('./mailer');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
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
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7, //7 days
  },
}));

// Serve frontend files (HTML, CSS, JS) as static files
app.use(express.static(path.join(__dirname, '../frontend')));

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
  help_type: ["money", "volunteer", "service", "product"],
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
      // חשוב: לא לאפשר שלילי (הערת תקינות):contentReference[oaicite:5]{index=5}
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ message: "Invalid amount_needed." });
      amount_needed = n;
    } else {
      amount_needed = null;
    }

    // short_summary optional: take first 160 chars from description
    const short_summary = full_description.slice(0, 160);

    const [result] = await db.query(
      `INSERT INTO requests
        (user_id, help_type, category, target_group, topic, region, title, short_summary, full_description, amount_needed, is_money_request, status, created_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW())`,
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
             title, short_summary, full_description, amount_needed, status, created_at
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

// Start listening for incoming HTTP requests
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});