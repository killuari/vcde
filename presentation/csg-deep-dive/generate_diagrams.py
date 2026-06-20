#!/usr/bin/env python3
"""Generate PNG diagrams for the CSG mathematics presentation."""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import patheffects as pe
from matplotlib.colors import TwoSlopeNorm
import numpy as np
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401

OUT = Path(__file__).resolve().parent / "assets" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

# Presentation palette (aligned with vcde demos)
C_INSIDE = "#e74c3c"
C_OUTSIDE = "#3498db"
C_SURFACE = "#111827"
C_A = "#2ecc71"
C_B = "#9b59b6"
C_UNION = "#27ae60"
C_INTER = "#2980b9"
C_DIFF = "#c0392b"
BG = "#ffffff"
FG = "#111827"
MUTED = "#64748b"
ACCENT = "#2563eb"


def style_ax(ax, title: str | None = None, dark: bool = True):
    if dark:
        ax.set_facecolor(BG)
        ax.figure.patch.set_facecolor(BG)
        ax.tick_params(colors=FG, labelsize=9)
        ax.xaxis.label.set_color(FG)
        ax.yaxis.label.set_color(FG)
        for spine in ax.spines.values():
            spine.set_color(MUTED)
    if title:
        ax.set_title(title, color=FG if dark else "black", fontsize=10, pad=12, weight="bold")


def sdf_circle(x, y, cx, cy, r):
    return np.sqrt((x - cx) ** 2 + (y - cy) ** 2) - r


def sdf_box(x, y, cx, cy, hw, hh):
    dx = np.abs(x - cx) - hw
    dy = np.abs(y - cy) - hh
    outside = np.sqrt(np.maximum(dx, 0) ** 2 + np.maximum(dy, 0) ** 2)
    inside = np.minimum(np.maximum(dx, dy), 0)
    return outside + inside


def smooth_union_vals(d1, d2, k):
    h = np.clip(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0)
    d = h * d1 + (1 - h) * d2 - k * h * (1 - h)
    return d, h


def smooth_intersection_vals(d1, d2, k):
    d, h = smooth_union_vals(-d1, -d2, k)
    return -d, h


def smooth_difference_vals(d1, d2, k):
    d, h = smooth_intersection_vals(d1, -d2, k)
    return d, h


def sdf_field(ax, field, extent, title, cmap="RdBu_r", vmin=-1.2, vmax=1.2):
    n = 220
    xs = np.linspace(extent[0], extent[1], n)
    ys = np.linspace(extent[2], extent[3], n)
    X, Y = np.meshgrid(xs, ys)
    Z = field(X, Y)
    norm = TwoSlopeNorm(vmin=vmin, vcenter=0.0, vmax=vmax)
    im = ax.imshow(
        Z,
        origin="lower",
        extent=extent,
        cmap=cmap,
        norm=norm,
        interpolation="bilinear",
        aspect="equal",
    )
    ax.contour(X, Y, Z, levels=[0], colors=[C_SURFACE], linewidths=1.8)
    style_ax(ax, title)


def finish_fig(fig, path: Path, *, top: float = 0.90, bottom: float = 0.06,
               left: float = 0.06, right: float = 0.98,
               hspace: float | None = None, wspace: float | None = None):
    kw = dict(top=top, bottom=bottom, left=left, right=right)
    if hspace is not None:
        kw["hspace"] = hspace
    if wspace is not None:
        kw["wspace"] = wspace
    fig.subplots_adjust(**kw)
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor=BG, pad_inches=0.2)
    plt.close(fig)


def plot_boolean_venn():
    fig, axes = plt.subplots(1, 3, figsize=(12, 4.8))
    fig.patch.set_facecolor(BG)
    fig.suptitle("Boolesche Operationen → SDF-Kombination", color=FG, fontsize=14, y=0.97)

    configs = [
        ("Vereinigung  A ∪ B", "union", C_UNION, r"$d=\min(d_1,d_2)$"),
        ("Schnittmenge  A ∩ B", "inter", C_INTER, r"$d=\max(d_1,d_2)$"),
        ("Differenz  A \\ B", "diff", C_DIFF, r"$d=\max(d_1,-d_2)$"),
    ]

    for ax, (title, op, color, formula) in zip(axes, configs):
        ax.set_xlim(-2.2, 2.2)
        ax.set_ylim(-1.6, 1.6)
        ax.set_aspect("equal")
        ax.axis("off")
        style_ax(ax)

        c1 = plt.Circle((-0.45, 0), 1.0, fill=False, ec=C_A, lw=2.5)
        c2 = plt.Circle((0.45, 0), 1.0, fill=False, ec=C_B, lw=2.5)
        ax.add_patch(c1)
        ax.add_patch(c2)
        ax.text(-0.95, 0.15, "A", color=C_A, fontsize=16, weight="bold")
        ax.text(0.75, 0.15, "B", color=C_B, fontsize=16, weight="bold")

        # shaded region via fine grid mask
        n = 400
        xs = np.linspace(-2.2, 2.2, n)
        ys = np.linspace(-1.6, 1.6, n)
        X, Y = np.meshgrid(xs, ys)
        d1 = sdf_circle(X, Y, -0.45, 0, 1.0)
        d2 = sdf_circle(X, Y, 0.45, 0, 1.0)
        if op == "union":
            mask = (d1 <= 0) | (d2 <= 0)
        elif op == "inter":
            mask = (d1 <= 0) & (d2 <= 0)
        else:
            mask = (d1 <= 0) & (d2 > 0)

        ax.contourf(X, Y, mask.astype(float), levels=[0.5, 1.5], colors=[color], alpha=0.55)
        ax.set_title(title, color=FG, fontsize=10, pad=10)
        ax.text(0, -1.42, formula, ha="center", color=FG, fontsize=11,
                bbox=dict(boxstyle="round,pad=0.35", fc="#eef2f7", ec=MUTED, alpha=0.95))

    finish_fig(fig, OUT / "01-boolean-venn.png", top=0.86, wspace=0.28)


def plot_sdf_heatmap_panel():
    extent = [-2.4, 2.4, -2.0, 2.0]

    def d1(X, Y):
        return sdf_circle(X, Y, -0.55, 0, 0.95)

    def d2(X, Y):
        return sdf_circle(X, Y, 0.55, 0, 0.95)

    ops = [
        (r"$d_1$ — Form A", d1),
        (r"$d_2$ — Form B", d2),
        (r"Vereinigung $\min(d_1,d_2)$", lambda X, Y: np.minimum(d1(X, Y), d2(X, Y))),
        (r"Schnitt $\max(d_1,d_2)$", lambda X, Y: np.maximum(d1(X, Y), d2(X, Y))),
        (r"Differenz $\max(d_1,-d_2)$", lambda X, Y: np.maximum(d1(X, Y), -d2(X, Y))),
    ]

    fig, axes = plt.subplots(2, 3, figsize=(13, 9.2))
    fig.patch.set_facecolor(BG)
    axes_flat = axes.flatten()

    for ax, (title, fn) in zip(axes_flat, ops):
        sdf_field(ax, fn, extent, title)

    # legend panel — use axes fraction coords with generous spacing
    ax_leg = axes_flat[5]
    ax_leg.axis("off")
    style_ax(ax_leg)
    ax_leg.text(0.08, 0.92, "Signed Distance Field", color=FG, fontsize=12, weight="bold",
                transform=ax_leg.transAxes, va="top")
    legend_items = [
        (C_INSIDE, "d < 0 — innen"),
        (C_SURFACE, "d = 0 — Oberfläche"),
        (C_OUTSIDE, "d > 0 — außen"),
    ]
    y = 0.68
    for col, label in legend_items:
        ax_leg.add_patch(mpatches.Rectangle(
            (0.08, y), 0.14, 0.09, fc=col, ec=MUTED, transform=ax_leg.transAxes,
        ))
        ax_leg.text(0.28, y + 0.045, label, color=FG, fontsize=10, va="center",
                    transform=ax_leg.transAxes)
        y -= 0.20
    ax_leg.text(
        0.08, 0.10,
        "Rot = nah an/vor der Fläche (innen)\nBlau = weit draußen",
        color=MUTED, fontsize=9, linespacing=1.5, transform=ax_leg.transAxes, va="bottom",
    )

    fig.suptitle("2D-Querschnitt: Distanzfelder vor und nach CSG", color=FG, fontsize=14, y=0.99)
    finish_fig(fig, OUT / "02-sdf-heatmap-panel.png", top=0.88, hspace=0.58, wspace=0.32)


def plot_1d_intuition():
    """Along a horizontal scanline: d1, d2, and combined ops."""
    x = np.linspace(-2.5, 2.5, 500)
    y0 = 0.0
    d1 = sdf_circle(x, y0, -0.6, 0, 1.0)
    d2 = sdf_circle(x, y0, 0.6, 0, 1.0)

    fig, axes = plt.subplots(3, 1, figsize=(11, 8.2), sharex=True)
    fig.patch.set_facecolor(BG)

    panels = [
        (r"Vereinigung: $\min(d_1,d_2)$", np.minimum(d1, d2), C_UNION),
        (r"Schnitt: $\max(d_1,d_2)$", np.maximum(d1, d2), C_INTER),
        (r"Differenz: $\max(d_1,-d_2)$", np.maximum(d1, -d2), C_DIFF),
    ]

    for ax, (title, d, col) in zip(axes, panels):
        ax.axhline(0, color=MUTED, lw=0.8, ls="--", alpha=0.6)
        ax.axvspan(-2.5, 2.5, ymin=0, ymax=0.5, color="#e2e8f0", alpha=0.45)
        ax.plot(x, d1, color=C_A, lw=1.6, alpha=0.75, label=r"$d_1$")
        ax.plot(x, d2, color=C_B, lw=1.6, alpha=0.75, label=r"$d_2$")
        ax.plot(x, d, color=col, lw=2.4, label="Ergebnis")
        ax.fill_between(x, d, 0, where=(d <= 0), color=col, alpha=0.25)
        ax.set_ylabel("Distanz", color=FG)
        ax.set_ylim(-1.3, 1.3)
        style_ax(ax, title)
        ax.legend(loc="upper left", fontsize=8, facecolor="#f8fafc", edgecolor=MUTED,
                  labelcolor=FG, framealpha=0.95)

    axes[-1].set_xlabel("Position entlang der Scanlinie", color=FG)
    fig.suptitle("1D-Intuition: horizontale Probe durch zwei Kreise",
                 color=FG, fontsize=13, y=0.98)
    finish_fig(fig, OUT / "03-1d-scanline.png", top=0.90, hspace=0.50)


def plot_inside_outside_table():
    fig, ax = plt.subplots(figsize=(10, 4.8))
    fig.patch.set_facecolor(BG)
    ax.axis("off")

    rows = [
        ["Punktlage", r"$d_1$", r"$d_2$", "Union min", "Schnitt max", "Diff max(·,−)"],
        ["nur in A", "< 0", "> 0", "< 0 ✓", "> 0 ✗", "< 0 ✓"],
        ["nur in B", "> 0", "< 0", "< 0 ✓", "> 0 ✗", "> 0 ✗"],
        ["in A ∩ B", "< 0", "< 0", "< 0 ✓", "< 0 ✓", "< 0 ✓"],
        ["außen", "> 0", "> 0", "> 0 ✗", "> 0 ✗", "> 0 ✗"],
    ]

    table = ax.table(
        cellText=rows[1:],
        colLabels=rows[0],
        loc="center",
        cellLoc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1.1, 1.8)

    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor(MUTED)
        cell.set_facecolor("#e2e8f0" if row == 0 else "#f8fafc")
        cell.get_text().set_color(FG)
        if row == 0:
            cell.get_text().set_weight("bold")

    ax.set_title(
        "Warum min / max? — Innen iff alle relevanten $d_i < 0$",
        color=FG, fontsize=13, pad=28, weight="bold", y=1.02,
    )
    fig.subplots_adjust(top=0.82, bottom=0.08)
    fig.savefig(OUT / "04-inside-outside-table.png", dpi=180, bbox_inches="tight", facecolor=BG)
    plt.close(fig)


def _draw_box(ax, x, y, w, h, text, fc, ec, fs=9):
    rect = mpatches.FancyBboxPatch(
        (x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
        fc=fc, ec=ec, lw=2,
    )
    ax.add_patch(rect)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", color="white",
            fontsize=fs, weight="bold")


def plot_csg_tree():
    """CSG tree diagram inspired by the FreeCAD rounded-cube example."""
    fig, ax = plt.subplots(figsize=(14, 9))
    fig.patch.set_facecolor(BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 9.5)
    ax.axis("off")

    def leaf(x, y, text, fc):
        _draw_box(ax, x, y, 1.55, 0.7, text, fc, "white", fs=8)

    def arrow(x1, y1, x2, y2):
        ax.annotate(
            "", xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle="-|>", color=MUTED, lw=1.6,
                            shrinkA=4, shrinkB=4, connectionstyle="arc3,rad=0.0"),
        )

    # --- tree (lower area, y: 0.3 – 5.5) ---
    leaf(0.4, 0.4, "Zylinder\n(Z)", "#5d6d7e")
    leaf(2.2, 0.4, "Zylinder\n(X)", "#5d6d7e")
    leaf(4.0, 0.4, "Zylinder\n(Y)", "#5d6d7e")
    leaf(7.4, 0.4, "Würfel", "#d35400")
    leaf(9.2, 0.4, "Kugel", "#8e44ad")

    _draw_box(ax, 1.6, 1.75, 2.2, 0.8, "Union", "#e91e8c", "#ff79c6")
    _draw_box(ax, 7.2, 1.75, 2.2, 0.8, "Schnitt", "#f39c12", "#ffd27f")
    _draw_box(ax, 4.2, 3.35, 2.6, 0.9, "Differenz\n(A \\ B)", "#e74c3c", "#ff8a80", fs=10)

    # arrows: leaves → operators
    arrow(1.15, 1.10, 2.0, 1.75)
    arrow(2.95, 1.10, 2.7, 1.75)
    arrow(4.75, 1.10, 3.4, 1.75)
    arrow(8.15, 1.10, 7.9, 1.75)
    arrow(9.95, 1.10, 8.7, 1.75)

    # operators → root
    arrow(2.7, 2.55, 4.8, 3.35)
    arrow(8.3, 2.55, 6.2, 3.35)

    # result box — right of root, no crossing
    _draw_box(ax, 10.8, 3.2, 2.8, 1.2,
              "Ergebnis:\nabgerundeter Würfel\nmit Bohrungen", "#2c3e50", ACCENT, fs=9)
    arrow(6.8, 3.8, 10.8, 3.8)

    # --- header (upper area, y: 6.5 – 9) ---
    ax.text(7.0, 8.85, "CSG-Baum: hierarchische Konstruktion", color=FG, fontsize=15,
            ha="center", weight="bold")
    ax.text(7.0, 8.35,
            "Blätter = Primitive SDFs   ·   Knoten = boolesche Operatoren   ·   Wurzel = finale Szene-SDF",
            color=MUTED, fontsize=10, ha="center")

    code = (
        "float scene(vec3 p) {\n"
        "  float holes = opUnion(opUnion(cylZ(p), cylX(p)), cylY(p));\n"
        "  float core  = opIntersect(box(p), sphere(p));\n"
        "  return opSubtract(core, holes);\n"
        "}"
    )
    ax.text(0.5, 7.55, code, family="monospace", fontsize=8.5, color="#075985",
            bbox=dict(boxstyle="round,pad=0.55", fc="#f8fafc", ec=MUTED),
            va="top", ha="left")

    # separator line between code header and tree
    ax.plot([0.3, 13.7], [6.15, 6.15], color=MUTED, lw=0.8, alpha=0.45)

    fig.savefig(OUT / "05-csg-tree.png", dpi=180, bbox_inches="tight", facecolor=BG, pad_inches=0.2)
    plt.close(fig)


def plot_nary_chain():
    fig, ax = plt.subplots(figsize=(12, 5.4))
    fig.patch.set_facecolor(BG)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 5.4)
    ax.axis("off")

    ax.text(0.5, 5.0, "N-äre Vereinigung = wiederholtes min",
            color=FG, fontsize=12, weight="bold", va="top")

    code = "float d = d1;\nd = min(d, d2);\nd = min(d, d3);\nd = min(d, d4);"
    ax.text(0.5, 3.85, code, family="monospace", fontsize=10, color="#075985", va="top",
            bbox=dict(boxstyle="round,pad=0.45", fc="#f8fafc", ec=MUTED))

    ax.plot([0.4, 11.6], [2.55, 2.55], color=MUTED, lw=0.6, alpha=0.35)

    # flow: boxes with clear gaps; min labels centered in gaps
    y, bw, bh = 1.05, 1.1, 0.9
    boxes = [("d₁", 0.5), ("d₂", 2.55), ("d₃", 4.6), ("d₄", 6.65)]
    for label, x in boxes:
        _draw_box(ax, x, y, bw, bh, label, "#34495e", ACCENT, fs=12)

    _draw_box(ax, 9.0, y - 0.05, 2.2, bh + 0.1, r"$d_\mathrm{scene}$", ACCENT, "white", fs=14)

    gaps = [(1.6, 2.55), (3.65, 4.6), (5.75, 6.65), (7.75, 9.0)]
    for x0, x1 in gaps:
        xm = (x0 + x1) / 2
        ax.annotate(
            "", xy=(x1, y + bh / 2), xytext=(x0, y + bh / 2),
            arrowprops=dict(arrowstyle="-|>", color=MUTED, lw=1.6,
                            shrinkA=2, shrinkB=2),
        )
        if x1 < 8.5:
            ax.text(xm, y + bh + 0.18, "min", ha="center", color=FG,
                    fontsize=10, weight="bold")

    fig.savefig(OUT / "06-nary-union-chain.png", dpi=180, bbox_inches="tight",
                facecolor=BG, pad_inches=0.2)
    plt.close(fig)


def plot_smooth_union():
    x = np.linspace(-2.2, 2.2, 400)
    d1 = sdf_circle(x, 0, -0.55, 0, 0.9)
    d2 = sdf_circle(x, 0, 0.55, 0, 0.9)
    hard = np.minimum(d1, d2)

    k = 0.35
    smooth, h = smooth_union_vals(d1, d2, k)

    fig, (ax_top, ax_bottom) = plt.subplots(2, 1, figsize=(10, 6.4), sharex=True)
    fig.patch.set_facecolor(BG)

    # Oberes Panel: harte vs. weiche Union
    ax_top.axhline(0, color=MUTED, ls="--", lw=0.8, alpha=0.6)
    ax_top.plot(x, d1, color=C_A, lw=1.4, alpha=0.75, label=r"$d_1$")
    ax_top.plot(x, d2, color=C_B, lw=1.4, alpha=0.75, label=r"$d_2$")
    ax_top.plot(x, hard, color=C_UNION, lw=2.0, label=r"$\min(d_1,d_2)$")
    ax_top.plot(x, smooth, color="#f1c40f", lw=2.0, ls="--",
                label=rf"$\mathrm{{smoothUnion}}(k={k})$")
    ax_top.fill_between(x, smooth, 0, where=(smooth <= 0), color="#f1c40f", alpha=0.18)
    ax_top.set_ylabel("Distanz", color=FG)
    style_ax(ax_top, "Distanz entlang einer Scanlinie")
    ax_top.legend(facecolor="#f8fafc", edgecolor=MUTED, labelcolor=FG,
                  loc="upper left", framealpha=0.95, fontsize=8)

    # Unteres Panel: Mischgewicht h(d1,d2)
    ax_bottom.axhline(0, color=MUTED, ls="--", lw=0.8, alpha=0.6)
    ax_bottom.plot(x, h, color="#f1c40f", lw=2.0)
    ax_bottom.set_xlabel("Scanlinie", color=FG)
    ax_bottom.set_ylabel(r"$h$", color=FG)
    style_ax(ax_bottom, r"$h(d_1,d_2)$")
    ax_bottom.fill_between(
        x, h, 0, where=((h > 0.0) & (h < 1.0)), color="#f1c40f", alpha=0.18
    )

    fig.suptitle(
        "Smooth Union",
        color=FG,
        fontsize=13,
        y=0.99,
    )
    finish_fig(fig, OUT / "07-smooth-union.png", top=0.92, hspace=0.45)


def plot_smooth_union_intuition():
    extent = [-2.45, 2.45, -1.7, 1.7]
    n = 420
    xs = np.linspace(extent[0], extent[1], n)
    ys = np.linspace(extent[2], extent[3], n)
    X, Y = np.meshgrid(xs, ys)
    d1 = sdf_circle(X, Y, -0.62, 0, 0.88)
    d2 = sdf_circle(X, Y, 0.62, 0, 0.88)
    hard = np.minimum(d1, d2)
    k = 0.52
    smooth, h = smooth_union_vals(d1, d2, k)
    band = (h > 0.03) & (h < 0.97)

    fig, axes = plt.subplots(1, 2, figsize=(14.2, 6.6))
    fig.patch.set_facecolor(BG)
    panels = [
        (axes[0], hard, r"$\min(d_1,d_2)$", "#dff7e8", False),
        (axes[1], smooth, r"$\mathrm{smoothUnion}(d_1,d_2,k)$", "#fff2bd", True),
    ]

    for ax, field, title, fill, show_band in panels:
        ax.set_xlim(extent[0], extent[1])
        ax.set_ylim(extent[2], extent[3])
        ax.set_aspect("equal")
        style_ax(ax, title)
        ax.contourf(X, Y, field <= 0, levels=[0.5, 1.5], colors=[fill], alpha=0.95)
        if show_band:
            ax.contourf(X, Y, band.astype(float), levels=[0.5, 1.5], colors=["#ffd166"], alpha=0.28)
        ax.contour(X, Y, d1, levels=[0], colors=[C_A], linewidths=1.5, linestyles="--")
        ax.contour(X, Y, d2, levels=[0], colors=[C_B], linewidths=1.5, linestyles="--")
        ax.contour(X, Y, field, levels=[0], colors=[FG], linewidths=2.4)
        ax.set_xticks([])
        ax.set_yticks([])

    finish_fig(fig, OUT / "16-smooth-union-intuition.png", top=0.88, bottom=0.06, wspace=0.18)


def plot_smooth_union_formula_flow():
    fig, ax = plt.subplots(figsize=(14.2, 7.4))
    fig.patch.set_facecolor(BG)
    ax.set_xlim(0, 14.2)
    ax.set_ylim(0, 7.4)
    ax.axis("off")

    def box(x, y, w, h, text, fc="#f8fafc", ec=MUTED, fs=12, weight="normal"):
        rect = mpatches.FancyBboxPatch(
            (x, y), w, h, boxstyle="round,pad=0.04,rounding_size=0.08",
            fc=fc, ec=ec, lw=1.8,
        )
        ax.add_patch(rect)
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
                color=FG, fontsize=fs, weight=weight, linespacing=1.35)

    def arrow(x1, y1, x2, y2):
        ax.annotate(
            "", xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle="-|>", color=MUTED, lw=1.7,
                            shrinkA=3, shrinkB=3),
        )

    box(0.55, 5.28, 2.2, 0.72, r"$d_1(\mathbf{p})$", "#e9f9ef", C_A, fs=15, weight="bold")
    box(0.55, 4.22, 2.2, 0.72, r"$d_2(\mathbf{p})$", "#f2eafa", C_B, fs=15, weight="bold")
    box(0.55, 3.16, 2.2, 0.72, r"$k$", "#fff7d6", "#f39c12", fs=15, weight="bold")

    box(
        3.35, 4.65, 4.15, 1.55,
        r"$h=\mathrm{clamp}\left(0.5+0.5\,\frac{d_2-d_1}{k},0,1\right)$",
        "#eef6ff", ACCENT, fs=11,
    )
    box(
        3.35, 2.55, 4.15, 1.35,
        r"$m=h\,d_1+(1-h)\,d_2$",
        "#f8fafc", MUTED, fs=12,
    )
    box(
        8.15, 2.55, 3.35, 1.35,
        r"$c=k\,h(1-h)$",
        "#fff7d6", "#f39c12", fs=12,
    )
    box(
        8.15, 4.65, 3.35, 1.55,
        r"$d_\mathrm{smooth}=m-c$",
        "#e9f9ef", C_UNION, fs=11, weight="bold",
    )
    box(
        12.1, 3.42, 1.55, 1.25,
        r"$d=0$",
        "#eef2ff", ACCENT, fs=12, weight="bold",
    )

    arrow(2.75, 5.64, 3.35, 5.43)
    arrow(2.75, 4.58, 3.35, 5.15)
    arrow(2.75, 3.52, 3.35, 4.88)
    arrow(5.42, 4.65, 5.42, 3.90)
    arrow(7.50, 3.22, 8.15, 3.22)
    arrow(9.82, 3.90, 9.82, 4.65)
    arrow(11.50, 5.42, 12.10, 4.20)

    ax.text(3.5, 1.43, r"$h=1 \Rightarrow d_1$", color=C_A, fontsize=12, weight="bold")
    ax.text(5.68, 1.43, r"$h=0 \Rightarrow d_2$", color=C_B, fontsize=12, weight="bold")
    ax.text(7.85, 1.43, r"$0<h<1$", color="#f39c12", fontsize=12, weight="bold")
    ax.plot([3.2, 11.2], [1.18, 1.18], color=MUTED, lw=1.0, alpha=0.45)

    fig.savefig(OUT / "17-smooth-union-formula-flow.png", dpi=180,
                bbox_inches="tight", facecolor=BG, pad_inches=0.2)
    plt.close(fig)


def plot_smooth_2d_comparison():
    extent = [-2.4, 2.4, -2.0, 2.0]
    n = 320
    xs = np.linspace(extent[0], extent[1], n)
    ys = np.linspace(extent[2], extent[3], n)
    X, Y = np.meshgrid(xs, ys)
    d1 = sdf_circle(X, Y, -0.55, 0, 0.95)
    d2 = sdf_circle(X, Y, 0.55, 0, 0.95)

    ks = [0.18, 0.38, 0.62]
    fig, axes = plt.subplots(2, 2, figsize=(12.5, 9.0))
    fig.patch.set_facecolor(BG)

    hard = np.minimum(d1, d2)
    fields = [(r"Harte Union: $\min(d_1,d_2)$", hard)]
    for k in ks:
        sm, _ = smooth_union_vals(d1, d2, k)
        fields.append((rf"Glatte Union: $k={k}$", sm))

    for ax, (title, field) in zip(axes.flatten(), fields):
        norm = TwoSlopeNorm(vmin=-1.2, vcenter=0.0, vmax=1.2)
        ax.imshow(
            field,
            origin="lower",
            extent=extent,
            cmap="RdBu_r",
            norm=norm,
            interpolation="bilinear",
            aspect="equal",
        )
        ax.contour(X, Y, field, levels=[0], colors=[C_SURFACE], linewidths=1.8)
        style_ax(ax, title)

    fig.suptitle(
        "Wie k den Blend-Bereich steuert: klein = fast hart, groß = breite Verschmelzung",
        color=FG,
        fontsize=13,
        y=0.99,
    )
    finish_fig(fig, OUT / "11-smooth-2d-comparison.png", top=0.92, hspace=0.35, wspace=0.24)


def plot_smooth_h_map():
    extent = [-2.4, 2.4, -2.0, 2.0]
    n = 320
    xs = np.linspace(extent[0], extent[1], n)
    ys = np.linspace(extent[2], extent[3], n)
    X, Y = np.meshgrid(xs, ys)
    d1 = sdf_circle(X, Y, -0.55, 0, 0.95)
    d2 = sdf_circle(X, Y, 0.55, 0, 0.95)
    k = 0.38
    smooth, h = smooth_union_vals(d1, d2, k)

    fig, axes = plt.subplots(1, 2, figsize=(12.5, 5.1))
    fig.patch.set_facecolor(BG)

    ax0, ax1 = axes
    style_ax(ax0, rf"$h(d_1,d_2),\ k={k}$")
    im = ax0.imshow(
        h,
        origin="lower",
        extent=extent,
        cmap="viridis",
        vmin=0.0,
        vmax=1.0,
        interpolation="bilinear",
        aspect="equal",
    )
    ax0.contour(X, Y, h, levels=[0.0, 0.5, 1.0], colors=["#f8f8f8", "#ffd166", "#f8f8f8"], linewidths=1.1)
    cb = fig.colorbar(im, ax=ax0, fraction=0.046, pad=0.04)
    cb.ax.tick_params(colors=FG, labelsize=8)
    cb.set_label(r"$h$", color=FG)

    style_ax(ax1, r"$d_\mathrm{smooth}=0$")
    norm = TwoSlopeNorm(vmin=-1.2, vcenter=0.0, vmax=1.2)
    ax1.imshow(
        smooth,
        origin="lower",
        extent=extent,
        cmap="RdBu_r",
        norm=norm,
        interpolation="bilinear",
        aspect="equal",
    )
    ax1.contour(X, Y, np.minimum(d1, d2), levels=[0], colors=["#9fb3c8"], linewidths=1.2, linestyles="--")
    ax1.contour(X, Y, smooth, levels=[0], colors=[C_SURFACE], linewidths=2.0)
    finish_fig(fig, OUT / "12-smooth-h-map.png", top=0.94, wspace=0.22)


def plot_smooth_k_sweep():
    extent = [-2.4, 2.4, -2.0, 2.0]
    n = 300
    xs = np.linspace(extent[0], extent[1], n)
    ys = np.linspace(extent[2], extent[3], n)
    X, Y = np.meshgrid(xs, ys)
    d1 = sdf_circle(X, Y, -0.55, 0, 0.95)
    d2 = sdf_circle(X, Y, 0.55, 0, 0.95)
    ks = [0.05, 0.12, 0.2, 0.3, 0.42, 0.55, 0.7, 0.85]
    norm = TwoSlopeNorm(vmin=-1.2, vcenter=0.0, vmax=1.2)

    for i, k in enumerate(ks, start=1):
        smooth, _ = smooth_union_vals(d1, d2, k)
        fig, ax = plt.subplots(figsize=(6.0, 4.4))
        fig.patch.set_facecolor(BG)
        ax.imshow(
            smooth,
            origin="lower",
            extent=extent,
            cmap="RdBu_r",
            norm=norm,
            interpolation="bilinear",
            aspect="equal",
        )
        ax.contour(X, Y, smooth, levels=[0], colors=[C_SURFACE], linewidths=1.9)
        style_ax(ax, rf"Smooth Union Sweep — $k={k}$")
        ax.text(
            0.02, 0.04, f"Frame {i:02d}/{len(ks)}",
            transform=ax.transAxes,
            color=FG,
            fontsize=8.5,
            bbox=dict(boxstyle="round,pad=0.2", fc="#f8fafc", ec=MUTED, alpha=0.95),
        )
        fig.savefig(
            OUT / f"13-smooth-k-sweep-{i:02d}.png",
            dpi=180,
            bbox_inches="tight",
            facecolor=BG,
            pad_inches=0.15,
        )
        plt.close(fig)

    # overview panel
    fig, axes = plt.subplots(2, 4, figsize=(14, 7.2))
    fig.patch.set_facecolor(BG)
    for ax, k in zip(axes.flatten(), ks):
        smooth, _ = smooth_union_vals(d1, d2, k)
        ax.imshow(
            smooth,
            origin="lower",
            extent=extent,
            cmap="RdBu_r",
            norm=norm,
            interpolation="bilinear",
            aspect="equal",
        )
        ax.contour(X, Y, smooth, levels=[0], colors=[C_SURFACE], linewidths=1.4)
        style_ax(ax, rf"$k={k}$")
    fig.suptitle("k-Sweep: kontinuierliche Verbreiterung des Blend-Bereichs", color=FG, fontsize=13, y=0.99)
    finish_fig(fig, OUT / "13-smooth-k-sweep-panel.png", top=0.9, hspace=0.4, wspace=0.18)


def plot_smooth_other_ops():
    extent = [-2.4, 2.4, -2.0, 2.0]
    n = 300
    xs = np.linspace(extent[0], extent[1], n)
    ys = np.linspace(extent[2], extent[3], n)
    X, Y = np.meshgrid(xs, ys)
    d1 = sdf_circle(X, Y, -0.55, 0, 0.95)
    d2 = sdf_circle(X, Y, 0.55, 0, 0.95)
    k = 0.4
    norm = TwoSlopeNorm(vmin=-1.2, vcenter=0.0, vmax=1.2)

    hard_inter = np.maximum(d1, d2)
    smooth_inter, _ = smooth_intersection_vals(d1, d2, k)
    hard_diff = np.maximum(d1, -d2)
    smooth_diff, _ = smooth_difference_vals(d1, d2, k)

    fig, axes = plt.subplots(2, 2, figsize=(12.5, 8.8))
    fig.patch.set_facecolor(BG)
    panels = [
        (axes[0, 0], hard_inter, r"Hart: Intersection $\max(d_1,d_2)$"),
        (axes[0, 1], smooth_inter, rf"Glatt: smoothIntersection($k={k}$)"),
        (axes[1, 0], hard_diff, r"Hart: Difference $\max(d_1,-d_2)$"),
        (axes[1, 1], smooth_diff, rf"Glatt: smoothDifference($k={k}$)"),
    ]
    for ax, field, title in panels:
        ax.imshow(
            field,
            origin="lower",
            extent=extent,
            cmap="RdBu_r",
            norm=norm,
            interpolation="bilinear",
            aspect="equal",
        )
        ax.contour(X, Y, field, levels=[0], colors=[C_SURFACE], linewidths=1.8)
        style_ax(ax, title)

    fig.suptitle("Glatte Varianten für Schnittmenge und Differenz", color=FG, fontsize=13, y=0.99)
    finish_fig(fig, OUT / "14-smooth-other-ops.png", top=0.92, hspace=0.35, wspace=0.22)


def plot_smooth_step_breakdown():
    x = np.linspace(-2.2, 2.2, 600)
    d1 = sdf_circle(x, 0, -0.55, 0, 0.9)
    d2 = sdf_circle(x, 0, 0.55, 0, 0.9)
    k = 0.38
    h = np.clip(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0)
    mix_part = h * d1 + (1 - h) * d2
    corr = k * h * (1 - h)
    smooth = mix_part - corr
    hard = np.minimum(d1, d2)

    fig, axes = plt.subplots(3, 1, figsize=(11, 8.9), sharex=True)
    fig.patch.set_facecolor(BG)

    axes[0].plot(x, d1, color=C_A, lw=1.5, alpha=0.8, label=r"$d_1$")
    axes[0].plot(x, d2, color=C_B, lw=1.5, alpha=0.8, label=r"$d_2$")
    axes[0].plot(x, h, color="#ffd166", lw=2.0, label=r"$h$")
    axes[0].set_ylabel("Werte", color=FG)
    style_ax(axes[0], r"1) Gewicht berechnen: $h=\mathrm{clamp}(0.5+0.5(d_2-d_1)/k,0,1)$")
    axes[0].legend(facecolor="#f8fafc", edgecolor=MUTED, labelcolor=FG, fontsize=8, loc="upper left")

    axes[1].axhline(0, color=MUTED, lw=0.8, ls="--", alpha=0.6)
    axes[1].plot(x, mix_part, color=ACCENT, lw=2.1, label="mix(d2,d1,h)")
    axes[1].plot(x, corr, color="#f39c12", lw=1.8, ls="--", label=r"$k\,h(1-h)$")
    axes[1].set_ylabel("Distanz", color=FG)
    style_ax(axes[1], r"2) Mischen und Korrekturterm bestimmen")
    axes[1].legend(facecolor="#f8fafc", edgecolor=MUTED, labelcolor=FG, fontsize=8, loc="upper left")

    axes[2].axhline(0, color=MUTED, lw=0.8, ls="--", alpha=0.6)
    axes[2].plot(x, hard, color=C_UNION, lw=2.0, label="hart: min(d1,d2)")
    axes[2].plot(x, smooth, color="#f1c40f", lw=2.1, label="smooth = mix - k*h*(1-h)")
    axes[2].fill_between(x, smooth, 0, where=(smooth <= 0), color="#f1c40f", alpha=0.16)
    axes[2].set_xlabel("Scanlinie", color=FG)
    axes[2].set_ylabel("Distanz", color=FG)
    style_ax(axes[2], r"3) Finale glatte Distanz: sichtbarer Übergang ohne harten Knick")
    axes[2].legend(facecolor="#f8fafc", edgecolor=MUTED, labelcolor=FG, fontsize=8, loc="upper left")

    fig.suptitle("Smooth-Union Schritt-für-Schritt", color=FG, fontsize=14, y=0.99)
    finish_fig(fig, OUT / "15-smooth-step-breakdown.png", top=0.93, hspace=0.45)


def main():
    print(f"Writing diagrams to {OUT}")
    plot_boolean_venn()
    plot_sdf_heatmap_panel()
    plot_1d_intuition()
    plot_inside_outside_table()
    plot_csg_tree()
    plot_nary_chain()
    plot_smooth_union()
    plot_smooth_union_intuition()
    plot_smooth_union_formula_flow()
    plot_smooth_2d_comparison()
    plot_smooth_h_map()
    plot_smooth_k_sweep()
    plot_smooth_other_ops()
    plot_smooth_step_breakdown()
    print("Done.")


if __name__ == "__main__":
    main()
