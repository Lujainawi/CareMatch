/* frontend/js/chat.js */

/** ---- Auth guard (chat must be after login) ---- */
async function requireLogin() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        window.location.href = "logIn.html"; // chat.html בתוך /pages
        return null;
      }
      return await res.json();
    } catch (e) {
      window.location.href = "logIn.html";
      return null;
    }
  }
  
  /** ---- UI helpers ---- */
  const chatLog = document.getElementById("chatLog");
  const choicesEl = document.getElementById("choices");
  const textForm = document.getElementById("textForm");
  const textInput = document.getElementById("textInput");
  const sendBtn = textForm.querySelector('button[type="submit"]');

  const imageInput = document.getElementById("imageInput");
  
  const progressText = document.getElementById("progressText");
  const hintText = document.getElementById("hintText");
  
  const backBtn = document.getElementById("backBtn");
  const restartBtn = document.getElementById("restartBtn");
  const endBtn = document.getElementById("endBtn");
  
  const modeChat = document.getElementById("modeChat");
  const modeQuick = document.getElementById("modeQuick");

  const scrollDownBtn = document.getElementById("scrollDownBtn");

  const endDialog = document.getElementById("endDialog");
  const endCancelBtn = document.getElementById("endCancelBtn");
  const endConfirmBtn = document.getElementById("endConfirmBtn");


  const ORG_DEFAULT_IMAGES = [
    { key: "org_01", src: "../images/aharai.jpeg", alt: "Default image 1" },
    { key: "org_02", src: "../images/appleseeds.jpeg", alt: "Default image 2" },
    { key: "org_03", src: "../images/atidna.jpeg", alt: "Default image 3" },
    { key: "org_04", src: "../images/Beit_Lssie_Shapiro.jpeg", alt: "Default image 4" },
    { key: "org_05", src: "../images/druze_children.jpeg", alt: "Default image 5" },
    { key: "org_06", src: "../images/latet.jpeg", alt: "Default image 6" },
    { key: "org_07", src: "../images/melabev.jpeg", alt: "Default image 7" },
    { key: "org_08", src: "../images/nezareth_hospital.jpeg", alt: "Default image 8" },
    { key: "org_09", src: "../images/Pichon_Lev.jpeg", alt: "Default image 9" },
    { key: "org_10", src: "../images/rambam.jpeg", alt: "Default image 10" },
    { key: "org_11", src: "../images/sheba.jpeg", alt: "Default image 11" },
    { key: "org_12", src: "../images/sos_children.jpeg", alt: "Default image 12" },
    { key: "org_13", src: "../images/the_carmel_elders.jpeg", alt: "Default image 13" },
    { key: "org_14", src: "../images/yad_sarah.jpeg", alt: "Default image 14" },
  ];
  
  // AI
// במקום AI_PRESETS_BY_TOPIC:
const AI_IMAGES_BY_TOPIC = {
  health: [
    { key: "ai_health_1", label: "Health 1", src: "../images/ai/health_1.png", alt: "Health preset 1" },
    { key: "ai_health_2", label: "Health 2", src: "../images/ai/health_2.png", alt: "Health preset 2" },
    { key: "ai_health_3", label: "Health 3", src: "../images/ai/health_3.png", alt: "Health preset 3" },
  ],
  education: [
    { key: "ai_edu_1", label: "Education 1", src: "../images/ai/edu_1.png", alt: "Education preset 1" },
    { key: "ai_edu_2", label: "Education 2", src: "../images/ai/edu_2.png", alt: "Education preset 2" },
  ],
  arts: [
    { key: "ai_arts_1", label: "Arts 1", src: "../images/ai/arts_1.png", alt: "Arts preset 1" },
    { key: "ai_arts_2", label: "Arts 2", src: "../images/ai/arts_2.png", alt: "Arts preset 2" },
  ],
  technology: [
    { key: "ai_tech_1", label: "Tech 1", src: "../images/ai/tech_1.png", alt: "Tech preset 1" },
    { key: "ai_tech_2", label: "Tech 2", src: "../images/ai/tech_2.png", alt: "Tech preset 2" },
  ],
  basic_needs: [
    { key: "ai_needs_1", label: "Basic needs 1", src: "../images/ai/needs_1.png", alt: "Needs preset 1" },
    { key: "ai_needs_2", label: "Basic needs 2", src: "../images/ai/needs_2.png", alt: "Needs preset 2" },
  ],
  social: [
    { key: "ai_social_1", label: "Social 1", src: "../images/ai/social_1.png", alt: "Social preset 1" },
    { key: "ai_social_2", label: "Social 2", src: "../images/ai/social_2.png", alt: "Social preset 2" },
  ],
  other: [
    { key: "ai_other_1", label: "General 1", src: "../images/ai/other_1.png", alt: "Other preset 1" },
    { key: "ai_other_2", label: "General 2", src: "../images/ai/other_2.png", alt: "Other preset 2" },
  ],
}; 
  
  function updateBackButton() {
    if (!backBtn) return;
    backBtn.disabled = history.length <= 1;
  }  

  function setImageGrid(images, onPick) {
    choicesEl.innerHTML = "";
    choicesEl.classList.add("is-image-grid");
    setComposerEnabled(false, "Choose an option below…");
  
    const grid = document.createElement("div");
    grid.className = "img-grid";
  
    images.forEach((imgObj) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "img-choice";
  
      btn.innerHTML = `
          <img src="${imgObj.src}" alt="${imgObj.alt}">
          <span>${imgObj.label || imgObj.key}</span>
      `;
  
      btn.addEventListener("click", () => {
        [...choicesEl.querySelectorAll("button")].forEach((x) => (x.disabled = true));
        btn.classList.add("is-selected");
        onPick(imgObj);
      });
  
      grid.appendChild(btn);
    });
  
    choicesEl.appendChild(grid);
  
    // add skip button underneath
    const skipRow = document.createElement("div");
    skipRow.className = "img-actions";
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.className = "choice-btn";
    skipBtn.textContent = "Skip";
    skipBtn.addEventListener("click", () => {
      addMsg("Skip", "user");
    
      state.imageSource = null;
      state.imageKey = null;
      state.imageUrl = null;
    
      choicesEl.classList.remove("is-image-grid");
      submitRequest();
    });    
    skipRow.appendChild(skipBtn);
    choicesEl.appendChild(skipRow);
  }

const chatView = document.getElementById("chatView");
const quickView = document.getElementById("quickView");
const quickForm = document.getElementById("quickForm");

const qIntent = document.getElementById("qIntent");
const qDonationType = document.getElementById("qDonationType");
const qRegion = document.getElementById("qRegion");
const qCategory = document.getElementById("qCategory");
const qTopic = document.getElementById("qTopic");

const qDonorFields = document.getElementById("qDonorFields");
const qRequesterFields = document.getElementById("qRequesterFields");
const qHelpType = document.getElementById("qHelpType");
const qReqCategory = document.getElementById("qReqCategory");
const qTargetGroup = document.getElementById("qTargetGroup");
const qReqRegion = document.getElementById("qReqRegion");
const qReqTopic = document.getElementById("qReqTopic");
const qTitle = document.getElementById("qTitle");
const qDescription = document.getElementById("qDescription");
const qAmountRow = document.getElementById("qAmountRow");
const qAmountNeeded = document.getElementById("qAmountNeeded");
const qError = document.getElementById("qError");
const qSubmitBtn = document.getElementById("qSubmitBtn");

function setQuickError(msg) {
  if (!qError) return;
  qError.textContent = msg || "";
}

function syncQuickFormUI() {
  const intent = qIntent.value;

  // toggle sections
  if (qDonorFields) qDonorFields.hidden = intent !== "donor";
  if (qRequesterFields) qRequesterFields.hidden = intent !== "requester";

  // donor submit text
  if (qSubmitBtn) {
    if (intent === "donor") {
      qSubmitBtn.textContent = (qDonationType.value === "money") ? "Go to Donate" : "Show results";
    } else {
      qSubmitBtn.textContent = "Submit request";
    }
  }

  // requester: amount only for money
  if (intent === "requester") {
    const showAmount = qHelpType.value === "money";
    if (qAmountRow) qAmountRow.hidden = !showAmount;
    if (!showAmount && qAmountNeeded) qAmountNeeded.value = "";
  }

  setQuickError("");
}

qIntent?.addEventListener("change", syncQuickFormUI);
qDonationType?.addEventListener("change", syncQuickFormUI);
qHelpType?.addEventListener("change", syncQuickFormUI);
syncQuickFormUI();


function setMode(mode) {
  const isQuick = mode === "quick";

  // views
  chatView.hidden = isQuick;
  quickView.hidden = !isQuick;

  // buttons UI
  modeQuick.classList.toggle("is-active", isQuick);
  modeChat.classList.toggle("is-active", !isQuick);
  modeQuick.setAttribute("aria-pressed", String(isQuick));
  modeChat.setAttribute("aria-pressed", String(!isQuick));
}

function isNearBottom(el, threshold = 40) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

function updateScrollDownButton() {
  if (!scrollDownBtn) return;
  scrollDownBtn.hidden = isNearBottom(chatLog);
}

chatLog.addEventListener("scroll", updateScrollDownButton);

scrollDownBtn.addEventListener("click", () => {
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
  updateScrollDownButton();
});



  function setComposerEnabled(enabled, placeholder = "") {
    textForm.hidden = false;
  
    textForm.classList.toggle("is-disabled", !enabled);
    textInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
  
    textInput.placeholder = placeholder || (enabled ? "Type your answer..." : "Choose an option below…");
  
    if (enabled) textInput.focus();
  }
  
  let suppressMsgs = false;
  function addMsg(text, who = "bot") {
    if (suppressMsgs) return;
  
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    div.textContent = text;
    chatLog.appendChild(div);
  
    const shouldStick = isNearBottom(chatLog);
    if (shouldStick) {
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  
    updateScrollDownButton();
  }  
  
  function setChoices(buttons = []) {
    choicesEl.innerHTML = "";
    setComposerEnabled(false, "Choose an option below…");
  
    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.textContent = b.label;
  
      btn.addEventListener("click", () => {
        // prevent double click
        [...choicesEl.querySelectorAll("button")].forEach((x) => (x.disabled = true));
        btn.classList.add("is-selected");
        b.onClick();
      });
  
      choicesEl.appendChild(btn);
    });

    updateScrollDownButton();
  }
  
  /** ---- Text question helper ---- */
  let pendingTextHandler = null;
  
  function askText(prompt, placeholder, handler) {
    if (typeof placeholder === "function") {
      handler = placeholder;
      placeholder = "";
    }

    addMsg(prompt, "bot");
  
    // clear choices and enable typing
    choicesEl.innerHTML = "";
    pendingTextHandler = handler;
  
    textForm.hidden = false;
    textInput.value = "";
    setComposerEnabled(true, placeholder || "Type your answer…");

    pushHistory(state);
  }  
  
  textForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pendingTextHandler) return;
  
    const val = String(textInput.value || "").trim();
    if (!val) {
      textInput.focus();
      return;
    }
  
    const handler = pendingTextHandler;
    pendingTextHandler = null;
    setComposerEnabled(false, "Choose an option below…");
    textInput.value = "";
  
    addMsg(val, "user");
    handler(val);
  });
  
  function goToResults(paramsObj) {
    const params = new URLSearchParams(paramsObj);
    window.location.href = `result.html?${params.toString()}`;
  }
  
  /** ---- Simple state + history ---- */
  let history = [];
  let state = {
    mode: null, // null / donor / requester
  
    // donor fields
    donationType: null, // money / volunteer
    region: null,
    category: null,
    topic: null,
  
    // requester fields
    helpType: null, // money / volunteer / service
    requestFor: null, // "org" / "individual"  (NEW)
    targetGroup: null,
    title: null,
    fullDescription: null,
    amountNeeded: null,
  
    // image
    imageSource: null, // internal / upload_pending / ai
    imageKey: null,
    imageUrl: null
  };
  
  
  function pushHistory(snapshot) {
    const snap = JSON.parse(JSON.stringify(snapshot));
    snap.__chatHtml = chatLog.innerHTML;  
    history.push(snap);
    updateBackButton();
  }
  
  function popHistory() {
    if (history.length <= 1) return null;
    history.pop();
    updateBackButton();
    return JSON.parse(JSON.stringify(history[history.length - 1]));
  }
  
  
  function resetAll() {
    history = [];
    state = {
      mode: null,
    
      donationType: null,
      region: null,
      category: null,
      topic: null,
    
      helpType: null,
      requestFor: null,
      targetGroup: null,
      title: null,
      fullDescription: null,
      amountNeeded: null,
    
      imageSource: null,
      imageKey: null,
      imageUrl: null
    };    
    choicesEl.innerHTML = "";
    textForm.hidden = true;
    chatLog.innerHTML = "";
    updateBackButton();
  }

  function showDonorCategoryQuestion(type) {
    progressText.textContent = "Step 4";
    hintText.textContent = "";
  
    addMsg("Which type of organization do you prefer?");
    setChoices([
      { label: "NGO", onClick: () => pickCategory("ngo", type) },
      { label: "Hospital", onClick: () => pickCategory("hospital", type) },
      { label: "School", onClick: () => pickCategory("school", type) },
      { label: "Nursing home", onClick: () => pickCategory("nursing_home", type) },
      { label: "Orphanage", onClick: () => pickCategory("orphanage", type) },
      { label: "Any", onClick: () => pickCategory("any", type) },
    ]);

    pushHistory(state);
  }
  
  function showDonorTopicQuestion(type) {
    progressText.textContent = "Step 5";
    hintText.textContent = "";
  
    addMsg("Which topic matters most to you?");
    setChoices([
      { label: "Health", onClick: () => pickTopic("health", type) },
      { label: "Education", onClick: () => pickTopic("education", type) },
      { label: "Arts", onClick: () => pickTopic("arts", type) },
      { label: "Technology", onClick: () => pickTopic("technology", type) },
      { label: "Basic needs", onClick: () => pickTopic("basic_needs", type) },
      { label: "Social", onClick: () => pickTopic("social", type) },
      { label: "Other", onClick: () => pickTopic("other", type) },
    ]);

    pushHistory(state);
  }
  
  function renderFromState() {
    pendingTextHandler = null;
    choicesEl.classList.remove("is-image-grid");
    choicesEl.innerHTML = "";
    setComposerEnabled(false, "Choose an option below…");
  
    if (!state.mode) {
      progressText.textContent = "Step 1";
      hintText.textContent = "";
      addMsg("What would you like to do today?");
      setChoices([
        {
          label: "Donate",
          onClick: () => {
            addMsg("Donate", "user");
            state.mode = "donor";
            donorContribute();
          },
        },
        {
          label: "Request support",
          onClick: () => {
            addMsg("Request support", "user");
            state.mode = "requester";
            requesterIntro();
          },
        },
      ]);
      return;
    }
  
    // 2) Donor flow
    if (state.mode === "donor") {
      if (!state.donationType) {
        donorContribute();
        return;
      }
  
      // money: יראה שוב את מסך "Go to Donate"
      if (state.donationType === "money") {
        progressText.textContent = "Step 2";
        hintText.textContent = "";
        addMsg("You can donate securely on our Donate page.");
        setChoices([{ label: "Go to Donate Money page", onClick: () => (window.location.href = "donate.html") }]);
        return;
      }
  
      // volunteer:
      if (!state.region) {
        donorFiltersThenResults("volunteer"); // שאלה על Region
        return;
      }
      if (!state.category) {
        showDonorCategoryQuestion("volunteer"); // שאלה על Category
        return;
      }
      if (!state.topic) {
        showDonorTopicQuestion("volunteer"); // שאלה על Topic
        return;
      }
  
      goToResults({
        mode: "donor",
        donation_type: "volunteer",
        region: state.region || "",
        topic: state.topic || "",
        category: state.category && state.category !== "any" ? state.category : "",
      });
      return;
    }
  
    // 3) Requester flow
    if (state.mode === "requester") {
      if (!state.helpType) { requesterPickHelpType(); return; }
      if (!state.requestFor) { requesterWhoFor(); return; }
  
      if (state.requestFor === "org" && !state.category) { requesterOrgType(); return; }
  
      if (!state.targetGroup) { requesterTargetGroup(); return; }
      if (!state.topic) { requesterTopic(); return; }
      if (!state.region) { requesterRegion(); return; }
      if (!state.title) { requesterTitle(); return; }
      if (!state.fullDescription) { requesterDescription(); return; }
  
      if (state.helpType === "money" && !state.amountNeeded) { requesterAmountNeeded(); return; }
  
      requesterImageOptional();
    }
  }  
  
  /** ---- Flow ---- */
  function startFlow(userName = "there") {
    resetAll();
  
    progressText.textContent = "Step 1";
    hintText.textContent = "";
  
    addMsg(`Hi, ${userName}! 👋`);
    addMsg("Welcome to CareMatch. I’ll ask a few questions to filter the best matches for you.");
    addMsg("NOTE: please don’t share sensitive personal details here.");
    addMsg("What would you like to do today?");

    setChoices([
      {
        label: "Donate",
        onClick: () => {
          addMsg("Donate", "user");
          state.mode = "donor";
          donorContribute();
        },
      },
      {
        label: "Request support",
        onClick: () => {
          addMsg("Request support", "user");
          state.mode = "requester";
          requesterIntro();
        },
      },
    ]);
    pushHistory(state);
  }
  
  /** ---------------- DONOR ---------------- */
  function donorContribute() {
    progressText.textContent = "Step 2";
    hintText.textContent = "";
  
    addMsg("How would you like to help?");
    setChoices([
      {
        label: "Donate Money",
        onClick: () => {
          addMsg("Donate Money", "user");
          state.donationType = "money";
  
          addMsg("You can donate securely on our Donate page.");
          setChoices([
            {
              label: "Go to Donate Money page",
              onClick: () => (window.location.href = "donate.html"),
            },
          ]);
        },
      },
      {
        label: "Volunteer in person",
        onClick: () => {
          addMsg("Volunteer in person", "user");
          state.donationType = "volunteer";
          donorFiltersThenResults("volunteer");
        },
      },
    ]);

    pushHistory(state);
  }
  
  function donorFiltersThenResults(type) {
    progressText.textContent = "Step 3";
    hintText.textContent = "";
  
    addMsg("Where would you like to help?");
    setChoices([
      { label: "North", onClick: () => pickRegion("north", type) },
      { label: "Center", onClick: () => pickRegion("center", type) },
      { label: "South", onClick: () => pickRegion("south", type) },
      { label: "Jerusalem", onClick: () => pickRegion("jerusalem", type) },
      { label: "East", onClick: () => pickRegion("east", type) },
    ]);

    pushHistory(state);
  }
  
  function pickRegion(region, type) {
    addMsg(region, "user");
    state.region = region;
  
    progressText.textContent = "Step 4";
    hintText.textContent = "";
  
    addMsg("Which type of organization do you prefer?");
    setChoices([
      { label: "NGO", onClick: () => pickCategory("ngo", type) },
      { label: "Hospital", onClick: () => pickCategory("hospital", type) },
      { label: "School", onClick: () => pickCategory("school", type) },
      { label: "Nursing home", onClick: () => pickCategory("nursing_home", type) },
      { label: "Orphanage", onClick: () => pickCategory("orphanage", type) },
      { label: "Any", onClick: () => pickCategory("any", type) },
    ]);

    pushHistory(state);
  }
  
  function pickCategory(category, type) {
    addMsg(category, "user");
    state.category = category;
    showDonorTopicQuestion(type); 
  }
  
  
  function pickTopic(topic, type) {
    addMsg(topic, "user");
    state.topic = topic;
  
    progressText.textContent = "Done";
    hintText.textContent = "";
  
    addMsg("Great — here are the best matches for you.");
  
    const params = {
      mode: "donor",
      donation_type: type,
      region: state.region || "",
      topic: state.topic || "",
    };
    if (state.category && state.category !== "any") params.category = state.category;
  
    goToResults(params);
  }
  
  
  /** ---------------- REQUESTER (I need help) ---------------- */
  function requesterIntro() {
    progressText.textContent = "Step 2";
    hintText.textContent = "";
  
    addMsg("Thanks — I’ll ask a few quick questions, publish your request, and then show matching results.");
    requesterPickHelpType();
  }
  
  function requesterPickHelpType() {
    addMsg("What kind of help do you need?");
    setChoices([
      {
        label: "Financial support",
        onClick: () => {
          addMsg("Financial support", "user");
          state.helpType = "money";
          requesterWhoFor();
        },
      },
      {
        label: "Volunteer",
        onClick: () => {
          addMsg("Volunteer", "user");
          state.helpType = "volunteer";
          requesterWhoFor();
        },
      },
      {
        label: "Service or workshop",
        onClick: () => {
          addMsg("Service or workshop", "user");
          state.helpType = "service";
          requesterWhoFor();
        },
      },
      {
        label: "Not sure",
        onClick: () => {
          addMsg("Not sure", "user");
          addMsg("If you need money for expenses, choose Financial support. If you need people to help on-site, choose Volunteer. If you need an activity or session, choose Service / Workshop.");
          requesterPickHelpType();
        },
      },
    ]);
    pushHistory(state);
  }
  
  function requesterWhoFor() {
    progressText.textContent = "Step 3";
  
    addMsg("Who is this request for?");
    setChoices([
      {
        label: "An organization",
        onClick: () => {
          addMsg("An organization", "user");
          state.requestFor = "org";      // NEW
          requesterOrgType();
        },
      },
      {
        label: "An individual",
        onClick: () => {
          addMsg("An individual", "user");
          state.requestFor = "individual"; // NEW
          state.category = "private";
          requesterTargetGroup();
        },
      },      
    ]);

    pushHistory(state);
  }
  
  function requesterOrgType() {
    progressText.textContent = "Step 4";
  
    addMsg("What type of organization?");
    setChoices([
      { label: "NGO", onClick: () => setRequesterCategory("ngo") },
      { label: "School", onClick: () => setRequesterCategory("school") },
      { label: "Hospital", onClick: () => setRequesterCategory("hospital") },
      { label: "Nursing home", onClick: () => setRequesterCategory("nursing_home") },
      { label: "Orphanage", onClick: () => setRequesterCategory("orphanage") },
      { label: "Other", onClick: () => setRequesterCategory("other") },
    ]);

    pushHistory(state);
  }
  
  function setRequesterCategory(cat) {
    addMsg(cat, "user");
    state.category = cat;
    requesterTargetGroup();
  }
  
  function requesterTargetGroup() {
    progressText.textContent = "Step 5";
  
    addMsg("Which group is this for?");
    setChoices([
      { label: "Elderly", onClick: () => setTargetGroup("elderly") },
      { label: "Children", onClick: () => setTargetGroup("children") },
      { label: "Youth", onClick: () => setTargetGroup("youth") },
      { label: "Families", onClick: () => setTargetGroup("families") },
      { label: "Patients", onClick: () => setTargetGroup("patients") },
      { label: "Refugees", onClick: () => setTargetGroup("refugees") },
      { label: "General", onClick: () => setTargetGroup("general") },
    ]);

    pushHistory(state);
  }
  
  function setTargetGroup(g) {
    addMsg(g, "user");
    state.targetGroup = g;
    requesterTopic();
  }
  
  function requesterTopic() {
    progressText.textContent = "Step 6";
  
    addMsg("Which topic best fits the request?");
    setChoices([
      { label: "Health", onClick: () => setTopic("health") },
      { label: "Education", onClick: () => setTopic("education") },
      { label: "Arts", onClick: () => setTopic("arts") },
      { label: "Technology", onClick: () => setTopic("technology") },
      { label: "Basic needs", onClick: () => setTopic("basic_needs") },
      { label: "Social", onClick: () => setTopic("social") },
      { label: "Other", onClick: () => setTopic("other") },
    ]);

    pushHistory(state);
  }
  
  function setTopic(t) {
    addMsg(t, "user");
    state.topic = t;
    requesterRegion();
  }
  
  function requesterRegion() {
    progressText.textContent = "Step 7";
  
    addMsg("Which region is this for?");
    setChoices([
      { label: "North", onClick: () => setRegion("north") },
      { label: "Center", onClick: () => setRegion("center") },
      { label: "South", onClick: () => setRegion("south") },
      { label: "Jerusalem", onClick: () => setRegion("jerusalem") },
      { label: "East", onClick: () => setRegion("east") },
    ]);

    pushHistory(state);
  }
  
  function setRegion(r) {
    addMsg(r, "user");
    state.region = r;
    requesterTitle();
  }
  
  function requesterTitle() {
    progressText.textContent = "Step 8";
  
    askText(
      "Write a short title for your request (e.g., “Art workshop for kids”).",
      "Short title…",
      (val) => {
        state.title = val.slice(0, 255);
        requesterDescription();
      }
    );
  }
  
  function requesterDescription() {
    progressText.textContent = "Step 9";
  
    askText(
      "Please describe what you need. Include: what, for whom, when, and any important details.",
      "Describe your request…",
      (val) => {
        state.fullDescription = val;
  
        if (state.helpType === "money") {
          requesterAmountNeeded();
        } else {
          requesterImageOptional();
        }
      }
    );
  }
  
  function requesterAmountNeeded() {
    progressText.textContent = "Step 10";
  
    askText(
      "What amount is needed? (numbers only, in NIS)",
      "e.g., 500",
      (val) => {
        const num = Number(String(val).replace(/[^\d.]/g, ""));
        if (!Number.isFinite(num) || num <= 0) {
          addMsg("Please enter a positive number (e.g., 500).");
          requesterAmountNeeded();
          return;
        }
        state.amountNeeded = num;
        requesterImageOptional();
      }
    );
  }
  
  
  /** Optional image step (scaffold)
   *  Cloudinary / AI will be connected later.
   *  DB fields recommended: image_url / image_source / image_key:contentReference[oaicite:3]{index=3}
   */
  function requesterImageOptional() {
    progressText.textContent = "Step 11";
  
    const isOrg = state.requestFor === "org";
  
    // -------- ORG: choose from default images --------
    if (isOrg) {
      addMsg("Last step: choose one of our default images (14 options).", "bot");
  
      setImageGrid(ORG_DEFAULT_IMAGES, (imgObj) => {
        addMsg(`Selected ${imgObj.key}`, "user");
        state.imageSource = "internal";    
        state.imageKey = imgObj.key;
        state.imageUrl = imgObj.src;
  
        choicesEl.classList.remove("is-image-grid");
        submitRequest();
      });
  
      pushHistory(state);
      return;
    }
  
    // -------- INDIVIDUAL: choose upload / AI / skip --------
    addMsg("Would you like to add an image? (Optional)", "bot");
  
    setChoices([
      {
        label: "Upload an image",
        onClick: () => {
          addMsg("Upload an image", "user");
          if (imageInput) {
            imageInput.value = ""; // allow re-select same file
            imageInput.click();
          }
        },
      },
      {
        label: "Generate with AI ",
        onClick: async () => {
          addMsg("Generate with AI (real)", "user");
          addMsg("Generating image…", "bot");
          try {
            const topic = state.topic || "other";
            const out = await generateAiImage(topic);
      
            state.imageSource = out.image_source; // "ai"
            state.imageKey = out.image_key;
            state.imageUrl = out.image_url;
      
            addMsg("Image generated ✅", "bot");
            submitRequest();
          } catch (e) {
            addMsg(String(e.message || "AI error. Try again."), "bot");
            requesterImageOptional();
          }
        },
      },
      {
        label: "Skip",
        onClick: () => {
          addMsg("Skip", "user");
          state.imageSource = null;
          state.imageKey = null;
          state.imageUrl = null;
  
          submitRequest();
        },
      },
    ]);
  
    pushHistory(state);
  }
   
  
  if (imageInput) {
    imageInput.addEventListener("change", async () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        addMsg("No file selected. You can skip or try again.", "bot");
        requesterImageOptional();
        return;
      }
  
      // revoke old blob preview
      if (state.imageUrl && String(state.imageUrl).startsWith("blob:")) {
        URL.revokeObjectURL(state.imageUrl);
      }
  
      state.imageSource = null;        
      state.imageKey = null;
  
      const previewUrl = URL.createObjectURL(file);
      state.imageUrl = previewUrl;
  
      addMsg("Image selected (preview only). To save an image with your request, please choose a default/AI image, or skip.", "bot");
  
      requesterImageOptional();
  
      pushHistory(state);
    });
  }

  async function generateAiImage(topic) {
    const res = await fetch("/api/images/generate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "AI failed");
    return data; // { image_url, image_source:"ai", image_key }
  }  
  
  
  async function submitRequest() {
    progressText.textContent = "Done";
    hintText.textContent = "";
  
    addMsg("Publishing your request…", "bot");
  
    const mappedImageSource =
      state.imageSource === "ai_preset" ? "ai" :
      state.imageSource === "upload_pending" ? null :
      state.imageSource || null;
  
    const isBlobUrl = state.imageUrl && String(state.imageUrl).startsWith("blob:");
  
    const image_url =
      mappedImageSource && !isBlobUrl ? (state.imageUrl || null) : null;
  
    const payload = {
      help_type: state.helpType,
      category: state.category,
      target_group: state.targetGroup,
      topic: state.topic,
      region: state.region,
      title: state.title,
      full_description: state.fullDescription,
      amount_needed: state.helpType === "money" ? state.amountNeeded : null,
  
      // ✅ image fields (optional)
      image_url,
      image_source: mappedImageSource,
      image_key: mappedImageSource ? (state.imageKey || null) : null,
    };
  
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addMsg(err.message || "Could not publish the request. Please try again.", "bot");
        return;
      }
  
      addMsg("Your request is published. Redirecting to results…", "bot");
      goToResults({ mode: "requester", mine: "1" });
    } catch (e) {
      addMsg("Network error. Please try again.", "bot");
    }
  }  
  
  /** ---- Buttons ---- */
  backBtn.addEventListener("click", () => {
    const prev = popHistory();
    if (!prev) return;
  
    // restore state
    const { __chatHtml, ...rest } = prev;
    state = rest;
  
    // restore UI without adding new messages
    if (typeof __chatHtml === "string") chatLog.innerHTML = __chatHtml;
  
    suppressMsgs = true;
    try {
      renderFromState();
    } finally {
      suppressMsgs = false;
    }

    updateScrollDownButton();
    
  });
   
  
  restartBtn.addEventListener("click", () => {
    addMsg("Restart chat", "user");
    startFlow("there");
  });
  
  endBtn.addEventListener("click", () => {
    if (endDialog && typeof endDialog.showModal === "function") {
      endDialog.showModal();
    } else {
      goToResults({ mode: state.mode || "donor" });
    }
  });
  
  endCancelBtn?.addEventListener("click", () => endDialog?.close());
  endConfirmBtn?.addEventListener("click", () => {
    endDialog?.close();
    goToResults({ mode: state.mode || "donor" });
  });
  
  
  /** Quick form toggle (UI only right now) */
  let qImageSource = null; // "internal" | "ai" | "cloudinary" | null
  let qImageKey = null;
  let qImageUrl = null;

  const qChooseDefaultImg = document.getElementById("qChooseDefaultImg");
  const qChooseAiImg = document.getElementById("qChooseAiImg");
  const qClearImg = document.getElementById("qClearImg");
  const qImgPreview = document.getElementById("qImgPreview");
  const qImgUpload = document.getElementById("qImgUpload");

  function qSetPreview(url) {
    if (!qImgPreview) return;
    if (!url) {
      qImgPreview.style.display = "none";
      qImgPreview.src = "";
      return;
    }
    qImgPreview.src = url;
    qImgPreview.style.display = "block";
  }

  function isQuickOrg() {
    return (qReqCategory?.value || "") !== "private";
  }

  function syncQuickImageActions() {
    const isOrg = isQuickOrg();
  
    // Org -> only default
    qChooseDefaultImg.disabled = false;
    qChooseAiImg.disabled = isOrg; // disable for org
    // אם תוסיפי Upload button - תעשי גם disabled = isOrg
  
    if (isOrg && qImageSource === "ai") {
      qImageSource = null; qImageKey = null; qImageUrl = null;
      qSetPreview(null);
    }
  }
  qReqCategory?.addEventListener("change", syncQuickImageActions);
  syncQuickImageActions();
  
  

  qChooseDefaultImg?.addEventListener("click", () => {
    openImgDialog(
      ORG_DEFAULT_IMAGES,
      (imgObj) => {
        qImageSource = "internal";
        qImageKey = imgObj.key;
        qImageUrl = imgObj.src;
        qSetPreview(qImageUrl);
      },
      () => {
        qImageSource = null; qImageKey = null; qImageUrl = null;
        qSetPreview(null);
      }
    );
  });  
  
  qChooseAiImg?.addEventListener("click", async () => {
    setQuickError("");
    const topic = (qReqTopic?.value || "other").trim() || "other";
    try {
      const out = await generateAiImage(topic);
      qImageSource = out.image_source; // "ai"
      qImageKey = out.image_key;
      qImageUrl = out.image_url;
      qSetPreview(qImageUrl);
    } catch (e) {
      setQuickError(e.message || "AI generation failed.");
    }
  });
  
  
  qClearImg?.addEventListener("click", () => {
    qImageSource = null;
    qImageKey = null;
    qImageUrl = null;
    qSetPreview(null);
  })  

  modeChat.addEventListener("click", () => setMode("chat"));
  modeQuick.addEventListener("click", () => setMode("quick"));  

  if (quickForm) {
    quickForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setQuickError("");
  
      const intent = qIntent.value;
  
      // ---- DONOR ----
      if (intent === "donor") {
        if (qDonationType.value === "money") {
          window.location.href = "donate.html";
          return;
        }
  
        const cat = qCategory.value;
        const params = {
          mode: "donor",
          donation_type: "volunteer",
          region: qRegion.value || "",
          topic: qTopic.value || "",
          category: (cat && cat !== "any") ? cat : "",
        };
  
        Object.keys(params).forEach((k) => {
          if (!params[k]) delete params[k];
        });
  
        goToResults(params);
        return;
      }
  
      // ---- REQUESTER ----
      // must be logged in (session cookie)
      const me = await requireLogin();
      if (!me) return;
  
      const payload = {
        help_type: (qHelpType.value || "").trim(),
        category: (qReqCategory.value || "").trim(),
        target_group: (qTargetGroup.value || "").trim(),
        region: (qReqRegion.value || "").trim(),
        topic: (qReqTopic.value || "").trim(),
        title: (qTitle.value || "").trim(),
        full_description: (qDescription.value || "").trim(),

        image_source: qImageSource || null,  
        image_key: qImageKey || null,
        image_url: qImageUrl || null,
      };
  
      if (
        !payload.help_type ||
        !payload.category ||
        !payload.target_group ||
        !payload.region ||
        !payload.topic ||
        !payload.title ||
        !payload.full_description
      ) {
        setQuickError("Please fill all required fields.");
        return;
      }
  
      if (payload.help_type === "money") {
        const n = Number(qAmountNeeded.value);
        if (!Number.isFinite(n) || n <= 0) {
          setQuickError("Please enter a valid amount (numbers only).");
          return;
        }
        payload.amount_needed = n;
      }
  
      try {
        const res = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
  
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setQuickError(data.message || "Could not submit your request.");
          return;
        }
  
        // show "My requests" + matching open requests
        goToResults({
          mode: "requester",
          mine: "1",
          region: payload.region,
          topic: payload.topic,
          category: payload.category,
          help_type: payload.help_type,
        });
      } catch (err) {
        setQuickError("Network error. Please try again.");
      }
    });
  }
  


  /* Quick Form - Dialog */ 
const imgDialog = document.getElementById("imgDialog");
const imgDialogGrid = document.getElementById("imgDialogGrid");
const imgDialogCancel = document.getElementById("imgDialogCancel");
const imgDialogSkip = document.getElementById("imgDialogSkip");

function openImgDialog(images, onPick, onSkip) {
  imgDialogGrid.innerHTML = "";

  images.forEach((imgObj) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "img-choice";
    btn.innerHTML = `
      <img src="${imgObj.src}" alt="${imgObj.alt}">
      <span>${imgObj.label || imgObj.key}</span>
    `;
    btn.addEventListener("click", () => {
      imgDialog.close();
      onPick(imgObj);
    });
    imgDialogGrid.appendChild(btn);
  });

  imgDialogCancel.onclick = () => imgDialog.close();
  imgDialogSkip.onclick = () => {
    imgDialog.close();
    onSkip?.();
  };

  imgDialog.showModal();
}

  
  
  /** ---- init ---- */
  (async function init() {
    // כשתחברי את ההתחברות מחדש, תחזירי את זה:
    // const me = await requireLogin();
    // if (!me) return;
  
    setMode("chat");
    setComposerEnabled(false);
    startFlow("there");
    updateScrollDownButton();
  })();  