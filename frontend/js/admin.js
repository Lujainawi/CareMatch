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
let donationsChartInstance = null;
let regionChartInstance = null;

async function loadDonationsByMonthChart() {
  const res = await fetch("/api/admin/charts/donations-by-month", { credentials: "include" });
  if (res.status === 401 || res.status === 403) return (window.location.href = "results.html");
  if (!res.ok) throw new Error("Failed donations chart");

  const data = await res.json();
  const rows = data.rows || [];

  function prettyMonth(ym) {
  // ym: "2026-01"
  const [y, m] = String(ym).split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const labels = rows.map(r => prettyMonth(r.ym));

  const values = rows.map(r => Number(r.total || 0));

  const ctx = document.getElementById("donationsChart");
  if (!ctx) return;

  if (donationsChartInstance) donationsChartInstance.destroy();

  donationsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "₪", data: values }]
    },
    options: { responsive: true }
  });
}

async function loadRequestsByRegionChart() {
  const res = await fetch("/api/admin/charts/requests-by-region", { credentials: "include" });
  if (res.status === 401 || res.status === 403) return (window.location.href = "results.html");
  if (!res.ok) throw new Error("Failed region chart");

  const data = await res.json();
  const rows = data.rows || [];

  const regionName = {
  north: "North",
  center: "Center",
  south: "South",
  jerusalem: "Jerusalem",
  east: "East",
};

  const labels = rows.map(r => regionName[r.region] || r.region);
  const values = rows.map(r => Number(r.cnt || 0));

  const ctx = document.getElementById("regionChart");
  if (!ctx) return;

  if (regionChartInstance) regionChartInstance.destroy();

  regionChartInstance = new Chart(ctx, {
  type: "bar",
  data: {
    labels,
    datasets: [{ label: "Requests", data: values }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 }
      }
    }
  }
});

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
  await loadDonationsByMonthChart();
  await loadRequestsByRegionChart();
  await wireLogout();
  await loadUsers();
});

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => (t.hidden = true), 2200);
}

function confirmModal({ title, text, okText = "OK" }) {
  const dlg = document.getElementById("confirmDialog");
  if (!dlg) return Promise.resolve(false);

  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmText").textContent = text;
  document.getElementById("confirmOk").textContent = okText;

  return new Promise((resolve) => {
    const onClose = () => {
      dlg.removeEventListener("close", onClose);
      resolve(dlg.returnValue === "ok");
    };
    dlg.addEventListener("close", onClose);
    dlg.showModal(); // MDN dialog.showModal()
  });
}


async function loadUsers() {
  const status = document.getElementById("usersStatus");
  const tbody = document.getElementById("usersTbody");
  if (!tbody) return;

  try {
    if (status) status.textContent = "Loading…";

    const res = await fetch("/api/admin/users", { credentials: "include" });
    if (res.status === 401 || res.status === 403) return (window.location.href = "results.html");
    if (!res.ok) throw new Error("Failed to load users");

    const data = await res.json();
    const rows = data.rows || [];

    const subject = encodeURIComponent("CareMatch");

tbody.innerHTML = rows.map(u => {
  const mailHref = u.email ? `mailto:${u.email}?subject=${subject}` : "#";

  return `
    <tr>
      <td>${escapeHtml(u.full_name || "")}</td>
      <td>${escapeHtml(u.email || "")}</td>
      <td>${escapeHtml(u.role || "")}</td>
      <td>${escapeHtml(u.region || "")}</td>
      <td>${Number(u.request_count || 0)}</td>
      <td class="actions">
        <a class="btn btn-ghost" href="${mailHref}" ${u.email ? "" : "aria-disabled='true'"}>Contact</a>
        <button class="btn btn-danger" data-del="${u.id}">Delete</button>
      </td>
    </tr>
  `;
}).join("");


    // bind delete buttons
    tbody.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        await deleteUser(id);
      });
    });

    if (status) status.textContent = "";
  } catch (e) {
    console.error(e);
    if (status) status.textContent = "Could not load users.";
  }
}

async function deleteUser(id) {
  const ok = await confirmModal({
  title: "Delete user?",
  text: "This will delete the user and all their requests.",
  okText: "Delete"
});
  if (!ok) return;

  const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
  if (res.status === 401 || res.status === 403) return (window.location.href = "results.html");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showToast(data.message || "Delete failed.");
    return;
  }
  await loadUsers();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

