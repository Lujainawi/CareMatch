document.addEventListener("DOMContentLoaded", () => {
    (function initDonateDemo(){
      const form = document.getElementById("donateForm");
      const btn = document.getElementById("donateBtn");
      const status = document.getElementById("donateStatus");
      const custom = document.getElementById("customAmount");
  
      const modal = document.getElementById("donateModal");
      const modalText = document.getElementById("donateModalText");
      const modalClose = document.getElementById("donateModalClose");
  
      if (!form || !btn || !status || !custom || !modal || !modalText || !modalClose) return;
  
      function getSelectedAmount(){
        const checked = form.querySelector('input[name="amount"]:checked');
        const customVal = Number(custom.value);
        if (custom.value && customVal > 0) return customVal;
        return checked ? Number(checked.value) : 50;
      }
  
      function updateButton(){
        const amount = getSelectedAmount();
        btn.textContent = `Donate ₪${amount}`;
      }
  
      custom.addEventListener("input", () => {
        form.querySelectorAll('input[name="amount"]').forEach(r => (r.checked = false));
        updateButton();
      });
  
      form.querySelectorAll('input[name="amount"]').forEach(radio => {
        radio.addEventListener("change", () => {
          custom.value = "";
          updateButton();
        });
      });
  
      updateButton();
  
      form.addEventListener("submit", (e) => {
        e.preventDefault();
  
        const amount = getSelectedAmount();
        const freq = form.querySelector('input[name="freq"]:checked')?.value || "one_time";
        const method = form.querySelector('input[name="method"]:checked')?.value || "card";
  
        status.textContent = "Preparing demo checkout…";
  
        modalText.textContent =
          `Demo donation: ₪${amount} • ${freq.replace("_"," ")} • via ${method}. No real payment was made.`;
        modal.hidden = false;
        status.textContent = "";
      });
  
      modalClose.addEventListener("click", () => { modal.hidden = true; });
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
    })();
  
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });  