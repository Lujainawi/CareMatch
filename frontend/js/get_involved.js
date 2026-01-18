document.addEventListener("DOMContentLoaded", () => {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });
  
const ORGS = {
    "latet": {
      name: "Latet",
      area: "Center",
      desc: "Largest national food bank / humanitarian aid NGO focused on reducing poverty and food insecurity in Israel.",
      help: [
        "Sort and pack food boxes in the warehouse",
        "Help with food rescue / logistics and distribution support"
      ],
      url: "https://www.latet.org.il/en"
    },
    "pitchon-lev": {
      name: "Pitchon Lev",
      area: "Center",
      desc: "Works to help people exit poverty through humanitarian aid and long-term support programs.",
      help: [
        "Sort and distribute food parcels and essential goods at aid centers",
        "Support coordination/admin tasks where needed"
      ],
      url: "https://www.pitchonlev.org.il/en/"
    },
    "appleseeds": {
      name: "Appleseeds",
      area: "North & South",
      desc: "Bridges Israel’s digital divide with technology education, training, and digital-literacy programs for underserved communities.",
      help: [
        "Volunteer as a mentor/lecturer (tech, career, interview practice)",
        "Teach basic digital skills for people taking first steps in tech"
      ],
      url: "https://www.appleseeds.org.il/"
    },
    "beit-issie-shapiro": {
      name: "Beit Issie Shapiro",
      area: "Center",
      desc: "Provides innovative services and programs for children and adults with disabilities and special needs.",
      help: [
        "Join volunteer roles with children (schools / after-school programs)",
        "Support activities around therapy sessions and creative workshops (as needed)"
      ],
      url: "https://www.beitissie.org.il/"
    },
    "sos": {
      name: "SOS Children’s Villages Israel",
      area: "Arad (South) & Migdal HaEmek (North)",
      desc: "Provides long-term family-style homes for children at risk who cannot live with their biological families.",
      help: [
        "Become a mentor / supportive adult figure",
        "Help with after-school activities and enriching programs (assigned by needs)"
      ],
      url: "https://www.sos-childrensvillages.org/"
    },
    "mali": {
      name: "MALI",
      area: "North, Center & South",
      desc: "Cares for and supports at-risk children and youth through residential frameworks and educational/rehabilitative programs.",
      help: [
        "Academic tutoring / homework support",
        "Lead enrichment activities (sports, music, creativity) when relevant"
      ],
      url: "https://www.mally.org.il/"
    },
    "aharai": {
      name: "Aharai!",
      area: "Nationwide",
      desc: "Youth leadership movement promoting social involvement and preparation for meaningful service and civic responsibility.",
      help: [
        "Support youth programs (field activities / leadership sessions)",
        "Help organize community volunteer initiatives (as needed)"
      ],
      url: "https://aharai.org.il/"
    },
    "atidna": {
      name: "Atidna",
      area: "North & Center",
      desc: "Arab-Jewish partnership initiative building youth leadership and civic engagement programs.",
      help: [
        "Support dialogue / community engagement activities",
        "Join joint social projects connected to youth leadership programs"
      ],
      url: "https://atidna.org/"
    },
    "rambam": {
      name: "Rambam Health Care Campus",
      area: "Haifa (North)",
      desc: "Major academic hospital serving Northern Israel, with broad clinical care and research activity.",
      help: [
        "Volunteer roles vary; support non-clinical tasks where permitted",
        "Assist via official volunteer frameworks (assigned by hospital needs)"
      ],
      url: "https://www.rambam.org.il/"
    },
    "sheba": {
      name: "Sheba Medical Center (Tel HaShomer)",
      area: "Ramat Gan (Center)",
      desc: "Large medical center providing comprehensive care and research; volunteer roles are coordinated based on hospital needs.",
      help: [
        "Volunteer coordination matches you to roles based on skills/needs",
        "Support logistical or patient-support tasks (as assigned)"
      ],
      url: "https://www.shebaonline.org/"
    },
    "nazareth": {
      name: "Nazareth Hospital EMMS",
      area: "Nazareth (North)",
      desc: "Hospital in Nazareth within the Nazareth Trust network; volunteering depends on current programs and needs.",
      help: [
        "Support service roles where available (program-dependent)",
        "Join organized volunteer groups for non-clinical support tasks"
      ],
      url: "https://nazarethtrust.org/"
    },
    "melabev": {
      name: "Melabev ",
      area: "Jerusalem area",
      desc: "Community-based services for people living with dementia/Alzheimer’s and support for families.",
      help: [
        "Volunteer visits / companionship and wellbeing check-ins",
        "Telephone reassurance / regular check-in calls"
      ],
      url: "https://www.melabev.org/"
    },
    "yad-sarah": {
      name: "Yad Sarah",
      area: "Nationwide",
      desc: "Volunteer-based organization providing medical equipment lending and wide home-care/community services.",
      help: [
        "Help at lending centers (equipment desk / support)",
        "Assist in maintenance workshops that repair/refurbish equipment"
      ],
      url: "https://www.yadsarah.org/"
    },
    "ziknei-hacarmel": {
      name: "Ziknei HaCarmel",
      area: "Haifa / Carmel region",
      desc: "Community association supporting older adults through clubs/activities and social frameworks in the Carmel area.",
      help: [
        "Support senior-club activities and group programs",
        "Join volunteer roles around social activities (based on needs)"
      ],
      url: "https://www.guidestar.org.il/organization/580186500"
    }
  };
  
  const modal = document.getElementById("orgModal");
  const card = modal.querySelector(".gi-modal__card");
  const titleEl = document.getElementById("orgModalTitle");
  const areaEl = document.getElementById("orgModalArea");
  const descEl = document.getElementById("orgModalDesc");
  const listEl = document.getElementById("orgModalList");
  const websiteEl = document.getElementById("orgModalWebsite");
  
  let lastFocused = null;
  
  function openModal(org) {
    lastFocused = document.activeElement;
  
    titleEl.textContent = org.name;
    areaEl.textContent = org.area;
    descEl.textContent = org.desc;
  
    listEl.innerHTML = "";
    org.help.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      listEl.appendChild(li);
    });
  
    if (org.url && org.url !== "#") {
      websiteEl.href = org.url;
      websiteEl.style.display = "";
    } else {
      websiteEl.href = "#";
      websiteEl.style.display = "none";
    }
  
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    card.focus();
    modal.setAttribute("aria-hidden", "false");
  }
  
  function closeModal() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    modal.setAttribute("aria-hidden", "true");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }
  
  document.addEventListener("click", (e) => {
    const orgCard = e.target.closest(".gi-org-card[data-org]");
    if (orgCard) {
      e.preventDefault();
      const key = orgCard.getAttribute("data-org");
      const org = ORGS[key];
      if (org) openModal(org);
      return;
    }
  
    // close if click on overlay or X
    const closeTarget = e.target.closest("[data-close='true']");
    if (closeTarget && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
  
  document.addEventListener("keydown", (e) => {
    if (modal.classList.contains("hidden")) return;
    if (e.key === "Escape") closeModal();
  });  