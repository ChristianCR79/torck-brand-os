(() => {
  const NS = "http://www.w3.org/2000/svg";
  const playground = document.querySelector(".torck-playground");
  if (!playground) return;

  const grid = playground.querySelector("[data-torck-grid]");
  const quartersLayer = playground.querySelector("[data-torck-quarters]");
  const shuffleButton = playground.querySelector("[data-torck-shuffle]");
  const copyBlock = playground.querySelector(".torck-playground__copy");
  const editableHeadline = playground.querySelector(".torck-playground__headline");
  const editableSubline = playground.querySelector(".torck-playground__subline");

  quartersLayer.classList.add("torck-playground__quarters");

  const cell = 80;
  const size = 80;
  const minX = 86;
  const minY = 70;
  const cols = 11;
  const rows = 6;

  let tileEls = [];
  let runId = 0;
  let lastLayoutIndex = -1;
  let lastThemeIndex = -1;
  let loopTimer = null;

  const outlineSegments = [
    `M ${size},0 A ${size} ${size} 0 0 1 0,${size}`,
    `M ${size / 2},0 A ${size / 2} ${size / 2} 0 0 1 0,${size / 2}`,
    `M ${size / 2},0 L ${size},0`,
    `M 0,${size / 2} L 0,${size}`,
  ];
  const fillSegment = `M ${size},0 A ${size} ${size} 0 0 1 0,${size} L 0,${size / 2} A ${size / 2} ${size / 2} 0 0 0 ${size / 2},0 Z`;

  const layouts = [
    {
      text: { left: "calc(var(--torck-grid-unit) * 1)", top: "calc(var(--torck-grid-unit) * 1.15)", right: "auto", bottom: "auto", transform: "none", align: "left" },
      finalOrigin: [7, 2],
      circleOrigins: [[2, 1], [5, 2], [8, 3]],
    },
    {
      text: { left: "auto", right: "calc(var(--torck-grid-unit) * 1)", top: "calc(var(--torck-grid-unit) * 1.1)", bottom: "auto", transform: "none", align: "right" },
      finalOrigin: [3, 3],
      circleOrigins: [[2, 2], [5, 1], [8, 2]],
    },
    {
      text: { left: "50%", top: "calc(var(--torck-grid-unit) * 1.1)", right: "auto", bottom: "auto", transform: "translateX(-50%)", align: "center" },
      finalOrigin: [5, 3],
      circleOrigins: [[3, 2], [6, 2], [8, 1]],
    },
    {
      text: { left: "calc(var(--torck-grid-unit) * 1)", top: "auto", right: "auto", bottom: "calc(var(--torck-grid-unit) * 1)", transform: "none", align: "left" },
      finalOrigin: [7, 1],
      circleOrigins: [[2, 3], [5, 2], [8, 1]],
    },
    {
      text: { left: "auto", right: "calc(var(--torck-grid-unit) * 1)", top: "auto", bottom: "calc(var(--torck-grid-unit) * 1)", transform: "none", align: "right" },
      finalOrigin: [3, 1],
      circleOrigins: [[2, 1], [5, 2], [8, 3]],
    },
  ];

  const themes = [
    { bg: "#415578", grid: "#f0fa28", quarter: "#f0fa28", headline: "#f5f0eb", status: "rgba(240, 250, 40, 0.56)" },
    { bg: "#415578", grid: "#f5f0eb", quarter: "#f0fa28", headline: "#f5f0eb", status: "rgba(245, 240, 235, 0.46)" },
    { bg: "#415578", grid: "#f0fa28", quarter: "#f5f0eb", headline: "#f5f0eb", status: "rgba(240, 250, 40, 0.56)" },
    { bg: "#f5f0eb", grid: "#415578", quarter: "#f0fa28", headline: "#415578", status: "rgba(65, 85, 120, 0.54)" },
    { bg: "#f5f0eb", grid: "#f0fa28", quarter: "#415578", headline: "#415578", status: "rgba(65, 85, 120, 0.54)" },
    { bg: "#f5f0eb", grid: "#415578", quarter: "#415578", headline: "#415578", status: "rgba(65, 85, 120, 0.54)" },
  ];

  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      const x = minX + gx * cell;
      const y = minY + gy * cell;
      const plus = document.createElementNS(NS, "g");
      plus.setAttribute("class", "torck-playground__grid-plus");
      plus.innerHTML = `<path d="M ${x - 6} ${y} L ${x + 6} ${y}" /><path d="M ${x} ${y - 6} L ${x} ${y + 6}" />`;
      grid.appendChild(plus);
    }
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function slot(gx, gy, rot) {
    return { x: minX + gx * cell, y: minY + gy * cell, rot };
  }

  function circleSlots(originX, originY) {
    return [
      slot(originX, originY, 180),
      slot(originX + 1, originY, 270),
      slot(originX + 1, originY + 1, 0),
      slot(originX, originY + 1, 90),
    ];
  }

  function randomSlots(count) {
    const all = [];
    for (let gx = 0; gx < cols - 1; gx++) {
      for (let gy = 0; gy < rows - 1; gy++) {
        all.push(slot(gx, gy, [0, 90, 180, 270][Math.floor(Math.random() * 4)]));
      }
    }
    return shuffle(all).slice(0, count);
  }

  function buildTile(index) {
    const group = document.createElementNS(NS, "g");
    group.setAttribute("class", "torck-playground__quarter");

    if (index % 4 === 0 || index % 7 === 0) {
      const fill = document.createElementNS(NS, "path");
      fill.setAttribute("class", "fill");
      fill.setAttribute("d", fillSegment);
      group.appendChild(fill);
    }

    outlineSegments.forEach((d) => {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      group.appendChild(path);
    });

    quartersLayer.appendChild(group);
    return group;
  }

  function place(el, target) {
    el.style.transform = `translate(${target.x}px, ${target.y}px) rotate(${target.rot}deg)`;
  }

  function pickLayout() {
    let index = Math.floor(Math.random() * layouts.length);
    if (layouts.length > 1 && index === lastLayoutIndex) index = (index + 1) % layouts.length;
    lastLayoutIndex = index;
    return layouts[index];
  }

  function pickTheme() {
    let index = Math.floor(Math.random() * themes.length);
    if (themes.length > 1 && index === lastThemeIndex) index = (index + 1) % themes.length;
    lastThemeIndex = index;
    return themes[index];
  }

  function applyTextLayout(layout) {
    copyBlock.classList.toggle("is-center", layout.text.align === "center");
    copyBlock.classList.toggle("is-right", layout.text.align === "right");
    copyBlock.style.setProperty("--torck-copy-left", layout.text.left);
    copyBlock.style.setProperty("--torck-copy-right", layout.text.right);
    copyBlock.style.setProperty("--torck-copy-top", layout.text.top);
    copyBlock.style.setProperty("--torck-copy-bottom", layout.text.bottom);
    copyBlock.style.transform = layout.text.transform;
    copyBlock.style.textAlign = layout.text.align;
  }

  function applyTheme(theme) {
    playground.style.setProperty("--torck-active-bg", theme.bg);
    document.body.style.setProperty("--torck-active-bg", theme.bg);
    playground.style.setProperty("--torck-active-grid", theme.grid);
    playground.style.setProperty("--torck-active-quarter", theme.quarter);
    playground.style.setProperty("--torck-active-headline", theme.headline);
    playground.style.setProperty("--torck-active-status", theme.status);
  }

  function run() {
    runId += 1;
    const currentRun = runId;
    if (loopTimer) window.clearTimeout(loopTimer);
    quartersLayer.classList.remove("spinning");
    quartersLayer.innerHTML = "";

    const layout = pickLayout();
    const theme = pickTheme();
    applyTextLayout(layout);
    applyTheme(theme);

    const count = 9 + Math.floor(Math.random() * 4);
    tileEls = Array.from({ length: count }, (_, index) => buildTile(index));

    const starts = randomSlots(count);
    const circleStage = layout.circleOrigins.flatMap(([gx, gy]) => circleSlots(gx, gy)).slice(0, count);
    const finalRing = circleSlots(layout.finalOrigin[0], layout.finalOrigin[1]);
    const finalStage = Array.from({ length: count }, (_, index) => finalRing[index % 4]);
    const spinCenterX = minX + (layout.finalOrigin[0] + 1) * cell;
    const spinCenterY = minY + (layout.finalOrigin[1] + 1) * cell;

    quartersLayer.style.setProperty("--torck-spin-x", `${spinCenterX}px`);
    quartersLayer.style.setProperty("--torck-spin-y", `${spinCenterY}px`);

    tileEls.forEach((el, index) => {
      el.classList.remove("visible", "final");
      el.style.transitionDelay = "0ms";
      place(el, starts[index]);
    });

    window.setTimeout(() => {
      if (currentRun !== runId) return;
      tileEls.forEach((el, index) => {
        el.classList.add("visible");
        el.style.transitionDelay = `${(index % 4) * 65}ms`;
      });
    }, 80);

    window.setTimeout(() => {
      if (currentRun !== runId) return;
      tileEls.forEach((el, index) => place(el, circleStage[index]));
    }, 1550);

    window.setTimeout(() => {
      if (currentRun !== runId) return;
      tileEls.forEach((el, index) => {
        el.classList.add("final");
        el.style.transitionDelay = `${index * 28}ms`;
        place(el, finalStage[index]);
      });
    }, 3400);

    window.setTimeout(() => {
      if (currentRun !== runId) return;
      quartersLayer.classList.add("spinning");
    }, 4700);

    loopTimer = window.setTimeout(() => {
      if (currentRun !== runId) return;
      run();
    }, 10300);
  }

  function normalizeSubline() {
    const normalized = editableSubline.innerText
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    editableSubline.textContent = normalized || "Dann komm ins Team.";
    window.localStorage.setItem("torck-playground-subline", editableSubline.textContent);
  }

  [
    ["torck-playground-headline", editableHeadline],
    ["torck-playground-subline", editableSubline],
  ].forEach(([key, el]) => {
    const saved = window.localStorage.getItem(key);
    if (saved) el.innerHTML = saved;
    el.addEventListener("input", () => window.localStorage.setItem(key, el.innerHTML));
  });

  normalizeSubline();
  editableSubline.addEventListener("blur", normalizeSubline);
  editableSubline.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      editableSubline.blur();
    }
  });

  shuffleButton.addEventListener("click", run);
  run();
})();
