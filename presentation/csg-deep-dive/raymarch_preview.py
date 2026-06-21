#!/usr/bin/env python3
"""Software raymarch previews of CSG scenes for slide figures."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT = Path(__file__).resolve().parent / "assets" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

BG = "#ffffff"


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


def sd_torus(p, major=0.55, minor=0.18):
    q = np.stack([np.linalg.norm(p[..., [0, 2]], axis=-1) - major, p[..., 1]], axis=-1)
    return np.linalg.norm(q, axis=-1) - minor


def sd_cone(p, h=0.72, r=0.54):
    radial = np.linalg.norm(p[..., [0, 2]], axis=-1)
    side_radius = r * (h - p[..., 1]) / (2.0 * h)
    side = (radial - side_radius) * 0.9
    top = p[..., 1] - h
    bottom = -p[..., 1] - h
    return np.maximum(np.maximum(side, top), bottom)


def sd_capsule(p, h=0.48, r=0.28):
    q = p.copy()
    q[..., 1] -= np.clip(q[..., 1], -h, h)
    return np.linalg.norm(q, axis=-1) - r


def sd_rounded_box(p, b, r):
    return sd_box(p, b) - r


def sd_ellipsoid(p, radii):
    k0 = np.linalg.norm(p / radii, axis=-1)
    k1 = np.linalg.norm(p / (radii * radii), axis=-1)
    return k0 * (k0 - 1.0) / (k1 + 1e-8)


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


def _normalize(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-8)


def _look_at_rays(width, height, ro, target, fov_degrees=34.0):
    forward = target - ro
    forward = forward / np.linalg.norm(forward)
    world_up = np.array([0.0, 1.0, 0.0])
    right = np.cross(forward, world_up)
    right = right / np.linalg.norm(right)
    up = np.cross(right, forward)

    aspect = width / height
    scale = np.tan(np.deg2rad(fov_degrees) * 0.5)
    xs = np.linspace(-aspect * scale, aspect * scale, width)
    ys = np.linspace(-scale, scale, height)
    X, Y = np.meshgrid(xs, ys)
    rd = forward + X[..., None] * right + Y[..., None] * up
    return _normalize(rd)


def _rotate_x(p, angle):
    c, s = np.cos(angle), np.sin(angle)
    q = p.copy()
    q[..., 1] = c * p[..., 1] - s * p[..., 2]
    q[..., 2] = s * p[..., 1] + c * p[..., 2]
    return q


def _rotate_y(p, angle):
    c, s = np.cos(angle), np.sin(angle)
    q = p.copy()
    q[..., 0] = c * p[..., 0] + s * p[..., 2]
    q[..., 2] = -s * p[..., 0] + c * p[..., 2]
    return q


def _rotate_z(p, angle):
    c, s = np.cos(angle), np.sin(angle)
    q = p.copy()
    q[..., 0] = c * p[..., 0] - s * p[..., 1]
    q[..., 1] = s * p[..., 0] + c * p[..., 1]
    return q


def _inverse_rotate(p, angles):
    rx, ry, rz = angles
    q = _rotate_z(p, -rz)
    q = _rotate_y(q, -ry)
    q = _rotate_x(q, -rx)
    return q


def _rgb(hex_color):
    value = hex_color.lstrip("#")
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], dtype=float) / 255.0


def render_primitive_tile(scene_fn, color, angles=(0.0, 0.0, 0.0)):
    width, height = 520, 390
    ro = np.array([0.0, 0.28, 3.75])
    target = np.array([0.0, 0.02, 0.0])
    rd = _look_at_rays(width, height, ro, target, fov_degrees=38.0)
    ro_grid = np.broadcast_to(ro, rd.shape)

    def scene(p):
        return scene_fn(_inverse_rotate(p, angles))

    t = ray_march(ro_grid, rd, scene, steps=128, max_t=6.0, eps=8e-4)
    hit = t > 0
    pos = ro_grid + rd * np.maximum(t, 0)[..., None]

    eps = 0.002

    def grad(p):
        ex = np.array([eps, 0.0, 0.0])
        ey = np.array([0.0, eps, 0.0])
        ez = np.array([0.0, 0.0, eps])
        return np.stack([
            scene(p + ex) - scene(p - ex),
            scene(p + ey) - scene(p - ey),
            scene(p + ez) - scene(p - ez),
        ], axis=-1)

    n = _normalize(grad(pos))
    view = _normalize(-rd)
    light = np.array([0.45, 0.86, 0.38])
    light = light / np.linalg.norm(light)
    fill = np.array([-0.55, 0.28, 0.75])
    fill = fill / np.linalg.norm(fill)

    diff = np.clip(np.sum(n * light, axis=-1), 0.0, 1.0)
    diff_fill = np.clip(np.sum(n * fill, axis=-1), 0.0, 1.0)
    half_vec = _normalize(light + view)
    spec = np.clip(np.sum(n * half_vec, axis=-1), 0.0, 1.0) ** 38
    rim = (1.0 - np.clip(np.sum(n * view, axis=-1), 0.0, 1.0)) ** 2.2

    base = _rgb(color)
    shade = 0.22 + 0.72 * diff + 0.20 * diff_fill
    surface = base * shade[..., None]
    surface += spec[..., None] * np.array([0.95, 0.98, 1.0]) * 0.42
    surface += rim[..., None] * np.array([0.40, 0.62, 0.92]) * 0.22
    surface = np.clip(surface, 0.0, 1.0)

    y = np.linspace(0.0, 1.0, height)[:, None]
    x = np.linspace(-1.0, 1.0, width)[None, :]
    yy = np.linspace(-1.0, 1.0, height)[:, None]
    top = _rgb("#ffffff")
    bottom = _rgb("#f4f7fb")
    bg = bottom * (1.0 - y[..., None]) + top * y[..., None]
    vignette = 1.0 - 0.07 * np.clip((x[..., None] ** 2 + yy[..., None] ** 2) / 1.75, 0.0, 1.0)
    bg = bg * vignette
    shadow = np.exp(-((x / 0.58) ** 2 + ((yy + 0.67) / 0.16) ** 2))
    bg = bg * (1.0 - 0.12 * shadow[..., None])

    return np.where(hit[..., None], surface, bg)


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
    amb = 0.18
    col = amb + diff * 0.62
    col = np.where(t > 0, col, 1.0)

    fig, ax = plt.subplots(figsize=(5, 3.8))
    ax.imshow(col, origin="lower", cmap="gray", vmin=0, vmax=1)
    ax.axis("off")
    if show_title:
        ax.set_title(title, color="#111827", fontsize=11, pad=6)
    fig.patch.set_facecolor(BG)
    fig.subplots_adjust(left=0, right=1, top=1 if not show_title else 0.92, bottom=0)
    fig.savefig(OUT / outfile, dpi=160, bbox_inches="tight", facecolor=BG)
    plt.close(fig)


def render_primitive_gallery():
    primitives = [
        ("Würfel", lambda p: sd_box(p, np.array([0.48, 0.48, 0.48])), "#f39c12", (0.28, -0.56, 0.10)),
        ("Kugel", lambda p: sd_sphere(p, 0.58), "#2ecc71", (0.0, 0.0, 0.0)),
        ("Zylinder", lambda p: sd_cylinder(p, 0.54, 0.36), "#3498db", (0.0, 0.0, 0.0)),
        ("Torus", lambda p: sd_torus(p, 0.48, 0.16), "#e91e63", (0.86, -0.34, 0.0)),
        ("Kegel", lambda p: sd_cone(p, 0.64, 0.48), "#e74c3c", (0.0, 0.0, 0.0)),
        ("Kapsel", lambda p: sd_capsule(p, 0.42, 0.25), "#9b59b6", (0.0, 0.0, -0.18)),
        ("Abgerundeter Würfel", lambda p: sd_rounded_box(p, np.array([0.38, 0.38, 0.38]), 0.14), "#1abc9c", (0.26, -0.58, 0.10)),
        ("Ellipsoid", lambda p: sd_ellipsoid(p, np.array([0.62, 0.38, 0.45])), "#ffd166", (0.12, -0.45, 0.08)),
    ]

    fig, axes = plt.subplots(2, 4, figsize=(16, 9))
    fig.patch.set_facecolor("#ffffff")
    fig.suptitle("CSG-Grundkörper: Beispiele", color="#111827", fontsize=28, weight="bold", y=0.965)

    for ax, (label, fn, color, angles) in zip(axes.flatten(), primitives):
        img = render_primitive_tile(fn, color, angles)
        ax.imshow(img, origin="lower")
        ax.axis("off")
        ax.text(
            0.5, 0.045, label,
            transform=ax.transAxes,
            ha="center",
            va="center",
            color="#111827",
            fontsize=15,
            weight="bold",
            bbox=dict(boxstyle="round,pad=0.34", fc="#ffffff", ec="#2563eb", lw=1.4, alpha=0.96),
        )

    fig.subplots_adjust(top=0.84, hspace=0.14, wspace=0.04, left=0.025, right=0.975, bottom=0.045)
    fig.savefig(OUT / "00-csg-primitives.png", dpi=120, facecolor="#ffffff")
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
        ax.set_title(title, color="#111827", fontsize=10, pad=8)
    fig.suptitle("Ray-Marched CSG-Beispiele (aus SDF-Formeln)", color="#111827", fontsize=12, y=0.98)
    fig.subplots_adjust(top=0.90, hspace=0.28, wspace=0.08, left=0.02, right=0.98, bottom=0.04)
    fig.savefig(OUT / "10-render-panel.png", dpi=160, bbox_inches="tight", facecolor=BG, pad_inches=0.15)
    plt.close(fig)


def main():
    print(f"Rendering previews to {OUT}")
    render_primitive_gallery()
    render_panel()
    print("Done.")


if __name__ == "__main__":
    main()
