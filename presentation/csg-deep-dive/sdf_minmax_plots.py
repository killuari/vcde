from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def circle_sdf(x, y, center_x, center_y, radius):
    """Signed Distance Field eines Kreises."""
    return np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2) - radius


def setup_axis(ax):
    ax.set_aspect("equal", adjustable="box")
    ax.set_xlim(-1.7, 1.7)
    ax.set_ylim(-1.2, 1.2)
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_visible(False)


def plot_operation_fields(out_dir):
    x = np.linspace(-1.7, 1.7, 520)
    y = np.linspace(-1.2, 1.2, 380)
    xx, yy = np.meshgrid(x, y)

    a = circle_sdf(xx, yy, -0.45, 0.0, 0.75)
    b = circle_sdf(xx, yy, 0.45, 0.0, 0.75)

    fields = [
        ("A", a),
        ("B", b),
        ("Union = min(A, B)", np.minimum(a, b)),
        ("Schnittmenge = max(A, B)", np.maximum(a, b)),
        ("Differenz = max(A, -B)", np.maximum(a, -b)),
    ]

    fig, axes = plt.subplots(2, 3, figsize=(12, 7), constrained_layout=True)
    axes = axes.ravel()

    for ax, (title, field) in zip(axes, fields):
        clipped = np.clip(field, -0.65, 0.65)
        image = ax.imshow(
            clipped,
            extent=[x.min(), x.max(), y.min(), y.max()],
            origin="lower",
            cmap="RdBu_r",
            vmin=-0.65,
            vmax=0.65,
        )
        ax.contourf(xx, yy, field, levels=[field.min(), 0.0], colors=["black"], alpha=0.08)
        ax.contour(xx, yy, field, levels=[0.0], colors="black", linewidths=2.0)
        ax.set_title(title, fontsize=12, pad=8)
        setup_axis(ax)

    axes[-1].axis("off")
    axes[-1].text(
        0.02,
        0.85,
        "Vorzeichen-Konvention\n\n"
        "d(p) < 0: innen\n"
        "d(p) = 0: Oberflaeche\n"
        "d(p) > 0: aussen\n\n"
        "Die schwarze Linie ist d(p)=0.",
        transform=axes[-1].transAxes,
        va="top",
        ha="left",
        fontsize=12,
        linespacing=1.35,
    )

    colorbar = fig.colorbar(image, ax=axes[:5], shrink=0.9)
    colorbar.set_label("SDF-Wert")

    fig.suptitle("Boolesche Operationen auf SDFs mit min und max", fontsize=15)
    fig.savefig(out_dir / "sdf_minmax_operations.png", dpi=300)
    plt.close(fig)


def plot_center_line_profiles(out_dir):
    x = np.linspace(-1.7, 1.7, 900)
    y = np.zeros_like(x)

    a = circle_sdf(x, y, -0.45, 0.0, 0.75)
    b = circle_sdf(x, y, 0.45, 0.0, 0.75)
    union = np.minimum(a, b)
    schnittmenge = np.maximum(a, b)
    difference = np.maximum(a, -b)

    fig, ax = plt.subplots(figsize=(12, 5), constrained_layout=True)
    ax.axhline(0.0, color="black", linewidth=1.2)
    ax.plot(x, a, color="#4c78a8", linewidth=1.7, label="A")
    ax.plot(x, b, color="#f58518", linewidth=1.7, label="B")
    ax.plot(x, union, color="#54a24b", linewidth=2.4, label="Union = min(A, B)")
    ax.plot(x, schnittmenge, color="#b279a2", linewidth=2.4, label="Schnittmenge = max(A, B)")
    ax.plot(x, difference, color="#e45756", linewidth=2.4, label="Differenz = max(A, -B)")
    ax.fill_between(x, -0.85, union, where=union <= 0, color="#54a24b", alpha=0.08)
    ax.set_xlim(-1.7, 1.7)
    ax.set_ylim(-0.85, 1.0)
    ax.set_xlabel("x entlang der Mittellinie")
    ax.set_ylabel("SDF-Wert")
    ax.set_title("Eindimensionaler Schnitt: negative Werte liegen innen")
    ax.legend(ncol=2, frameon=False, loc="upper center")
    ax.grid(True, alpha=0.25)
    fig.savefig(out_dir / "sdf_minmax_profiles.png", dpi=300)
    plt.close(fig)


def main():
    out_dir = Path(__file__).resolve().parent / "assets" / "diagrams"
    out_dir.mkdir(exist_ok=True)
    plot_operation_fields(out_dir)
    plot_center_line_profiles(out_dir)
    print(f"Gespeichert: {out_dir / 'sdf_minmax_operations.png'}")
    print(f"Gespeichert: {out_dir / 'sdf_minmax_profiles.png'}")


if __name__ == "__main__":
    main()
