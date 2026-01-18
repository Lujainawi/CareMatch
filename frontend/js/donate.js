/**
 * @file donate.js
 * @description Guest donation (demo) – one-time only.
 * Creates a record in `guest_donations` via POST /api/guest-donations.
 * Notes:
 * - Demo only: no real payment is processed.
 */
document.addEventListener("DOMContentLoaded", () => {
  //--- Main donate form elements (amount + method selection) ---
  const form = document.getElementById("donateForm");
  const btn = document.getElementById("donateBtn");
  const status = document.getElementById("donateStatus");
  const custom = document.getElementById("customAmount");
  
  // --- Modal elements (checkout + thank you) ---
  const modal = document.getElementById("donateModal");
  const modalSummary = document.getElementById("donateModalSummary");
  const modalClose = document.getElementById("donateModalClose");

  // --- Optional donor fields (stored for demo reporting only) ---
  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutStatus = document.getElementById("checkoutStatus");
  const confirmBtn = document.getElementById("confirmBtn");

  
  const donorName = document.getElementById("donorName");
  const donorEmail = document.getElementById("donorEmail");
  const donorPhone = document.getElementById("donorPhone");
 
  // --- Payment method conditional sections ---
  const cardFields = document.getElementById("cardFields");
  const bitFields = document.getElementById("bitFields");

  // --- Thank-you view elements ---
  const thankYouView = document.getElementById("thankYouView");
  const thankYouText = document.getElementById("thankYouText");
  const closeAfterThanks = document.getElementById("closeAfterThanks");

  // --- Card demo inputs (NOT sent to server) ---
  const cardNumber = document.getElementById("cardNumber");
  const cardExpiry = document.getElementById("cardExpiry");
  const cardCvv = document.getElementById("cardCvv");
  
  // ---Footer year---
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  //If any essential element is missing, stop initialization safely.
  if (!form || !btn || !status || !custom || !modal || !modalSummary || !checkoutForm) return;


  /**
   * @description Get selected donation amount (preset or custom).
   * @returns {number} donation amount
   */
  function getSelectedAmount() {
    const checked = form.querySelector('input[name="amount"]:checked');
    const customVal = Number(custom.value);
    if (custom.value && Number.isFinite(customVal) && customVal > 0) return customVal;
    return checked ? Number(checked.value) : 50;
  }


  /**
   * @description Get selected payment method.
   * @returns {string} payment method
   */
  function getSelectedMethod() {
    return form.querySelector('input[name="method"]:checked')?.value || "card";
  }

  /**
   * @description Update main donate button text with selected amount.
   */
  function updateButton() {
    const amount = getSelectedAmount();
    btn.textContent = `Donate ₪${amount}`;
  }

  /**
   * @description Open checkout modal, reset views.
   */
  function openModal() {
    modal.hidden = false;
    checkoutStatus.textContent = "";
    thankYouView.hidden = true;
    checkoutForm.hidden = false;
  }

  /**
   * @description Close checkout modal, reset views and fields.
   */
  function closeModal() {
    modal.hidden = true;
    checkoutStatus.textContent = "";
    status.textContent = "";
    // optional: clear optional fields
    if (donorName) donorName.value = "";
    if (donorEmail) donorEmail.value = "";
    if (donorPhone) donorPhone.value = "";
  }
  /**
   * @description Show/hide fields in modal based on selected payment method.
   * @param {string} method payment method
   */
  function setFieldsByMethod(method) {
    if (method === "bit") {
      if (bitFields) bitFields.hidden = false;
      if (cardFields) cardFields.hidden = true;
    } else {
      if (bitFields) bitFields.hidden = true;
      if (cardFields) cardFields.hidden = false;
    }
  }

  // Custom amount input: uncheck presets
  custom.addEventListener("input", () => {
    form.querySelectorAll('input[name="amount"]').forEach(r => (r.checked = false));
    updateButton();
  });

  // Preset amount selection clears custom
  form.querySelectorAll('input[name="amount"]').forEach(radio => {
    radio.addEventListener("change", () => {
      custom.value = "";
      updateButton();
    });
  });

  // Payment method change updates modal fields (if open)
  form.querySelectorAll('input[name="method"]').forEach(radio => {
    radio.addEventListener("change", () => {
      if (!modal.hidden) setFieldsByMethod(getSelectedMethod());
    });
  });

  updateButton();

  // Step 1: open checkout modal
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const amount = getSelectedAmount();
    const method = getSelectedMethod();

    status.textContent = "Opening demo checkout…";

    modalSummary.textContent = `You are donating ₪${amount} via ${method.toUpperCase()}.`;
    setFieldsByMethod(method);
    openModal();

    status.textContent = "";
  });

  // Step 2: confirm -> send to backend 
  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = getSelectedAmount();
    const method = getSelectedMethod();

    // ---- Demo validation (required fields by method) ----
    if (method === "card") {
      const cn = (cardNumber?.value || "").trim();
      const ex = (cardExpiry?.value || "").trim();
      const cv = (cardCvv?.value || "").trim();

      if (!cn || !ex || !cv) {
        checkoutStatus.textContent = "Please fill card details.";
        return;
      }

      // optional simple format checks (still demo)
      const digits = cn.replace(/\D/g, "");
      if (digits.length < 12) {
        checkoutStatus.textContent = "Card number looks too short.";
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(ex)) {
        checkoutStatus.textContent = "Expiry must be MM/YY.";
        return;
      }
      if (!/^\d{3,4}$/.test(cv)) {
        checkoutStatus.textContent = "CVV must be 3-4 digits.";
        return;
      }
    }

    if (method === "bit") {
      const ph = (donorPhone?.value || "").trim();
      if (!ph) {
        checkoutStatus.textContent = "Please enter a phone number.";
        return;
      }
    }


    const payload = {
      amount,
      payment_method: method,
      donor_name: donorName?.value?.trim() || null,
      donor_email: donorEmail?.value?.trim() || null,
      donor_phone: method === "bit" ? (donorPhone?.value?.trim() || null) : null,
    };

    checkoutStatus.textContent = "Saving demo donation…";
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      const res = await fetch("/api/guest-donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        checkoutStatus.textContent = data?.message || "Could not save donation.";
        if (confirmBtn) confirmBtn.disabled = false;
        return;
      }

      // Show thank you
      checkoutForm.hidden = true;
      thankYouView.hidden = false;
      thankYouText.textContent = ``;
      checkoutStatus.textContent = "";
    } catch (err) {
      checkoutStatus.textContent = "Network error. Please try again.";
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
    }
  });

  // Close handlers
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (closeAfterThanks) closeAfterThanks.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
});
