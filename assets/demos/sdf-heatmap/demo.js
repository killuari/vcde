(function () {
    const canvas = document.getElementById('canvas');
    const ctx    = canvas.getContext('2d');

    // [labelP1, minP1, maxP1, stepP1, defP1, labelP2, minP2, maxP2, stepP2, defP2, showP2]
    const shapeConfigs = [
        ['Radius',      10, 170, 1, 80,  '',           0,   0,   1,  0,  false], // 0 Kugel
        ['Halbbreite',  10, 185, 1, 100, 'Halbhöhe',   10, 170,  1, 60, true],   // 1 Box
        ['Außenradius', 30, 150, 1, 90,  'Rohrradius',  5,  55,  1, 25, true],   // 2 Torus
        ['Halbachse',   10, 150, 1, 80,  'Radius',      5,  75,  1, 28, true],   // 3 Kapsel
        ['Halbhöhe',    10, 170, 1, 85,  'Radius',     10, 130,  1, 45, true],   // 4 Zylinder
        ['Größe',       20, 160, 1, 90,  '',            0,   0,  1,  0, false],  // 5 Oktaeder
    ];

    // Inside colors matching primitiv-galerie 3D shader baseColors
    const shapeInside = [
        [89,  184, 255],  // Kugel     vec3(0.35,0.72,1.00)
        [230, 140,  51],  // Box       vec3(0.90,0.55,0.20)
        [77,  217, 128],  // Torus     vec3(0.30,0.85,0.50)
        [217,  77, 140],  // Kapsel    vec3(0.85,0.30,0.55)
        [191, 179,  51],  // Zylinder  vec3(0.75,0.70,0.20)
        [166,  89, 230],  // Oktaeder  vec3(0.65,0.35,0.90)
    ];
    const outsideColor = [51, 68, 102]; // dark navy, consistent outside

    const formulaHTML = [
        'f(<b>p</b>) = &#x2016;<b>p</b>&#x2016; &minus; r',
        '<b>q</b> = |<b>p</b>| &minus; <b>b</b>,&ensp;f(<b>p</b>) = &#x2016;max(<b>q</b>, 0)&#x2016; + min(max(q<sub>x</sub>, q<sub>y</sub>), 0)',
        'f(<b>p</b>) = |&thinsp;&#x2016;<b>p</b>&#x2016; &minus; R&thinsp;| &minus; r',
        '<b>a</b> = clamp(p<sub>y</sub>, &minus;h, h)·ŷ,&ensp;f(<b>p</b>) = &#x2016;<b>p</b> &minus; <b>a</b>&#x2016; &minus; r',
        '<b>q</b> = (|p<sub>x</sub>| &minus; r, |p<sub>y</sub>| &minus; h),&ensp;f(<b>p</b>) = &#x2016;max(<b>q</b>, 0)&#x2016; + min(max(q<sub>x</sub>, q<sub>y</sub>), 0)',
        'f(<b>p</b>) = |p<sub>x</sub>| + |p<sub>y</sub>| &minus; s',
    ];

    let shapeIdx = 0;
    let p1 = 80, p2 = 60;
    let showIso = false;

    function sdCircle(px, py, cx, cy, r) {
        return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) - r;
    }

    function sdBox(px, py, cx, cy, hw, hh) {
        const dx = Math.abs(px - cx) - hw;
        const dy = Math.abs(py - cy) - hh;
        return Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) + Math.min(Math.max(dx, dy), 0);
    }

    function sdCapsule(px, py, ax, ay, bx, by, r) {
        const pax = px - ax, pay = py - ay;
        const bax = bx - ax, bay = by - ay;
        const len2 = bax * bax + bay * bay;
        const h = len2 > 0 ? Math.max(0, Math.min(1, (pax * bax + pay * bay) / len2)) : 0;
        const dx = pax - bax * h, dy = pay - bay * h;
        return Math.sqrt(dx * dx + dy * dy) - r;
    }

    function sdTorus2D(px, py, cx, cy, outerR, r) {
        const dx = px - cx, dy = py - cy;
        return Math.abs(Math.sqrt(dx * dx + dy * dy) - outerR) - r;
    }

    function sdDiamond2D(px, py, cx, cy, s) {
        return Math.abs(px - cx) + Math.abs(py - cy) - s;
    }

    function sdf(px, py) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        switch (shapeIdx) {
            case 0: return sdCircle(px, py, cx, cy, p1);
            case 1: return sdBox(px, py, cx, cy, p1, p2);
            case 2: return sdTorus2D(px, py, cx, cy, p1, p2);
            case 3: return sdCapsule(px, py, cx, cy - p1, cx, cy + p1, p2);
            case 4: return sdBox(px, py, cx, cy, p2, p1);  // Zylinder: radius=p2, halfH=p1
            case 5: return sdDiamond2D(px, py, cx, cy, p1);
        }
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function render() {
        const w = canvas.width, h = canvas.height;
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        const norm = w * 0.05;
        const ic = shapeInside[shapeIdx];
        const oc = outsideColor;

        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const d = sdf(px, py);
                const t = Math.min(Math.abs(d) / norm, 1.0);
                let r, g, b;
                if (d <= 0) {
                    r = Math.round(lerp(255, ic[0], t));
                    g = Math.round(lerp(255, ic[1], t));
                    b = Math.round(lerp(255, ic[2], t));
                } else {
                    r = Math.round(lerp(255, oc[0], t));
                    g = Math.round(lerp(255, oc[1], t));
                    b = Math.round(lerp(255, oc[2], t));
                }

                if (showIso) {
                    const frac = ((d / 30) % 1 + 1) % 1;
                    if (frac < 0.05) {
                        r = Math.round(r * 0.4);
                        g = Math.round(g * 0.4);
                        b = Math.round(b * 0.4);
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

    window.setShape = function (idx) {
        shapeIdx = idx;
        const cfg = shapeConfigs[idx];

        const sl1 = document.getElementById('sl-p1');
        sl1.min = cfg[1]; sl1.max = cfg[2]; sl1.step = cfg[3]; sl1.value = cfg[4];
        p1 = cfg[4];
        document.getElementById('label-p1').textContent = cfg[0];
        document.getElementById('val-p1').textContent   = p1;

        const sl2   = document.getElementById('sl-p2');
        const p2grp = document.getElementById('p2-group');
        p2grp.style.display = cfg[10] ? 'block' : 'none';
        if (cfg[10]) {
            sl2.min = cfg[6]; sl2.max = cfg[7]; sl2.step = cfg[8]; sl2.value = cfg[9];
            p2 = cfg[9];
            document.getElementById('label-p2').textContent = cfg[5];
            document.getElementById('val-p2').textContent   = p2;
        }

        for (var i = 0; i < 6; i++) {
            var btn = document.getElementById('btn-shape-' + i);
            var active = i === idx;
            btn.style.background  = active ? '#4a90d9' : '#f0f0f0';
            btn.style.color       = active ? '#fff'    : '#333';
            btn.style.borderColor = active ? '#4a90d9' : '#bbb';
        }

        // Update inside swatch color
        const ic = shapeInside[idx];
        document.getElementById('swatch-inside').style.background =
            'rgb(' + ic[0] + ',' + ic[1] + ',' + ic[2] + ')';

        // Update formula
        document.getElementById('formula-display').innerHTML = formulaHTML[idx];

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

    // Initialize with shape 0
    setShape(0);
})();
