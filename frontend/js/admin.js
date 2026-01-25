function $(id) {
  return document.getElementById(id);
}

function formatMoneyILS(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("en-IL", { maximumFractionDigits: 2 });
}

async function loadMetrics() {
  const status = $("adminStatus");
  try {
    if (status) status.textContent = "Loading…";

    const res = await fetch("/api/admin/metrics", { credentials: "include" });
    if (res.status === 401 || res.status === 403) {
      // Not allowed: send back to results/login
      window.location.href = "results.html";
      return;
    }
    if (!res.ok) throw new Error("Failed to load metrics");

    const data = await res.json();

    $("kpiTotalDonations").textContent = formatMoneyILS(data.totalDonations);
    $("kpiTotalRequests").textContent = String(data.totalRequests ?? "—");
    $("kpiTotalOrganizations").textContent = String(data.totalOrganizations ?? "—");

    if (status) status.textContent = "";
  } catch (e) {
    console.error(e);
    if (status) status.textContent = "Could not load admin data.";
  }
}

async function wireLogout() {
  const btn = $("logoutBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/index.html";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadMetrics();
  await wireLogout();
});
