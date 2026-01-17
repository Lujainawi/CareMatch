/**
 * @file result.js
 * @description Manages the display of request results based on user filters and login status.
 * This script fetches requests from the backend API, applies user-selected filters,
 * and dynamically renders request cards on the results page.
 */
import { createRequestCard } from "./components/requestCard.js";

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
function rowToCardData(row) {
  const hasRealPhoto = Boolean(row.image_url); // אם העלו תמונה
  const isLogoLike = ["ngo", "hospital", "school", "nursing_home", "orphanage"].includes(row.category);

  return {
    image: pickImageForRow(row),
    imageAlt: "Request image",
    imageFit: hasRealPhoto ? "cover" : (isLogoLike ? "contain" : "cover"),

    region: humanize(row.region),
    nameType: humanize(row.category),
    displayName: `Topic: ${humanize(row.topic)}`,
    field: humanize(row.target_group),
    helpType: row.title || "Request",
    shortDesc: row.short_summary || (row.full_description ? String(row.full_description).slice(0, 160) : ""),
    moreHref: "donate.html",
  };
}


/**
 * @description Renders a list of request cards into the specified list element.
 * @param {HTMLElement} listEl - The container element for the request cards.
 * @param {Array} rows - The list of request rows to render.
 */ 
function renderList(listEl, rows) {
  listEl.innerHTML = "";
  const frag = document.createDocumentFragment();
  rows.forEach((row) => frag.appendChild(createRequestCard(rowToCardData(row))));
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

    btn.addEventListener("click", () => {
      [...wrap.querySelectorAll("button")].forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.value === t.value))
      );
      onChange(t.value);
    });

    wrap.appendChild(btn);
  });
}

/**
 * @description Initializes the results page by ensuring user login,
 * setting up filters, and loading request data.
 */
(async function init() {
  await requireLogin();

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

      const next = new URLSearchParams(window.location.search);
      if (activeTopic) next.set("topic", activeTopic);
      else next.delete("topic");
      history.replaceState({}, "", `${location.pathname}?${next.toString()}`);

      await load();
    },
  });

  /**
   * @description Loads and displays requests based on current filters.
   */
  async function load() {
    buildActiveFilterChips({
      mode,
      region,
      category,
      helpType,
      topic: activeTopic,
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
    $("mySection").hidden = true;
    myList.innerHTML = "";

    if (mode === "requester" || params.get("mine") === "1") {
      const myRows = await fetchRequests({ ...base, mine: "1" });
      if (myRows.length) {
        $("mySection").hidden = false;
        renderList(myList, myRows);
      }
    }
    
    // Main results section
    const allRows = await fetchRequests({ ...base, status: "open" });

    const allEmpty = $("allEmpty");
    const allList = $("allList");
    const countEl = $("resultsCount");

    const hasResults = allRows.length > 0;
    allEmpty.hidden = hasResults;
    allList.hidden = !hasResults;

    if (countEl) countEl.textContent = String(allRows.length);

    if (hasResults) renderList(allList, allRows);
    else allList.innerHTML = "";
  }

  await load();
  // Logout button handler
  $("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "logIn.html";
  });
})();