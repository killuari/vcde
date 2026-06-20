# CSG Mathe-Deep-Dive — Entwurf (throwaway branch)

Entwurf für Folgeseiten nach der CSG-Einführungsfolie. SDF und Ray Marching werden vorausgesetzt.

## Generieren

```bash
cd presentation/csg-deep-dive
python3 generate_diagrams.py    # 2D-Diagramme (PNG)
python3 raymarch_preview.py       # 3D-Raymarch-Previews (PNG)
python3 export_pdf.py             # Beispiel-PDFs (ohne LaTeX)
```

Optional (falls `lmodern` o.ä. installiert): `quarto render csg-math-slides.qmd`

## Ausgabe

| Datei | Inhalt |
|-------|--------|
| `assets/diagrams/*.png` | 12 Diagramme (Venn, Heatmaps, Scanline, Baum, Renders) |
| `csg-math-slides.pdf` | 10 Folien à 16:9 (matplotlib) |
| `csg-math-pages.pdf` | Alle Diagramme als Einzelseiten (Handout) |
| `csg-math-slides.qmd` | Quarto/Beamer-Quelle (für später mit vollem TeX-Setup) |

## Folienstruktur (Vorschlag)

1. **Kontext** — was bereits erklärt wurde
2. **Mengen → Distanzen** — Venn + Formeltabelle
3. **Kernoperationen** — min/max/-d₂ + GLSL
4. **Warum?** — Vorzeichentabelle + 1D-Scanline
5. **2D-Felder** — Heatmap-Panel
6. **CSG-Baum** — Hierarchie + Code
7. **Renders** — 4 Raymarch-Beispiele
8. **Erweiterungen** — smooth union, Domain-Ops
9. **Zusammenfassung**

Branch: `throwaway/csg-presentation-draft` — nicht mergen.
