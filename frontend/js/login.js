/**
 * @file login.js
 * @description Manages the user authentication process, including form validation, 
 * password visibility toggling, and multi-factor authentication (MFA) logic.
 * @notes 
 * - Implements OWASP security principles by using generic error messages.
 * - Follows WCAG accessibility standards for form controls and modal management.
 * - Uses session-based tokens for secure multi-step verification flows.
 */

(function () {
  // ---- DOM Elements: Form Fields ----
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const toggleBtn = document.getElementById("togglePassword");

  // ---- DOM Elements: Error Display Containers ----
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const formError = document.getElementById("formError");

  // ---- DOM Elements: Multi-Factor Authentication Modal(MFA) ----
  const loginVerifyModal = document.getElementById("loginVerifyModal");
  const loginMaskedEmail = document.getElementById("loginMaskedEmail");
  const loginCode = document.getElementById("loginCode");
  const loginCodeError = document.getElementById("loginCodeError");
  const loginModalMsg = document.getElementById("loginModalMsg");
  const loginVerifyBtn = document.getElementById("loginVerifyBtn");
  const loginResendBtn = document.getElementById("loginResendBtn");
  const loginResendTimerEl = document.getElementById("loginResendTimer");

  // Close buttons inside the modal
  const loginCloseEls = loginVerifyModal?.querySelectorAll('[data-close="true"]') || [];

  // ---- Ensure DOM elements exist before proceeding ----
  if (!form || !email || !password || !toggleBtn) return;

  // ---- UI Helpers functions ----

  /**
   * Sets or clears error states for input fields.
   * @param {HTMLElement} inputEl - The input element to style.
   * @param {HTMLElement} errorEl - The container for the error message.
   * @param {string} message - The error description (empty to clear).
   */
  function setFieldError(inputEl, errorEl, message) {
    errorEl.textContent = message || "";
    inputEl.classList.toggle("input--invalid", Boolean(message));
  }

  /**
   * Clears the general form error message.
   */
  function clearFormError() {
    formError.textContent = "";
  }

  // ---- Login Modal (MFA) functions ----
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

  // ---- MFA Resend timer ----
  let loginResendInterval = null;
  
  /**
   * Manages the countdown for the "Resend Code" button to prevent spam.
   * @param {number} seconds - Countdown duration in seconds.
   */
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

    // Update button state
    toggleBtn.setAttribute("aria-pressed", String(!isShown));
    toggleBtn.textContent = isShown ? "Show" : "Hide";

    password.focus();
  });

  // ---- Field validation ----

  /**
   * Validates Email format and requirement
   */
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

  /**
   * Validates password length/strength requirements
   */
  function validatePassword() {
    const val = password.value;

    if (!val || !val.trim()) {
      setFieldError(password, passwordError, "Password is required.");
      return false;
    }

    // Minimum security threshold: 8 characters
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

  // ---- API placeholders ----

  /**
   * Sends login request to the server.
   */
  async function apiLogin(payload) {
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

  // Verifies the MFA code
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

  // Requests a new MFA code to be sent
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




  // ---- Main Form Submit  ----
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

      // Specific case: email not verified
      if (status === 403 && data?.code === "EMAIL_NOT_VERIFIED") {
        formError.textContent = "Please verify your email before logging in.";
        return;
      }

      if (!ok) {
        // OWASP: Use generic message to prevent discovery of valid email addresses
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
        // Store MFA token in sessionStorage for verification step
        sessionStorage.setItem("mfaToken", mfaToken);

        if (loginMaskedEmail) {
          loginMaskedEmail.textContent = data?.maskedEmail || "";
        }

        openLoginModal();
        startLoginResendTimer(60);
        return;
      }

      // Success: redirect to chat
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

  // ---- MFA Verify Handling ----
  loginVerifyBtn?.addEventListener("click", async () => {
    if (loginModalMsg) loginModalMsg.textContent = "";
    setFieldError(loginCode, loginCodeError, "");

    const code = String(loginCode?.value || "").trim();
    if (!code) {
      setFieldError(loginCode, loginCodeError, "Enter the verification code.");
      return;
    }
    // Basic format check: 6 digits
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
      // Success: clear MFA token and redirect to chat
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


  // ---- MFA Resend Code Handling ----
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