const MODE_ENG = "engineering";
const MODE_VISITOR = "visitor";

const body = document.body;
const toggle = document.getElementById("mode-toggle");
const backButtons = document.querySelectorAll("#back-to-visitor, [data-back-to-visitor]");
const yearEl = document.getElementById("year");
const shoreline = document.getElementById("shoreline");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

const ENG_HASHES = new Set([
  "#engineering",
  "#eng-intro",
  "#eng-fft",
  "#eng-reorder",
  "#eng-open",
  "#eng-about",
]);

/** Nav targets per mode. Key = data-nav value. */
const NAV_TARGETS = {
  [MODE_VISITOR]: { projects: "#projects", lab: "#lab", about: "#about" },
  [MODE_ENG]: { projects: "#eng-fft", lab: "#eng-reorder", about: "#eng-about" },
};

/** Which nav item a section belongs to (for the green "current" pill). */
const SECTION_TO_NAV = {
  top: "projects",
  projects: "projects",
  lab: "lab",
  about: "about",
  "eng-intro": "projects",
  "eng-fft": "projects",
  "eng-reorder": "lab",
  "eng-open": "lab",
  "eng-about": "about",
};

function modeFromHash() {
  return ENG_HASHES.has(location.hash) ? MODE_ENG : MODE_VISITOR;
}

function syncNav(mode) {
  const targets = NAV_TARGETS[mode];
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const key = a.getAttribute("data-nav");
    if (targets[key]) a.setAttribute("href", targets[key]);
  });
}

function setCurrent(key) {
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.getAttribute("data-nav") === key) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  });
}

function applyMode(mode, { updateHash = true, scroll = false } = {}) {
  body.dataset.mode = mode;
  const isEng = mode === MODE_ENG;
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(isEng));
    toggle.title = isEng ? "回到工坊（访客模式）" : "切换到工程笔记模式";
  }
  syncNav(mode);
  if (updateHash) {
    if (isEng) {
      if (!ENG_HASHES.has(location.hash)) {
        history.replaceState(null, "", `#${MODE_ENG}`);
      }
    } else if (ENG_HASHES.has(location.hash)) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  if (scroll) {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
  }
  drawShoreline();
  updateSpy();
}

function toggleMode() {
  const next = body.dataset.mode === MODE_ENG ? MODE_VISITOR : MODE_ENG;
  applyMode(next, { scroll: true });
  // Keep keyboard users oriented: move focus to the new hero heading.
  document.getElementById("hero-title")?.focus({ preventScroll: true });
}

toggle?.addEventListener("click", toggleMode);
backButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    applyMode(MODE_VISITOR, { scroll: true });
    document.getElementById("hero-title")?.focus({ preventScroll: true });
  })
);

window.addEventListener("hashchange", () => {
  const fromHash = modeFromHash();
  if (fromHash === MODE_ENG) {
    applyMode(MODE_ENG, { updateHash: false });
  } else if (body.dataset.mode === MODE_ENG && !ENG_HASHES.has(location.hash)) {
    applyMode(MODE_VISITOR, { updateHash: false });
  }
});

/** Scroll spy: highlight the nav item for the section under the header. */
let spyFrame = 0;
function updateSpy() {
  cancelAnimationFrame(spyFrame);
  spyFrame = requestAnimationFrame(() => {
    const probe = window.innerHeight * 0.35;
    let currentId = "top";
    document.querySelectorAll("main > section").forEach((sec) => {
      if (!sec.offsetParent && sec.id !== "top") return; // hidden in this mode
      const r = sec.getBoundingClientRect();
      if (r.top <= probe && r.height > 0) currentId = sec.id;
    });
    // At the very bottom, the last visible section wins.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      const visible = [...document.querySelectorAll("main > section")].filter((s) => s.offsetParent);
      if (visible.length) currentId = visible[visible.length - 1].id;
    }
    setCurrent(SECTION_TO_NAV[currentId] || "projects");
  });
}
window.addEventListener("scroll", updateSpy, { passive: true });

/** Signature waveform shown under the engineering hero. */
function drawShoreline() {
  if (!shoreline) return;
  const ctx = shoreline.getContext("2d");
  if (!ctx) return;
  if (body.dataset.mode !== MODE_ENG) return; // canvas is hidden in visitor mode

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = shoreline.clientWidth || 1200;
  const cssH = shoreline.clientHeight || 120;
  shoreline.width = Math.floor(cssW * dpr);
  shoreline.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const wave = (t) =>
    cssH * 0.5 +
    Math.sin(t * Math.PI * 8) * cssH * 0.12 +
    Math.sin(t * Math.PI * 18 + 0.4) * cssH * 0.05 +
    Math.cos(t * Math.PI * 3) * cssH * 0.04;

  ctx.beginPath();
  ctx.moveTo(0, cssH);
  for (let x = 0; x <= cssW; x += 2) ctx.lineTo(x, wave(x / cssW));
  ctx.lineTo(cssW, cssH);
  ctx.closePath();
  ctx.fillStyle = "rgba(212, 195, 158, 0.12)";
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= cssW; x += 1) {
    const y = wave(x / cssW);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(229, 177, 91, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const marks = [0, 50 / 128, 75 / 128];
  ctx.fillStyle = "rgba(244, 232, 210, 0.7)";
  marks.forEach((m) => {
    ctx.fillRect(Math.max(m * cssW, 0.5), cssH * 0.18, 1, cssH * 0.64);
  });
}

window.addEventListener("resize", () => {
  drawShoreline();
  updateSpy();
});

applyMode(modeFromHash(), { updateHash: false });

export { applyMode, MODE_ENG, MODE_VISITOR };
