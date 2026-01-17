/**
 * @file contactForm.js
 * @description Initializes the contact form by setting up event listeners
 * and handling form submissions.
 */

/**
 * @description Initializes the contact form functionality.
 */   
export function initContactForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmit");

  // Guard clause to ensure all elements are present
  if (!form || !status || !submitBtn) return;

  /**
   * @description Handles the form submission event to send contact data to the backend.
   * @param {Event} e - The form submission event.
   */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Let the browser show built-in validation messages (required/email/etc.)
    if (!form.reportValidity()) return;

    status.classList.remove("is-error", "is-success");
    status.textContent = "Sending...";
    submitBtn.disabled = true;
    
    // Gather form data
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }); 

      if (!res.ok) throw new Error("Request failed");
      
      // Clear the form and show success message
      form.reset(); // Clear all form fields
      status.classList.add("is-success");
      status.textContent = "Thanks! Your message was sent.";
    } catch (err) {
      status.classList.add("is-error");
      status.textContent = "Sorry — something went wrong. Please try again.";
    } finally {
      // Always re-enable the button, regardless of success or failur
      submitBtn.disabled = false;
    }
  });
}