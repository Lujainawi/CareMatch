(function () {
  const form = document.getElementById("resetForm");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const msg = document.getElementById("msg");
  const err = document.getElementById("error");

  if (!form || !newPassword || !confirmPassword) return;

  const setText = (el, t) => { if (el) el.textContent = t || ""; };

  const params = new URLSearchParams(window.location.search);
  const token = (params.get("token") || "").trim();

  if (!token) {
    setText(err, "Invalid or expired link.");
    form.style.display = "none";
    return;
  }

  async function apiResetPassword(payload) {
    const res = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    return { ok: res.ok, data };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setText(err, "");
    setText(msg, "");

    const p1 = String(newPassword.value || "");
    const p2 = String(confirmPassword.value || "");

    if (p1.length < 8) { setText(err, "Password must be at least 8 characters."); return; }
    if (p1 !== p2) { setText(err, "Passwords do not match."); return; }

    const btn = form.querySelector('button[type="submit"]');
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Resetting..."; }

    try {
      const { ok, data } = await apiResetPassword({ token, newPassword: p1 });

      if (!ok) {
        setText(err, data?.message || "Invalid or expired link.");
        return;
      }

      setText(msg, "Password updated. Redirecting to login...");
      setTimeout(() => { window.location.href = "logIn.html"; }, 900);
    } catch {
      setText(err, "Something went wrong. Please try again.");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old || "Reset password"; }
    }
  });
})();
