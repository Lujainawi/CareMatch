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
  
    if (!form || !email || !password || !toggleBtn) return;
  
    // ---- Helpers ----
    function setFieldError(inputEl, errorEl, message) {
      errorEl.textContent = message || "";
      inputEl.classList.toggle("input--invalid", Boolean(message));
    }
  
    function clearFormError() {
      formError.textContent = "";
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
      } catch (_) {}
  
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
  
        // If backend says MFA step is required (what we planned)
        // Save what the MFA page needs.
        const mfaToken = data?.mfaToken || "TODO_BACKEND_MFA_TOKEN";
        const channels = data?.channels || ["sms", "email"];
  
        sessionStorage.setItem("mfaToken", mfaToken);
        sessionStorage.setItem("mfaChannels", JSON.stringify(channels));
        sessionStorage.setItem("maskedEmail", data?.maskedEmail || "");
        sessionStorage.setItem("maskedPhone", data?.maskedPhone || "");
  
        // Next page: choose SMS/Email + resend timer + code verify
        window.location.href = "../index.html";
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
  })();  