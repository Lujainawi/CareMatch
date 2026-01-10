/* frontend/js/signup.js
   Works with: frontend/pages/signUp.html

   Flow:
   1) Validate fields (full_name, email, password, confirm_password)
   2) POST /api/auth/signup  -> expects { ok:true, verifyToken:"..." }
   3) Open verification modal + start resend timer (60s)
   4) POST /api/auth/email/verify  -> expects { ok:true }
   5) POST /api/auth/email/resend  -> expects { ok:true }
*/

(function () {
  // ---------- DOM ----------
   // We grab references to the form inputs and error placeholders to show validation messages.
  const form = document.getElementById("signupForm");

  const fullName = document.getElementById("fullName");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  const togglePassword = document.getElementById("togglePassword");
  const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

  const fullNameError = document.getElementById("fullNameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmError = document.getElementById("confirmError");
  const formError = document.getElementById("formError");

  // Modal
  const verifyModal = document.getElementById("verifyModal");
  const emailCode = document.getElementById("emailCode");
  const codeError = document.getElementById("codeError");
  const modalMsg = document.getElementById("modalMsg");
  const verifyBtn = document.getElementById("verifyBtn");
  const resendBtn = document.getElementById("resendBtn");
  const resendTimerEl = document.getElementById("resendTimer");

  if (!form || !fullName || !email || !password || !confirmPassword) return;

  const closeEls = verifyModal?.querySelectorAll('[data-close="true"]') || [];

  // ---------- Helpers ----------
  function setFieldError(inputEl, errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    inputEl.classList.toggle("input--invalid", Boolean(message));
  }

  function clearFormError() {
    if (formError) formError.textContent = "";
  }

  function normalizeEmail(val) {
    return String(val || "").trim().toLowerCase();
  }

  // ---------- Password toggle ----------
  function setupToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener("click", () => {
      const isShown = input.type === "text";
      input.type = isShown ? "password" : "text";
      btn.setAttribute("aria-pressed", String(!isShown));
      btn.textContent = isShown ? "Show" : "Hide";
      input.focus();
    });
  }

  setupToggle(togglePassword, password);
  setupToggle(toggleConfirmPassword, confirmPassword);

  // ---------- Validation ----------
  function validateFullName() {
    const val = fullName.value.trim();
    if (!val) {
      setFieldError(fullName, fullNameError, "Full name is required.");
      return false;
    }
    // Simple rule: require at least 2 words
    if (val.split(/\s+/).length < 2) {
      setFieldError(fullName, fullNameError, "Please enter first and last name.");
      return false;
    }
    setFieldError(fullName, fullNameError, "");
    return true;
  }

  function validateEmail() {
    const val = email.value.trim();
    if (!val) {
      setFieldError(email, emailError, "Email is required.");
      return false;
    }
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
    if (val.length < 8) {
      setFieldError(password, passwordError, "Password must be at least 8 characters.");
      return false;
    }
    setFieldError(password, passwordError, "");
    return true;
  }

  function validateConfirmPassword() {
    const a = password.value;
    const b = confirmPassword.value;

    if (!b || !b.trim()) {
      setFieldError(confirmPassword, confirmError, "Please confirm your password.");
      return false;
    }
    if (b.length < 8) {
      setFieldError(confirmPassword, confirmError, "Password must be at least 8 characters.");
      return false;
    }
    if (a !== b) {
      setFieldError(confirmPassword, confirmError, "Passwords do not match.");
      return false;
    }
    setFieldError(confirmPassword, confirmError, "");
    return true;
  }

  // Validate on blur, re-validate on input only if error already visible
  fullName.addEventListener("blur", validateFullName);
  fullName.addEventListener("input", () => {
    if (fullNameError?.textContent) validateFullName();
    clearFormError();
  });

  email.addEventListener("blur", validateEmail);
  email.addEventListener("input", () => {
    if (emailError?.textContent) validateEmail();
    clearFormError();
  });

  password.addEventListener("blur", () => {
    validatePassword();
    if (confirmPassword.value) validateConfirmPassword();
  });
  password.addEventListener("input", () => {
    if (passwordError?.textContent) validatePassword();
    if (confirmPassword.value && confirmError?.textContent) validateConfirmPassword();
    clearFormError();
  });

  confirmPassword.addEventListener("blur", validateConfirmPassword);
  confirmPassword.addEventListener("input", () => {
    if (confirmError?.textContent) validateConfirmPassword();
    clearFormError();
  });

  // ---------- Modal helpers ----------
  function openModal() {
    if (!verifyModal) return;
    verifyModal.setAttribute("aria-hidden", "false");
    verifyModal.classList.add("is-open");

    modalMsg && (modalMsg.textContent = "");
    if (emailCode) emailCode.value = "";
    setFieldError(emailCode, codeError, "");

    setTimeout(() => emailCode?.focus(), 0);
  }

  function closeModal() {
    if (!verifyModal) return;
    verifyModal.setAttribute("aria-hidden", "true");
    verifyModal.classList.remove("is-open");
  }

  closeEls.forEach((el) => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && verifyModal?.classList.contains("is-open")) closeModal();
  });

  // ---------- Resend timer ----------
  let resendInterval = null;

  function startResendTimer(seconds = 60) {
    if (!resendBtn || !resendTimerEl) return;

    let left = seconds;
    resendBtn.disabled = true;
    resendTimerEl.textContent = `(${left})`;

    if (resendInterval) clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      left -= 1;
      resendTimerEl.textContent = `(${left})`;
      if (left <= 0) {
        clearInterval(resendInterval);
        resendInterval = null;
        resendBtn.disabled = false;
        resendTimerEl.textContent = "";
      }
    }, 1000);
  }

  // ---------- API ----------
  async function apiSignup(payload) {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {}

    return { ok: res.ok, status: res.status, data };
  }

  async function apiVerifyEmail(payload) {
    const res = await fetch("/api/auth/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {}

    return { ok: res.ok, status: res.status, data };
  }

  async function apiResendCode(payload) {
    const res = await fetch("/api/auth/email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {}

    return { ok: res.ok, status: res.status, data };
  }

  // ---------- Submit signup ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFormError();

    const ok =
      validateFullName() &
      validateEmail() &
      validatePassword() &
      validateConfirmPassword();

    if (!ok) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const oldText = submitBtn ? submitBtn.textContent : "";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    try {
      const { ok: success, data } = await apiSignup({
        full_name: fullName.value.trim(),
        email: normalizeEmail(email.value),
        password: password.value,
      });

      if (!success) {
        // generic message keeps UX simple and avoids email enumeration
        if (formError) formError.textContent = "Signup failed. Please try again.";
        return;
      }

      const verifyToken = data?.verifyToken || "";
      if (!verifyToken) {
        if (formError) formError.textContent = "Signup succeeded, but verification could not start.";
        return;
      }

      sessionStorage.setItem("verifyToken", verifyToken);

      openModal();
      startResendTimer(60);
    } catch (err) {
      if (formError) formError.textContent = "Something went wrong. Please try again.";
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = oldText || "Submit";
      }
    }
  });

  // ---------- Verify code ----------
  verifyBtn?.addEventListener("click", async () => {
    modalMsg && (modalMsg.textContent = "");
    setFieldError(emailCode, codeError, "");

    const code = String(emailCode?.value || "").trim();

    if (!code) {
      setFieldError(emailCode, codeError, "Enter the verification code.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setFieldError(emailCode, codeError, "Code must be 6 digits.");
      return;
    }

    const verifyToken = sessionStorage.getItem("verifyToken") || "";
    if (!verifyToken) {
      modalMsg && (modalMsg.textContent = "Missing verification session. Please sign up again.");
      return;
    }

    verifyBtn.disabled = true;
    const oldText = verifyBtn.textContent;
    verifyBtn.textContent = "Verifying...";

    try {
      const { ok: success, status, data } = await apiVerifyEmail({ verifyToken, code });

      if (!success) {
        // show server message if exists, otherwise generic
        const msg = data?.message || (status === 429 ? "Too many attempts. Try again later." : "Invalid code.");
        modalMsg && (modalMsg.textContent = msg);
        return;
      }

      // Verified -> go to login page
      sessionStorage.removeItem("verifyToken");
      closeModal();
      window.location.href = "../pages/chat.html";
    } catch (err) {
      modalMsg && (modalMsg.textContent = "Something went wrong. Please try again.");
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = oldText || "Verify";
    }
  });

  // ---------- Resend code ----------
  resendBtn?.addEventListener("click", async () => {
    modalMsg && (modalMsg.textContent = "");

    const verifyToken = sessionStorage.getItem("verifyToken") || "";
    if (!verifyToken) {
      modalMsg && (modalMsg.textContent = "Missing verification session. Please sign up again.");
      return;
    }

    resendBtn.disabled = true;

    try {
      const { ok: success, data } = await apiResendCode({ verifyToken });
      if (!success) {
        modalMsg && (modalMsg.textContent = data?.message || "Could not resend. Please try again.");
        resendBtn.disabled = false;
        return;
      }

      modalMsg && (modalMsg.textContent = "A new code was sent.");
      startResendTimer(60);
    } catch (err) {
      modalMsg && (modalMsg.textContent = "Something went wrong. Please try again.");
      resendBtn.disabled = false;
    }
  });
})();
