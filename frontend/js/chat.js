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
  const AI_PRESETS_BY_TOPIC = {
    health: [
      { key: "health_1", label: "Health illustration" },
      { key: "health_2", label: "Medical support icon" },
    ],
    education: [
      { key: "edu_1", label: "Education illustration" },
      { key: "edu_2", label: "Learning support icon" },
    ],
    arts: [
      { key: "arts_1", label: "Arts activity illustration" },
      { key: "arts_2", label: "Creative workshop icon" },
    ],
    technology: [
      { key: "tech_1", label: "Technology training illustration" },
      { key: "tech_2", label: "Digital help icon" },
    ],
    basic_needs: [
      { key: "needs_1", label: "Food & essentials illustration" },
      { key: "needs_2", label: "Community support icon" },
    ],
    social: [
      { key: "social_1", label: "Community event illustration" },
      { key: "social_2", label: "Social support icon" },
    ],
    other: [
      { key: "other_1", label: "General helpful illustration" },
      { key: "other_2", label: "Neutral support icon" },
    ],
  };  

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
        <span>${imgObj.key.replace("org_", "Image ")}</span>
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


  function setComposerEnabled(enabled, placeholder = "") {
    textForm.hidden = false;
  
    textForm.classList.toggle("is-disabled", !enabled);
    textInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
  
    textInput.placeholder = placeholder || (enabled ? "Type your answer..." : "Choose an option below…");
  
    if (enabled) textInput.focus();
  }
  
  function addMsg(text, who = "bot") {
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    div.textContent = text;
    chatLog.appendChild(div);
  
    // keep scrolling inside chat log
    chatLog.scrollTop = chatLog.scrollHeight;
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
  }
  
  /** ---- Text question helper ---- */
  let pendingTextHandler = null;
  
  function askText(prompt, placeholder, handler) {
    addMsg(prompt, "bot");
  
    // clear choices and enable typing
    choicesEl.innerHTML = "";
    pendingTextHandler = handler;
  
    textForm.hidden = false;
    textInput.value = "";
    setComposerEnabled(true, placeholder || "Type your answer…");
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
    mode: "donor", // donor / requester
    // donor fields
    donationType: null, // money / volunteer
    region: null,
    category: null,
    topic: null,
  
    // requester fields
    helpType: null, // money / volunteer / service
    targetGroup: null,
    title: null,
    fullDescription: null,
    amountNeeded: null,
  
    // image (optional future)
    imageSource: null, // internal / cloudinary / ai
    imageKey: null,
    imageUrl: null
  };
  
  function pushHistory(snapshot) {
    history.push(JSON.parse(JSON.stringify(snapshot)));
  }
  function popHistory() {
    if (history.length <= 1) return null;
    history.pop();
    return JSON.parse(JSON.stringify(history[history.length - 1]));
  }
  
  function resetAll() {
    history = [];
    state = {
      mode: "donor",
      donationType: null,
      region: null,
      category: null,
      topic: null,
  
      helpType: null,
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
  }
  
  /** ---- Flow ---- */
  function startFlow(userName = "there") {
    resetAll();
    pushHistory(state);
  
    progressText.textContent = "Step 1";
    hintText.textContent = "";
  
    addMsg(`Hi, ${userName}! 👋`);
    addMsg("Welcome to CareMatch. I’ll ask a few questions to filter the best matches for you.");
    addMsg("NOTE: please don’t share sensitive personal details here.");
  
    addMsg("First, what brings you here?");
    setChoices([
      {
        label: "I want to donate",
        onClick: () => {
          addMsg("I want to donate", "user");
          state.mode = "donor";
          pushHistory(state);
          donorContribute();
        },
      },
      {
        label: "I need help",
        onClick: () => {
          addMsg("I need help", "user");
          state.mode = "requester";
          pushHistory(state);
          requesterIntro();
        },
      },
    ]);
  }
  
  /** ---------------- DONOR ---------------- */
  function donorContribute() {
    progressText.textContent = "Step 2";
    hintText.textContent = "";
  
    addMsg("Great. How would you like to contribute?");
    setChoices([
      {
        label: "Donate Money",
        onClick: () => {
          addMsg("Donate Money", "user");
          state.donationType = "money";
          pushHistory(state);
  
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
        label: "Volunteer (in person)",
        onClick: () => {
          addMsg("Volunteer (in person)", "user");
          state.donationType = "volunteer";
          pushHistory(state);
          donorFiltersThenResults("volunteer");
        },
      },
    ]);
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
  }
  
  function pickRegion(region, type) {
    addMsg(region, "user");
    state.region = region;
    pushHistory(state);
  
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
  }
  
  function pickCategory(category, type) {
    addMsg(category, "user");
    state.category = category;
    pushHistory(state);
  
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
  }
  
  function pickTopic(topic, type) {
    addMsg(topic, "user");
    state.topic = topic;
    pushHistory(state);
  
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
  
    addMsg("Got it. I’ll ask a few quick questions and then create your request and show matching results.");
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
          pushHistory(state);
          requesterWhoFor();
        },
      },
      {
        label: "Volunteer",
        onClick: () => {
          addMsg("Volunteer", "user");
          state.helpType = "volunteer";
          pushHistory(state);
          requesterWhoFor();
        },
      },
      {
        label: "Service / Workshop",
        onClick: () => {
          addMsg("Service / Workshop", "user");
          state.helpType = "service";
          pushHistory(state);
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
  }
  
  function requesterWhoFor() {
    progressText.textContent = "Step 3";
  
    addMsg("Who is this request for?");
    setChoices([
      {
        label: "An organization",
        onClick: () => {
          addMsg("An organization", "user");
          pushHistory(state);
          requesterOrgType();
        },
      },
      {
        label: "An individual",
        onClick: () => {
          addMsg("An individual", "user");
          state.category = "private"; // schema enum has 'private'
          pushHistory(state);
          requesterTargetGroup();
        },
      },
    ]);
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
  }
  
  function setRequesterCategory(cat) {
    addMsg(cat, "user");
    state.category = cat;
    pushHistory(state);
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
  }
  
  function setTargetGroup(g) {
    addMsg(g, "user");
    state.targetGroup = g;
    pushHistory(state);
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
  }
  
  function setTopic(t) {
    addMsg(t, "user");
    state.topic = t;
    pushHistory(state);
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
  }
  
  function setRegion(r) {
    addMsg(r, "user");
    state.region = r;
    pushHistory(state);
    requesterTitle();
  }
  
  function requesterTitle() {
    progressText.textContent = "Step 8";
  
    askText(
      "Write a short title for your request (e.g., “Art workshop for kids”).",
      "Short title…",
      (val) => {
        state.title = val.slice(0, 255);
        pushHistory(state);
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
        pushHistory(state);
  
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
  
    askText("What amount is needed? (numbers only)", "e.g., 500", (val) => {
      const num = Number(String(val).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(num) || num <= 0) {
        addMsg("Please enter a positive number (e.g., 500).");
        requesterAmountNeeded();
        return;
      }
      state.amountNeeded = num;
      pushHistory(state);
      requesterImageOptional();
    });
  }
  
  /** Optional image step (scaffold)
   *  Cloudinary / AI will be connected later.
   *  DB fields recommended: image_url / image_source / image_key:contentReference[oaicite:3]{index=3}
   */
  function requesterImageOptional() {
    progressText.textContent = "Step 11";
  
    const isOrg = state.category && state.category !== "private";
  
    if (isOrg) {
      addMsg("Last step: choose one of our default images (14 options).", "bot");
  
      setImageGrid(ORG_DEFAULT_IMAGES, (imgObj) => {
        addMsg(`Selected ${imgObj.key}`, "user");
        state.imageSource = "internal";
        state.imageKey = imgObj.key;
        state.imageUrl = imgObj.src; // for preview/use in results if you want
        pushHistory(state);
  
        choicesEl.classList.remove("is-image-grid");
        submitRequest();
      });
  
      return;
    }
  
    // Individual: Upload OR AI (limited)
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
        label: "Generate with AI (limited)",
        onClick: () => {
          addMsg("Generate with AI (limited)", "user");
  
          const topic = state.topic || "other";
          const presets = AI_PRESETS_BY_TOPIC[topic] || AI_PRESETS_BY_TOPIC.other;
  
          addMsg("Choose an AI preset (limited to your topic).", "bot");
          setChoices(
            presets.map((p) => ({
              label: p.label,
              onClick: () => {
                addMsg(p.label, "user");
                state.imageSource = "ai";
                state.imageKey = `ai:${topic}:${p.key}`;
                state.imageUrl = null;
                pushHistory(state);
                submitRequest();
              },
            }))
          );
        },
      },
      {
        label: "Skip",
        onClick: () => {
          addMsg("Skip", "user");
          submitRequest();
        },
      },
    ]);
  }  
  
  if (imageInput) {
    imageInput.addEventListener("change", async () => {
      const file = imageInput.files && imageInput.files[0];
      if (!file) {
        addMsg("No file selected. You can skip or try again.");
        requesterImageOptional();
        return;
      }
  
      if (state.imageUrl && String(state.imageUrl).startsWith("blob:")) {
        URL.revokeObjectURL(state.imageUrl);
      }
  
      state.imageSource = "upload_pending";
      state.imageUrl = URL.createObjectURL(file);

      pushHistory(state);
  
      addMsg("Image selected (preview). We'll upload it to the server later.", "bot");
      submitRequest();
    });
  }
  
  async function submitRequest() {
    progressText.textContent = "Done";
    hintText.textContent = "";
  
    addMsg("Publishing your request…");
  
    const payload = {
      help_type: state.helpType,
      category: state.category,
      target_group: state.targetGroup,
      topic: state.topic,
      region: state.region,
      title: state.title,
      full_description: state.fullDescription,
      amount_needed: state.helpType === "money" ? state.amountNeeded : null,
  
      // optional future image fields
      image_url: state.imageSource === "internal" ? state.imageUrl : null,
      image_source: state.imageSource,
      image_key: state.imageKey || null,
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
        addMsg(err.message || "Could not publish the request. Please try again.");
        return;
      }
  
      addMsg("Your request is published. Redirecting to results…");
      // show user’s requests + all requests in results (you can handle in result.js)
      goToResults({ mode: "requester", mine: "1" });
    } catch (e) {
      addMsg("Network error. Please try again.");
    }
  }
  
  /** ---- Buttons ---- */
  backBtn.addEventListener("click", () => {
    const prev = popHistory();
    if (!prev) return;
  
    state = prev;
    addMsg("Back", "user");
    addMsg("Back restored the previous answers. (Next step: re-render the exact step UI.)");
  });
  
  restartBtn.addEventListener("click", () => {
    addMsg("Restart chat", "user");
    startFlow("there");
  });
  
  endBtn.addEventListener("click", () => {
    goToResults({ mode: state.mode || "donor" });
  });
  
  /** Quick form toggle (UI only right now) */
  modeChat.addEventListener("click", () => setMode("chat"));
  modeQuick.addEventListener("click", () => setMode("quick"));  

  if (quickForm) {
    quickForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const intent = qIntent.value;
  
      // כרגע Quick Form לתורמים (דונור) בלבד
      if (intent === "donor") {
        const params = {
          mode: "donor",
          donation_type: qDonationType.value,
          region: qRegion.value || "",
          category: qCategory.value || "",
          topic: qTopic.value || "",
        };
  
        // ניקוי פרמטרים ריקים
        Object.keys(params).forEach((k) => {
          if (!params[k]) delete params[k];
        });
  
        goToResults(params); // משתמש ב-URLSearchParams
        return;
      }
  
      // requester: לעבור לשיחה (כי יש שם title/description/תמונות מותנות)
      setMode("chat");
      addMsg("For 'I need help', please use the Conversation flow.", "bot");
    });
  }  
  
  /** ---- init ---- */
  (async function init() {
    // כשתחברי את ההתחברות מחדש, תחזירי את זה:
    // const me = await requireLogin();
    // if (!me) return;
  
    setMode("chat");
    setComposerEnabled(false);
    startFlow("there");
  })();  