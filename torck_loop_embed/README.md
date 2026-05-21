# Torck Loop Embed

Ein kleines HTML/CSS/JS-Paket für den rotierbaren Torck-Loop.

## Dateien

- `index.html`: Demo und Beispiel-Einbindung
- `torck-loop.css`: Styling, Farben, Layout, Filled/Outline
- `torck-loop.js`: 3D-Layer, Drag-Verhalten und Button-Logik
- `assets/fonts/SpaceMono-Regular.ttf`: Schrift für den Textbutton

## Einbindung

```html
<link rel="stylesheet" href="torck-loop.css">

<div class="torck-loop" data-torck-loop>
  <div class="torck-loop__stage">
    <div class="torck-loop__object"></div>
  </div>

  <div class="torck-loop__controls" aria-label="Torck Loop Darstellung">
    <div class="torck-loop__color-controls" aria-label="Hintergrundfarbe">
      <button type="button" data-torck-theme="cream" aria-label="Cream Hintergrund" aria-pressed="true">
        <span class="torck-loop__swatch torck-loop__swatch--cream"></span>
      </button>
      <button type="button" data-torck-theme="slate" aria-label="Slate Blue Hintergrund" aria-pressed="false">
        <span class="torck-loop__swatch torck-loop__swatch--slate"></span>
      </button>
    </div>

    <div class="torck-loop__loop-color-controls" aria-label="Loop Farbe auf blauem Hintergrund">
      <button type="button" data-torck-loop-color="yellow" aria-label="Electric Yellow Loop" aria-pressed="true">
        <span class="torck-loop__swatch torck-loop__swatch--yellow"></span>
      </button>
      <button type="button" data-torck-loop-color="cream" aria-label="Cream Loop" aria-pressed="false">
        <span class="torck-loop__swatch torck-loop__swatch--cream"></span>
      </button>
    </div>

    <button class="torck-loop__mode-button" type="button" data-torck-mode-toggle aria-label="Filled oder Outline wechseln" aria-pressed="false">
      <span data-torck-mode-label>Outline</span>
    </button>
  </div>
</div>

<script src="torck-loop.js"></script>
```

Der Container `.torck-loop` hat standardmäßig `min-height: 100svh`. Für einen kleineren Bereich kann diese Regel in der einbindenden Seite überschrieben werden.
