export function initContactForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmit");
  if (!form || !status || !submitBtn) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Let the browser show built-in validation messages (required/email/etc.)
    if (!form.reportValidity()) return;

    status.classList.remove("is-error", "is-success");
    status.textContent = "Sending...";
    submitBtn.disabled = true;

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }); 

      if (!res.ok) throw new Error("Request failed");

      form.reset();
      status.classList.add("is-success");
      status.textContent = "Thanks! Your message was sent.";
    } catch (err) {
      status.classList.add("is-error");
      status.textContent = "Sorry — something went wrong. Please try again.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}