/**
 * @file index.js
 * @description Home page logic: initializes UI components, updates stats, and runs carousels.
 * @notes
 * - Uses demo data (can be replaced with API/DB).
 * - Respects prefers-reduced-motion for accessibility.
 */

// --- Section 1: Imports & Initializations ---
import { createRequestCard } from "./components/requestCard.js";
import { initContactForm } from "./components/contactForm.js";
initContactForm();


document.getElementById("year").textContent = new Date().getFullYear();


// --- Section2: Data ---
// Smooth number animation using requestAnimationFrame
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/**
 * Animate a number inside an element (or set instantly for reduced-motion users).
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 * @param {(value: number) => string} formatter
 * @param {number} [duration=700]
 */
function animateNumber(el, from, to, formatter, duration = 450) {
  if (reduceMotion) {
    el.textContent = formatter(to);
    return;
  }

  const start = performance.now();

  
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const value = from + (to - from) * t;
    el.textContent = formatter(value);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
  
  // Demo ranges (random walk)
  const state = {
    requests: 1200,
    donors: 850,
    success: 95,     // percent
    response: 2.5    // hours
  };

  
  /**
  * Formats a duration (in hours) into a compact "xh ym" string.
  * @param {number} hours
  * @returns {string}
  */
  function formatDuration(hours) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
  
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  
  const formatters = {
    requests: (v) => Math.round(v).toString(),
    donors: (v) => Math.round(v).toString(),
    success: (v) => `${Math.round(v)}%`,
    response: (v) => formatDuration(v)
  };
  
  
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  
  /**
 * Generates the next demo value for a given stat (random-walk within safe bounds).
 * @param {"requests"|"donors"|"success"|"response"} key
 * @param {number} current
 * @returns {number}
 */
  function nextValue(key, current) {
    switch (key) {
      case "requests": return clamp(current + (Math.random() * 24 - 12), 900, 5000);
      case "donors":   return clamp(current + (Math.random() * 16 - 8), 200, 3000);
      case "success":  return clamp(current + (Math.random() * 2 - 1), 85, 99);
      case "response": return clamp(current + (Math.random() * 0.6 - 0.3), 0.8, 10);
      default: return current;
    }
  }
  
  function updateStats() {
    document.querySelectorAll(".stat-value[data-key]").forEach((el) => {
      const key = el.dataset.key;
      const from = state[key];
      const to = nextValue(key, from);
      state[key] = to;
      animateNumber(el, from, to, formatters[key]);
    });
  }
  
  // Initial + periodic update
  updateStats();
  setInterval(updateStats, 4000);


 // --- Section 3: Testimonials ---
 (function initTestimonialsCarousel(){
    const carousel = document.querySelector(".carousel");
    if (!carousel) return;
  
    const slides = Array.from(carousel.querySelectorAll(".slide"));
    const prevBtn = carousel.querySelector(".carousel-btn.prev");
    const nextBtn = carousel.querySelector(".carousel-btn.next");
    const dots = Array.from(document.querySelectorAll(".carousel-dots .dot"));
  
    let index = 0;
  
    function show(i){
      index = (i + slides.length) % slides.length;
  
      slides.forEach((s, idx) => {
        const active = idx === index;
        s.classList.toggle("is-active", active);
        s.setAttribute("aria-hidden", active ? "false" : "true");
      });
  
      dots.forEach((d, idx) => {
        const active = idx === index;
        d.classList.toggle("is-active", active);
        if (active) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
    }
  
    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));
  
    dots.forEach((dot, idx) => {
      dot.addEventListener("click", () => show(idx));
    });
  
    // Keyboard: Left/Right arrows when the carousel is focused
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    });
  
    show(0);
  })();

  function pulseAuthLink() {
    const auth = document.getElementById("authLink");
    if (!auth) return;
  
    // scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  
    // restart animation even on rapid clicks
    auth.classList.remove("auth-pulse");
    void auth.offsetWidth; // force reflow to reset animation
    auth.classList.add("auth-pulse");
  
    // focus for accessibility
    setTimeout(() => {
      auth.classList.remove("auth-pulse");
      auth.focus?.();
    }, 1400);
  }
  
  // only for the homepage request cards carousel
  const trackEl = document.getElementById("requestsTrack");
  trackEl?.addEventListener("click", (e) => {
    const btn = e.target.closest(".card__btn");
    if (!btn) return;
  
    // prevent navigation (More details link/button)
    e.preventDefault();
    pulseAuthLink();
  });
  

// --- Section 4: Recent Requests ---
// 1) Demo data (we well replace this with API/DB later)
const demoRequests = [
  {
    image: "images/the_carmel_elders.jpeg",
    imageAlt: "Elderly support",
    imageFit: "contain",
    region: "Carmel",
    nameType: "NGO",
    displayName: "Ziknei HaCarmel Center",
    field: "Seniors",
    helpType: "Elderly care support",
    shortDesc: "Home visits and basic groceries for older adults.",
    moreHref: "results.html"
  },
  {
    image: "images/druze_children.jpeg",
    imageAlt: "Children support",
    imageFit: "contain",
    region: "North",
    nameType: "Orphanage",
    displayName: "Horfeish Children’s Home",
    field: "Children",
    helpType: "Back-to-school support",
    shortDesc: "School supplies and learning support for children and teens.",
    moreHref: "results.html"
  },
  {
    image: "images/yad_sarah.jpeg",
    imageAlt: "Food packages",
    imageFit: "contain",
    region: "Israel",
    nameType: "NGO",
    displayName: "Leket Israel",
    field: "Families",
    helpType: "Food packages",
    shortDesc: "Food boxes and essential groceries for families in need.",
    moreHref: "results.html"
  },
  {
    image: "images/latet.jpeg",
    imageAlt: "Humanitarian aid",
    imageFit: "contain",
    region: "Israel",
    nameType: "NGO",
    displayName: "Latet",
    field: "Community",
    helpType: "Emergency essentials",
    shortDesc: "Hygiene kits and essentials for people facing hardship.",
    moreHref: "results.html"
  },
  {
    image: "images/Hospitals.jpeg",
    imageAlt: "Hospital support",
    imageFit: "contain",
    region: "Galilee",
    nameType: "Hospital",
    displayName: "HopeCare Hospital Fund",
    field: "Healthcare",
    helpType: "Patient essentials",
    shortDesc: "Support for medications, transport, and patient necessities.",
    moreHref: "results.html"
  },
  {
    image: "images/School.jpeg",
    imageAlt: "Education support",
    imageFit: "contain",
    region: "Haifa",
    nameType: "NGO",
    displayName: "Tech4Teens Learning Hub",
    field: "Education",
    helpType: "Learning support",
    shortDesc: "Devices and tutoring support for students who need a boost.",
    moreHref: "results.html"
  },
  {
    image: "images/donate.jpg",
    imageAlt: "Community support",
    imageFit: "contain",
    region: "North",
    nameType: "NGO",
    displayName: "Community Hearts Fund",
    field: "Community",
    helpType: "Short-term assistance",
    shortDesc: "Immediate help for urgent needs while long-term solutions are arranged.",
    moreHref: "results.html"
  },
  {
    image: "images/sos_children.jpeg",
    imageAlt: "Family support",
    imageFit: "contain",
    region: "Acre",
    nameType: "NGO",
    displayName: "SafeHome Family Support",
    field: "Families",
    helpType: "Family essentials",
    shortDesc: "Baby supplies and essential items for families under pressure.",
    moreHref: "results.html"
  }
];
  
  // 2) Render cards into the track
  const track = document.getElementById("requestsTrack");
  if (track) {
    demoRequests.forEach((item) => track.appendChild(createRequestCard(item)));
  }
  
  // 3) Carousel controls + “loop” behavior (end -> start)
  (function initRequestsCarousel(){
    if (!track) return;
  
    const nextBtn = document.querySelector('[data-req="next"]');
    const prevBtn = document.querySelector('[data-req="prev"]');
  
    function stepPx(){
      const first = track.querySelector(".card--request");
      if (!first) return 260;
      const gap = parseFloat(getComputedStyle(track).gap || "16");
      return first.getBoundingClientRect().width + gap;
    }
  
    function maxScrollLeft(){
      return Math.max(0, track.scrollWidth - track.clientWidth);
    }
  
    function goNext(){
      const end = maxScrollLeft();
      const nearEnd = track.scrollLeft >= end - 5;
      if (nearEnd) track.scrollTo({ left: 0, behavior: "smooth" });
      else track.scrollBy({ left: stepPx(), behavior: "smooth" });
    }
  
    function goPrev(){
      const end = maxScrollLeft();
      const nearStart = track.scrollLeft <= 5;
      if (nearStart) track.scrollTo({ left: end, behavior: "smooth" });
      else track.scrollBy({ left: -stepPx(), behavior: "smooth" });
    }
  
    nextBtn?.addEventListener("click", goNext);
    prevBtn?.addEventListener("click", goPrev);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function startAuto(){
      if (prefersReducedMotion) return;
      if (!track.classList.contains("slide-auto")) return;
      stopAuto();
      autoTimer = setInterval(() => goNext(), 2200); 
    }
    
    function stopAuto(){
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    }
    
    let autoTimer = null;
    
    // pause on hover / focus
    track.addEventListener("mouseenter", stopAuto);
    track.addEventListener("mouseleave", startAuto);
    track.addEventListener("focusin", stopAuto);
    track.addEventListener("focusout", startAuto);
    
    // also pause a bit when user interacts (scroll/touch)
    ["wheel", "touchstart", "pointerdown"].forEach((evt) => {
      track.addEventListener(evt, () => {
        stopAuto();
        setTimeout(startAuto, 5000);
      }, { passive: true });
    });
    
    startAuto();
  })();  
  