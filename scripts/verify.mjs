import { chromium, devices } from "../.tmp-verify/node_modules/playwright/index.mjs";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";

/** Use the browser this Playwright build expects, or any newer Chromium already on disk. */
function chromiumLaunch() {
  if (process.env.CHROME_PATH) return { executablePath: process.env.CHROME_PATH };
  const root = join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "ms-playwright");
  if (!existsSync(root)) return {};
  const wanted = Number((chromium.executablePath().match(/chromium-(\d+)/) || [])[1] || 0);
  const found = readdirSync(root)
    .map((name) => ({ name, build: Number((name.match(/^chromium-(\d+)$/) || [])[1] || 0) }))
    .filter((x) => x.build > 0 && x.build <= wanted)
    .sort((a, b) => b.build - a.build)[0];
  if (!found) return {};
  const exe = join(root, found.name, "chrome-win", "chrome.exe");
  return existsSync(exe) ? { executablePath: exe } : {};
}

async function run() {
  const browser = await chromium.launch(chromiumLaunch());
  const errors = [];

  async function check(label, fn) {
    try {
      await fn();
      console.log(`OK ${label}`);
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
      console.error(`FAIL ${label}: ${e.message}`);
    }
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto(BASE, { waitUntil: "networkidle" });

  await check("visitor hero", async () => {
    await page.waitForSelector("text=把想法，");
    const mode = await page.locator("body").getAttribute("data-mode");
    if (mode !== "visitor") throw new Error(`mode=${mode}`);
    if (!(await page.locator("#jianpu").isVisible())) throw new Error("jianpu card hidden");
  });

  await check("retired cards are gone", async () => {
    const gone = await page.locator("#guitartool, #paratool").count();
    if (gone !== 0) throw new Error(`retired cards=${gone}`);
    const links = await page.locator('a[href*="guitartool"], a[href*="paratool"], img[src*="card-guitar"], img[src*="card-paratool"], img[src*="lab-jianpu"]').count();
    if (links !== 0) throw new Error(`retired references=${links}`);
  });

  await check("projects: three cards, jianpu second", async () => {
    const titles = await page.locator(".cards .card__title").allTextContents();
    const nums = await page.locator(".cards .card__num").allTextContents();
    if (titles.length !== 3) throw new Error(`cards=${titles.length} [${titles.join(", ")}]`);
    if (nums.join(",") !== "01,02,03") throw new Error(`nums=${nums.join(",")}`);
    if (!/曲库/.test(titles[1])) throw new Error(`second card=${titles[1]}`);
    const href = await page.locator('#jianpu a[href="jianpu/"]').first().getAttribute("href");
    if (href !== "jianpu/") throw new Error(`href=${href}`);
  });

  await check("projects: no horizontal overflow", async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 1) throw new Error(`overflow=${over}px`);
  });

  await check("lab strip: only Down is left", async () => {
    const live = await page.locator(".lab-strip .wip--live").count();
    if (live !== 0) throw new Error(`live lab entries=${live}`);
    const text = await page.locator("#lab .lab-strip__inner").textContent();
    if (!text.includes("Down")) throw new Error("Down entry missing");
    if (text.includes("曲库")) throw new Error("曲库 still in lab strip");
  });

  await check("toggle engineering", async () => {
    await page.locator("#mode-toggle").click();
    await page.waitForFunction(() => document.body.dataset.mode === "engineering");
    if (!page.url().includes("#engineering")) throw new Error("hash missing");
    await page.waitForSelector("text=美在");
    if (await page.locator("#eng-fft").isHidden()) throw new Error("fft lab hidden");
  });

  await check("fft slider", async () => {
    await page.locator("#fft-f2").fill("60");
    await page.waitForFunction(() => document.getElementById("fft-f2-out")?.textContent === "60");
    const formula = await page.locator("#fft-formula").textContent();
    if (!formula.includes("60")) throw new Error(formula);
  });

  await check("reorder lab", async () => {
    const count = await page.locator(".reorder-item").count();
    if (count !== 3) throw new Error(`items=${count}`);
    await page.locator("#reorder-reset").click();
    await page.waitForSelector('#reorder-status[data-state="ok"]');
    await page.locator("#reorder-shuffle").click();
    await page.waitForFunction(
      () => document.getElementById("reorder-status")?.dataset.state !== "ok"
    );
  });

  await check("eng section hash keeps mode", async () => {
    await page.locator('[data-nav="projects"]').click();
    await page.waitForFunction(() => location.hash === "#eng-fft");
    const mode = await page.locator("body").getAttribute("data-mode");
    if (mode !== "engineering") throw new Error(`mode=${mode} after #eng-fft`);
  });

  await check("back to visitor", async () => {
    await page.locator("#back-to-visitor").click();
    await page.waitForFunction(() => document.body.dataset.mode === "visitor");
    await page.waitForSelector("#jianpu .card__title");
  });

  // ---- 曲谱: no demo, immersive mode -------------------------------------
  const score = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  score.on("pageerror", (err) => errors.push(`score pageerror: ${err.message}`));
  await score.goto(`${BASE}/jianpu/`, { waitUntil: "networkidle" });
  await score.waitForFunction(() => document.querySelectorAll(".jp-song").length > 0);

  await check("library: demo is gone", async () => {
    const titles = await score.locator(".jp-song__title").allTextContents();
    if (titles.some((t) => /湖岸/.test(t))) throw new Error(`titles=${titles.join(" | ")}`);
    const current = await score.locator("#piece-title").textContent();
    if (current.includes("湖岸")) throw new Error(`default piece=${current}`);
    const status = await score.evaluate(async () => (await fetch("../scores/demo.abc")).status);
    if (status !== 404) throw new Error(`demo.abc status=${status}`);
  });

  await check("breadcrumb no longer points at 吉他兔", async () => {
    const hrefs = await score.locator(".jp-crumbs a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    const text = await score.locator(".jp-crumbs").textContent();
    if (hrefs.includes("../#guitartool")) throw new Error(`hrefs=${hrefs.join(",")}`);
    if (!text.includes("曲库")) throw new Error(`crumbs=${text}`);
  });

  const vis = (sel) => score.locator(sel).isVisible();

  await check("immersive: button hides the chrome", async () => {
    await score.locator("#immersive").click();
    await score.waitForFunction(() => document.body.classList.contains("is-immersive"));
    if (await vis(".jp-masthead")) throw new Error("masthead still visible");
    if (await vis(".jp-library")) throw new Error("library still visible");
    if (await vis(".jp-settings")) throw new Error("settings still visible");
    if (!(await vis("#immersive-bar"))) throw new Error("top bar hidden");
    const bar = await score.locator("#immersive-bar").boundingBox();
    if (!bar || bar.height > 52) throw new Error(`bar height=${bar && bar.height}`);
    const title = await score.locator("#immersive-title").textContent();
    const piece = await score.locator("#piece-title").textContent();
    if (title.trim() !== piece.trim()) throw new Error(`bar title=${title} piece=${piece}`);
    if (!(await vis(".jp-paper"))) throw new Error("paper hidden");
  });

  await check("immersive: dock sits at the bottom, collapsed", async () => {
    const box = await score.locator("#dock").boundingBox();
    const vh = score.viewportSize().height;
    if (!box || box.y + box.height < vh - 2) throw new Error(`dock bottom=${box && box.y + box.height} vh=${vh}`);
    // Park the pointer away from the dock first: it expands on hover.
    await score.mouse.move(5, 5);
    await score.waitForFunction(() => document.querySelector(".jp-console").getBoundingClientRect().top > window.innerHeight - 6);
    const grip = await score.locator("#dock").evaluate((el) => el.getBoundingClientRect().top);
    if (vh - grip > 40) throw new Error(`collapsed strip too tall: ${vh - grip}px`);
    await score.locator("#dock").hover();
    await score.waitForFunction(() => document.querySelector(".jp-console").getBoundingClientRect().top < window.innerHeight - 40);
    await score.mouse.move(5, 5);
    await score.waitForFunction(() => document.querySelector(".jp-console").getBoundingClientRect().top > window.innerHeight - 6);
  });

  await check("immersive: score re-fits the wider paper", async () => {
    const w = await score.evaluate(() => document.querySelector(".jp-paper").clientWidth);
    const svgW = await score.evaluate(() => {
      const svg = document.querySelector(".jp-paper > svg");
      return svg ? svg.getBoundingClientRect().width : 0;
    });
    if (!(svgW > 0 && svgW <= w + 1)) throw new Error(`svg=${svgW} paper=${w}`);
    const over = await score.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 1) throw new Error(`overflow=${over}px`);
  });

  // A practice page has to show at least four score lines, on desktops too.
  const rowsInView = (page) => page.evaluate(() => {
    const paper = document.querySelector("#paper");
    const box = paper.getBoundingClientRect();
    let shown = 0;
    for (const svg of paper.querySelectorAll(":scope > svg")) {
      const r = svg.getBoundingClientRect();
      if (r.top - box.top >= paper.clientHeight) break;
      let ink = -Infinity;
      for (const el of svg.querySelectorAll("text, path, use, rect")) {
        const b = el.getBoundingClientRect();
        if (b.width || b.height) ink = Math.max(ink, b.bottom);
      }
      if (Math.min(ink, box.bottom) - Math.max(box.top, r.top) > 0.5 * r.height) shown++;
    }
    return shown;
  });

  for (const size of [{ width: 1440, height: 940 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }]) {
    await check(`immersive: 4+ rows at ${size.width}x${size.height}`, async () => {
      const p = await browser.newPage({ viewport: size });
      await p.goto(`${BASE}/jianpu/`, { waitUntil: "networkidle" });
      await p.waitForSelector(".jp-paper > svg");
      await p.waitForTimeout(700);
      await p.locator("#immersive").click();
      await p.waitForTimeout(600);
      const shown = await rowsInView(p);
      const over = await p.evaluate(() => {
        const paper = document.querySelector("#paper");
        return paper.scrollWidth - paper.clientWidth;
      });
      await p.close();
      if (shown < 4) throw new Error(`rows=${shown}`);
      if (over > 1) throw new Error(`paper scrolls sideways by ${over}px`);
    });
  }

  await check("immersive: Esc restores everything", async () => {
    await score.keyboard.press("Escape");
    await score.waitForFunction(() => !document.body.classList.contains("is-immersive"));
    if (!(await vis(".jp-masthead"))) throw new Error("masthead not restored");
    if (!(await vis(".jp-library"))) throw new Error("library not restored");
    if (!(await vis(".jp-settings"))) throw new Error("settings not restored");
    if (await vis("#immersive-bar")) throw new Error("top bar still visible");
  });

  await check("immersive: F enters, F leaves, search field keeps its F", async () => {
    await score.keyboard.press("f");
    await score.waitForFunction(() => document.body.classList.contains("is-immersive"));
    await score.keyboard.press("f");
    await score.waitForFunction(() => !document.body.classList.contains("is-immersive"));
    await score.locator("#query").click();
    await score.keyboard.type("f");
    const value = await score.locator("#query").inputValue();
    if (value !== "f") throw new Error(`query=${value}`);
    if (await score.evaluate(() => document.body.classList.contains("is-immersive"))) throw new Error("typed f toggled immersive");
    await score.locator("#query").fill("");
  });

  // Mobile: drawer mode + immersive on a phone viewport.
  const mobile = await browser.newPage({ ...devices["iPhone 12"] });
  await mobile.goto(`${BASE}/#engineering`, { waitUntil: "networkidle" });
  await check("mobile engineering", async () => {
    await mobile.waitForFunction(() => document.body.dataset.mode === "engineering");
    const box = await mobile.locator("#mode-toggle").boundingBox();
    if (!box || box.width < 20) throw new Error("toggle not visible");
    await mobile.locator("#fft-f3").fill("80");
    await mobile.waitForFunction(() => document.getElementById("fft-f3-out")?.textContent === "80");
  });

  await check("mobile immersive", async () => {
    await mobile.goto(`${BASE}/jianpu/`, { waitUntil: "networkidle" });
    await mobile.waitForFunction(() => document.querySelectorAll(".jp-song").length > 0);
    await mobile.locator("#immersive").click();
    await mobile.waitForFunction(() => document.body.classList.contains("is-immersive"));
    if (await mobile.locator(".jp-masthead").isVisible()) throw new Error("masthead visible");
    if (!(await mobile.locator("#immersive-bar").isVisible())) throw new Error("bar hidden");
    await mobile.locator("#immersive-exit").click();
    await mobile.waitForFunction(() => !document.body.classList.contains("is-immersive"));
    if (!(await mobile.locator(".jp-masthead").isVisible())) throw new Error("masthead not restored");
  });

  await browser.close();
  if (errors.length) {
    console.error("\nVerification failed:");
    for (const e of errors) console.error("-", e);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

run();