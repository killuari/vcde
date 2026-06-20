#!/usr/bin/env python3
"""Export slide-style PDFs from generated PNG diagrams (no LaTeX required)."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.image as mpimg
from matplotlib.backends.backend_pdf import PdfPages

ROOT = Path(__file__).resolve().parent
DIAG = ROOT / "assets" / "diagrams"

BG = "#1a1f2e"
FG = "#e8ecf4"
ACCENT = "#4a90d9"
MUTED = "#9aa5b8"

# reserved header band (figure coords)
TITLE_Y = 0.94
SUBTITLE_Y = 0.875
CONTENT_TOP = 0.82   # nothing may extend above this when subtitle present
CONTENT_TOP_NO_SUB = 0.88


def slide(fig, title: str, subtitle: str | None = None) -> tuple:
    fig.patch.set_facecolor(BG)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor(BG)
    ax.axis("off")
    ax.text(0.06, TITLE_Y, title, color=FG, fontsize=22, weight="bold", va="top")
    top = CONTENT_TOP_NO_SUB
    if subtitle:
        ax.text(0.06, SUBTITLE_Y, subtitle, color=MUTED, fontsize=12, va="top")
        top = CONTENT_TOP
    return ax, top


def add_image(fig, path: Path, bottom: float, height: float,
              left: float = 0.06, width: float = 0.88):
    ax_img = fig.add_axes([left, bottom, width, height])
    ax_img.imshow(mpimg.imread(path))
    ax_img.axis("off")
    return ax_img


def add_code(ax, code: str, y: float, fontsize: float = 9):
    ax.text(
        0.06, y, code,
        family="monospace", fontsize=fontsize, color="#a8d8ff", va="top",
        bbox=dict(boxstyle="round,pad=0.5", fc="#0d1117", ec=MUTED),
    )


def add_bullets(ax, items: list[str], y: float = 0.72):
    for i, item in enumerate(items):
        ax.text(0.08, y - i * 0.065, f"•  {item}", color=FG, fontsize=13, va="top")


def add_math_paragraph(ax, title: str, lines: list[str], y: float = 0.78):
    ax.text(0.06, y, title, color=ACCENT, fontsize=16, weight="bold", va="top")
    yy = y - 0.07
    for ln in lines:
        ax.text(0.06, yy, ln, color=FG, fontsize=12, va="top")
        yy -= 0.06


def export_beamer_pdf(out: Path):
    with PdfPages(out) as pdf:
        # title slide
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, _ = slide(fig, "CSG — Mathematischer Deep Dive", "Folgeseiten (Entwurf)")
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # context
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Kontext", "Was wir bereits wissen")
        add_bullets(ax, [
            "SDF: f(p) < 0 innen, f(p) = 0 Oberfläche, f(p) > 0 außen",
            "Ray Marching: Schrittweite = |f(p)| entlang des Strahls",
            "Primitive: Kugel, Box, Zylinder als geschlossene Formeln",
        ], top - 0.06)
        ax.text(0.06, top - 0.34,
                "Diese Folien: Wie wird aus Primitiven eine Szene — rein algebraisch?",
                color=ACCENT, fontsize=14, weight="bold")
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # venn + table
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Von Mengen zu Distanzen")
        table = (
            "Vereinigung     d = min(d₁, d₂)\n"
            "Schnittmenge    d = max(d₁, d₂)\n"
            "Differenz       d = max(d₁, −d₂)"
        )
        ax.text(0.06, top - 0.02, table, family="monospace", fontsize=12, color=FG, va="top",
                bbox=dict(boxstyle="round,pad=0.4", fc="#243044", ec=MUTED))
        add_image(fig, DIAG / "01-boolean-venn.png", bottom=0.04, height=top - 0.22)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # glsl
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "GLSL — die drei Operatoren")
        add_code(ax,
                 "float opUnion(float d1, float d2)     { return min(d1, d2); }\n"
                 "float opIntersect(float d1, float d2) { return max(d1, d2); }\n"
                 "float opSubtract(float d1, float d2)  { return max(d1, -d2); }",
                 top - 0.04, fontsize=10)
        ax.text(0.06, top - 0.30,
                "Die Szene ist ein verschachtelter Ausdrucksbaum — kein neues Mesh nötig.",
                color=MUTED, fontsize=11)
        add_image(fig, DIAG / "06-nary-union-chain.png", bottom=0.04, height=0.36)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # why min/max — stacked with gap
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Warum min / max?", "Innen iff d < 0")
        table_h = 0.30
        scan_h = top - table_h - 0.10
        add_image(fig, DIAG / "04-inside-outside-table.png", bottom=scan_h + 0.06, height=table_h)
        add_image(fig, DIAG / "03-1d-scanline.png", bottom=0.04, height=scan_h)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # 2d fields
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "2D-Distanzfelder", "Weiße Kontur = d = 0")
        add_image(fig, DIAG / "02-sdf-heatmap-panel.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # csg tree — single large diagram
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "CSG-Baum", "Hierarchische Konstruktion")
        add_image(fig, DIAG / "05-csg-tree.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # renders
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Gerenderte Beispiele", "Software-Raymarch aus SDF-Formeln")
        add_image(fig, DIAG / "10-render-panel.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # shader
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "GLSL — Szene aus dem Baum")
        add_code(ax,
                 "float scene(vec3 p) {\n"
                 "  float holes = min(min(cylZ(p), cylX(p)), cylY(p));\n"
                 "  float core  = max(box(p), sphere(p));\n"
                 "  return max(core, -holes);\n"
                 "}", top - 0.06, fontsize=10)
        add_image(fig, DIAG / "09-render-csg-tree.png", bottom=0.06, height=0.42, width=0.55, left=0.06)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # smooth union
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Glatte Übergänge", "min/max durch polynomiale Mischung")
        add_image(fig, DIAG / "07-smooth-union.png", bottom=0.16, height=top - 0.22)
        add_code(ax,
                 "float h = clamp(0.5+0.5*(d2-d1)/k, 0., 1.);\n"
                 "return mix(d2,d1,h) - k*h*(1.0-h);", 0.06)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # smooth union: parameter sweep
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Smooth Union in 2D", "Was k geometrisch verändert")
        add_image(fig, DIAG / "11-smooth-2d-comparison.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # smooth union: internals
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Smooth Union intern", "Mischgewicht h und korrigierte Kontur")
        add_image(fig, DIAG / "12-smooth-h-map.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # smooth union: k sweep
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Smooth Union k-Sweep", "Von fast hart bis stark geblendet")
        add_image(fig, DIAG / "13-smooth-k-sweep-panel.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # smooth difference / intersection
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Smooth Difference & Intersection", "Gleiche Idee, andere Operatoren")
        add_image(fig, DIAG / "14-smooth-other-ops.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # smooth breakdown
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Smooth Union Schritt-für-Schritt", "h → mix → Korrektur → finales d")
        add_image(fig, DIAG / "15-smooth-step-breakdown.png", bottom=0.03, height=top - 0.05)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # mathematical properties
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Smooth Union — formale Eigenschaften", "Text- und Formelperspektive")
        add_math_paragraph(ax, "Definition", [
            "h = clamp(1/2 + (d2-d1)/(2k), 0, 1)",
            "d_s = (1-h)*d2 + h*d1 - k*h*(1-h)",
        ], y=top - 0.01)
        add_math_paragraph(ax, "Aussagen", [
            "1) k -> 0+  =>  d_s -> min(d1,d2) punktweise",
            "2) |d1-d2| >= k  =>  h in {0,1}  =>  d_s exakt d1 oder d2",
            "3) |d1-d2| < k   =>  glatte polynomiale Mischung",
            "4) -k*h*(1-h) reduziert den Aufbläh-Effekt der reinen Linearmischung",
        ], y=0.49)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # derivative view
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Warum wirklich „smooth“?", "Ableitungen und Normalen-Interpretation")
        add_math_paragraph(ax, "Im Blend-Band gilt", [
            "dh/dd1 = -1/(2k),   dh/dd2 = +1/(2k)",
            "=> grad(d_s) = alpha * grad(d1) + (1-alpha) * grad(d2), alpha in [0,1]",
            "Die Flächennormale springt nicht abrupt, sondern wird kontinuierlich gemischt.",
        ], y=top - 0.01)
        add_math_paragraph(ax, "Konsequenz fürs Rendering", [
            "Kleinere Normalensprünge -> weichere Highlights und stabilere Shading-Übergänge.",
            "Außerhalb des Blend-Bands bleiben die originalen SDF-Flächen exakt erhalten.",
        ], y=0.43)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # summary
        fig = plt.figure(figsize=(13.33, 7.5))
        ax, top = slide(fig, "Zusammenfassung")
        add_bullets(ax, [
            "Union → min(d₁,d₂) — nähere Fläche gewinnt",
            "Schnitt → max(d₁,d₂) — beide müssen innen sein",
            "Differenz → max(d₁,−d₂) — B wird invertiert",
            "Szene = Baum aus Primitiven + Operatoren",
            "Rendering: map(p) in der Ray-Marching-Schleife",
        ], top - 0.04)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

    print(f"Wrote {out}")


def export_pages_pdf(out: Path):
    """One diagram per page — print-friendly handout."""
    images = sorted(DIAG.glob("*.png"))
    with PdfPages(out) as pdf:
        for img_path in images:
            fig = plt.figure(figsize=(11.69, 8.27))  # A4 landscape
            fig.patch.set_facecolor(BG)
            # title band separate from image
            fig.text(0.04, 0.96, img_path.stem.replace("-", " "), color=FG,
                     fontsize=16, weight="bold", va="top")
            sub = fig.add_axes([0.04, 0.05, 0.92, 0.86])
            sub.imshow(mpimg.imread(img_path))
            sub.axis("off")
            pdf.savefig(fig, facecolor=BG)
            plt.close(fig)
    print(f"Wrote {out}")


def main():
    export_beamer_pdf(ROOT / "csg-math-slides.pdf")
    export_pages_pdf(ROOT / "csg-math-pages.pdf")


if __name__ == "__main__":
    main()
