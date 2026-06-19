(function () {
    const canvas  = document.getElementById('canvas');
    const sandbox = new GlslCanvas(canvas);

    // [label1, min1, max1, step1, default1, label2, min2, max2, step2, default2, showP2]
    const shapeConfigs = [
        ['Radius',        0.10, 1.20, 0.01, 0.60, '',             0.05, 0.50, 0.01, 0.25, false],
        ['Halbbreite XZ', 0.10, 1.20, 0.01, 0.60, 'Halbhöhe Y',  0.10, 1.20, 0.01, 0.40, true ],
        ['Außenradius',   0.30, 1.00, 0.01, 0.70, 'Rohrradius',   0.05, 0.40, 0.01, 0.20, true ],
        ['Halbachse',     0.00, 1.00, 0.01, 0.50, 'Radius',       0.05, 0.50, 0.01, 0.25, true ],
        ['Halbhöhe',      0.10, 1.00, 0.01, 0.50, 'Radius',       0.10, 0.80, 0.01, 0.35, true ],
        ['Größe',         0.20, 1.50, 0.01, 0.80, '',             0.05, 1.00, 0.01, 0.40, false],
    ];

    let currentShape = 0;
    let p1 = 0.60, p2 = 0.25;
    let loadedShader = '';

    function applyUniforms() {
        sandbox.setUniform('u_shape',  parseFloat(currentShape));
        sandbox.setUniform('u_param1', p1);
        sandbox.setUniform('u_param2', p2);
    }

    fetch('shader.frag')
        .then(function (r) { return r.text(); })
        .then(function (frag) {
            loadedShader = frag;
            sandbox.on('load', applyUniforms);
            sandbox.load(frag);
        });

    let wasHidden = false;
    new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) { wasHidden = true; return; }
        if (!wasHidden) return;
        wasHidden = false;
        canvas.width = 450; canvas.height = 450;
        if (loadedShader) sandbox.load(loadedShader);
    }, { threshold: 0.01 }).observe(canvas);

    window.setShape = function (idx) {
        currentShape = idx;
        const cfg = shapeConfigs[idx];

        const sl1 = document.getElementById('sl-p1');
        sl1.min = cfg[1]; sl1.max = cfg[2]; sl1.step = cfg[3]; sl1.value = cfg[4];
        p1 = cfg[4];
        document.getElementById('label-p1').textContent = cfg[0];
        document.getElementById('val-p1').textContent   = p1.toFixed(2);

        const sl2   = document.getElementById('sl-p2');
        const p2grp = document.getElementById('p2-group');
        p2grp.style.display = cfg[10] ? 'block' : 'none';
        if (cfg[10]) {
            sl2.min = cfg[6]; sl2.max = cfg[7]; sl2.step = cfg[8]; sl2.value = cfg[9];
            p2 = cfg[9];
            document.getElementById('label-p2').textContent = cfg[5];
            document.getElementById('val-p2').textContent   = p2.toFixed(2);
        }

        for (var i = 0; i < 6; i++) {
            var btn    = document.getElementById('btn-shape-' + i);
            var active = i === idx;
            btn.style.background  = active ? '#4a90d9' : '#f0f0f0';
            btn.style.color       = active ? '#fff'    : '#333';
            btn.style.borderColor = active ? '#4a90d9' : '#bbb';
        }

        applyUniforms();
    };

    document.getElementById('sl-p1').addEventListener('input', function () {
        p1 = parseFloat(this.value);
        document.getElementById('val-p1').textContent = p1.toFixed(2);
        sandbox.setUniform('u_param1', p1);
    });

    document.getElementById('sl-p2').addEventListener('input', function () {
        p2 = parseFloat(this.value);
        document.getElementById('val-p2').textContent = p2.toFixed(2);
        sandbox.setUniform('u_param2', p2);
    });
})();
