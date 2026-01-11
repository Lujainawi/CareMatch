(function () {
  const form = document.getElementById("forgotForm");
  const email = document.getElementById("email");
  const msg = document.getElementById("msg");
  const err = document.getElementById("error");
  if (!form || !email) return;

  const setText = (el, t) => { if (el) el.textContent = t || ""; };

  async function apiForgotPassword(payload) {
    const res = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    try { await res.json(); } catch (_) {}
    return res.ok;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setText(err, "");
    setText(msg, "");

    const val = email.value.trim();
    if (!val) { setText(err, "Email is required."); return; }
    if (email.validity.typeMismatch) { setText(err, "Enter a valid email address."); return; }

    const btn = form.querySelector('button[type="submit"]');
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }

    // הודעה כללית תמיד (מונע enumeration)
    try { await apiForgotPassword({ email: val }); } catch (_) {}
    setText(msg, "If this email exists, we sent a reset link.");

    if (btn) { btn.disabled = false; btn.textContent = old || "Send reset link"; }
  });
})();
