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
  return row.image_url || "../images/placeholder.jpeg";
}


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

function renderList(listEl, rows) {
  listEl.innerHTML = "";
  const frag = document.createDocumentFragment();
  rows.forEach((row) => frag.appendChild(createRequestCard(rowToCardData(row))));
  listEl.appendChild(frag);
}

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

  $("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "logIn.html";
  });
})();