#!/usr/bin/env python3
"""Software raymarch previews of CSG scenes for slide figures."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).resolve().parent / "assets" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

BG = "#0d1117"


def sd_sphere(p, r=1.0):
    return np.linalg.norm(p, axis=-1) - r


def sd_box(p, b):
    q = np.abs(p) - b
    return (
        np.linalg.norm(np.maximum(q, 0), axis=-1)
        + np.minimum(np.maximum(q[..., 0], np.maximum(q[..., 1], q[..., 2])), 0)
    )


def sd_cylinder(p, h, r):
    d = np.stack([np.linalg.norm(p[..., [0, 2]], axis=-1) - r, np.abs(p[..., 1]) - h], axis=-1)
    outside = np.linalg.norm(np.maximum(d, 0), axis=-1)
    inside = np.minimum(np.maximum(d[..., 0], d[..., 1]), 0)
    return outside + inside


def op_union(d1, d2):
    return np.minimum(d1, d2)


def op_intersect(d1, d2):
    return np.maximum(d1, d2)


def op_subtract(d1, d2):
    return np.maximum(d1, -d2)


def scene_rounded_cube_holes(p):
    cyl_z = sd_cylinder(p, 1.2, 0.22)
    cyl_x = sd_cylinder(p[..., [1, 2, 0]], 1.2, 0.22)
    cyl_y = sd_cylinder(p[..., [2, 0, 1]], 1.2, 0.22)
    holes = op_union(op_union(cyl_z, cyl_x), cyl_y)
    core = op_intersect(sd_box(p, np.array([0.75, 0.75, 0.75])), sd_sphere(p, 0.95))
    return op_subtract(core, holes)


def scene_simple_union(p):
    return op_union(sd_sphere(p - np.array([0.55, 0, 0]), 0.55), sd_sphere(p + np.array([0.55, 0, 0]), 0.55))


def scene_intersection(p):
    return op_intersect(sd_box(p, np.array([0.7, 0.7, 0.7])), sd_sphere(p, 0.85))


def scene_difference(p):
    return op_subtract(sd_box(p, np.array([0.75, 0.75, 0.75])), sd_sphere(p - np.array([0.35, 0.35, 0]), 0.55))


def ray_march(ro, rd, scene_fn, steps=96, max_t=8.0, eps=1e-3):
    t = np.zeros(ro.shape[:-1])
    hit = np.zeros(ro.shape[:-1], dtype=bool)
    for _ in range(steps):
        p = ro + rd * t[..., None]
        d = scene_fn(p)
        t = t + d
        hit = hit | (d < eps)
        t = np.where(hit, t, t)
        if np.all(hit | (t > max_t)):
            break
    t = np.where(t > max_t, -1.0, t)
    t = np.where(hit, t, -1.0)
    return t


def render_scene(scene_fn, title: str, outfile: str, ro=None, *, show_title: bool = False):
    w, h = 320, 240
    xs = np.linspace(-1.1, 1.1, w)
    ys = np.linspace(-0.85, 0.85, h)
    X, Y = np.meshgrid(xs, ys)

    if ro is None:
        ro = np.array([0.0, 0.2, 3.2])
    rd = np.stack([X, Y, -np.full_like(X, 1.5)], axis=-1)
    rd = rd / np.linalg.norm(rd, axis=-1, keepdims=True)

    ro_grid = np.broadcast_to(ro, rd.shape)
    t = ray_march(ro_grid, rd, scene_fn)

    # simple normal via gradient
    eps = 0.002
    def grad(p):
        ex = np.array([eps, 0, 0])
        ey = np.array([0, eps, 0])
        ez = np.array([0, 0, eps])
        return np.stack([
            scene_fn(p + ex) - scene_fn(p - ex),
            scene_fn(p + ey) - scene_fn(p - ey),
            scene_fn(p + ez) - scene_fn(p - ez),
        ], axis=-1)

    pos = ro_grid + rd * np.maximum(t, 0)[..., None]
    n = grad(pos)
    n = n / (np.linalg.norm(n, axis=-1, keepdims=True) + 1e-8)

    light = np.array([0.4, 0.8, 0.5])
    light = light / np.linalg.norm(light)
    diff = np.clip(np.sum(n * light, axis=-1), 0, 1)
    amb = 0.15
    col = amb + diff * 0.85
    col = np.where(t > 0, col, 0.0)

    fig, ax = plt.subplots(figsize=(5, 3.8))
    ax.imshow(col, origin="lower", cmap="gray", vmin=0, vmax=1)
    ax.axis("off")
    if show_title:
        ax.set_title(title, color="white", fontsize=11, pad=6)
    fig.patch.set_facecolor(BG)
    fig.subplots_adjust(left=0, right=1, top=1 if not show_title else 0.92, bottom=0)
    fig.savefig(OUT / outfile, dpi=160, bbox_inches="tight", facecolor=BG)
    plt.close(fig)


def render_panel():
    scenes = [
        (scene_simple_union, "Union zweier Kugeln", "08-render-union.png"),
        (scene_intersection, "Schnitt Box ∩ Kugel", "08-render-intersection.png"),
        (scene_difference, "Differenz Box \\ Kugel", "08-render-difference.png"),
        (scene_rounded_cube_holes, "CSG-Baum: Würfel mit Bohrungen", "09-render-csg-tree.png"),
    ]
    for fn, title, name in scenes:
        render_scene(fn, title, name)

    # combined panel — titles only here, not in source images
    fig, axes = plt.subplots(2, 2, figsize=(10, 7.5))
    fig.patch.set_facecolor(BG)
    for ax, (fn, title, name) in zip(axes.flatten(), scenes):
        img = plt.imread(OUT / name)
        ax.imshow(img)
        ax.axis("off")
        ax.set_title(title, color="white", fontsize=10, pad=8)
    fig.suptitle("Ray-Marched CSG-Beispiele (aus SDF-Formeln)", color="white", fontsize=12, y=0.98)
    fig.subplots_adjust(top=0.90, hspace=0.28, wspace=0.08, left=0.02, right=0.98, bottom=0.04)
    fig.savefig(OUT / "10-render-panel.png", dpi=160, bbox_inches="tight", facecolor=BG, pad_inches=0.15)
    plt.close(fig)


def main():
    print(f"Rendering previews to {OUT}")
    render_panel()
    print("Done.")


if __name__ == "__main__":
    main()
