/**
 * @file donate.js
 * @description Handles the donation form interactions and demo checkout process.
 */
document.addEventListener("DOMContentLoaded", () => {
    /**
     * @description Initializes the donation form demo functionality.
     * Handles amount selection, frequency, payment method, and displays a modal with the demo checkout summary.
     */
    (function initDonateDemo(){
      const form = document.getElementById("donateForm");
      const btn = document.getElementById("donateBtn");
      const status = document.getElementById("donateStatus");
      const custom = document.getElementById("customAmount");
  
      const modal = document.getElementById("donateModal");
      const modalText = document.getElementById("donateModalText");
      const modalClose = document.getElementById("donateModalClose");

      // Ensure all necessary UI elements exist before initializing
      if (!form || !btn || !status || !custom || !modal || !modalText || !modalClose) return;
  
      /**
       * @description Calculates the current donation amount based on radio selection or custom input.
       * @returns {number} The selected donation amount.
       */
      function getSelectedAmount(){
        const checked = form.querySelector('input[name="amount"]:checked');
        const customVal = Number(custom.value);
        if (custom.value && customVal > 0) return customVal;
        return checked ? Number(checked.value) : 50;
      }
      /**
       * @description Updates the donation button text to reflect the selected amount.
       */
      function updateButton(){
        const amount = getSelectedAmount();
        btn.textContent = `Donate ₪${amount}`;
      }
      
      /**
       * @description Event listener for custom amount input changes.
       */
      custom.addEventListener("input", () => {
        form.querySelectorAll('input[name="amount"]').forEach(r => (r.checked = false));
        updateButton();
      });
     
      /** 
       * @description Handles radio button selection. Clears custom amount input when a preset is selected.
       *  */
      form.querySelectorAll('input[name="amount"]').forEach(radio => {
        radio.addEventListener("change", () => {
          custom.value = "";
          updateButton();
        });
      });
      
      // Initial button update
      updateButton();
  
      /**
       * @description Handles form submission to display the demo checkout modal.
       * @param {Event} e - The form submission event.
       */
      form.addEventListener("submit", (e) => {
        e.preventDefault();
  
        const amount = getSelectedAmount();
        const freq = form.querySelector('input[name="freq"]:checked')?.value || "one_time";
        const method = form.querySelector('input[name="method"]:checked')?.value || "card";
  
        status.textContent = "Preparing demo checkout…";
        
        // Simulate processing delay
        modalText.textContent =
          `Demo donation: ₪${amount} • ${freq.replace("_"," ")} • via ${method}. No real payment was made.`;
        modal.hidden = false;
        status.textContent = "";
      });
      // Modal close handlers
      modalClose.addEventListener("click", () => { modal.hidden = true; });
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
    })();
     
    /** ---- Dynamic Footer Year ---- */
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });  