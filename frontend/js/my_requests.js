import { createRequestCard } from "./components/requestCard.js";

async function requireLogin() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) {
    window.location.href = "logIn.html";
    return null;
  }
  return res.json();
}

function $(id) { return document.getElementById(id); }

async function fetchRequests(q) {
  const qs = new URLSearchParams(q);
  const res = await fetch(`/api/requests?${qs.toString()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load requests");
  const data = await res.json();
  return data.rows || [];
}

function rowToCardData(row, opts = {}) {
  return {
    id: row.id,
    image: row.image_url || "../images/placeholder.jpeg",
    imageAlt: "Request image",
    imageFit: row.image_url ? "cover" : "contain",
    region: String(row.region || "").replaceAll("_", " "),
    nameType: String(row.category || "").replaceAll("_", " "),
    displayName: row.topic ? `Topic: ${String(row.topic).replaceAll("_", " ")}` : "",
    field: String(row.target_group || "").replaceAll("_", " "),
    helpType: row.title || "Request",
    shortDesc: row.short_summary || (row.full_description ? String(row.full_description).slice(0, 160) : ""),
    status: row.status,             
    canManage: Boolean(opts.canManage), 
    canDelete: Boolean(opts.canDelete),
    isMine: true,
  };
}

function renderMyList(rows) {
  const list = $("myList");
  list.innerHTML = "";
  const frag = document.createDocumentFragment();
  rows.forEach((row) =>
    frag.appendChild(createRequestCard(rowToCardData(row, { canManage: true, canDelete: true })))
  );
  list.appendChild(frag);
}

async function load() {
  const status = $("statusFilter").value;
  const rows = await fetchRequests({ mine: "1", status });
  renderMyList(rows);
}

function attachManageClick() {
  const list = $("myList");
  list.addEventListener("click", async (e) => {
    const accept = e.target.closest('button[data-action="accept"]');
    const reject = e.target.closest('button[data-action="reject"]');
    if (!accept && !reject) return;

    const card = e.target.closest(".card");
    const id = card?.dataset?.requestId;
    if (!id) return;

    const url = accept
      ? `/api/requests/${encodeURIComponent(id)}/accept`
      : `/api/requests/${encodeURIComponent(id)}/reject`;

    const res = await fetch(url, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.message || "Action failed.");
      return;
    }
    await load();
  });
}

function attachLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "logIn.html";
  });
}

(async function init() {
  const me = await requireLogin();
  if (!me) return;

  attachManageClick();
  attachLogout();

  $("statusFilter").addEventListener("change", load);
  await load();
})();