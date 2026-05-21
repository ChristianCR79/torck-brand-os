/* eslint-disable */
const { useState, useMemo, useEffect, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#4A5677", "#E0EC4F"],
  "strokeWidth": 3,
  "tailChance": 0.65,
  "tailMaxLen": 2,
  "symmetry": "none",
  "extraSeeds": 0,
  "centralRing": true,
  "showImage": true,
  "animation": "reform",
  "drawSpeed": 900,
  "driftSpeed": 5,
  "autoCycle": false,
  "autoCycleInterval": 5,
  "showGrid": true
}/*EDITMODE-END*/;

const PALETTES = [
  ["#4A5677", "#E0EC4F"], // navy / lime
  ["#1B1B1B", "#F5F5F0"], // ink / paper
  ["#0F2A4E", "#FF7A45"], // deep blue / coral
  ["#F4EFE6", "#1B1B1B"], // paper / ink
  ["#0E0E0E", "#C7FF3D"], // black / electric lime
  ["#5C3A21", "#F1E2C8"], // espresso / cream
];

const { generateLogo, Tile, tilesBBox, rngFromSeed } = window.__shapeGen;

function ShapeSVG({ tiles, vbX, vbY, vbW, vbH, S, fg, strokeWidth, animClass, animKey, drawSpeed, driftSpeed, outgoing, bboxCx, bboxCy, svgRef, showGrid, rootTx = 0, rootTy = 0 }) {
  // Compute dot-grid intersections within the viewBox.
  const dots = [];
  if (showGrid) {
    const startX = Math.ceil(vbX / S);
    const endX = Math.floor((vbX + vbW) / S);
    const startY = Math.ceil(vbY / S);
    const endY = Math.floor((vbY + vbH) / S);
    for (let kx = startX; kx <= endX; kx++) {
      for (let ky = startY; ky <= endY; ky++) {
        dots.push({ x: kx * S, y: ky * S, key: `${kx},${ky}` });
      }
    }
  }
  return (
    <svg
      ref={svgRef}
      className={`shape-svg ${animClass} ${outgoing ? 'outgoing' : ''}`}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        '--draw-dur': `${drawSpeed}ms`,
        '--drift-dur': `${driftSpeed}s`,
        '--spin-dur': `${driftSpeed}s`,
        '--wobble-dur': `${Math.max(2, driftSpeed / 4)}s`,
        '--pulse-dur': `${Math.max(1.5, driftSpeed / 9)}s`,
      }}
    >
      {showGrid && (
        <g className="dot-grid">
          {dots.map((d) => (
            <circle key={d.key} cx={d.x} cy={d.y} r={2.6} fill={fg} opacity={0.42} />
          ))}
        </g>
      )}
      <g
        className="shape-root"
        transform={rootTx || rootTy ? `translate(${rootTx}, ${rootTy})` : undefined}
      >
        {tiles.map((tile, i) => (
          <Tile
            key={i}
            tile={tile}
            S={S}
            stroke={fg}
            strokeWidth={strokeWidth}
            tileIndex={i}
            animKey={animKey}
          />
        ))}
      </g>
    </svg>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  // Previous shape kept briefly during crossfade
  const [prev, setPrev] = useState(null);
  const curSvgRef = useRef(null);

  // The home form is the fixed brand logo. Seed only affects scatter
  // destinations during the reform animation (pressing Generate kicks off
  // a fresh scatter sequence — the home shape stays put).
  const tiles = useMemo(() => generateLogo(), []);

  const S = 120; // tile size in svg units (cell = S × S)
  // 8×4.5 cells gives exactly 16:9 aspect with the logo at ~50% of frame
  // height instead of ~22%. Dot grid renders only at integer cell boundaries,
  // so the half-cell at the bottom is just background space.
  const GRID_COLS = 8;
  const GRID_ROWS = 4.5;
  const bbox = useMemo(() => tilesBBox(tiles), [tiles]);
  // Fixed 16:9 viewBox of GRID_COLS × GRID_ROWS cells. The shape is
  // centered inside the grid via an integer-cell offset on .shape-root
  // so its tiles always align with the dot grid.
  const vbW = GRID_COLS * S;
  const vbH = GRID_ROWS * S;
  const vbX = 0;
  const vbY = 0;
  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;
  // Center the logo using floats, then round translate so tile cells still
  // land on grid intersections.
  const offsetCellX = Math.round((GRID_COLS - bboxW) / 2 - bbox.minX);
  const offsetCellY = Math.round((GRID_ROWS - bboxH) / 2 - bbox.minY);
  const rootTx = offsetCellX * S;
  const rootTy = offsetCellY * S;
  // Scatter-cell bounds in shape-local coords: any cell that, after the
  // root offset, sits inside the 0..GRID_COLS / 0..GRID_ROWS viewBox.
  const scatterMinX = -offsetCellX;
  const scatterMaxX = GRID_COLS - offsetCellX; // exclusive
  const scatterMinY = -offsetCellY;
  const scatterMaxY = GRID_ROWS - offsetCellY;
  const bboxCx = vbW / 2;
  const bboxCy = vbH / 2;

  const [bg, fg] = t.palette;
  const animClass = `anim-${t.animation || 'none'}`;

  const regenerate = useCallback(() => {
    setPrev({ tiles, vbX, vbY, vbW, vbH, bboxCx, bboxCy, rootTx, rootTy, animKey: seed });
    setSeed(Math.floor(Math.random() * 1e9));
  }, [tiles, vbX, vbY, vbW, vbH, bboxCx, bboxCy, rootTx, rootTy, seed]);

  // clear the outgoing snapshot after the crossfade duration
  useEffect(() => {
    if (!prev) return;
    const id = setTimeout(() => setPrev(null), t.drawSpeed + 100);
    return () => clearTimeout(id);
  }, [prev, t.drawSpeed]);

  // auto-cycle
  useEffect(() => {
    if (!t.autoCycle) return;
    const id = setInterval(regenerate, t.autoCycleInterval * 1000);
    return () => clearInterval(id);
  }, [t.autoCycle, t.autoCycleInterval, regenerate]);

  // space/enter regenerates
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        regenerate();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [regenerate]);

  // Reform mode — WAAPI-driven assemble/disassemble. Each global cycle:
  //   – all tiles start at home (assembled form visible)
  //   – tiles leave home at staggered times (i/n of cycle)
  //   – tiles snap to a randomly-assigned GRID CELL within an expanded
  //     bbox (never the same cell as another tile or any home cell)
  //   – ALL tiles return to home simultaneously by 88% of cycle
  //   – brief dwell showing the complete defined form
  //   – cycle restarts with fresh random destinations
  // Rotations quantized to 90° increments. Translations are integer
  // multiples of the tile size S, so resting tiles always sit on the grid.
  useEffect(() => {
    if (t.animation !== 'reform') return undefined;
    let active = true;
    const allAnims = new Set();
    let intervalId = null;
    let startTimer = null;

    // Scatter cells = every cell inside the 16:9 viewBox that isn't a
    // home cell. Bounds come from the App scope so the pool always fits
    // the visible grid.
    const homeSet = new Set(tiles.map((tl) => `${tl.gx},${tl.gy}`));

    const buildScatterPool = () => {
      const pool = [];
      for (let x = scatterMinX; x < scatterMaxX; x++) {
        for (let y = scatterMinY; y < scatterMaxY; y++) {
          if (!homeSet.has(`${x},${y}`)) pool.push({ x, y });
        }
      }
      // Fisher-Yates shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    };

    const runCycle = (innerEls, period) => {
      if (!active) return;
      // 90° quantized rotations: -180, -90, 0, 90, 180 (also occasional no-rotation)
      const rotSteps = [-180, -90, 0, 0, 90, 180];
      const pool = buildScatterPool();
      const n = innerEls.length;

      tiles.forEach((tile, i) => {
        const el = innerEls[i];
        if (!el) return;

        // Drop any prior finished animations on this element so they don't
        // pile up (each .animate() leaves one behind with fill: forwards).
        el.getAnimations().forEach((a) => {
          if (a.playState === 'finished') {
            try { a.cancel(); } catch (e) {}
          }
        });

        // Assign a unique grid cell from the pool — if pool exhausted, wrap.
        const cell = pool[i % pool.length] || { x: tile.gx, y: tile.gy };
        const dx = (cell.x - tile.gx) * S;
        const dy = (cell.y - tile.gy) * S;
        const sr = rotSteps[Math.floor(Math.random() * rotSteps.length)];

        // Tile leaves home at staggered point; ALL tiles return together.
        const leaveAt = (i / n) * 0.4; // 0 .. 0.4 of cycle

        const a = el.animate(
          [
            { transform: 'translate(0px, 0px) rotate(0deg)', offset: 0 },
            { transform: 'translate(0px, 0px) rotate(0deg)', offset: leaveAt },
            { transform: `translate(${dx}px, ${dy}px) rotate(${sr}deg)`, offset: Math.min(0.55, leaveAt + 0.18) },
            { transform: `translate(${dx}px, ${dy}px) rotate(${sr}deg)`, offset: 0.6 },
            { transform: 'translate(0px, 0px) rotate(0deg)', offset: 0.78 },
            // Hold the assembled form for ~22% of the cycle so the defined
            // shape is clearly visible (≈1.1s in a 5s cycle).
            { transform: 'translate(0px, 0px) rotate(0deg)', offset: 1 },
          ],
          {
            duration: period,
            easing: 'cubic-bezier(.5, 0, .2, 1)',
            fill: 'forwards',
          }
        );
        allAnims.add(a);
        a.finished.then(
          () => allAnims.delete(a),
          () => {}
        );
      });
    };

    const setup = () => {
      if (!active) return;
      const svg = curSvgRef.current;
      if (!svg) {
        startTimer = setTimeout(setup, 30);
        return;
      }
      const innerEls = Array.from(svg.querySelectorAll('.tile-inner'));
      if (!innerEls.length) {
        startTimer = setTimeout(setup, 30);
        return;
      }
      const period = Math.max(1500, (t.driftSpeed || 5) * 1000);
      runCycle(innerEls, period);
      intervalId = setInterval(() => runCycle(innerEls, period), period);
    };

    startTimer = setTimeout(setup, 30);

    return () => {
      active = false;
      if (startTimer) clearTimeout(startTimer);
      if (intervalId) clearInterval(intervalId);
      allAnims.forEach((a) => {
        try { a.cancel(); } catch (e) {}
      });
    };
  }, [t.animation, t.driftSpeed, seed, tiles, scatterMinX, scatterMinY, scatterMaxX, scatterMaxY]);

  return (
    <div className="app" style={{ background: bg }}>
      <div className="stage">
        <div className="frame">
          {t.showImage && (
            <image-slot
              id="bg-photo"
              shape="rect"
              placeholder="Bild hier ablegen — die Form bleibt darüber sichtbar"
              class="bg-slot"
            ></image-slot>
          )}
          {prev && (
            <ShapeSVG
              key={`prev-${prev.animKey}`}
              tiles={prev.tiles}
              vbX={prev.vbX} vbY={prev.vbY} vbW={prev.vbW} vbH={prev.vbH}
              bboxCx={prev.bboxCx} bboxCy={prev.bboxCy}
              rootTx={prev.rootTx} rootTy={prev.rootTy}
              S={S} fg={fg} strokeWidth={t.strokeWidth}
              animClass={animClass}
              animKey={prev.animKey}
              drawSpeed={t.drawSpeed}
              driftSpeed={t.driftSpeed}
              outgoing={true}
              showGrid={t.showGrid}
            />
          )}
          <ShapeSVG
            key={`cur-${seed}`}
            svgRef={curSvgRef}
            tiles={tiles}
            vbX={vbX} vbY={vbY} vbW={vbW} vbH={vbH}
            bboxCx={bboxCx} bboxCy={bboxCy}
            rootTx={rootTx} rootTy={rootTy}
            S={S} fg={fg} strokeWidth={t.strokeWidth}
            animClass={animClass}
            animKey={seed}
            drawSpeed={t.drawSpeed}
            driftSpeed={t.driftSpeed}
            outgoing={false}
            showGrid={t.showGrid}
          />
        </div>
      </div>

      <header className="hud-top">
        <div className="brand">
          <svg className="brand-mark" viewBox="-10 -10 70 70" aria-hidden="true">
            <g fill="none" stroke={fg} strokeWidth="3" strokeLinecap="round">
              <path d="M 50,0 A 50 50 0 0 1 0,50" />
              <path d="M 25,0 A 25 25 0 0 1 0,25" />
              <path d="M 25,0 L 50,0" />
              <path d="M 0,25 L 0,50" />
            </g>
          </svg>
          <div className="brand-text">
            <div className="brand-name" style={{ color: fg }}>Quarter</div>
            <div className="brand-meta" style={{ color: fg, opacity: 0.55 }}>
              Logo motion system
            </div>
          </div>
        </div>

        <div className="meta" style={{ color: fg }}>
          <span className="dot" style={{ background: fg }}></span>
          <span className="seed-label">SEED</span>
          <span className="seed-val">{String(seed).padStart(9, '0')}</span>
          <span className="sep" style={{ background: fg, opacity: 0.3 }}></span>
          <span className="count">{tiles.length} tiles</span>
        </div>
      </header>

      <footer className="hud-bottom">
        <div className="hint" style={{ color: fg, opacity: 0.55 }}>
          <kbd style={{ borderColor: fg, color: fg }}>Space</kbd>
          <span>to regenerate</span>
        </div>
        <div className="actions">
          <button
            className="btn-ghost"
            onClick={() => setTweak('showImage', !t.showImage)}
            style={{ color: fg, borderColor: fg }}
          >
            {t.showImage ? 'Hide image slot' : 'Show image slot'}
          </button>
          <button
            className="btn-primary"
            onClick={regenerate}
            style={{ background: fg, color: bg }}
          >
            Reshuffle scatter
            <span className="arrow">→</span>
          </button>
        </div>
      </footer>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Style">
          <TweakSlider label="Stroke" min={0.5} max={8} step={0.1} value={t.strokeWidth} onChange={v => setTweak('strokeWidth', v)} unit="px" />
          <TweakColor label="Palette" value={t.palette} onChange={v => setTweak('palette', v)} options={PALETTES} />
          <TweakToggle label="Dot grid" value={t.showGrid} onChange={v => setTweak('showGrid', v)} />
        </TweakSection>
        <TweakSection label="Motion">
          <TweakSelect label="Animation" value={t.animation} onChange={v => setTweak('animation', v)} options={[
            { label: 'Reform (assemble loop)', value: 'reform' },
            { label: 'Draw-in only', value: 'none' },
            { label: 'Spin (whole shape)', value: 'spin' },
            { label: 'Wobble (gentle)', value: 'wobble' },
            { label: 'Scatter (chaotic)', value: 'drift' },
            { label: 'Pulse', value: 'pulse' },
          ]} />
          <TweakSlider label="Draw speed" min={200} max={2400} step={50} value={t.drawSpeed} onChange={v => setTweak('drawSpeed', v)} unit="ms" />
          <TweakSlider label="Cycle period" min={2} max={20} step={0.5} value={t.driftSpeed} onChange={v => setTweak('driftSpeed', v)} unit="s" />
          <TweakToggle label="Auto-cycle" value={t.autoCycle} onChange={v => setTweak('autoCycle', v)} />
          <TweakSlider label="Cycle interval" min={2} max={20} step={1} value={t.autoCycleInterval} onChange={v => setTweak('autoCycleInterval', v)} unit="s" />
        </TweakSection>
        <TweakSection label="Image">
          <TweakToggle label="Show image slot" value={t.showImage} onChange={v => setTweak('showImage', v)} />
          <TweakButton label="Reshuffle scatter" onClick={regenerate} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
