/* frontend/js/result.js */

async function requireLogin() {
    // sends session cookie with request (needed for express-session auth)
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
  
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  function humanize(v) {
    return String(v || "").replaceAll("_", " ");
  }
  
  function buildFilterChips(filters) {
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
  
  function pickImageForRow(row) {
    // If later you add image_url in DB, prefer it:
    if (row.image_url) return row.image_url;
  
    // fallback: you can map category -> internal image file
    // (adjust paths to your real images)
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
  
  function createRequestCardFromRow(row) {
    const li = document.createElement("li");
    li.className = "req-card";
  
    const img = document.createElement("img");
    img.className = "req-card__img";
    img.src = pickImageForRow(row);
    img.alt = "Request image";
  
    const body = document.createElement("div");
    body.className = "req-card__body";
  
    const meta = document.createElement("p");
    meta.className = "req-card__meta";
    meta.textContent = `${humanize(row.region)} • ${humanize(row.category)} • ${humanize(row.help_type)}`;
  
    const title = document.createElement("h3");
    title.className = "req-card__title";
    title.textContent = row.title || "Request";
  
    const tags = document.createElement("p");
    tags.className = "req-card__tags";
    tags.textContent = `Topic: ${humanize(row.topic)} • Target: ${humanize(row.target_group)}`;
  
    const desc = document.createElement("p");
    desc.className = "req-card__desc";
    desc.textContent = row.short_summary || (row.full_description ? String(row.full_description).slice(0, 160) : "");
  
    body.append(meta, title, tags, desc);
  
    if (row.is_money_request || row.help_type === "money") {
      const amount = document.createElement("p");
      amount.className = "req-card__amount";
      amount.textContent = row.amount_needed ? `Amount needed: ${row.amount_needed}` : "Amount needed: —";
      body.appendChild(amount);
    }
  
    li.append(img, body);
    return li;
  }
  
  async function fetchRequests(queryParamsObj) {
    const qs = new URLSearchParams(queryParamsObj);
    const res = await fetch(`/api/requests?${qs.toString()}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load requests");
    const data = await res.json();
    return data.rows || [];
  }
  
  (async function init() {
    // await requireLogin();
  
    const params = new URLSearchParams(window.location.search);
  
    const mode = params.get("mode") || "donor";
  
    // filters coming from chat.js
    const region = params.get("region") || "";
    const topic = params.get("topic") || "";
    const category = params.get("category") || "";
  
    // donor uses donation_type in your current chat.js, backend expects help_type
    const donationType = params.get("donation_type") || "";
    const helpType = params.get("help_type") || donationType || "";
  
    const mine = params.get("mine") || "";
  
    const filtersForApi = {
      region,
      topic,
      category,
      help_type: helpType,
      status: "open",
    };
  
    // clean empty keys so URLSearchParams won’t include them
    Object.keys(filtersForApi).forEach((k) => {
      if (!filtersForApi[k]) delete filtersForApi[k];
    });
  
    buildFilterChips({ mode, region, topic, category, helpType });
  
    $("resultsSub").textContent =
      mode === "requester"
        ? "Here are your requests and all matching open requests."
        : "Here are open requests that match your choices.";
  
    // Requester: show "My requests" section (mine=1)
    if (mode === "requester" || mine === "1") {
      $("mySection").hidden = false;
  
      const myRows = await fetchRequests({ ...filtersForApi, mine: "1" });
      if (!myRows.length) $("myEmpty").hidden = false;
  
      const myList = $("myList");
      myRows.forEach((row) => myList.appendChild(createRequestCardFromRow(row)));
    }
  
    // Always show all (filtered)
    const allRows = await fetchRequests(filtersForApi);
    if (!allRows.length) $("allEmpty").hidden = false;
  
    const allList = $("allList");
    allRows.forEach((row) => allList.appendChild(createRequestCardFromRow(row)));
  
    // Logout button
    $("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "logIn.html";
    });
  })();  