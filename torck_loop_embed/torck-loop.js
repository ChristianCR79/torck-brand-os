(() => {
  const LOOP_PATH = "M165.45,26.08C152.38,10.16,132.55,0,110.35,0,70.99,0,39.08,31.91,39.08,71.27c0,.02,0,.04,0,.05h-.1C38.99,92.82,21.5,110.31,0,110.31v32.28c22.22,0,42.1-10.22,55.17-26.21,13.07,15.97,32.93,26.16,55.17,26.16,39.36,0,71.27-31.91,71.27-71.27,0-.78-.02-1.56-.04-2.33,1.24-20.39,18.21-36.6,38.91-36.6V.05c-22.13,0-41.94,10.14-55.02,26.02ZM110.35,110.13c-21.46,0-38.86-17.4-38.86-38.86s17.4-38.86,38.86-38.86,38.86,17.4,38.86,38.86-17.4,38.86-38.86,38.86Z";
  const DEPTH = 68;
  const LAYERS = 30;

  function createLayer(className, z, opacity) {
    const layer = document.createElement("div");
    layer.className = `torck-loop__layer ${className}`;
    layer.style.transform = `translateZ(${z}px)`;
    layer.style.opacity = opacity;
    layer.innerHTML = `
      <svg viewBox="0 0 220.48 142.59" role="img" aria-label="Torck Loop">
        <path d="${LOOP_PATH}"></path>
      </svg>
    `;
    return layer;
  }

  function initLoop(root) {
    const object = root.querySelector(".torck-loop__object");
    const stage = root.querySelector(".torck-loop__stage");
    const themeButtons = root.querySelectorAll("[data-torck-theme]");
    const loopColorButtons = root.querySelectorAll("[data-torck-loop-color]");
    const modeButton = root.querySelector("[data-torck-mode-toggle]");
    const modeLabel = root.querySelector("[data-torck-mode-label]");

    if (!object || !stage || !modeButton || !modeLabel) return;

    object.innerHTML = "";
    for (let i = 0; i < LAYERS; i += 1) {
      const t = i / (LAYERS - 1);
      const z = -DEPTH / 2 + DEPTH * t;
      const opacity = 0.26 + t * 0.46;
      const wireClass = i === 0 ? " torck-loop__layer--wire torck-loop__layer--back" : (i % 8 === 0 ? " torck-loop__layer--wire" : "");
      object.appendChild(createLayer(`torck-loop__layer--side${wireClass}`, z, opacity.toFixed(3)));
    }
    object.appendChild(createLayer("torck-loop__layer--front", DEPTH / 2 + 1, 1));

    const state = {
      theme: "cream",
      mode: "fill",
      loopColor: "yellow"
    };

    function syncUi() {
      root.classList.toggle("is-slate", state.theme === "slate");
      root.classList.toggle("is-loop-cream", state.theme === "slate" && state.loopColor === "cream");
      root.classList.toggle("is-outline", state.mode === "outline");

      themeButtons.forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.torckTheme === state.theme));
      });

      loopColorButtons.forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.torckLoopColor === state.loopColor));
      });

      modeButton.setAttribute("aria-pressed", String(state.mode === "outline"));
      modeLabel.textContent = state.mode === "outline" ? "Fill" : "Outline";
    }

    themeButtons.forEach(button => {
      button.addEventListener("click", () => {
        state.theme = button.dataset.torckTheme;
        if (state.theme !== "slate") state.loopColor = "yellow";
        syncUi();
      });
    });

    loopColorButtons.forEach(button => {
      button.addEventListener("click", () => {
        state.loopColor = button.dataset.torckLoopColor;
        state.theme = "slate";
        syncUi();
      });
    });

    modeButton.addEventListener("click", () => {
      state.mode = state.mode === "outline" ? "fill" : "outline";
      syncUi();
    });

    let drag = false;
    let lastX = 0;
    let lastY = 0;
    let rx = 58;
    let ry = -20;
    let rz = -2;

    function applyDragTransform() {
      object.style.animation = "none";
      object.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
    }

    stage.addEventListener("pointerdown", event => {
      drag = true;
      lastX = event.clientX;
      lastY = event.clientY;
      stage.setPointerCapture(event.pointerId);
      applyDragTransform();
    });

    stage.addEventListener("pointermove", event => {
      if (!drag) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      ry += dx * 0.32;
      rx -= dy * 0.22;
      rx = Math.max(18, Math.min(78, rx));
      applyDragTransform();
    });

    stage.addEventListener("pointerup", event => {
      drag = false;
      try {
        stage.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture may already be released.
      }
    });

    syncUi();
  }

  document.querySelectorAll("[data-torck-loop]").forEach(initLoop);
})();
