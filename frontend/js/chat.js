/**
 * @file chat.js
 * @description Chat wizard for CareMatch: guides donors/requesters through questions, posts requests,
 *              and redirects to results. Includes a quick-form mode and optional image selection/upload.
 * @notes
 * - Uses cookie-based sessions (credentials: "include") and an auth guard (requireLogin).
 * - Uses a simple in-memory state machine with history snapshots for the Back button.
 */

/** ---- Auth guard (chat must be after login) ---- */

/**
 * @description Ensures the user is logged in by checking the /api/auth/me endpoint.
 * @returns  {Promise<Object|null>} The user data if logged in, otherwise redirects to logIn.html.
 */
async function requireLogin() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        window.location.href = "/pages/logIn.html"; 
        return null;
      }
      return await res.json();
    } catch (e) {
      window.location.href = "/pages/logIn.html";
      return null;
    }
  }
  
  /** ---- UI helpers ---- */
  // General chat elements
  const chatLog = document.getElementById("chatLog");
  const choicesEl = document.getElementById("choices");
  const textForm = document.getElementById("textForm");
  const textInput = document.getElementById("textInput");
  const sendBtn = textForm.querySelector('button[type="submit"]');
  const imageInput = document.getElementById("imageInput");
  
  // Feedback/progress
  const progressText = document.getElementById("progressText");
  const hintText = document.getElementById("hintText");
  const backBtn = document.getElementById("backBtn");
  const restartBtn = document.getElementById("restartBtn");
  const endBtn = document.getElementById("endBtn");
  
  //Mode Switching
  const modeChat = document.getElementById("modeChat");
  const modeQuick = document.getElementById("modeQuick");
  const scrollDownBtn = document.getElementById("scrollDownBtn");

  // End dialog elements
  const endDialog = document.getElementById("endDialog");
  const endCancelBtn = document.getElementById("endCancelBtn");
  const endConfirmBtn = document.getElementById("endConfirmBtn");

  //Image presets organizations 
  const ORG_DEFAULT_IMAGES = [
    { key: "aharai", src: "../images/aharai.jpeg", alt: "Default image 1" },
    { key: "appleseeds", src: "../images/appleseeds.jpeg", alt: "Default image 2" },
    { key: "atidna", src: "../images/atidna.jpeg", alt: "Default image 3" },
    { key: "Beit_Lssie_Shapiro", src: "../images/Beit_Lssie_Shapiro.jpeg", alt: "Default image 4" },
    { key: "druze_children", src: "../images/druze_children.jpeg", alt: "Default image 5" },
    { key: "latet", src: "../images/latet.jpeg", alt: "Default image 6" },
    { key: "melabev", src: "../images/melabev.jpeg", alt: "Default image 7" },
    { key: "nezareth_hospital", src: "../images/nezareth_hospital.jpeg", alt: "Default image 8" },
    { key: "Pichon_Lev", src: "../images/Pichon_Lev.jpeg", alt: "Default image 9" },
    { key: "rambam", src: "../images/rambam.jpeg", alt: "Default image 10" },
    { key: "sheba", src: "../images/sheba.jpeg", alt: "Default image 11" },
    { key: "sos_children", src: "../images/sos_children.jpeg", alt: "Default image 12" },
    { key: "the_carmel_elders", src: "../images/the_carmel_elders.jpeg", alt: "Default image 13" },
    { key: "yad_sarah", src: "../images/yad_sarah.jpeg", alt: "Default image 14" },
  ];
  
// AI preset images 
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
  
  /**
   * @description Updates the visual state of the 'Back' button based on history depth.
   */
  function updateBackButton() {
    if (!backBtn) return;
    backBtn.disabled = history.length <= 1;
  }
   

  /**
 * @description Renders a grid of image options within the chat interface.
 * @param {Array} images - List of image objects to display.
 * @param {Function} onPick - Callback function when an image is chosen.
 */
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

/** ---- Quick form mode ---- */
const chatView = document.getElementById("chatView");
const quickView = document.getElementById("quickView");
const quickForm = document.getElementById("quickForm");
// Form fields elements
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


function setInvalid(el, on) {
  if (!el) return;
  el.classList.toggle("is-invalid", !!on);
}

function isRequester() {
  return (qIntent?.value || "") === "requester";
}

function validateQuick({ showErrors = false } = {}) {
  // Donor: לא חוסמים (רק משנים label)
  if (!isRequester()) return true;

  const req = [
    qHelpType,
    qReqCategory,
    qTargetGroup,
    qReqRegion,
    qReqTopic,
    qTitle,
    qDescription,
  ];

  let ok = true;

  for (const el of req) {
    const v = (el?.value || "").trim();
    const bad = !v || v.startsWith("Select");
    if (showErrors) setInvalid(el, bad);
    if (bad) ok = false;
  }

  // amount needed רק אם money
  if ((qHelpType?.value || "").trim() === "money") {
    const n = Number(qAmountNeeded?.value);
    const bad = !Number.isFinite(n) || n <= 0;
    if (showErrors) setInvalid(qAmountNeeded, bad);
    if (bad) ok = false;
  } else {
    if (showErrors) setInvalid(qAmountNeeded, false);
  }

  return ok;
}

function syncQuickSubmitUI() {
  // כותרת הכפתור לפי intent
  if (!qSubmitBtn) return;

  const intent = qIntent?.value || "donor";
  if (intent === "donor") {
    qSubmitBtn.disabled = false;
    qSubmitBtn.textContent = (qDonationType?.value === "money") ? "Go to Donate" : "Show results";
    return;
  }

  // requester
  qSubmitBtn.textContent = "Submit request";
  qSubmitBtn.disabled = !validateQuick({ showErrors: false });
}

[
  qIntent,
  qDonationType,
  qHelpType,
  qReqCategory,
  qTargetGroup,
  qReqRegion,
  qReqTopic,
  qTitle,
  qDescription,
  qAmountNeeded,
].forEach((el) => {
  if (!el) return;
  el.addEventListener("change", syncQuickSubmitUI);
  el.addEventListener("input", syncQuickSubmitUI);
});
syncQuickSubmitUI();


/**
 * @description Displays error messages specific to the Quick Form.
 * @param {string} msg - Sets an error message in the quick form UI
 */
function setQuickError(msg) {
  if (!qError) return;
  qError.textContent = msg || "";
}


/**
 * @description Synchronizes the Quick Form visibility and button text based on user input.
 * @notes 
 * - Toggles between 'donor' and 'requester' fields.
 * - Dynamically updates the submit button label based on donation type (money vs volunteer).
 */
function syncQuickFormUI() {
  const intent = qIntent.value;

  // toggle sections
  if (qDonorFields) qDonorFields.hidden = intent !== "donor";
  if (qRequesterFields) qRequesterFields.hidden = intent !== "requester";

  // clear invalid marks when switching modes
  if (intent !== "requester") {
    [qHelpType,qReqCategory,qTargetGroup,qReqRegion,qReqTopic,qTitle,qDescription,qAmountNeeded]
      .forEach((el) => setInvalid(el, false));
  }

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
  syncQuickSubmitUI();
}


qIntent?.addEventListener("change", syncQuickFormUI);
qDonationType?.addEventListener("change", syncQuickFormUI);
qHelpType?.addEventListener("change", syncQuickFormUI);
syncQuickFormUI();

/**
 * @description Toggles the application between 'Chat' mode and 'Quick' (Form) mode.
 * @param {string} mode - The target mode ('quick' or 'chat').
 */
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

/**
 * @description Checks if the user is scrolled near the bottom of a container.
 * @param {HTMLElement} el - The scrollable element.
 * @param {number} threshold - Distance from bottom in pixels to trigger 'true'.
 * @returns {boolean}
 */
function isNearBottom(el, threshold = 40) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

/**
 * @description Controls the visibility of the 'Scroll to Bottom' button based on scroll position.
 */
function updateScrollDownButton() {
  if (!scrollDownBtn) return;
  scrollDownBtn.hidden = isNearBottom(chatLog);
}
// Scroll event listener
chatLog?.addEventListener("scroll", updateScrollDownButton);

//Smooth scroll to bottom on button click
scrollDownBtn?.addEventListener("click", () => {
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
  updateScrollDownButton();
});


  /**
   * @description Enables or disables the text input area.
   * @param {boolean} enabled - Whether the user can type. 
   * @param {string} placeholder - Custom text to show in the input.
   */
  function setComposerEnabled(enabled, placeholder = "") {
    textForm.hidden = false;
  
    textForm.classList.toggle("is-disabled", !enabled);
    textInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
  
    textInput.placeholder = placeholder || (enabled ? "Type your answer..." : "Choose an option below…");
  
    if (enabled) textInput.focus();
  }
  

  /**
 * @description Appends a message bubble to the chat log.
 * @param {string} text - Message content.
 * @param {string} who - The sender ('bot' or 'user').
 * @notes Automatically scrolls to bottom if the user was already at the bottom.
 */

  // ---- Intro sequencing (UX) ----
  let introRunId = 0;
  function cancelIntroSequence() {
    introRunId++;
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function addMsgsSequential(messages, delayMs) {
    const runId = introRunId;
  
    for (const m of messages) {
      if (runId !== introRunId) return; // canceled by user action
      addMsg(m, "bot");
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  let suppressMsgs = false;
  function addMsg(text, who = "bot") {
    if (suppressMsgs) return;
  
    const shouldStick = isNearBottom(chatLog);
  
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    div.textContent = text;
    chatLog.appendChild(div);
  
    if (shouldStick) {
      requestAnimationFrame(() => {
        chatLog.scrollTop = chatLog.scrollHeight;
        updateScrollDownButton();
      });
    } else {
      updateScrollDownButton();
    }
  }
   
  
  /**
 * @description Clears existing choices and renders a new set of action buttons.
 * @param {Array<Object>} buttons - Array of button definitions {label, onClick}.
 */
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


  /** 
   * @description Helper to manage text-based questions in the chat flow.
   * @param {string} prompt - The bot's question.
   * @param {string|Function} placeholder - Input placeholder or the handler function.
   * @param {Function} [handler] - The callback function to execute on submit.
   */
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
  
  /**
   * @description Redirects the user to the results page with search parameters.
   * @param {Object} paramsObj - Key-value pairs of filter criteria.
   */
  function goToResults(paramsObj) {
    const params = new URLSearchParams(paramsObj);
    window.location.href = `/pages/result.html?${params.toString()}`;
  }
  
  /** ---- Simple state + history ---- */
  let history = []; // Array to store state snapshots for 'Back' functionality
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
  
  
  /**
   * @description Saves a deep-cloned snapshot of the current state and chat HTML.
   * @param {Object} snapshot - Current application state.
   */
  function pushHistory(snapshot) {
    const snap = JSON.parse(JSON.stringify(snapshot));
    snap.__chatHtml = chatLog.innerHTML;  
    history.push(snap);
    updateBackButton();
  }
  
  /**
   * @description Restores the previous state snapshot from history.
   * @returns {Object|null} The previous state object.
   */

  function popHistory() {
    if (history.length <= 1) return null;
    history.pop();
    updateBackButton();
    return JSON.parse(JSON.stringify(history[history.length - 1]));
  }
  
  /**
   *  @description Resets the entire chat state and UI to the initial state.
   */
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
   
  /**
   * @description Displays the donor category question in the chat flow.
   * @param {string} type - The donation type (e.g., 'volunteer').
   */
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
  
  /**
   * @description Displays the donor topic question in the chat flow.
   * @param {string} type - The donation type (e.g., 'volunteer').
   */
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
  
  /**
   * @description Renders the chat interface based on the current state.
   * Uses the state machine to determine which question to ask next.
   */
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
  
    // ------- Donor flow -------
    if (state.mode === "donor") {
      if (!state.donationType) {
        donorContribute();
        return;
      }
  
      // Direct redirect for monetary donations
      if (state.donationType === "money") {
        progressText.textContent = "Step 2";
        hintText.textContent = "";
        addMsg("You can donate securely on our Donate page.");
        setChoices([{ label: "Go to Donate Money page", onClick: () => (window.location.href = "/pages/donate.html") }]);
        return;
      }
  
      // volunteer flow
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

      // If all fields are present, navigate to results
      goToResults({
        mode: "donor",
        donation_type: "volunteer",
        region: state.region || "",
        topic: state.topic || "",
        category: state.category && state.category !== "any" ? state.category : "",
      });
      return;
    }
  
    // -------- Requester flow --------
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
  
  /**
   * @description Entry point for the chatbot. Resets session and greets the user.
   * @param {string} userName - The name of the logged-in user. 
   */
  async function startFlow(userName = "there") {
    cancelIntroSequence(); // cancel any previous intro run
    resetAll();

    endBtn.disabled = true;
  
    progressText.textContent = "Step 1";
    hintText.textContent = "";
  
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delayMs = reduceMotion ? 0 : 450;
  
    await addMsgsSequential(
      [
        `Hi, ${userName}! 👋`,
        "Welcome to CareMatch. I’ll ask a few questions to filter the best matches for you.",
        "NOTE: please don’t share sensitive personal details here.",
        "If you don’t have time for chat, Quick Form (top menu) lets you submit the same request quickly.",
        "What would you like to do today?",
      ],
      delayMs
    );

    endBtn.disabled = false;
  
    setChoices([
      {
        label: "Donate",
        onClick: () => {
          cancelIntroSequence();
          addMsg("Donate", "user");
          state.mode = "donor";
          endBtn.disabled = false;
          donorContribute();
        },
      },
      {
        label: "Request support",
        onClick: () => {
          cancelIntroSequence();
          addMsg("Request support", "user");
          state.mode = "requester";
          endBtn.disabled = false;
          requesterIntro();
        },
      },
    ]);
  
    pushHistory(state);
  }
  
  
  /** ---------------- DONOR ---------------- */

  /**
   * @description Step 2 (Donor): Determines the donation method.
   */
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
              onClick: () => (window.location.href = "/pages/donate.html"),
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
  
  /**
   * @description Asks donor for region and then shows results.
   * @param {string} type - The donation type (e.g., 'volunteer').
   */
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
  
  /**
   * @description Updates the donor's region and moves to organization category selection.
   * @param {string} region - The selected geographic area.
   * @param {string} type - The donation type. 
   */
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
  
  /**
   * @description Updates the donor's preferred organization category and moves to topic selection.
   * @param {string} category - The selected organization type.
   * @param {string} type - The donation type.
   */
  function pickCategory(category, type) {
    addMsg(category, "user");
    state.category = category;
    showDonorTopicQuestion(type); 
  }
  
  /**
   * @description Updates the donor's preferred topic and shows matching results.
   * @param {string} topic - The selected topic.
   * @param {string} type - The donation type.
   */
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
  
  /**
   * @description  Initializes the request creation process.
   */
  function requesterIntro() {
    progressText.textContent = "Step 2";
    hintText.textContent = "";
  
    addMsg("Thanks — I’ll ask a few quick questions, publish your request, and then show matching results.");
    requesterPickHelpType();
  }
      
  /**
   * @description Asks the requester what type of help they need.
   */   
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
  
  /**
   * @description Asks the requester who the request is for (organization or individual).
   */
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
  

  /**
   * @description Asks the requester about the type of organization.
   */
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
  
  /**
   * @description Sets the requester organization category and proceeds to target group selection.
   * @param {string} cat - The selected organization category.
   */
  function setRequesterCategory(cat) {
    addMsg(cat, "user");
    state.category = cat;
    requesterTargetGroup();
  }
  
  /**
   * @description Asks the requester about the target group for the request.
   */
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
  
  /**
   * @description Sets the requester target group and proceeds to topic selection.
   * @param {string} g - The selected target group.
   */
  function setTargetGroup(g) {
    addMsg(g, "user");
    state.targetGroup = g;
    requesterTopic();
  }
  
  /**
   * @description Asks the requester about the topic of the request.
   */
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
  
  /**
   * @description Sets the requester topic and proceeds to region selection.
   * @param {string} t - The selected topic.
   */
  function setTopic(t) {
    addMsg(t, "user");
    state.topic = t;
    requesterRegion();
  }
  
  /**
   * @description Asks the requester about the region for the request.
   */ 
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
  
  /**
   * @description Sets the requester region and proceeds to title input.
   * @param {string} r - The selected region.
   */
  function setRegion(r) {
    addMsg(r, "user");
    state.region = r;
    requesterTitle();
  }
  
  /**
   * @description Asks the requester for a short title for their request.
   */
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
  /**
   * @description Asks the requester for a detailed description of their request.
   */
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
  
  /**
   * @description Asks the requester for the amount of money needed.
   */
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
  
  
  /**
   * @description Step 11 (Requester): Handles optional image attachment.
   * @notes 
   * - Organizations: Choose from a predefined grid of internal assets.
   * - Individuals: Options to upload a personal file, use AI (scaffold), or skip.
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
   
  /**
   * @description Sets up the image upload input listener.
   * @notes Handles file selection, upload process, and error management.
   */
  if (imageInput) {
    imageInput.addEventListener("change", async () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        addMsg("No file selected. You can skip or try again.", "bot");
        requesterImageOptional();
        return;
      }
  
      addMsg("Uploading image…", "bot");
  
      try {
        const out = await uploadImageFile(file);
  
        state.imageSource = out.image_source; // "upload"
        state.imageKey = out.image_key;
        state.imageUrl = out.image_url;       // "/uploads/user/..."
        
        addMsg("Image uploaded ✅", "bot");
        submitRequest();
      } catch (e) {
        addMsg(e.message || "Upload failed. Try again or skip.", "bot");
        requesterImageOptional();
      }
    });
  }
  

  /**
   * @description Uploads an image file to the server.
   * @param {File} file - The image file to upload.
   * @returns {Promise<Object>} Resolves with upload details { image_url, image_source, image_key }.    
   * @throws {Error} If the upload fails.
   */
  async function uploadImageFile(file) {
    const fd = new FormData();
    fd.append("image", file);
  
    const res = await fetch("/api/uploads/image", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
  
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data; // { image_url, image_source:"upload", image_key }
  }
  
  /**
   * @description Finalizes and submits the request to the server.
   */
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
  
  /** ---- Navigation Event Listeners ---- */
  /**
   * @description Handles the 'Back' button click to restore previous state.
   */
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
    cancelIntroSequence();
    addMsg("Restart chat", "user");
    startFlow("there");
  });  
  
  endBtn.addEventListener("click", () => {
    // ✅ allow ending even before choosing a mode -> go to results with no filters
    if (!state.mode) {
      if (endDialog && typeof endDialog.showModal === "function") endDialog.showModal();
      else goToResults({}); // results without mode
      return;
    }
    if (endDialog && typeof endDialog.showModal === "function") endDialog.showModal();
    else goToResults({ mode: state.mode });
  });
  
  endConfirmBtn?.addEventListener("click", () => {
    endDialog?.close();
    if (!state.mode) goToResults({});
    else goToResults({ mode: state.mode });
  });
  
  
  endCancelBtn?.addEventListener("click", () => endDialog?.close());
  endConfirmBtn?.addEventListener("click", () => {
    if (!state.mode) {
      addMsg("Please choose: Donate or Request support (so I can show the right results).", "bot");
      return;
    }
  
    endDialog?.close();
    goToResults({ mode: state.mode });
  });
  
  
  
  /** Quick form toggle (UI only right now) */
  let qImageSource = null; // "internal" | "ai" | "cloudinary" | null
  let qImageKey = null;
  let qImageUrl = null;

  const qChooseDefaultImg = document.getElementById("qChooseDefaultImg");
  const qClearImg = document.getElementById("qClearImg");
  const qImgPreview = document.getElementById("qImgPreview");
  const qImgUpload = document.getElementById("qImgUpload");
  const qUploadImg = document.getElementById("qUploadImg");


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
    const cat = (qReqCategory?.value || "").trim();
  
    if (!cat) {
      qChooseDefaultImg.disabled = true;
      qUploadImg && (qUploadImg.disabled = true);
      return;
    }
  
    const isPrivate = cat === "private";
  
    qChooseDefaultImg.disabled = isPrivate;
    if (qUploadImg) qUploadImg.disabled = !isPrivate;
  
    if (isPrivate && qImageSource === "internal") {
      qImageSource = null; qImageKey = null; qImageUrl = null;
      qSetPreview(null);
    }
    if (!isPrivate && qImageSource === "upload") {
      qImageSource = null; qImageKey = null; qImageUrl = null;
      qSetPreview(null);
    }
  }  
  qReqCategory?.addEventListener("change", syncQuickImageActions);
  syncQuickImageActions();  


  qUploadImg?.addEventListener("click", () => {
    setQuickError("");
    if (qImgUpload) {
      qImgUpload.value = "";
      qImgUpload.click();
    }
  });
  
  qImgUpload?.addEventListener("change", async () => {
    const file = qImgUpload.files && qImgUpload.files[0];
    if (!file) return;
  
    setQuickError("");
  
    try {
      const out = await uploadImageFile(file); 
      qImageSource = out.image_source; 
      qImageKey = out.image_key;
      qImageUrl = out.image_url;
      qSetPreview(qImageUrl);
    } catch (e) {
      setQuickError(e.message || "Upload failed. Try again.");
    }
  });  
  

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
  
  
  qClearImg?.addEventListener("click", () => {
    qImageSource = null;
    qImageKey = null;
    qImageUrl = null;
    qSetPreview(null);
    qImgUpload && (qImgUpload.value = "");
  })  

  modeChat.addEventListener("click", () => {
    cancelIntroSequence();
    setMode("chat");
  });
  
  modeQuick.addEventListener("click", () => {
    cancelIntroSequence();
    setMode("quick");
    if (typeof syncQuickFormUI === "function") syncQuickFormUI();
    if (typeof syncQuickImageActions === "function") syncQuickImageActions();
  });
  
  

  if (quickForm) {
    quickForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setQuickError("");
  
      const intent = qIntent.value;
  
      // ---- DONOR ----
      if (intent === "donor") {
        if (qDonationType.value === "money") {
          window.location.href = "/pages/donate.html";
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
      
      // UX validation: mark fields + scroll to first missing
      const ok = validateQuick({ showErrors: true });
      if (!ok) {
        setQuickError("Please fill all required fields.");
        const firstBad = document.querySelector(".is-invalid");
        firstBad?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

  
      if (payload.help_type === "money") {
        const n = Number(qAmountNeeded.value);
        const bad = !Number.isFinite(n) || n <= 0;
        setInvalid(qAmountNeeded, bad);
        if (bad) {
          setQuickError("Please enter a valid amount (numbers only).");
          qAmountNeeded?.scrollIntoView({ behavior: "smooth", block: "center" });
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
  


  /* -------- Quick Form - Dialog -------- */ 

// Modal dialog for image selection
const imgDialog = document.getElementById("imgDialog");
const imgDialogGrid = document.getElementById("imgDialogGrid");
const imgDialogCancel = document.getElementById("imgDialogCancel");
const imgDialogSkip = document.getElementById("imgDialogSkip");

/**
 * @description Opens a modal dialog to select an image from a grid.
 * @param {Array<Object>} images - Array of image objects {src, alt, label, key}.
 * @param {Function} onPick - Callback function triggered when an image is selected. 
 * @param {Function} [onSkip] - Optional callback for when the user skips the selection.
 */
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
  /**
   * @description Initializes the chat interface on page load.
   */
  (async function init() {
    document.querySelectorAll("dialog[open]").forEach(d => { try { d.close(); } catch(e) {} });
    document.querySelectorAll("[inert]").forEach(el => el.removeAttribute("inert"));    
  
    const me = await requireLogin();
    if (!me) return;
  
    setMode("chat");
    setComposerEnabled(false);
    await startFlow("there");
    updateScrollDownButton();
  })();  