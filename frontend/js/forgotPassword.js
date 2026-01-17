/**
 * @file forgotPassword.js
 * @description Handles the forgot password form submission and interactions.
 */
 
(function () {
  const form = document.getElementById("forgotForm");
  const email = document.getElementById("email");
  const msg = document.getElementById("msg");
  const err = document.getElementById("error");
  // Ensure necessary elements exist
  if (!form || !email) return;

  /**
   * @description Safely sets the text content of an element.
   * @param {HTMLElement|null} el - The target element.
   * @param {string} t - The text to set.
   */
  const setText = (el, t) => { if (el) el.textContent = t || ""; };

   /**
   * @description Sends a forgot password request to the API.
   * @param {Object} payload - The request payload containing the email.
   * @returns {Promise<boolean>} - Resolves to true if the request was successful, false otherwise.
   */
  async function apiForgotPassword(payload) {
    const res = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    // Attempt to parse JSON response to avoid unhandled promise rejections
    try { await res.json(); } catch (_) {}
    return res.ok;
  }

  /**
   * @description Handles the form submission for forgot password.
   * Validates input, sends API request, and displays appropriate messages.
   * @param {Event} e - The form submission event.
   */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setText(err, "");
    setText(msg, "");

    const val = email.value.trim();

    // Basic Client-side validation
    if (!val) { 
      setText(err, "Email is required.");
       return;
       }

    if (email.validity.typeMismatch) {
       setText(err, "Enter a valid email address.");
        return;
       }
       
    // Disable button and show sending state
    const btn = form.querySelector('button[type="submit"]');
    const old = btn?.textContent || "";
    if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }


    try {
       await apiForgotPassword({ email: val });
    }  catch (_) {
         // Network or unexpected error
       }

    setText(msg, "If this email exists, we sent a reset link.");

    if (btn) {
       btn.disabled = false;
       btn.textContent = old || "Send reset link";
       }
  });
})();
