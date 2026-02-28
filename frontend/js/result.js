/**
 * @file result.js
 * @description Manages the display of request results based on user filters and login status.
 * This script fetches requests from the backend API, applies user-selected filters,
 * and dynamically renders request cards on the results page.
 */
import { createRequestCard } from "./components/requestCard.js";

function confirmDelete() {
  const dlg = document.getElementById("confirmDialog");
  if (!dlg) return Promise.resolve(window.confirm("Delete this request?"));

  return new Promise((resolve) => {
    // show modal
    dlg.showModal();

    // when dialog closes, read returnValue (from buttons value="")
    const onClose = () => {
      dlg.removeEventListener("close", onClose);
      resolve(dlg.returnValue === "ok");
    };

    dlg.addEventListener("close", onClose, { once: true });
  });
}


/**
 * @description Ensures the user is logged in by checking the session with the backend.
 * @returns  {Promise<Object|null>} User data or redirects to login.
 */
async function requireLogin() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) {
    window.location.href = "logIn.html";
    return null;
  }
  return res.json();
}

/**
 * @description Helper for document.getElementById
 */
function $(id) {
  return document.getElementById(id);
}


/**
 * @description Converts underscores to spaces and capitalizes words for better readability.
 * @param {string} v - The string to humanize.
 * @returns {string} The humanized string.
 */
function humanize(v) {
  return String(v || "").replaceAll("_", " ");
}

/**
 * @description Builds and displays filter chips based on active filters.
 * @param {Object} filters - The active filters.
 */
function buildActiveFilterChips(filters) {
  const wrap = $("activeFilters");
  wrap.innerHTML = "";

  Object.entries(filters).forEach(([k, v]) => {
    if (!v) return;
    const chip = document.createElement("span");
    chip.className = "filter-chip";
    chip.textContent = `${humanize(k)}: ${humanize(v)}`;
    wrap.appendChild(chip);
  });
}

/**
 * @description Fetches requests from the backend API based on query parameters.
 * @param {Object} queryParamsObj - The query parameters as key-value pairs.
 * @returns {Promise<Array>} The list of requests.
 */
async function fetchRequests(queryParamsObj) {
  const qs = new URLSearchParams(queryParamsObj);
  const res = await fetch(`/api/requests?${qs.toString()}`, { credentials: "include" });

  if (res.status === 401) {
    window.location.href = "logIn.html";
    return [];
  }
  if (!res.ok) throw new Error("Failed to load requests");

  const data = await res.json();
  return data.rows || [];
}

/**
 * @description Picks the appropriate image URL for a request row.
 * @param {Object} row - The request row data.
 * @returns {string} The image URL.
 */ 
function pickImageForRow(row) {
  return row.image_url || "../images/placeholder.jpeg";
}


/**
 * @description Converts a request row into card data for rendering.
 * @param {Object} row - The request row data.
 * @returns {Object} The card data.
 */
function rowToCardData(row, opts = {}) {
  const hasRealPhoto = Boolean(row.image_url);
  const isLogoLike = ["ngo", "hospital", "school", "nursing_home", "orphanage"].includes(row.category);

  return {
    id: row.id,
    image: pickImageForRow(row),
    imageAlt: "Request image",
    imageFit: hasRealPhoto ? "cover" : (isLogoLike ? "contain" : "cover"),
    region: humanize(row.region),
    nameType: humanize(row.category),
    displayName: row.topic ? `Topic: ${humanize(row.topic)}` : "",
    field: humanize(row.target_group),
    helpType: row.title || "Request",
    shortDesc: row.short_summary || (row.full_description ? String(row.full_description).slice(0, 160) : ""),
    canDelete: Boolean(opts.canDelete),
  };
}



/**
 * @description Renders a list of request cards into the specified list element.
 * @param {HTMLElement} listEl - The container element for the request cards.
 * @param {Array} rows - The list of request rows to render.
 */ 
function renderList(listEl, rows, opts = {}) {
  listEl.innerHTML = "";
  const frag = document.createDocumentFragment();
  rows.forEach((row) => frag.appendChild(createRequestCard(rowToCardData(row, opts))));
  listEl.appendChild(frag);
}

/**
 * @description Provides a human-readable label for a given topic value.
 * @param {string} v - The topic value.
 * @returns {string} The corresponding topic label.
 */ 
function topicLabel(v) {
  const map = {
    "": "All topics",
    health: "Health",
    education: "Education",
    arts: "Arts",
    technology: "Technology",
    basic_needs: "Basic needs",
    social: "Social",
    other: "Other",
  };
  return map[v ?? ""] ?? "All topics";
}

/**
 * @description Renders topic filter buttons and manages their state.
 */
function renderTopicButtons({ initialTopic, onChange }) {
  const topics = [
    { value: "", label: "All" },
    { value: "health", label: "Health" },
    { value: "education", label: "Education" },
    { value: "arts", label: "Arts" },
    { value: "technology", label: "Technology" },
    { value: "basic_needs", label: "Basic needs" },
    { value: "social", label: "Social" },
    { value: "other", label: "Other" },
  ];

  const wrap = $("topicFilters");
  wrap.innerHTML = "";

  topics.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn";
    btn.textContent = t.label;
    btn.setAttribute("aria-pressed", String(t.value === initialTopic));
    btn.dataset.value = t.value;

    btn.addEventListener("click", async () => {
      [...wrap.querySelectorAll("button")].forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.value === t.value))
      );
    
      const next = new URLSearchParams(window.location.search);
      next.delete("region");
      next.delete("category");
      next.delete("help_type");
      next.delete("donation_type"); 
    
      if (!t.value) next.delete("topic");
      else next.set("topic", t.value);
    
      history.replaceState({}, "", `${location.pathname}?${next.toString()}`);
    
      await onChange(t.value);
    });
    

    wrap.appendChild(btn);
  });
}

/**
 * @description Initializes the results page by ensuring user login,
 * setting up filters, and loading request data.
 */
(async function init() {
  const me = await requireLogin();
  if (!me) return;
  
  const adminLink = $("adminLink");
  if (adminLink && me.role === "admin") adminLink.hidden = false;

  // footer year
  const y = new Date().getFullYear();
  const yearEl = $("yearNow");
  if (yearEl) yearEl.textContent = String(y);

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "donor";

  const region = params.get("region") || "";
  const category = params.get("category") || "";

  const donationType = params.get("donation_type") || "";
  const helpType = params.get("help_type") || donationType || "";

  let activeTopic = params.get("topic") || "";

  $("resultsSub").textContent =
    mode === "requester"
      ? "Here you can see your requests and explore other open requests."
      : "Here are open requests that match your choices. If nothing fits, try another topic.";

      renderTopicButtons({
        initialTopic: activeTopic,
        onChange: async (newTopic) => {
          activeTopic = newTopic; 
          await load();
        },
      });
      
  
  // ===== Details dialog (Modal) wiring =====
  const dialog = document.getElementById("detailsDialog");
  const form = document.getElementById("detailsForm");
  const closeBtn = document.getElementById("detailsClose");
  const statusEl = document.getElementById("detailsStatus");

  // Map of requestId -> row, refreshed on every load()
  let rowsById = new Map();

  function setDialogContent(row) {
    document.getElementById("dTitle").textContent = row.title || "Request";
    document.getElementById("dMeta").textContent =
      `${humanize(row.region)} • ${humanize(row.category)} • ${humanize(row.help_type || "")}`.replace(/\s•\s$/,"");
  
    document.getElementById("dDesc").textContent =
      row.full_description || row.short_summary || "";
  
    const img = document.getElementById("dImg");
    img.src = pickImageForRow(row);
    img.alt = "Request image";
  
    document.getElementById("dRequestId").value = String(row.id);
  
    // optional: prefill from logged in user
    document.getElementById("donorName").value = me?.full_name || "";
    document.getElementById("donorEmail").value = me?.email || "";
    document.getElementById("donorPhone").value = "";
    document.getElementById("donorMsg").value = "";
  
    statusEl.textContent = "";
  }

  function openDetails(requestId) {
    const row = rowsById.get(Number(requestId));
    if (!row || !dialog) return;
    setDialogContent(row);
    dialog.showModal();
  }

  closeBtn?.addEventListener("click", () => dialog?.close());


  /**
   * @description Loads and displays requests based on current filters.
   */
  function readFiltersFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const mode = p.get("mode") || "donor";
    const region = p.get("region") || "";
    const category = p.get("category") || "";
    const donationType = p.get("donation_type") || "";
    const helpType = p.get("help_type") || donationType || "";
    const topic = p.get("topic") || "";
    const mine = p.get("mine") || "";
    return { mode, region, category, helpType, topic, mine };
  }
  
  async function load() {
    const { mode, region, category, helpType, topic, mine } = readFiltersFromUrl();
    activeTopic = topic;
  
    buildActiveFilterChips({
      region,
      category,
      helpType,
    });
  
    const summaryParts = [topicLabel(activeTopic)];
    if (region) summaryParts.push(humanize(region));
    if (category) summaryParts.push(humanize(category));
    if (helpType) summaryParts.push(humanize(helpType));
    const fs = $("filterSummary");
    if (fs) fs.textContent = `Showing: ${summaryParts.join(" • ")}`;
  
    const base = {};
    if (region) base.region = region;
    if (category) base.category = category;
    if (helpType) base.help_type = helpType;
    if (activeTopic) base.topic = activeTopic;
  
    const myList = $("myList");

    rowsById = new Map();

    const myRows = await fetchRequests({ ...base, mine: "1", status: "all" });
    myRows.forEach(r => rowsById.set(r.id, r));  
    
    $("mySection").hidden = true;
    myList.innerHTML = "";
    if (myRows.length) {
      $("mySection").hidden = false;
      renderList(myList, myRows, { canDelete: true, canManage: true });
    }      
  
    const allRows = await fetchRequests({ ...base });
    allRows.forEach(r => rowsById.set(r.id, r));

  
    const allEmpty = $("allEmpty");
    const allList = $("allList");
    const countEl = $("resultsCount");
  
    const hasResults = allRows.length > 0;
    allEmpty.hidden = hasResults;
    allList.hidden = !hasResults;
  
    if (countEl) countEl.textContent = String(allRows.length);
  
    if (hasResults) renderList(allList, allRows, { canDelete: false });
    else allList.innerHTML = "";
  }  

  await load();

  function attachDetailsClick(listEl) {
    if (!listEl) return;
    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest('button[data-action="details"]');
      if (!btn) return;
  
      const card = e.target.closest(".card");
      const id = card?.dataset?.requestId;
      if (id) openDetails(id);
    });
  }
  
  attachDetailsClick($("allList"));
  attachDetailsClick($("myList"));

  function attachDeleteClick(listEl) {
    if (!listEl) return;
    listEl.addEventListener("click", async (e) => {
      const btn = e.target.closest('button[data-action="delete"]');
      if (!btn) return;
  
      const card = e.target.closest(".card");
      const id = card?.dataset?.requestId;
      if (!id) return;
  
      const ok = await confirmDelete();
      if (!ok) return;
  
      const res = await fetch(`/api/requests/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
  
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.message || "Failed to delete.");
        return;
      }
  
      await load();
    });
  }
  attachDeleteClick($("myList"));

  function attachManageClick(listEl) {
    if (!listEl) return;
    listEl.addEventListener("click", async (e) => {
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
  
      await load(); // refresh lists
    });
  }
  attachManageClick($("myList"));
  

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const requestId = document.getElementById("dRequestId").value;
    const name = document.getElementById("donorName").value.trim();
    const email = document.getElementById("donorEmail").value.trim();
    const phone = document.getElementById("donorPhone").value.trim();
    const message = document.getElementById("donorMsg").value.trim();
  
    if (!message) {
      statusEl.textContent = "Please write a message.";
      return;
    }
  
    statusEl.textContent = "Sending...";
  
    const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}/contact`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, message }),
    });
  
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.textContent = data?.message || "Failed to send.";
      return;
    }
  
    statusEl.textContent = "Sent! Waiting for decision...";
    setTimeout(() => dialog?.close(), 600);
    await load();
  });  
  

  // Logout button handler
  $("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/index.html";
  });
})();