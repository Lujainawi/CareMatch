/* frontend/js/result.js */
import { createRequestCard } from "./components/requestCard.js";

async function requireLogin() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) {
    window.location.href = "logIn.html";
    return null;
  }
  return res.json();
}

function $(id) {
  return document.getElementById(id);
}

function humanize(v) {
  return String(v || "").replaceAll("_", " ");
}

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

function pickImageForRow(row) {
  // Prefer DB image_url when exists (uploads/ai or uploads/user etc.)
  if (row.image_url) return row.image_url;

  // fallback images (adjust to your real files if needed)
  const map = {
    hospital: "../images/hospital.jpg",
    school: "../images/school.jpg",
    ngo: "../images/ngo.jpg",
    nursing_home: "../images/nursing_home.jpg",
    orphanage: "../images/orphanage.jpg",
    private: "../images/private.jpg",
    other: "../images/placeholder.jpg",
  };
  return map[row.category] || "../images/placeholder.jpg";
}

function rowToCardData(row) {
  // Map DB row -> your shared card component shape
  return {
    image: pickImageForRow(row),
    imageAlt: "Request image",
    region: humanize(row.region),
    nameType: humanize(row.category),            // shown in meta
    displayName: `Topic: ${humanize(row.topic)}`,// shown in tags line
    field: humanize(row.target_group),
    helpType: row.title || "Request",
    shortDesc:
      row.short_summary ||
      (row.full_description ? String(row.full_description).slice(0, 160) : ""),
    moreHref: "donate.html", // optional: change later to a real details page
  };
}

function renderList(listEl, rows) {
  listEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  rows.forEach((row) => {
    frag.appendChild(createRequestCard(rowToCardData(row)));
  });

  listEl.appendChild(frag);
}

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
      // Update pressed state for all buttons
      [...wrap.querySelectorAll("button")].forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.value === t.value))
      );

      onChange(t.value);
    });

    wrap.appendChild(btn);
  });
}

(async function init() {
  await requireLogin();

  const params = new URLSearchParams(window.location.search);

  const mode = params.get("mode") || "donor";

  // filters coming from chat.js
  const region = params.get("region") || "";
  const category = params.get("category") || "";

  // donor uses donation_type in your current chat.js, backend expects help_type
  const donationType = params.get("donation_type") || "";
  const helpType = params.get("help_type") || donationType || "";

  // topic is now user-clickable, but also can come from URL as initial
  let activeTopic = params.get("topic") || "";

  $("resultsSub").textContent =
    mode === "requester"
      ? "Here are your requests and all matching requests."
      : "Here are open requests that match your choices.";

  renderTopicButtons({
    initialTopic: activeTopic,
    onChange: async (newTopic) => {
      activeTopic = newTopic;

      // keep URL in sync (no reload)
      const next = new URLSearchParams(window.location.search);
      if (activeTopic) next.set("topic", activeTopic);
      else next.delete("topic");
      history.replaceState({}, "", `${location.pathname}?${next.toString()}`);

      await load();
    },
  });

  async function load() {
    // Chips row (what is currently applied)
    buildActiveFilterChips({
      mode,
      region,
      category,
      helpType,
      topic: activeTopic,
    });

    const base = {};
    if (region) base.region = region;
    if (category) base.category = category;
    if (helpType) base.help_type = helpType;
    if (activeTopic) base.topic = activeTopic;

    // --- My requests: show only if there ARE any ---
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

    // --- All open requests (always open) ---
    const allRows = await fetchRequests({ ...base, status: "open" });

    $("allEmpty").hidden = allRows.length > 0;
    renderList($("allList"), allRows);
  }

  await load();

  // Logout button
  $("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "logIn.html";
  });
})();