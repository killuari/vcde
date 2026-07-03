# SDF Rendering via Ray Marching

Eine interaktive Lern-Website zu **Signed Distance Functions (SDFs)** und **Sphere Tracing / Ray Marching**, erstellt mit [Quarto](https://quarto.org). Die Seite verbindet erklärenden Text mit selbst geschriebenen Demos (GLSL-Shader und 2D-Canvas), die direkt im Browser laufen.

Projekt im Rahmen des Moduls **Visual Computing** von Luis Kahles, Tobias Jäkel und Moritz Potthoff.

## Über das Projekt

Klassische Computergrafik beschreibt 3D-Objekte durch polygonale Netze. Diese Website zeigt eine Alternative: implizite Geometrie über Signed Distance Functions, die per Ray Marching gerendert wird. Zu jedem Konzept gibt es eine interaktive Demo, die das Verfahren live im Browser veranschaulicht.

Die Shader-Demos sind in **GLSL** (Fragment-Shader, GLSL ES 1.00) geschrieben und werden über die kleine Bibliothek **[glslCanvas](https://github.com/patriciogonzalezvivo/glslCanvas)** (WebGL1, per CDN eingebunden) gerendert. Die didaktischen 2D-Visualisierungen laufen in reinem JavaScript auf dem **HTML5-2D-Canvas**. Eine 3D-Engine wie three.js oder Babylon.js kommt nicht zum Einsatz. Jede Demo liegt als eigenständige Seite unter `assets/demos/` und wird per `<iframe>` in die Kapitel eingebettet.

## Inhalt

Die Website besteht aus sechs Kapiteln (Navigationsleiste oben):

- **Einführung** - Motivation, Grenzen polygonaler Netze und typische Anwendungsgebiete von SDFs
- **Theorie** - Definition von SDFs, die Kugel als Beispiel, Primitive, der Ray-Marching-Algorithmus, Shading und Beleuchtung
- **Verwandte Methoden** - Vergleich mit Rasterisierung und Ray Tracing, CSG gegenüber klassischem CAD
- **CSG** - Constructive Solid Geometry mit SDFs (Vereinigung, Schnittmenge, Differenz, glatte Übergänge)
- **Grenzen & Artefakte** - Schrittlimit und Abstandsschwelle beim Sphere Tracing
- **Demos** - Galerie aller interaktiven Demos an einem Ort

## Technologie-Stack

- **[Quarto](https://quarto.org)** - erzeugt die statische Website aus den `.qmd`-Dateien
- **GLSL + [glslCanvas](https://github.com/patriciogonzalezvivo/glslCanvas)** (WebGL1, per CDN) für die Shader-Demos und **HTML5-2D-Canvas** für die 2D-Visualisierungen (`index.html` + `demo.js` + `shader.frag` je Demo); keine 3D-Engine
- **SCSS** - dunkles Theme (neutrales Dunkel) in `theme-dark.scss`
- **Python + [uv](https://docs.astral.sh/uv/)** - optional, nur für eine Jupyter-Umgebung; für das reine Rendern der aktuellen Seiten wird Python **nicht** benötigt

## Voraussetzungen

- **Quarto CLI** (Version 1.4 oder neuer): siehe [Get Started](https://quarto.org/docs/get-started/). Prüfen mit:
  ```bash
  quarto --version
  ```
- Ein moderner Browser mit WebGL-Unterstützung für die Demos (die Shader-Demos laden glslCanvas per CDN, benötigen beim ersten Aufruf also eine Internetverbindung).
- **Optional:** Python 3.13 und [uv](https://docs.astral.sh/uv/), falls die Jupyter-Umgebung genutzt werden soll.

## Installation und lokale Vorschau

1. Repository klonen:
   ```bash
   git clone <repository-url>
   cd vcde
   ```

2. Website mit Live-Vorschau starten:
   ```bash
   quarto preview
   ```
   `quarto preview` startet einen lokalen Webserver, öffnet die Seite im Browser und lädt sie bei jeder Änderung an einer `.qmd`-, `.scss`- oder Demo-Datei automatisch neu. Ideal zum Entwickeln.

3. Alternativ die fertige Website statisch bauen:
   ```bash
   quarto render
   ```
   `quarto render` erzeugt das komplette HTML in den Ausgabeordner `_site/`. Diesen Ordner kann man direkt ausliefern oder z. B. über `_site/index.html` lokal öffnen.

> **Hinweis:** Die Startseite leitet automatisch auf das Kapitel **Einführung** weiter. Das ist so gewollt.

Ein Python-Setup ist für Vorschau und Rendern nicht erforderlich. Wer die optionale Jupyter-Umgebung möchte, richtet sie mit `uv sync` ein.

## Projektstruktur

```
vcde/
├── _quarto.yml            # Quarto-Projektkonfiguration (Navigation, Theme, Layout)
├── theme-dark.scss        # dunkles Theme der Website
├── styles.css             # zusätzliche, theme-unabhängige Layout-Regeln
├── references.bib         # Literaturverzeichnis (BibTeX)
├── pages/                 # die sechs Kapitel als .qmd-Dateien
│   ├── einfuehrung.qmd
│   ├── theorie.qmd
│   ├── verwandte-methoden.qmd
│   ├── csg.qmd
│   ├── grenzen-artefakte.qmd
│   └── demos.qmd
└── assets/
    ├── demos/             # interaktive Demos (GLSL/glslCanvas + 2D-Canvas)
    │   └── demo-dark.css  # gemeinsames dunkles Theme der Demos
    └── images/            # statische Abbildungen
```

## Deployment

Die Website wird automatisch über **GitHub Actions** veröffentlicht (`.github/workflows/publish.yml`). Bei jedem Push auf den `main`-Branch wird die Seite gerendert und auf den Branch `gh-pages` publiziert, von dem GitHub Pages die Seite ausliefert.

Einmalige Einrichtung im geforkten Repository:

1. **Settings > Actions > General**: unter *Workflow permissions* die Option *Read and write permissions* aktivieren und speichern.
2. Im Reiter **Actions** die Workflows aktivieren.
3. **Settings > Pages**: unter *Build and deployment* als Branch `gh-pages` auswählen und speichern.

Der Branch `gh-pages` entsteht erst nach dem ersten erfolgreichen Durchlauf der GitHub Action. Die Seite ist anschließend unter `https://<username>.github.io/<repository-name>/` erreichbar.

## Quellen

Die interaktiven Demos setzen etablierte Techniken der Echtzeit-Grafik um. Die wichtigsten Quellen:

- **Inigo Quilez** ([iquilezles.org](https://iquilezles.org)) - Distance Functions, Soft Shadows, Ambient Occlusion, Smooth Minimum, Fractional Brownian Motion (FBM) und Ray Marching.
- **John C. Hart (1996)** - *Sphere Tracing: A Geometric Method for the Antialiased Ray Tracing of Implicit Surfaces*.
- **Jamie Wong** - *Ray Marching and Signed Distance Functions*.
- Vorlesungsmaterial **Visual Computing**.

Die vollständigen Literaturangaben stehen in [`references.bib`](references.bib) und im Quellenverzeichnis am Ende jeder Kapitelseite.

## Lizenz

Siehe [LICENSE](LICENSE).
