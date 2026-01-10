/* frontend/js/login.js
  References:
  - aria-pressed (toggle button): MDN :contentReference[oaicite:2]{index=2}
  - Constraint Validation API: MDN :contentReference[oaicite:3]{index=3}
  - Generic login errors to reduce enumeration: OWASP :contentReference[oaicite:4]{index=4}
  - Error identification in text: WCAG 3.3.1 :contentReference[oaicite:5]{index=5}
*/

(function () {
  // ---- DOM ----
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const toggleBtn = document.getElementById("togglePassword");

  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const formError = document.getElementById("formError");

  // ---- Login OTP Modal DOM ----
  const loginVerifyModal = document.getElementById("loginVerifyModal");
  const loginMaskedEmail = document.getElementById("loginMaskedEmail");
  const loginCode = document.getElementById("loginCode");
  const loginCodeError = document.getElementById("loginCodeError");
  const loginModalMsg = document.getElementById("loginModalMsg");
  const loginVerifyBtn = document.getElementById("loginVerifyBtn");
  const loginResendBtn = document.getElementById("loginResendBtn");
  const loginResendTimerEl = document.getElementById("loginResendTimer");

  const loginCloseEls = loginVerifyModal?.querySelectorAll('[data-close="true"]') || [];

  if (!form || !email || !password || !toggleBtn) return;

  // ---- Helpers ----
  function setFieldError(inputEl, errorEl, message) {
    errorEl.textContent = message || "";
    inputEl.classList.toggle("input--invalid", Boolean(message));
  }

  function clearFormError() {
    formError.textContent = "";
  }

  function openLoginModal() {
    if (!loginVerifyModal) return;
    loginVerifyModal.setAttribute("aria-hidden", "false");
    loginVerifyModal.classList.add("is-open");
    if (loginModalMsg) loginModalMsg.textContent = "";
    if (loginCode) loginCode.value = "";
    setFieldError(loginCode, loginCodeError, "");
    setTimeout(() => loginCode?.focus(), 0);
  }
  function closeLoginModal() {
    if (!loginVerifyModal) return;
    loginVerifyModal.setAttribute("aria-hidden", "true");
    loginVerifyModal.classList.remove("is-open");
  }
  loginCloseEls.forEach((el) => el.addEventListener("click", closeLoginModal));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && loginVerifyModal?.classList.contains("is-open")) closeLoginModal();
  });

  // ---- Resend timer ----
  let loginResendInterval = null;

  function startLoginResendTimer(seconds = 60) {
    if (!loginResendBtn || !loginResendTimerEl) return;

    let left = seconds;
    loginResendBtn.disabled = true;
    loginResendTimerEl.textContent = `(${left})`;

    if (loginResendInterval) clearInterval(loginResendInterval);
    loginResendInterval = setInterval(() => {
      left -= 1;
      loginResendTimerEl.textContent = `(${left})`;
      if (left <= 0) {
        clearInterval(loginResendInterval);
        loginResendInterval = null;
        loginResendBtn.disabled = false;
        loginResendTimerEl.textContent = "";
      }
    }, 1000);
  }




  // ---- Show/Hide password (accessible toggle) ----
  toggleBtn.addEventListener("click", () => {
    const isShown = password.type === "text";
    password.type = isShown ? "password" : "text";

    toggleBtn.setAttribute("aria-pressed", String(!isShown));
    toggleBtn.textContent = isShown ? "Show" : "Hide";

    password.focus();
  });

  // ---- Field validation ----
  function validateEmail() {
    const val = email.value.trim();

    if (!val) {
      setFieldError(email, emailError, "Email is required.");
      return false;
    }

    // Uses built-in browser validation for type="email"
    if (email.validity.typeMismatch) {
      setFieldError(email, emailError, "Enter a valid email address.");
      return false;
    }

    setFieldError(email, emailError, "");
    return true;
  }

  function validatePassword() {
    const val = password.value;

    if (!val || !val.trim()) {
      setFieldError(password, passwordError, "Password is required.");
      return false;
    }

    // (Placeholder) requirement can be strengthened later.
    // For now we keep minimum length to match UI helper text.
    if (val.length < 8) {
      setFieldError(password, passwordError, "Password must be at least 8 characters.");
      return false;
    }

    setFieldError(password, passwordError, "");
    return true;
  }

  // Validate on blur, and re-validate while typing only if there is already an error
  email.addEventListener("blur", validateEmail);
  email.addEventListener("input", () => {
    if (emailError.textContent) validateEmail();
    clearFormError();
  });

  password.addEventListener("blur", validatePassword);
  password.addEventListener("input", () => {
    if (passwordError.textContent) validatePassword();
    clearFormError();
  });

  // ---- API placeholders (we'll implement backend later) ----
  async function apiLogin(payload) {
    // Expected backend:
    // POST /api/auth/login
    // body: { email, password }
    // response (example):
    // 200 { mfaRequired: true, mfaToken: "....", channels:["sms","email"], maskedEmail:"...", maskedPhone:"..." }
    // 401/400 => invalid
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    // Try parse JSON (if exists)
    let data = null;
    try {
      data = await res.json();
    } catch (_) { }

    return { ok: res.ok, status: res.status, data };
  }


  async function apiMfaVerify(payload) {
    const res = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data = null;
    try { data = await res.json(); } catch (_) { }
    return { ok: res.ok, status: res.status, data };
  }

  async function apiMfaResend(payload) {
    const res = await fetch("/api/auth/mfa/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data = null;
    try { data = await res.json(); } catch (_) { }
    return { ok: res.ok, status: res.status, data };
  }




  // ---- Submit ----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFormError();

    const okEmail = validateEmail();
    const okPass = validatePassword();
    if (!okEmail || !okPass) return;

    // UI: disable submit while sending
    const submitBtn = form.querySelector('button[type="submit"]');
    const oldText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";
    }

    try {
      const { ok, status, data } = await apiLogin({
        email: email.value.trim(),
        password: password.value,
      });


      if (status === 403 && data?.code === "EMAIL_NOT_VERIFIED") {
        formError.textContent = "Please verify your email before logging in.";
        return;
      }

      if (!ok) {
        // Generic message to avoid revealing whether email exists (OWASP)
        formError.textContent = "Invalid email or password.";
        return;
      }

      // MFA required -> open modal and wait for OTP verify
      if (data?.mfaRequired) {
        const mfaToken = data?.mfaToken || "";
        if (!mfaToken) {
          formError.textContent = "Something went wrong. Please try again.";
          return;
        }

        sessionStorage.setItem("mfaToken", mfaToken);

        if (loginMaskedEmail) {
          loginMaskedEmail.textContent = data?.maskedEmail || "";
        }

        openLoginModal();
        startLoginResendTimer(60);
        return;
      }

      // If server ever returns no MFA (not expected), fallback:
      window.location.href = "../pages/chat.html";
    } catch (err) {
      // Network/Unexpected
      formError.textContent = "Something went wrong. Please try again.";
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = oldText || "Log In";
      }
    }
  });
  loginVerifyBtn?.addEventListener("click", async () => {
    if (loginModalMsg) loginModalMsg.textContent = "";
    setFieldError(loginCode, loginCodeError, "");

    const code = String(loginCode?.value || "").trim();
    if (!code) {
      setFieldError(loginCode, loginCodeError, "Enter the verification code.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setFieldError(loginCode, loginCodeError, "Code must be 6 digits.");
      return;
    }

    const mfaToken = sessionStorage.getItem("mfaToken") || "";
    if (!mfaToken) {
      if (loginModalMsg) loginModalMsg.textContent = "Missing verification session. Please log in again.";
      return;
    }

    loginVerifyBtn.disabled = true;
    const oldText = loginVerifyBtn.textContent;
    loginVerifyBtn.textContent = "Verifying...";

    try {
      const { ok: success, status, data } = await apiMfaVerify({ mfaToken, code });

      if (!success) {
        const msg =
          data?.message ||
          (status === 429 ? "Too many attempts. Try again later." :
            status === 400 ? "Invalid code." :
              "Something went wrong. Please try again.");
        if (loginModalMsg) loginModalMsg.textContent = msg;
        return;
      }

      sessionStorage.removeItem("mfaToken");
      closeLoginModal();
      window.location.href = "../pages/chat.html";
    } catch (err) {
      if (loginModalMsg) loginModalMsg.textContent = "Something went wrong. Please try again.";
    } finally {
      loginVerifyBtn.disabled = false;
      loginVerifyBtn.textContent = oldText || "Verify";
    }
  });

  loginResendBtn?.addEventListener("click", async () => {
    if (loginModalMsg) loginModalMsg.textContent = "";

    const mfaToken = sessionStorage.getItem("mfaToken") || "";
    if (!mfaToken) {
      if (loginModalMsg) loginModalMsg.textContent = "Missing verification session. Please log in again.";
      return;
    }

    loginResendBtn.disabled = true;

    try {
      const { ok: success, data } = await apiMfaResend({ mfaToken });

      if (!success) {
        if (loginModalMsg) loginModalMsg.textContent = data?.message || "Could not resend. Please try again.";
        loginResendBtn.disabled = false;
        return;
      }

      if (loginModalMsg) loginModalMsg.textContent = "A new code was sent.";
      startLoginResendTimer(60);
    } catch (err) {
      if (loginModalMsg) loginModalMsg.textContent = "Something went wrong. Please try again.";
      loginResendBtn.disabled = false;
    }
  });

})();  