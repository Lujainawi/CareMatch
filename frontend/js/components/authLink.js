async function updateAuthLink() {
    const link = document.getElementById("authLink");
    if (!link) return;
  
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        link.textContent = "Results";
        link.href = "/pages/result.html";
      } else {
        link.textContent = "Log in";
        link.href = "/pages/logIn.html";
      }
    } catch {
      link.textContent = "Log in";
      link.href = "/pages/logIn.html";
    }
  }
  
  document.addEventListener("DOMContentLoaded", updateAuthLink);  
  