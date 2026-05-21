/* eslint-disable */
// Quarter-circle shape generator
// A "tile" is a square cell containing a quarter annulus.
// rot 0..3 puts the curve corner at: top-left, top-right, bottom-right, bottom-left.
// inner arc radius = S/2, outer arc radius = S.

const TILE_ROTATIONS = [0, 1, 2, 3];

// Pick which corner of cell (gx,gy) is the curve corner, given rotation.
// Returns grid vertex {vx, vy}.
function curveVertex(t) {
  // rot 0 → (gx, gy)  (top-left)
  // rot 1 → (gx+1, gy) (top-right)
  // rot 2 → (gx+1, gy+1) (bottom-right)
  // rot 3 → (gx, gy+1) (bottom-left)
  const dx = [0, 1, 1, 0][t.rot];
  const dy = [0, 0, 1, 1][t.rot];
  return { vx: t.gx + dx, vy: t.gy + dy };
}

// Opposite corner = where the outer arc tip points.
function outerVertex(t) {
  const dx = [1, 0, 0, 1][t.rot];
  const dy = [1, 1, 0, 0][t.rot];
  return { vx: t.gx + dx, vy: t.gy + dy };
}

// 3 candidate tile placements that anchor their curve corner at vertex (vx, vy),
// each living in a different adjacent cell. Caller filters out occupied cells.
function candidatesForVertex(vx, vy) {
  return [
    // up-left cell, curve corner at its bottom-right
    { gx: vx - 1, gy: vy - 1, rot: 2 },
    // up-right cell, curve corner at its bottom-left
    { gx: vx,     gy: vy - 1, rot: 3 },
    // down-left cell, curve corner at its top-right
    { gx: vx - 1, gy: vy,     rot: 1 },
    // down-right cell, curve corner at its top-left
    { gx: vx,     gy: vy,     rot: 0 },
  ];
}

function tileKey(t) { return t.gx + ',' + t.gy; }

// Build one composition.
//   centralRing: place the 2×2 ring at origin
//   tailChance:  probability each outer corner gets a tail
//   tailLength:  max chain length per tail
//   symmetry:    'none' | 'rot180' | 'mirror'
function generate(rng, opts) {
  const {
    centralRing = true,
    tailChance = 0.65,
    tailMaxLen = 2,
    symmetry = 'none',
    extraSeeds = 0,
  } = opts || {};

  const tiles = [];
  const occupied = new Set();

  function add(t) {
    const k = tileKey(t);
    if (occupied.has(k)) return false;
    occupied.add(k);
    tiles.push(t);
    return true;
  }

  if (centralRing) {
    add({ gx: 0, gy: 0, rot: 2 });
    add({ gx: 1, gy: 0, rot: 3 });
    add({ gx: 0, gy: 1, rot: 1 });
    add({ gx: 1, gy: 1, rot: 0 });
  }

  // Outer corners of the central ring
  const seedVerts = centralRing
    ? [
        { vx: 0, vy: 0 },
        { vx: 2, vy: 0 },
        { vx: 0, vy: 2 },
        { vx: 2, vy: 2 },
      ]
    : [{ vx: 0, vy: 0 }];

  function growTailAt(vx, vy, len) {
    let curV = { vx, vy };
    let lastDir = null;
    for (let i = 0; i < len; i++) {
      const cands = candidatesForVertex(curV.vx, curV.vy).filter(
        c => !occupied.has(tileKey(c))
      );
      if (!cands.length) break;
      // Slight bias: prefer extending outward (away from ring center)
      cands.sort(() => rng() - 0.5);
      const chosen = cands[0];
      add(chosen);
      curV = outerVertex(chosen);
      // chance to stop early
      if (rng() < 0.45) break;
    }
  }

  function maybeGrow(v) {
    if (rng() < tailChance) {
      const len = 1 + Math.floor(rng() * tailMaxLen);
      growTailAt(v.vx, v.vy, len);
    }
  }

  if (symmetry === 'rot180') {
    // Pick 2 of the 4 outer corners (top-left & top-right say), mirror via rot180.
    const pairs = [
      [seedVerts[0], seedVerts[3]], // diag
      [seedVerts[1], seedVerts[2]], // diag
    ];
    for (const pair of pairs) {
      if (rng() < tailChance) {
        const len = 1 + Math.floor(rng() * tailMaxLen);
        // Snapshot tiles before so we can mirror just-added ones
        const before = tiles.length;
        growTailAt(pair[0].vx, pair[0].vy, len);
        // Mirror: rotate 180° around ring center (1,1)
        for (let i = before; i < tiles.length; i++) {
          const t = tiles[i];
          const m = {
            gx: 2 - 1 - t.gx,
            gy: 2 - 1 - t.gy,
            rot: (t.rot + 2) % 4,
          };
          add(m);
        }
      }
    }
  } else if (symmetry === 'mirror') {
    // Mirror left↔right around vertical axis x=1.
    const lefts = [seedVerts[0], seedVerts[2]];
    for (const v of lefts) {
      if (rng() < tailChance) {
        const len = 1 + Math.floor(rng() * tailMaxLen);
        const before = tiles.length;
        growTailAt(v.vx, v.vy, len);
        for (let i = before; i < tiles.length; i++) {
          const t = tiles[i];
          // Mirror cell across x=1: cell at gx maps to cell at (1 - gx - 1) = -gx (since cell spans gx..gx+1, mirror is at -gx-1..-gx → -gx-1)
          // Actually mirror x ↔ 2 - x. A cell occupying [gx, gx+1] maps to [1-gx, 2-gx], i.e. new gx = 1-gx-1 = -gx... let me redo.
          // Mirror line at x=1: a point x maps to 2-x. Cell [gx, gx+1] maps to [2-gx-1, 2-gx] = [1-gx, 2-gx]. New left edge = 1 - gx. So new gx = 1 - gx.
          // Rotation: corner indices reflect: 0(TL)↔1(TR), 3(BL)↔2(BR).
          const mirrorRot = [1, 0, 3, 2][t.rot];
          const m = { gx: 1 - t.gx, gy: t.gy, rot: mirrorRot };
          add(m);
        }
      }
    }
  } else {
    for (const v of seedVerts) maybeGrow(v);
  }

  // Optional extra seed tiles scattered nearby
  for (let i = 0; i < extraSeeds; i++) {
    const vx = -1 + Math.floor(rng() * 4);
    const vy = -1 + Math.floor(rng() * 4);
    const cands = candidatesForVertex(vx, vy).filter(
      c => !occupied.has(tileKey(c))
    );
    if (cands.length) {
      cands.sort(() => rng() - 0.5);
      add(cands[0]);
    }
  }

  return tiles;
}

// ---------- Rendering ----------

// Path data for the 4 segments of a tile (rot=0; rotation handled by parent <g>)
function tileSegments(S) {
  const h = S / 2;
  return [
    // outer arc — quarter circle of radius S from (S,0) to (0,S)
    { kind: 'outer', d: `M ${S},0 A ${S} ${S} 0 0 1 0,${S}`, len: (Math.PI * S) / 2 },
    // inner arc — quarter of radius S/2 from (S/2,0) to (0,S/2)
    { kind: 'inner', d: `M ${h},0 A ${h} ${h} 0 0 1 0,${h}`, len: (Math.PI * S) / 4 },
    // top connector (S/2,0) → (S,0)
    { kind: 'conn', d: `M ${h},0 L ${S},0`, len: h },
    // left connector (0,S/2) → (0,S)
    { kind: 'conn', d: `M 0,${h} L 0,${S}`, len: h },
  ];
}

function Tile({ tile, S, stroke, strokeWidth, tileIndex = 0, segDelayMs = 60, tileDelayMs = 100, animKey = 0 }) {
  const segs = tileSegments(S);
  // Structure (outer → inner):
  //   .tile          — translate to home cell only
  //   .tile-inner    — WAAPI animation target (scatter translate + rotate in viewport frame)
  //   <g rot>        — base orientation (which corner is curve corner)
  // Splitting position from orientation lets the scatter translate operate in
  // viewport coords so destinations are grid-aligned regardless of base rot.
  return (
    <g
      className="tile"
      style={{ '--ti': tileIndex }}
      transform={`translate(${tile.gx * S}, ${tile.gy * S})`}
    >
      <g className="tile-inner">
        <g transform={`rotate(${tile.rot * 90}, ${S / 2}, ${S / 2})`}>
          {segs.map((s, i) => (
            <path
              key={`${animKey}-${i}`}
              className={`seg seg-${s.kind}`}
              d={s.d}
              pathLength="100"
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{
                animationDelay: `${tileIndex * tileDelayMs + i * segDelayMs}ms`,
              }}
            />
          ))}
        </g>
      </g>
    </g>
  );
}

// Compute bounding box of a set of tiles in cell-grid coords.
function tilesBBox(tiles) {
  if (!tiles.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tiles) {
    if (t.gx < minX) minX = t.gx;
    if (t.gy < minY) minY = t.gy;
    if (t.gx + 1 > maxX) maxX = t.gx + 1;
    if (t.gy + 1 > maxY) maxY = t.gy + 1;
  }
  return { minX, minY, maxX, maxY };
}

// Simple seeded RNG (mulberry32)
function rngFromSeed(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fixed brand logo: central 2×2 ring + 2 diagonal tails whose curve corners
// sit at the outer corners of the ring (visual overlap with the ring is
// intentional — that's the signature of the mark).
function generateLogo() {
  return [
    // Central ring — 4 quarter-annuli meeting curve-corners-to-curve-corners
    // at vertex (1, 1).
    { gx: 0, gy: 0, rot: 2 },
    { gx: 1, gy: 0, rot: 3 },
    { gx: 0, gy: 1, rot: 1 },
    { gx: 1, gy: 1, rot: 0 },
    // Upper-right tail at cell (2, 0), rot=3 → curve corner at BL of cell
    // = vertex (2, 1) = ring's right tangent. The tile's annular sector
    // sits in the upper-right of the cell with straight outer edges on top
    // and right, and the inner arc tucked at the BL facing the ring.
    { gx: 2, gy: 0, rot: 3 },
    // Bottom-left tail — point-symmetric to UR across the ring center (1, 1).
    // Cell (-1, 1) with rot=1 → curve corner at TR of cell = vertex (0, 1)
    // = ring's left tangent.
    { gx: -1, gy: 1, rot: 1 },
  ];
}

window.__shapeGen = { generate, generateLogo, tileSegments, Tile, tilesBBox, rngFromSeed, curveVertex, outerVertex };
