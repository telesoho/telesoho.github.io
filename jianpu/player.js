/* 简谱工作台 · Telesoho Studio
   Playback, rendering and follow-highlight logic is the original jianpu/player.js,
   kept as-is; this file adds the workbench chrome around it (library tabs, favourites,
   recents, tempo, volume, loop, zoom, print, bar counter, drawers). Vendor code untouched. */
(function () {
  const editor = window.yueScoreEditor;
  const $ = (id) => document.getElementById(id);
  const listEl = $("list");
  const emptyEl = $("empty");
  const queryEl = $("query");
  const paper = $("paper");
  const titleEl = $("piece-title");
  const metaEl = $("piece-meta");
  const keyEl = $("key");
  const clockEl = $("clock");
  const seekEl = $("seek");
  const waveEl = $("wave");
  const benchEl = document.querySelector(".jp-bench");
  const libraryPanel = $("library");
  const settingsPanel = $("settings");
  const libraryBtn = $("library-toggle");
  const openLibraryBtn = $("open-library");
  const openSettingsBtn = $("open-settings");
  const closeSettingsBtn = $("close-settings");
  const scrim = $("scrim");
  const playBtn = $("play");
  const stopBtn = $("stop");
  const prevBtn = $("prev");
  const nextBtn = $("next");
  const loopBtn = $("loop");
  const jianpuBtn = $("view-jianpu");
  const staffBtn = $("view-staff");
  const leadBtn = $("view-lead");
  const diagramBtn = $("diagram-toggle");
  const followBtn = $("follow");
  const barStatus = $("bar-status");
  const soundStatus = $("sound-status");
  const voiceOut = $("voice");
  const tempoOut = $("tempo");
  const tempoDown = $("tempo-down");
  const tempoUp = $("tempo-up");
  const tempoReset = $("tempo-reset");
  const rateEl = $("rate");
  const meterOut = $("meter");
  const volumeEl = $("volume");
  const muteBtn = $("mute");
  const zoomOutBtn = $("zoom-out");
  const zoomInBtn = $("zoom-in");
  const zoomFitBtn = $("zoom-fit");
  const zoomLevel = $("zoom-level");
  const printBtn = $("print");
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.jp-tabs [role="tab"]'));
  const PLAY_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6l8-4.8z"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h2.6v10H4zm5.4 0H12v10H9.4z"/></svg>';
  const STAR_OFF = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2.2 2.4 5 5.4.7-4 3.8 1 5.4L10 14.5l-4.8 2.6 1-5.4-4-3.8 5.4-.7z"/></svg>';
  const DOC_ICON = '<svg class="jp-song__icon" viewBox="0 0 22 26" aria-hidden="true"><path d="M2 5h15l4 4v15H2zM7 1v10h14"/></svg>';
  const RATES = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5];
  const TEMPO_MIN = 30;
  const TEMPO_MAX = 240;

  editor.setStrings({
    jpLeadKey: "选调",
    jpLeadMeter: "拍号",
    jpLeadTempo: "拍速",
    jpCapoAt: "变调夹 {n}品",
    jpOriginalKey: "原调",
  });

  function readRaw(name) {
    try { return localStorage.getItem(name); } catch (err) { return null; }
  }
  function writeRaw(name, value) {
    try { localStorage.setItem(name, value); } catch (err) { /* private mode */ }
  }
  function readList(name) {
    try {
      const v = JSON.parse(readRaw(name) || "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch (err) { return []; }
  }

  let catalog = [];
  let current = null;
  let abc = "";
  let chosen = "";
  let notation = "jianpu";
  let diagramOn = true;
  let ctx = null;
  let master = null;
  let playing = false;
  let arming = false;
  let scrubbing = false;
  let resumeAfterScrub = false;
  let generation = 0;
  let timer = 0;
  let startedAt = 0;
  let playFrom = 0;
  let offset = 0;
  let total = 0;
  let marks = [];
  let playKey = "";
  let barKey = "";
  let renderer = null;
  let sourceAnchors = null;
  let sourceAnchorKey = "";
  let sourceScrollShown = null;
  let sourceScrollAt = 0;
  // Workbench state
  let baseBpm = 0;
  let tempoBpm = 0;
  let loopOn = readRaw("jianpu-loop") === "1";
  let followOn = readRaw("jianpu-follow") !== "0";
  // On phones the full-width page would shrink digits to ~6px; start readable instead.
  let zoom = window.matchMedia("(max-width: 600px)").matches ? 0.72 : "fit";
  let tab = "all";
  let favs = new Set(readList("jianpu-favs"));
  let recent = readList("jianpu-recent");
  let volume = Number(readRaw("jianpu-volume"));
  if (!Number.isFinite(volume) || readRaw("jianpu-volume") == null) volume = 80;
  let muted = false;
  let barInfo = null;
  let barShown = "";
  let waveBars = [];
  let wavePlayed = -1;
  let loadToken = 0;
  const texts = new Map();
  const durations = new Map();
  const voices = [];
  const SOURCE_ROW_Y_TOL = 18;
  const SOURCE_SCROLL_TAU = 0.16;

  function label(name) {
    return String(name || "").endsWith("m") ? "6=" + name.slice(0, -1) : "1=" + name;
  }

  function clock(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
  }

  function clampTime(seconds) {
    const at = Number(seconds);
    if (!Number.isFinite(at)) return 0;
    return Math.max(0, Math.min(total || 0, at));
  }

  // Timing follows the chosen tempo: the drawn score keeps its own Q:, only the
  // copy fed to timeline()/playMarks() is re-tempoed, so every time scales 1:1.
  function withTempo(src, bpm) {
    const text = String(src || "");
    if (!bpm) return text;
    if (/^Q:1\/4=\d+/m.test(text)) return text.replace(/^Q:1\/4=\d+/m, "Q:1/4=" + bpm);
    if (/^X:[^\n]*\n/m.test(text)) return text.replace(/^(X:[^\n]*\n)/m, "$1Q:1/4=" + bpm + "\n");
    return "Q:1/4=" + bpm + "\n" + text;
  }

  function timingSrc() {
    return tempoBpm && tempoBpm !== baseBpm ? withTempo(abc, tempoBpm) : abc;
  }

  function lengthOf(src) {
    const score = editor.timeline(src);
    if (score.error) return 0;
    const m = editor.playMarks(src);
    const noteEnd = (score.notes || []).reduce((max, note) => Math.max(max, note.start + note.duration), 0);
    const markEnd = m.reduce((max, mark) => Math.max(max, mark.start), 0);
    return Math.max(noteEnd, markEnd);
  }

  function refreshTiming() {
    const src = timingSrc();
    const score = editor.timeline(src);
    marks = score.error ? [] : editor.playMarks(src);
    const noteEnd = (score.notes || []).reduce((max, note) => Math.max(max, note.start + note.duration), 0);
    const markEnd = marks.reduce((max, mark) => Math.max(max, mark.start), 0);
    total = Math.max(noteEnd, markEnd);
    drawWave(score);
    return score;
  }

  function nowPlaying() {
    if (!playing || !ctx) return offset;
    return Math.min(total, playFrom + Math.max(0, ctx.currentTime - startedAt));
  }

  function stopVoices() {
    for (const node of voices.splice(0)) {
      try { if (node.stop) node.stop(); } catch (err) { /* already stopped */ }
    }
  }

  function haltAudio() {
    playing = false;
    arming = false;
    generation += 1;
    if (timer) cancelAnimationFrame(timer);
    timer = 0;
    stopVoices();
  }

  function setPlayLabel(live) {
    const on = !!live;
    playBtn.innerHTML = on ? PAUSE_ICON : PLAY_ICON;
    playBtn.setAttribute("aria-label", on ? "暂停" : "播放");
    playBtn.setAttribute("aria-pressed", on ? "true" : "false");
    playBtn.title = on ? "暂停（空格）" : "播放（空格）";
    document.body.classList.toggle("is-playing", on);
  }

  function pause() {
    if (!playing && !arming) return;
    offset = nowPlaying();
    haltAudio();
    setPlayLabel(false);
    paint(offset);
  }

  function togglePlay() {
    if (playing || arming) pause();
    else void play();
  }

  function clearMotion() {
    paper.querySelectorAll(".is-on").forEach((el) => el.classList.remove("is-on"));
  }

  function clearBarOn() {
    paper.querySelectorAll("rect.bar-on").forEach((el) => el.remove());
    barKey = "";
  }

  function clearSourceScroll() {
    sourceAnchors = null;
    sourceAnchorKey = "";
    sourceScrollShown = null;
    sourceScrollAt = 0;
  }

  function clearPlayhead() {
    clearMotion();
    clearBarOn();
    clearSourceScroll();
    playKey = "";
  }

  function glowNote(el) {
    if (!el) return;
    el.classList.add("is-on");
    if (el.dataset.lyric === "1" || el.dataset.adorn === "1") return;
    const voice = el.dataset.voice || "";
    const idx = el.dataset.idx || "";
    const slice = el.dataset.slice || "0";
    paper.querySelectorAll('[data-adorn="1"]').forEach((adorn) => {
      if ((adorn.dataset.voice || "") !== voice) return;
      if ((adorn.dataset.idx || "") !== idx) return;
      if ((adorn.dataset.slice || "0") !== slice) return;
      adorn.classList.add("is-on");
    });
  }

  function viewBoxOf(svg) {
    const parts = String(svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
    try {
      const bb = svg.getBBox();
      return { x: bb.x, y: bb.y, w: bb.width || 1, h: bb.height || 1 };
    } catch (err) {
      return { x: 0, y: 0, w: 1, h: 1 };
    }
  }

  // Barlines share one path.d of Mx yv-h segments; thick bars sit ~3 units apart.
  function barXs(svg) {
    const xs = [];
    svg.querySelectorAll("path.bW, path.bthW").forEach((path) => {
      const d = path.getAttribute("d") || "";
      const re = /M\s*([-\d.]+)[\s,]+[-\d.]+/g;
      let match;
      while ((match = re.exec(d))) xs.push(Number(match[1]));
    });
    xs.sort((a, b) => a - b);
    const merged = [];
    for (const x of xs) {
      if (!Number.isFinite(x)) continue;
      if (!merged.length || x - merged[merged.length - 1] > 8) merged.push(x);
    }
    return merged;
  }

  function barSpanFor(node) {
    const svg = node && node.ownerSVGElement;
    if (!svg) return null;
    let box;
    try { box = node.getBBox(); } catch (err) { return null; }
    const cx = box.x + box.width / 2;
    const vb = viewBoxOf(svg);
    const xs = barXs(svg);
    if (!xs.length) return { svg: svg, x: vb.x, w: vb.w, y: vb.y, h: vb.h };
    let left = vb.x;
    let right = vb.x + vb.w;
    for (let i = 0; i < xs.length; i++) {
      if (cx < xs[i]) {
        right = xs[i];
        break;
      }
      left = xs[i];
    }
    const w = Math.max(1, right - left);
    return { svg: svg, x: left, w: w, y: vb.y, h: vb.h };
  }

  function paintBar(node) {
    // Keep the bar while paused/scrubbed mid-piece; clear only when idle at 0 (stop).
    if (!node || (!playing && !scrubbing && !(offset > 0))) {
      clearBarOn();
      return;
    }
    const span = barSpanFor(node);
    if (!span) {
      clearBarOn();
      return;
    }
    const nextKey = [
      Array.prototype.indexOf.call(paper.querySelectorAll("svg"), span.svg),
      span.x.toFixed(1),
      span.w.toFixed(1),
    ].join(":");
    if (nextKey === barKey) return;
    clearBarOn();
    barKey = nextKey;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "bar-on");
    rect.setAttribute("x", String(span.x));
    rect.setAttribute("y", String(span.y));
    rect.setAttribute("width", String(span.w));
    rect.setAttribute("height", String(span.h));
    span.svg.insertBefore(rect, span.svg.firstChild);
  }

  function collectRowAnchors() {
    if (!paper.getBoundingClientRect) return [];
    const paperBox = paper.getBoundingClientRect();
    const scrollTop = paper.scrollTop || 0;
    const byKey = new Map();
    for (const el of paper.querySelectorAll("[data-start]")) {
      if (el.dataset.adorn === "1" || el.dataset.lyric === "1") continue;
      const voice = el.dataset.voice || "Vocal";
      byKey.set(voice + ":" + el.dataset.idx + ":" + (el.dataset.slice || "0"), el);
    }
    const items = [];
    for (const mark of marks) {
      if (!mark || (mark.voice && mark.voice !== "Vocal")) continue;
      const node = byKey.get((mark.voice || "Vocal") + ":" + mark.index + ":" + mark.slice);
      if (!node || !node.getBoundingClientRect) continue;
      const box = node.getBoundingClientRect();
      items.push({
        t: mark.start,
        y: box.top - paperBox.top + scrollTop,
      });
    }
    items.sort((a, b) => a.t - b.t || a.y - b.y);
    const rows = [];
    for (const item of items) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(item.y - last.y) < SOURCE_ROW_Y_TOL) continue;
      rows.push({ t: item.t, y: item.y });
    }
    return rows;
  }

  function followSourceScroll(now) {
    if (!playing || !followOn || notation === "lead") return;
    const key = (paper.clientWidth || 0) + "x" + (paper.scrollHeight || 0);
    if (!sourceAnchors || sourceAnchorKey !== key) {
      sourceAnchors = collectRowAnchors();
      sourceAnchorKey = key;
    }
    const view = paper.clientHeight || 0;
    const maxScroll = Math.max(0, (paper.scrollHeight || 0) - view);
    const target = editor.sourceScrollTop(sourceAnchors, now, view, maxScroll);
    const nowMs = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const dt = sourceScrollShown == null || !sourceScrollAt
      ? 0
      : Math.max(0, (nowMs - sourceScrollAt) / 1000);
    const snap = Math.max(80, view * 0.5);
    const next = sourceScrollShown == null
      ? target
      : editor.easeScrollStep(sourceScrollShown, target, dt, SOURCE_SCROLL_TAU, snap);
    sourceScrollShown = next;
    sourceScrollAt = nowMs;
    paper.scrollTop = next;
  }

  function findHit(voice, index, slice, lyric) {
    for (const el of paper.querySelectorAll("[data-start]")) {
      if (el.dataset.adorn === "1") continue;
      if ((el.dataset.lyric === "1") !== lyric) continue;
      if ((el.dataset.voice || "") !== voice) continue;
      if (Number(el.dataset.idx) !== index) continue;
      if (Number(el.dataset.slice || 0) !== slice) continue;
      return el;
    }
    return null;
  }

  function nodeFor(mark) {
    if (!mark) return null;
    return findHit(mark.voice, mark.index, mark.slice, false)
      || (notation === "staff" ? findHit(mark.voice, mark.index, 0, false) : null);
  }

  function lyricFor(mark) {
    if (!mark || mark.voice !== "Vocal") return null;
    return findHit("Vocal", mark.index, 0, true);
  }

  function marksOf(voice) {
    return marks.filter((mark) => mark.voice === voice);
  }

  function markKey(mark) {
    return mark ? mark.voice + ":" + mark.index + ":" + mark.slice : "";
  }

  function paint(seconds) {
    const shown = clampTime(seconds);
    clockEl.textContent = clock(shown) + " / " + clock(total);
    seekEl.max = String(total || 0);
    if (!scrubbing) seekEl.value = String(shown);
    seekEl.setAttribute("aria-valuetext", clock(shown));
    paintExtras(shown);
    if (playing) followSourceScroll(shown);
    const followMark = editor.followMark(marks, shown)
      || editor.cursorAt(marksOf("Vocal"), shown)
      || editor.cursorAt(marksOf("Ins"), shown);
    const followNode = nodeFor(followMark);
    paintBar(followNode);
    const vocalMark = editor.cursorAt(marksOf("Vocal"), shown);
    const insMark = editor.cursorAt(marksOf("Ins"), shown);
    const key = markKey(vocalMark) + "|" + markKey(insMark);
    if (key === playKey) return;
    playKey = key;
    clearMotion();
    glowNote(nodeFor(vocalMark));
    glowNote(lyricFor(vocalMark));
    glowNote(nodeFor(insMark));
  }

  function fitDiagramSvg(svg) {
    return String(svg || "").replace(/<svg\b[\s\S]*?<\/svg>/g, (doc) => {
      if (doc.indexOf('class="diag"') < 0) return doc;
      const re = /<g(?: class="diag")? transform="translate\(([-\d.]+),([-\d.]+)\)"|<\/g>/g;
      let match;
      let ty = 0;
      const stack = [];
      const tops = [];
      while ((match = re.exec(doc))) {
        if (match[0] === "</g>") {
          ty = stack.length ? stack.pop() : 0;
          continue;
        }
        stack.push(ty);
        ty += Number(match[2]);
        if (match[0].indexOf("diag") >= 0) tops.push(ty - 34);
      }
      if (!tops.length) return doc;
      const minTop = Math.min.apply(null, tops);
      const pad = 6;
      if (minTop >= pad) return doc;
      const dy = pad - minTop;
      if (!/viewBox="0 0 [\d.]+ [\d.]+"/.test(doc) || !/height="[\d.]+px"/.test(doc)) return doc;
      const opened = doc.replace(/<svg\b([^>]*)>/, (_, attrs) => {
        const next = attrs
          .replace(/viewBox="0 0 ([\d.]+) ([\d.]+)"/, (__, w, h) =>
            'viewBox="0 0 ' + w + " " + (Number(h) + dy).toFixed(0) + '"')
          .replace(/height="([\d.]+)px"/, (__, h) =>
            'height="' + (Number(h) + dy).toFixed(0) + 'px"');
        return '<svg' + next + '><g transform="translate(0,' + dy.toFixed(1) + ')">';
      });
      return opened.replace(/<\/svg>\s*$/, "</g></svg>");
    });
  }

  function digitNodes(voice) {
    const nodes = [...paper.querySelectorAll("text.fj.v-" + voice)].filter((el) =>
      /^[0-7]$/.test((el.textContent || "").trim()));
    if (nodes.length || voice !== "Vocal") return nodes;
    return [...paper.querySelectorAll("text.fj")].filter((el) =>
      /^[0-7]$/.test((el.textContent || "").trim()));
  }

  function tagHit(el, mark, lyric) {
    el.dataset.voice = mark.voice;
    el.dataset.idx = String(mark.index);
    el.dataset.slice = String(mark.slice || 0);
    el.dataset.start = String(mark.start);
    if (lyric) el.dataset.lyric = "1";
  }

  // Accidentals (.jacc) and octave dots sit beside the digit; duration dots sit to the right.
  function tagAdornments(digit) {
    const svg = digit.ownerSVGElement;
    if (!svg || !digit.getBoundingClientRect) return;
    let box;
    try { box = digit.getBoundingClientRect(); } catch (err) { return; }
    if (!(box.width || box.height)) return;
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;
    const padX = Math.max(16, box.width * 2.2);
    const padY = Math.max(22, box.height * 2.4);
    svg.querySelectorAll("text").forEach((el) => {
      if (el === digit || el.classList.contains("fj")) return;
      if (el.dataset.lyric === "1" || el.dataset.start) return;
      const cls = el.getAttribute("class") || "";
      const isJacc = el.classList.contains("jacc");
      if (!isJacc && /(?:^|\s)f\d+/.test(cls)) return;
      let b;
      try { b = el.getBoundingClientRect(); } catch (err) { return; }
      if (!(b.width || b.height)) return;
      const ex = (b.left + b.right) / 2;
      const ey = (b.top + b.bottom) / 2;
      if (ex > box.right + 6) return;
      if (Math.abs(ex - cx) > padX || Math.abs(ey - cy) > padY) return;
      el.dataset.voice = digit.dataset.voice;
      el.dataset.idx = digit.dataset.idx;
      el.dataset.slice = digit.dataset.slice || "0";
      el.dataset.start = digit.dataset.start;
      el.dataset.adorn = "1";
    });
  }

  function bindJianpu() {
    for (const voice of ["Vocal", "Ins"]) {
      const nodes = digitNodes(voice);
      const voiceMarks = marks.filter((mark) => mark.voice === voice);
      const count = Math.min(nodes.length, voiceMarks.length);
      for (let i = 0; i < count; i++) {
        tagHit(nodes[i], voiceMarks[i], false);
        tagAdornments(nodes[i]);
      }
    }
    const vocal = digitNodes("Vocal");
    const events = editor.listEvents(abc);
    const drawn = {};
    events.forEach((ev) => {
      if (editor.lyricIsDrawn(ev.lyric)) drawn[ev.index] = true;
    });
    const headBoxes = [];
    vocal.forEach((el) => {
      if (!el.getBoundingClientRect) return;
      const box = el.getBoundingClientRect();
      if (!(box.width || box.height)) return;
      headBoxes.push({
        x: (box.left + box.right) / 2,
        y: (box.top + box.bottom) / 2,
        h: box.height,
        index: Number(el.dataset.idx),
        voice: "Vocal",
      });
    });
    const glyphs = [];
    paper.querySelectorAll("text").forEach((el) => {
      if (el.classList.contains("fj") || el.classList.contains("jacc")) return;
      const cls = el.getAttribute("class") || "";
      if (!/(?:^|\s)f\d+/.test(cls)) return;
      const text = (el.textContent || "").replace(/\s+/g, "");
      if (!text || text === "V:" || text === "A:" || text.indexOf("=") >= 0) return;
      if (!el.getBoundingClientRect) return;
      const box = el.getBoundingClientRect();
      if (!(box.width || box.height)) return;
      glyphs.push({ el: el, x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 });
    });
    const heights = headBoxes.map((head) => head.h).filter((h) => h > 0).sort((a, b) => a - b);
    const noteH = heights.length ? heights[(heights.length / 2) | 0] : 16;
    const maxGap = Math.max(48, noteH * 4);
    const hits = editor.assignLyricHits(headBoxes, glyphs, drawn, {
      rowSlack: Math.max(4, noteH * 0.6),
      maxGap: maxGap,
    });
    const claimed = new Set();
    const claim = (hit) => {
      if (!hit || claimed.has(hit.index)) return;
      const el = hit.glyph && hit.glyph.el;
      const start = editor.markTime(marks, "Vocal", hit.index, 0);
      if (!el || start == null) return;
      claimed.add(hit.index);
      tagHit(el, { voice: "Vocal", index: hit.index, slice: 0, start: start }, true);
    };
    hits.forEach(claim);
    const claimedGlyph = new Set(hits.map((hit) => hit.glyph));
    const xs = headBoxes.map((head) => head.x).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    let neighbor = 36;
    for (let i = 1; i < xs.length; i++) {
      const gap = xs[i] - xs[i - 1];
      if (gap > 4 && gap < neighbor) neighbor = gap;
    }
    editor.glyphsUnderNotes(
      headBoxes.filter((head) => !claimed.has(head.index)),
      glyphs.filter((glyph) => !claimedGlyph.has(glyph)),
      { maxGap: maxGap, xSlack: Math.max(16, neighbor * 0.65) },
    ).forEach(claim);
  }

  function bindStaff() {
    const groups = { Vocal: [], Ins: [] };
    const lyrics = [];
    paper.querySelectorAll("rect.hit").forEach((el) => {
      if (el.dataset.kind === "lyrics") lyrics.push(el);
      else if (groups[el.dataset.voice]) groups[el.dataset.voice].push(el);
    });
    for (const voice of ["Vocal", "Ins"]) {
      const slots = [];
      const seen = new Set();
      for (const mark of marks) {
        if (mark.voice !== voice || seen.has(mark.index)) continue;
        seen.add(mark.index);
        slots.push(mark);
      }
      const nodes = groups[voice];
      const count = Math.min(nodes.length, slots.length);
      for (let i = 0; i < count; i++) tagHit(nodes[i], slots[i], false);
    }
    const lyricMarks = [];
    for (const ev of editor.listEvents(abc)) {
      if (!editor.lyricIsDrawn(ev.lyric)) continue;
      const start = editor.markTime(marks, "Vocal", ev.index, 0);
      if (start == null) continue;
      lyricMarks.push({ voice: "Vocal", index: ev.index, slice: 0, start: start });
    }
    const count = Math.min(lyrics.length, lyricMarks.length);
    for (let i = 0; i < count; i++) tagHit(lyrics[i], lyricMarks[i], true);
  }

  function bindHits() {
    if (notation === "staff") bindStaff();
    else bindJianpu();
  }

  // ---- workbench additions -------------------------------------------------

  // Bar numbers for the vocal line, counted the same way the editor scans it:
  // "|" closes a bar, Zn spans n bars. Used for the "当前小节" read-out only.
  const BAR_TOKEN = /^(?:"[^"\n]*"|\[[A-Za-z]:[^\]\n]*\]|(?:\^\^|__|\^|_|=)?[A-Ga-gz][,']*[0-9]*-?)/;
  function scanBars(src) {
    const lines = String(src || "").split(/\r?\n/);
    const eventBar = [];
    const eventSpan = [];
    let bar = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== "V: Vocal") continue;
      let j = i + 1;
      while (j < lines.length && /^(M:|K:)/.test(lines[j])) j += 1;
      if (j >= lines.length) break;
      const line = lines[j];
      let open = false;
      let k = 0;
      while (k < line.length) {
        const ch = line[k];
        if (ch === "|") { if (open) bar += 1; open = false; k += 1; continue; }
        if (/\s/.test(ch)) { k += 1; continue; }
        const z = /^Z([2-4])?/.exec(line.slice(k));
        if (z) {
          const n = z[1] ? Number(z[1]) : 1;
          eventBar.push(bar + 1);
          eventSpan.push(n);
          bar += n - 1;
          open = true;
          k += z[0].length;
          continue;
        }
        const t = BAR_TOKEN.exec(line.slice(k));
        if (!t) { k += 1; continue; }
        if (/^[\^_=]*[A-Ga-gz]/.test(t[0])) {
          eventBar.push(bar + 1);
          eventSpan.push(1);
          open = true;
        }
        k += t[0].length;
      }
      if (open) bar += 1;
      i = j;
    }
    return { eventBar: eventBar, eventSpan: eventSpan, total: bar };
  }

  function barFor(now) {
    if (!barInfo || !barInfo.total) return 0;
    const mark = editor.followMark ? editor.followMark(marks, now) : null;
    if (!mark || (mark.voice && mark.voice !== "Vocal")) return 0;
    const base = barInfo.eventBar[mark.index];
    if (!base) return 0;
    const span = barInfo.eventSpan[mark.index] || 1;
    return base + (span > 1 ? Math.min(span - 1, mark.slice || 0) : 0);
  }

  function drawWave(score) {
    const notes = (score && score.notes) || [];
    const width = waveEl.clientWidth || 360;
    const count = Math.max(24, Math.min(96, Math.round(width / 7)));
    const raw = new Array(count).fill(0);
    if (total > 0) {
      for (const note of notes) {
        const at = Math.min(count - 1, Math.max(0, Math.floor((note.start / total) * count)));
        raw[at] += 0.6 + Math.min(2, note.duration);
      }
    }
    // light smoothing so the strip reads like a waveform, not a comb
    const energy = raw.map((v, i) => (v * 2 + (raw[i - 1] || 0) + (raw[i + 1] || 0)) / 4);
    const peak = Math.max(1e-6, ...energy);
    const key = count + ":" + energy.join(",");
    if (waveEl.dataset.key === key) return;
    waveEl.dataset.key = key;
    waveEl.innerHTML = "";
    waveBars = [];
    wavePlayed = -1;
    for (let i = 0; i < count; i++) {
      const bar = document.createElement("i");
      const h = energy[i] > 0 ? 14 + 86 * Math.pow(energy[i] / peak, 0.8) : 6;
      bar.style.height = h.toFixed(1) + "%";
      waveEl.appendChild(bar);
      waveBars.push(bar);
    }
  }

  let sideAt = 0;
  function followSideways() {
    if (!playing || !followOn || notation === "lead") return;
    if (paper.scrollWidth <= paper.clientWidth + 4) return;
    const nowMs = performance.now();
    if (nowMs - sideAt < 250) return;
    sideAt = nowMs;
    const node = paper.querySelector("text.fj.is-on, rect.hit.is-on");
    if (!node) return;
    const box = node.getBoundingClientRect();
    const view = paper.getBoundingClientRect();
    const margin = view.width * 0.18;
    if (box.left < view.left + margin || box.right > view.right - margin) {
      paper.scrollLeft += box.left - view.left - view.width * 0.35;
    }
  }

  function paintExtras(shown) {
    followSideways();
    const pct = total > 0 ? Math.max(0, Math.min(1, shown / total)) : 0;
    seekEl.style.setProperty("--p", (pct * 100).toFixed(2) + "%");
    const played = Math.round(pct * waveBars.length);
    if (played !== wavePlayed) {
      for (let i = 0; i < waveBars.length; i++) waveBars[i].classList.toggle("is-played", i < played);
      wavePlayed = played;
    }
    let text = "当前小节 —";
    if (barInfo && barInfo.total) {
      const n = (playing || scrubbing || shown > 0) ? barFor(shown) : 0;
      text = "当前小节 " + (n || "—") + " / " + barInfo.total;
    }
    if (text !== barShown) {
      barShown = text;
      barStatus.textContent = text;
    }
  }

  function headerMeters(src) {
    const seen = [];
    String(src || "").replace(/^M:\s*(\d+\s*\/\s*\d+|C\|?)/gm, (all, m) => {
      const v = m.replace(/\s+/g, "");
      if (seen.indexOf(v) < 0) seen.push(v);
      return all;
    });
    return seen;
  }

  function showMeta(info) {
    const meters = headerMeters(abc);
    const meterText = meters.length ? meters[0] + (meters.length > 1 ? "（含 " + meters.slice(1).join("、") + "）" : "") : "—";
    meterOut.textContent = meterText;
    meterOut.title = meters.length > 1 ? "曲中有变拍：" + meters.join(" → ") : "";
    const parts = [label(info.keyName || (current && current.key) || "C")];
    if (chosen && chosen !== info.keyName) parts[0] += "（选调 " + label(chosen) + "）";
    if (meters.length) parts.push(meters[0] + " 拍" + (meters.length > 1 ? "（有变拍）" : ""));
    parts.push("♩=" + (tempoBpm || baseBpm));
    if (total > 0) parts.push("时长 " + clock(total));
    metaEl.textContent = "";
    parts.forEach((part, i) => {
      if (i) metaEl.appendChild(document.createTextNode(" · "));
      const span = document.createElement("span");
      span.textContent = part;
      metaEl.appendChild(span);
    });
  }

  // Tempo ---------------------------------------------------------------
  function syncTempoUI() {
    const on = !!abc && baseBpm > 0;
    tempoOut.textContent = on ? String(tempoBpm) : "—";
    tempoDown.disabled = !on || tempoBpm <= TEMPO_MIN;
    tempoUp.disabled = !on || tempoBpm >= TEMPO_MAX;
    tempoReset.hidden = !on || tempoBpm === baseBpm;
    tempoReset.textContent = "恢复原速 " + baseBpm;
    rateEl.disabled = !on;
    const ratio = on ? tempoBpm / baseBpm : 1;
    let match = "";
    for (const r of RATES) if (Math.round(baseBpm * r) === tempoBpm) { match = String(r); break; }
    let custom = rateEl.querySelector('option[data-custom]');
    if (!match && on) {
      if (!custom) {
        custom = document.createElement("option");
        custom.dataset.custom = "1";
        rateEl.appendChild(custom);
      }
      custom.value = "custom";
      custom.textContent = ratio.toFixed(2).replace(/0$/, "") + "×";
      rateEl.value = "custom";
    } else {
      if (custom) custom.remove();
      rateEl.value = match || "1";
    }
  }

  function setTempo(next) {
    if (!abc || !baseBpm) return;
    const bpm = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, Math.round(Number(next))));
    if (!Number.isFinite(bpm) || bpm === tempoBpm) { syncTempoUI(); return; }
    const live = playing || arming;
    const at = live ? nowPlaying() : offset;
    const old = tempoBpm || baseBpm;
    haltAudio();
    tempoBpm = bpm;
    offset = at * old / bpm;
    refreshTiming();
    offset = clampTime(offset);
    retagHits();
    syncTempoUI();
    showMeta(editor.inspectScore(abc));
    if (live) void play(offset);
    else { setPlayLabel(false); playKey = ""; paint(offset); }
  }

  // Re-time the existing drawing (data-start) without redrawing the paper.
  function retagHits() {
    if (notation === "lead") return;
    const at = new Map();
    for (const mark of marks) at.set(mark.voice + ":" + mark.index + ":" + (mark.slice || 0), mark.start);
    paper.querySelectorAll("[data-start]").forEach((el) => {
      const slice = el.dataset.lyric === "1" ? "0" : (el.dataset.slice || "0");
      const start = at.get((el.dataset.voice || "") + ":" + el.dataset.idx + ":" + slice);
      if (start != null) el.dataset.start = String(start);
    });
    clearSourceScroll();
  }

  // Volume --------------------------------------------------------------
  function ensureCtx() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    // piano.js connects every voice to ctx.destination; route that through one gain.
    try {
      const real = ctx.destination;
      const gain = ctx.createGain();
      gain.connect(real);
      Object.defineProperty(ctx, "destination", { configurable: true, get: () => gain });
      if (ctx.destination === gain) master = gain;
      else gain.disconnect();
    } catch (err) {
      master = null;
    }
    if (!master) {
      volumeEl.disabled = true;
      muteBtn.disabled = true;
      volumeEl.title = "此浏览器不支持网页内音量，请用系统音量";
    }
    applyVolume();
    return ctx;
  }

  function applyVolume() {
    const v = muted ? 0 : volume / 100;
    if (master) {
      try { master.gain.setTargetAtTime(v * v * 1.25, ctx.currentTime, 0.02); } catch (err) { master.gain.value = v * v * 1.25; }
    }
    volumeEl.value = String(volume);
    volumeEl.style.setProperty("--p", volume + "%");
    volumeEl.setAttribute("aria-valuetext", muted ? "静音" : volume + "%");
    muteBtn.setAttribute("aria-pressed", muted || volume === 0 ? "true" : "false");
    muteBtn.setAttribute("aria-label", muted ? "取消静音" : "静音");
    muteBtn.title = muted ? "取消静音" : "静音";
    muteBtn.classList.toggle("is-muted", muted || volume === 0);
  }

  function showVoice(result) {
    if (!ctx || !window.yuePiano) return;
    const have = (window.yuePiano.voice && window.yuePiano.voice(ctx)) || result || null;
    const kind = have && have.kind;
    voiceOut.textContent = kind === "sampled" ? "钢琴（采样音色）" : kind === "synthetic" ? "钢琴（合成音色）" : "钢琴（音色载入中）";
    soundStatus.textContent = kind === "sampled" ? "采样钢琴" : kind === "synthetic" ? "合成钢琴（采样未载入）" : "钢琴音色载入中…";
  }

  // Zoom & print --------------------------------------------------------
  function leadFrame() {
    return notation === "lead" ? paper.querySelector("iframe") : null;
  }

  function applyZoom() {
    const frame = leadFrame();
    zoomFitBtn.setAttribute("aria-pressed", zoom === "fit" ? "true" : "false");
    paper.classList.toggle("is-zoomed", zoom !== "fit");
    if (frame) {
      const z = zoom === "fit" ? 1 : zoom;
      try {
        const doc = frame.contentDocument;
        if (doc && doc.documentElement) doc.documentElement.style.zoom = String(z);
      } catch (err) { /* not ready */ }
      zoomLevel.textContent = Math.round(z * 100) + "%";
      syncZoomButtons(z);
      return;
    }
    const svgs = Array.prototype.slice.call(paper.querySelectorAll(":scope > svg"));
    if (!svgs.length) { zoomLevel.textContent = "100%"; return; }
    const style = getComputedStyle(paper);
    const avail = Math.max(120, paper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const widest = svgs.reduce((max, svg) => Math.max(max, viewBoxOf(svg).w), 1);
    const fit = avail / widest;
    const scale = zoom === "fit" ? fit : zoom;
    for (const svg of svgs) {
      const vb = viewBoxOf(svg);
      svg.style.width = (vb.w * scale).toFixed(1) + "px";
      svg.style.height = (vb.h * scale).toFixed(1) + "px";
    }
    zoomLevel.textContent = Math.round(scale * 100) + "%";
    syncZoomButtons(scale);
    clearSourceScroll();
  }

  function currentScale() {
    if (zoom !== "fit") return zoom;
    const svg = paper.querySelector(":scope > svg");
    if (!svg) return 1;
    return (parseFloat(svg.style.width) || viewBoxOf(svg).w) / viewBoxOf(svg).w;
  }

  function syncZoomButtons(scale) {
    zoomOutBtn.disabled = scale <= 0.41;
    zoomInBtn.disabled = scale >= 2.49;
  }

  function stepZoom(dir) {
    const now = currentScale();
    const next = Math.max(0.4, Math.min(2.5, Math.round(now * (dir > 0 ? 1.15 : 1 / 1.15) * 100) / 100));
    zoom = next;
    applyZoom();
  }

  // Library: tabs, favourites, recents -----------------------------------
  function saveFavs() { writeRaw("jianpu-favs", JSON.stringify(Array.from(favs))); }
  function saveRecent() { writeRaw("jianpu-recent", JSON.stringify(recent)); }

  function tabEntries() {
    if (tab === "fav") return catalog.filter((entry) => favs.has(entry.id));
    if (tab === "recent") return recent.map((id) => catalog.find((entry) => entry.id === id)).filter(Boolean);
    return catalog;
  }

  function setTab(next, focus) {
    tab = next;
    for (const t of tabs) {
      const on = t.dataset.tab === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (on) listEl.setAttribute("aria-labelledby", t.id);
      if (on && focus) t.focus();
    }
    drawList();
  }

  function drawList(focusId) {
    const query = queryEl.value.trim().toLowerCase();
    const shown = tabEntries().filter((entry) => !query || String(entry.title || "").toLowerCase().includes(query));
    emptyEl.hidden = shown.length > 0;
    if (!shown.length) {
      emptyEl.textContent = query ? "没有匹配“" + queryEl.value.trim() + "”的曲谱。"
        : tab === "fav" ? "还没有收藏。点曲目右侧的 ☆ 收藏。"
          : tab === "recent" ? "还没有打开过的曲谱。" : "简谱库是空的。";
    }
    listEl.innerHTML = "";
    for (const entry of shown) {
      const item = document.createElement("li");
      item.className = "jp-song";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "jp-song__open";
      const on = current && current.id === entry.id;
      if (on) { button.setAttribute("aria-current", "true"); item.classList.add("is-current"); }
      const len = durations.get(entry.id);
      button.innerHTML = DOC_ICON;
      const name = document.createElement("span");
      name.className = "jp-song__title";
      name.textContent = entry.title || entry.id;
      const meta = document.createElement("span");
      meta.className = "jp-song__meta";
      const key = document.createElement("span");
      key.className = "jp-song__key";
      key.textContent = label(entry.key || "C");
      meta.appendChild(key);
      if (len) {
        const time = document.createElement("span");
        time.className = "jp-song__time";
        time.textContent = clock(len);
        time.setAttribute("aria-label", "时长 " + clock(len));
        meta.appendChild(time);
      }
      button.appendChild(name);
      button.appendChild(meta);
      button.addEventListener("click", () => {
        void openPiece(entry);
        closeDrawers();
      });
      const star = document.createElement("button");
      star.type = "button";
      star.className = "jp-song__fav";
      star.dataset.id = entry.id;
      const fav = favs.has(entry.id);
      star.setAttribute("aria-pressed", fav ? "true" : "false");
      star.setAttribute("aria-label", (fav ? "取消收藏 " : "收藏 ") + (entry.title || entry.id));
      star.title = fav ? "取消收藏" : "收藏";
      star.innerHTML = STAR_OFF;
      star.addEventListener("click", () => {
        if (favs.has(entry.id)) favs.delete(entry.id);
        else favs.add(entry.id);
        saveFavs();
        drawList(entry.id);
      });
      item.appendChild(button);
      item.appendChild(star);
      listEl.appendChild(item);
    }
    if (focusId) {
      const again = listEl.querySelector('.jp-song__fav[data-id="' + CSS.escape(focusId) + '"]');
      if (again) again.focus();
      else listEl.focus();
    }
    const list = navList();
    const at = current ? list.findIndex((entry) => entry.id === current.id) : -1;
    prevBtn.disabled = !current || list.length < 2;
    nextBtn.disabled = !current || list.length < 2;
    void at;
  }

  function navList() {
    const shown = tabEntries();
    return current && shown.some((entry) => entry.id === current.id) ? shown : catalog;
  }

  function stepPiece(dir) {
    const list = navList();
    if (!current || list.length < 2) return;
    const at = list.findIndex((entry) => entry.id === current.id);
    const next = list[(at + dir + list.length) % list.length];
    const keep = playing || arming;
    void openPiece(next, keep);
  }

  function loadText(id) {
    if (texts.has(id)) return Promise.resolve(texts.get(id));
    return fetch("../scores/" + encodeURIComponent(id) + ".abc").then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    }).then((text) => {
      texts.set(id, text);
      return text;
    });
  }

  function measureCatalog() {
    let chain = Promise.resolve();
    for (const entry of catalog) {
      chain = chain.then(() => loadText(entry.id)).then((text) => {
        const len = lengthOf(text);
        if (len > 0) durations.set(entry.id, len);
      }).catch(() => { /* leave unknown */ });
    }
    chain.then(() => drawList());
  }

  // Drawers (≤1100px) -----------------------------------------------------
  const drawerMq = window.matchMedia("(max-width: 1100px)");
  let drawerOpen = null;
  let drawerReturn = null;

  function isDrawerMode() { return drawerMq.matches; }

  function syncDrawers() {
    const mode = isDrawerMode();
    benchEl.classList.toggle("is-drawers", mode);
    for (const panel of [libraryPanel, settingsPanel]) {
      const open = drawerOpen === panel;
      panel.classList.toggle("is-open", mode && open);
      if (mode && !open) panel.setAttribute("inert", "");
      else panel.removeAttribute("inert");
      if (mode) panel.setAttribute("aria-hidden", open ? "false" : "true");
      else panel.removeAttribute("aria-hidden");
    }
    scrim.hidden = !(mode && drawerOpen);
    document.body.classList.toggle("has-drawer", !!(mode && drawerOpen));
    openLibraryBtn.setAttribute("aria-expanded", mode ? String(drawerOpen === libraryPanel) : String(!benchEl.classList.contains("is-library-off")));
    openSettingsBtn.setAttribute("aria-expanded", String(mode && drawerOpen === settingsPanel));
    libraryBtn.setAttribute("aria-label", mode ? "关闭曲谱库" : "收起曲谱库");
    libraryBtn.title = mode ? "关闭" : "收起曲谱库";
  }

  function openDrawer(panel, opener) {
    if (!isDrawerMode()) return;
    drawerOpen = panel;
    drawerReturn = opener || document.activeElement;
    syncDrawers();
    const first = panel === libraryPanel ? queryEl : panel.querySelector("button, select, input");
    if (first) first.focus();
  }

  function closeDrawers() {
    if (!drawerOpen) return;
    drawerOpen = null;
    syncDrawers();
    if (drawerReturn && drawerReturn.focus) drawerReturn.focus();
    drawerReturn = null;
  }

  function setLibrary(open) {
    benchEl.classList.toggle("is-library-off", !open);
    libraryBtn.setAttribute("aria-pressed", open ? "true" : "false");
    writeRaw("jianpu-library", open ? "1" : "0");
    syncDrawers();
    requestAnimationFrame(applyZoom);
  }

  // ---- original render / play, ported to the new chrome -------------------

  function render() {
    jianpuBtn.setAttribute("aria-pressed", notation === "jianpu" ? "true" : "false");
    staffBtn.setAttribute("aria-pressed", notation === "staff" ? "true" : "false");
    leadBtn.setAttribute("aria-pressed", notation === "lead" ? "true" : "false");
    diagramBtn.setAttribute("aria-checked", diagramOn ? "true" : "false");
    paper.classList.toggle("is-lead", notation === "lead");
    paper.dataset.view = notation;
    if (!abc) {
      paper.textContent = "";
      clearPlayhead();
      return;
    }
    const info = editor.inspectScore(abc);
    if (info.error) {
      paper.textContent = info.error;
      return;
    }
    refreshTiming();
    const names = editor.chordKeyNames(info.keyName);
    const selected = names.indexOf(chosen) >= 0 ? chosen : info.keyName;
    chosen = selected;
    if (keyEl.dataset.keys !== names.join(",")) {
      keyEl.dataset.keys = names.join(",");
      keyEl.innerHTML = names.map((name) => '<option value="' + name + '">' + label(name) + (name === info.keyName ? "（原调）" : "") + "</option>").join("");
    }
    keyEl.value = selected;
    showMeta(info);
    paper.innerHTML = "";
    playKey = "";
    barKey = "";
    clearSourceScroll();
    if (notation === "lead") {
      const sheet = editor.leadSheet(abc, current && current.title, selected);
      if (sheet.error) {
        paper.textContent = "无法生成弹唱谱";
        return;
      }
      const frame = document.createElement("iframe");
      frame.title = "弹唱谱";
      frame.srcdoc = String(editor.leadSheetDocument(sheet)).replace("</head>", LEAD_STYLE + "</head>");
      frame.addEventListener("load", applyZoom);
      paper.appendChild(frame);
      paint(playing ? nowPlaying() : offset);
      return;
    }
    // The title already sits in the paper header; keep only the key legend line.
    const bare = abc.replace(/^T:[^\n]*/m, "T:");
    const view = editor.chordsInKey(bare, selected === info.keyName ? "" : selected);
    const legend = editor.withKeyLegend(view, editor.keyLegend(info.keyName, selected));
    const body = notation === "jianpu" ? editor.jianpuAbcWithDirective(legend) : legend;
    const src = (diagramOn ? editor.diagramDirective("guitar") : "") + body;
    if (typeof abc2svg === "undefined" || !abc2svg.Abc) {
      paper.textContent = "简谱模块没有载入。";
      return;
    }
    try {
      const user = {
        img_out: (svg) => paper.insertAdjacentHTML("beforeend", fitDiagramSvg(svg)),
        errmsg: () => {},
        get_abcmodel: () => {},
        anno_stop: (type, start, stop, x, y, w, h, sym) => {
          if (notation !== "staff" || !renderer) return;
          if (type !== "note" && type !== "rest" && type !== "Zrest" && type !== "lyrics") return;
          const voice = String((sym && sym.p_v && sym.p_v.id) || "").replace(/[^A-Za-z0-9_-]/g, "");
          renderer.out_svg('<rect class="hit" data-kind="' + type + '" data-voice="' + voice + '" x="');
          renderer.out_sxsy(x, '" y="', y);
          const height = Math.abs(renderer.sh(h));
          renderer.out_svg('" width="' + Math.abs(w).toFixed(2) + '" height="' + height.toFixed(2) + '" fill="transparent"/>\n');
        },
      };
      renderer = new abc2svg.Abc(user);
      if (abc2svg.diag && abc2svg.diag.set_hooks) abc2svg.diag.set_hooks(renderer);
      renderer.tosvg("score", src);
      bindHits();
      applyZoom();
      paint(playing ? nowPlaying() : offset);
    } catch (error) {
      paper.textContent = String(error);
    }
  }

  const LEAD_STYLE = "<style>html,body{background:transparent!important;color:#302b22;" +
    "font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif}" +
    "body{margin:0;padding:6px 4px 18px}" +
    "h1,h2,h3{font-family:'Noto Serif SC','Songti SC',serif;color:#233729}" +
    "[class*='-ch'],b,strong{color:#3f5f3a}" +
    "hr,[class*='meta']{border-color:#dcc8a4!important}" +
    "@media print{html{zoom:1!important}}</style>";

  function seek(seconds) {
    const keep = playing || arming;
    offset = clampTime(seconds);
    if (keep) void play(offset);
    else paint(offset);
  }

  async function openPiece(entry, autoplay) {
    haltAudio();
    offset = 0;
    playKey = "";
    setPlayLabel(false);
    current = entry;
    titleEl.textContent = entry.title;
    document.title = (entry.title || "简谱") + " · 简谱工作台 · Telesoho Studio";
    history.replaceState(null, "", "#" + encodeURIComponent(entry.id));
    recent = [entry.id].concat(recent.filter((id) => id !== entry.id)).slice(0, 12);
    saveRecent();
    drawList();
    const token = ++loadToken;
    let text;
    try {
      text = await loadText(entry.id);
    } catch (err) {
      text = null;
    }
    if (token !== loadToken) return;
    if (text == null) {
      paper.textContent = "打不开这首简谱。";
      abc = "";
      total = 0;
      marks = [];
      barInfo = null;
      baseBpm = 0;
      syncTempoUI();
      metaEl.textContent = "";
      paint(0);
      return;
    }
    abc = text;
    const info = editor.inspectScore(abc);
    chosen = info.keyName || entry.key || "C";
    baseBpm = info.bpm || 120;
    tempoBpm = baseBpm;
    barInfo = scanBars(abc);
    barShown = "";
    paper.scrollTop = 0;
    syncTempoUI();
    render();
    if (autoplay) void play(0);
  }

  async function play(from) {
    if (!abc) return;
    const score = refreshTiming();
    if (score.error || !score.notes.length) return;
    let at = from == null ? offset : Number(from);
    if (!Number.isFinite(at) || at < 0) at = 0;
    if (at >= Math.max(0.02, total - 0.02)) at = 0;
    haltAudio();
    const gen = generation;
    arming = true;
    ensureCtx();
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch (err) {
      if (gen === generation) {
        arming = false;
        playing = false;
        setPlayLabel(false);
      }
      return;
    }
    if (gen !== generation) return;
    if (window.yuePiano.prepare) {
      showVoice();
      Promise.resolve(window.yuePiano.prepare(ctx)).then(showVoice, () => showVoice({ kind: "synthetic" }));
    }
    arming = false;
    playing = true;
    setPlayLabel(true);
    offset = at;
    playFrom = at;
    playKey = "";
    startedAt = ctx.currentTime + 0.05;
    const queue = editor.soundingNotes(score.notes, at);
    const tick = () => {
      if (!playing || gen !== generation) return;
      const now = Math.min(total, playFrom + Math.max(0, ctx.currentTime - startedAt));
      for (const item of editor.pumpMidi(queue, now)) {
        window.yuePiano.schedule(
          ctx,
          { midi: item.note.midi, volume: item.note.volume || 0.16, velocity: item.note.velocity },
          startedAt + item.delay,
          Math.max(0.06, item.duration),
          voices,
        );
      }
      paint(now);
      if (now < total - 0.02) timer = requestAnimationFrame(tick);
      else {
        playing = false;
        timer = 0;
        stopVoices();
        offset = total;
        setPlayLabel(false);
        paint(total);
        if (loopOn) void play(0);
      }
    };
    tick();
  }

  function showNotation(next) {
    if (notation === next) return;
    notation = next;
    const at = playing ? nowPlaying() : offset;
    offset = at;
    render();
  }

  // ---- wiring --------------------------------------------------------------

  keyEl.addEventListener("change", () => {
    chosen = keyEl.value;
    const at = playing ? nowPlaying() : offset;
    offset = at;
    render();
  });
  playBtn.addEventListener("click", () => { togglePlay(); });
  stopBtn.addEventListener("click", () => {
    haltAudio();
    offset = 0;
    clearPlayhead();
    setPlayLabel(false);
    paint(0);
  });
  prevBtn.addEventListener("click", () => stepPiece(-1));
  nextBtn.addEventListener("click", () => stepPiece(1));
  function syncLoop() {
    loopBtn.setAttribute("aria-pressed", loopOn ? "true" : "false");
    loopBtn.title = loopOn ? "循环播放：开" : "循环播放：关";
  }
  syncLoop();
  loopBtn.addEventListener("click", () => {
    loopOn = !loopOn;
    writeRaw("jianpu-loop", loopOn ? "1" : "0");
    syncLoop();
  });
  jianpuBtn.addEventListener("click", () => showNotation("jianpu"));
  staffBtn.addEventListener("click", () => showNotation("staff"));
  leadBtn.addEventListener("click", () => showNotation("lead"));
  seekEl.addEventListener("pointerdown", () => {
    resumeAfterScrub = playing || arming;
    scrubbing = true;
    haltAudio();
    setPlayLabel(false);
  });
  seekEl.addEventListener("input", () => {
    offset = clampTime(Number(seekEl.value));
    if (scrubbing) paint(offset);
    else seek(offset);
  });
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    offset = clampTime(Number(seekEl.value));
    if (resumeAfterScrub) void play(offset);
    else paint(offset);
  };
  seekEl.addEventListener("change", endScrub);
  seekEl.addEventListener("pointerup", endScrub);
  seekEl.addEventListener("pointercancel", endScrub);
  paper.addEventListener("click", (event) => {
    const el = event.target.closest && event.target.closest("[data-start]");
    if (!el || !paper.contains(el)) return;
    const at = Number(el.dataset.start);
    if (!Number.isFinite(at)) return;
    seek(at);
  });
  queryEl.addEventListener("input", () => drawList());

  for (const t of tabs) {
    t.addEventListener("click", () => setTab(t.dataset.tab));
    t.addEventListener("keydown", (event) => {
      const at = tabs.indexOf(t);
      let next = -1;
      if (event.key === "ArrowRight") next = (at + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (at - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      if (next < 0) return;
      event.preventDefault();
      setTab(tabs[next].dataset.tab, true);
    });
  }

  tempoDown.addEventListener("click", () => setTempo(tempoBpm - 2));
  tempoUp.addEventListener("click", () => setTempo(tempoBpm + 2));
  tempoReset.addEventListener("click", () => setTempo(baseBpm));
  rateEl.addEventListener("change", () => {
    const r = Number(rateEl.value);
    if (Number.isFinite(r) && r > 0) setTempo(baseBpm * r);
  });

  volumeEl.addEventListener("input", () => {
    volume = Math.max(0, Math.min(100, Number(volumeEl.value) || 0));
    muted = false;
    writeRaw("jianpu-volume", String(volume));
    applyVolume();
  });
  muteBtn.addEventListener("click", () => {
    if (volume === 0) { volume = 60; muted = false; }
    else muted = !muted;
    applyVolume();
  });
  applyVolume();

  function syncFollow() {
    followBtn.setAttribute("aria-checked", followOn ? "true" : "false");
    followBtn.title = followOn ? "谱面跟随播放进度滚动（点按关闭）" : "谱面不自动滚动（点按开启）";
  }
  syncFollow();
  followBtn.addEventListener("click", () => {
    followOn = !followOn;
    writeRaw("jianpu-follow", followOn ? "1" : "0");
    clearSourceScroll();
    syncFollow();
  });

  zoomInBtn.addEventListener("click", () => stepZoom(1));
  zoomOutBtn.addEventListener("click", () => stepZoom(-1));
  zoomFitBtn.addEventListener("click", () => { zoom = "fit"; applyZoom(); });
  if (window.ResizeObserver) {
    let last = 0;
    new ResizeObserver(() => {
      const w = paper.clientWidth;
      if (Math.abs(w - last) < 1) return;
      last = w;
      if (zoom === "fit") applyZoom();
      drawWave(editor.timeline(timingSrc()));
      wavePlayed = -1;
      paint(playing ? nowPlaying() : offset);
    }).observe(paper);
  }
  printBtn.addEventListener("click", () => {
    const frame = leadFrame();
    if (frame && frame.contentWindow) {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); return; } catch (err) { /* fall through */ }
    }
    window.print();
  });

  let libraryOpen = readRaw("jianpu-library") !== "0";
  setLibrary(libraryOpen);
  libraryBtn.addEventListener("click", () => {
    if (isDrawerMode()) closeDrawers();
    else setLibrary(benchEl.classList.contains("is-library-off"));
  });
  openLibraryBtn.addEventListener("click", () => {
    if (isDrawerMode()) openDrawer(libraryPanel, openLibraryBtn);
    else { setLibrary(true); queryEl.focus(); }
  });
  openSettingsBtn.addEventListener("click", () => openDrawer(settingsPanel, openSettingsBtn));
  closeSettingsBtn.addEventListener("click", closeDrawers);
  scrim.addEventListener("click", closeDrawers);
  const onMq = () => { if (!isDrawerMode()) drawerOpen = null; syncDrawers(); requestAnimationFrame(applyZoom); };
  if (drawerMq.addEventListener) drawerMq.addEventListener("change", onMq);
  else drawerMq.addListener(onMq);
  syncDrawers();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawerOpen) {
      event.preventDefault();
      closeDrawers();
      return;
    }
    if (event.key === "Tab" && drawerOpen) {
      const items = Array.prototype.slice.call(drawerOpen.querySelectorAll("button:not([disabled]), input, select, [tabindex='0']"))
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.key !== " " && event.code !== "Space") return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const t = event.target;
    if (t && t.closest && t.closest("input, select, textarea, button, a, [role='tab'], [role='switch'], [contenteditable='true']")) return;
    event.preventDefault();
    togglePlay();
  });

  function setDiagram(open) {
    diagramOn = !!open;
    diagramBtn.setAttribute("aria-checked", diagramOn ? "true" : "false");
    writeRaw("jianpu-diagram", diagramOn ? "1" : "0");
    const at = playing ? nowPlaying() : offset;
    offset = at;
    render();
  }
  diagramOn = readRaw("jianpu-diagram") !== "0";
  diagramBtn.setAttribute("aria-checked", diagramOn ? "true" : "false");
  diagramBtn.addEventListener("click", () => {
    setDiagram(!diagramOn);
  });

  rateEl.innerHTML = RATES.map((r) => '<option value="' + r + '">' + (r === 1 ? "1.0×" : r + "×") + "</option>").join("");
  setPlayLabel(false);
  setTab("all");
  syncTempoUI();

  fetch("../scores/index.json?" + Date.now(), { cache: "no-store" })
    .then((response) => response.json())
    .then((entries) => {
      catalog = Array.isArray(entries) ? entries : [];
      drawList();
      const id = decodeURIComponent(location.hash.replace(/^#/, ""));
      const found = catalog.find((entry) => entry.id === id) || catalog[0];
      if (found) void openPiece(found);
      measureCatalog();
    })
    .catch(() => {
      emptyEl.hidden = false;
      emptyEl.textContent = "简谱库没有载入。";
    });
})();
