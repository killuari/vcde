(function () {
    const canvas = document.getElementById('canvas');
    const ctx    = canvas.getContext('2d');

    let shape   = 'circle';
    let p1      = 80;
    let p2      = 70;
    let showIso = false;

    function sdCircle(px, py, cx, cy, r) {
        return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - r;
    }

    function sdBox(px, py, cx, cy, hw, hh) {
        const dx = Math.abs(px - cx) - hw;
        const dy = Math.abs(py - cy) - hh;
        return Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2)
               + Math.min(Math.max(dx, dy), 0);
    }

    function sdCapsule(px, py, ax, ay, bx, by, r) {
        const pax = px - ax, pay = py - ay;
        const bax = bx - ax, bay = by - ay;
        const len2 = bax * bax + bay * bay;
        const h = len2 > 0 ? Math.max(0, Math.min(1, (pax * bax + pay * bay) / len2)) : 0;
        const dx = pax - bax * h, dy = pay - bay * h;
        return Math.sqrt(dx * dx + dy * dy) - r;
    }

    function render() {
        const w = canvas.width, h = canvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        const cx = w / 2, cy = h / 2;
        const norm = w * 0.05;

        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                let d;
                if (shape === 'circle') {
                    d = sdCircle(px, py, cx, cy, p1);
                } else if (shape === 'rect') {
                    d = sdBox(px, py, cx, cy, p1, p2);
                } else {
                    d = sdCapsule(px, py, cx, cy - p2, cx, cy + p2, p1);
                }

                const t = Math.min(Math.abs(d) / norm, 1.0);
                let r, g, b;
                if (d <= 0) {
                    r = 255;
                    g = Math.round(255 * (1 - t));
                    b = Math.round(255 * (1 - t));
                } else {
                    r = Math.round(255 * (1 - t));
                    g = Math.round(255 * (1 - t));
                    b = 255;
                }

                if (showIso) {
                    const frac = ((d / 30) % 1 + 1) % 1;
                    if (frac < 0.05) {
                        r = Math.round(r * 0.3);
                        g = Math.round(g * 0.3);
                        b = Math.round(b * 0.3);
                    }
                }

                const idx = (py * w + px) * 4;
                data[idx]     = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    window.setShape = function (s) {
        shape = s;

        ['circle', 'rect', 'capsule'].forEach(function (id) {
            const btn    = document.getElementById('btn-' + id);
            const active = id === s;
            btn.style.background  = active ? '#4a90d9' : '#f0f0f0';
            btn.style.color       = active ? '#fff'    : '#333';
            btn.style.borderColor = active ? '#4a90d9' : '#bbb';
        });

        const p2Group = document.getElementById('p2-group');
        const label1  = document.getElementById('label-p1');
        const label2  = document.getElementById('label-p2');
        const sl1     = document.getElementById('sl-p1');
        const sl2     = document.getElementById('sl-p2');

        if (s === 'circle') {
            p2Group.style.display = 'none';
            label1.textContent    = 'Radius';
            sl1.min = 15; sl1.max = 170; sl1.value = 80; p1 = 80;
        } else if (s === 'rect') {
            p2Group.style.display = 'block';
            label1.textContent    = 'Halbbreite';
            label2.textContent    = 'Halbhöhe';
            sl1.min = 10; sl1.max = 185; sl1.value = 100; p1 = 100;
            sl2.min = 10; sl2.max = 170; sl2.value = 70;  p2 = 70;
        } else {
            p2Group.style.display = 'block';
            label1.textContent    = 'Radius';
            label2.textContent    = 'Halbachse';
            sl1.min = 10; sl1.max = 80;  sl1.value = 30;  p1 = 30;
            sl2.min = 20; sl2.max = 165; sl2.value = 80;  p2 = 80;
        }
        document.getElementById('val-p1').textContent = p1;
        document.getElementById('val-p2').textContent = p2;
        render();
    };

    document.getElementById('sl-p1').addEventListener('input', function () {
        p1 = parseInt(this.value);
        document.getElementById('val-p1').textContent = p1;
        render();
    });

    document.getElementById('sl-p2').addEventListener('input', function () {
        p2 = parseInt(this.value);
        document.getElementById('val-p2').textContent = p2;
        render();
    });

    document.getElementById('cb-iso').addEventListener('change', function () {
        showIso = this.checked;
        render();
    });

    render();
})();
