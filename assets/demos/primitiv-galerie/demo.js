(function () {
    const canvas = document.getElementById('canvas');
    const sandbox = new GlslCanvas(canvas);

    // [label1, min1, max1, step1, default1, label2, min2, max2, step2, default2, showP2]
    const shapeConfigs = [
        ['Radius', 0.10, 1.20, 0.01, 0.60, '', 0.05, 0.50, 0.01, 0.25, false],
        ['Halbbreite XZ', 0.10, 1.20, 0.01, 0.60, 'Halbhöhe Y', 0.10, 1.20, 0.01, 0.40, true ],
        ['Außenradius', 0.30, 1.00, 0.01, 0.70, 'Rohrradius', 0.05, 0.40, 0.01, 0.20, true ],
        ['Halbachse', 0.00, 1.00, 0.01, 0.50, 'Radius', 0.05, 0.50, 0.01, 0.25, true ],
        ['Halbhöhe', 0.10, 1.00, 0.01, 0.50, 'Radius', 0.10, 0.80, 0.01, 0.35, true ],
        ['Größe', 0.20, 1.50, 0.01, 0.80, '', 0.05, 1.00, 0.01, 0.40, false],
    ];

    const formulaHTML = [
        'f(<b>p</b>) = &#x2016;<b>p</b>&#x2016; &minus; r',
        '<b>q</b> = |<b>p</b>| &minus; <b>b</b>,<br>f(<b>p</b>) = &#x2016;max(<b>q</b>, 0)&#x2016; + min(max(q<sub>x</sub>, q<sub>y</sub>, q<sub>z</sub>), 0)',
        '<b>q</b> = (&#x2016;(p<sub>x</sub>, p<sub>z</sub>)&#x2016; &minus; t<sub>1</sub>, p<sub>y</sub>),<br>f(<b>p</b>) = &#x2016;<b>q</b>&#x2016; &minus; t<sub>2</sub>',
        '<b>a</b> = clamp(p<sub>y</sub>, &minus;h, h)·ŷ,<br>f(<b>p</b>) = &#x2016;<b>p</b> &minus; <b>a</b>&#x2016; &minus; r',
        '<b>d</b> = (&#x2016;(p<sub>x</sub>, p<sub>z</sub>)&#x2016; &minus; r, |p<sub>y</sub>| &minus; h),<br>f(<b>p</b>) = min(max(d<sub>x</sub>, d<sub>y</sub>), 0) + &#x2016;max(<b>d</b>, 0)&#x2016;',
        'm = p<sub>x</sub> + p<sub>y</sub> + p<sub>z</sub> &minus; s,<br>f(<b>p</b>) &asymp; m / &radic;3 &ensp;(Symmetriefall)',
    ];

    const glslRaw = [
`float sdSphere(vec3 p, float r) {
    return length(p) - r;
}`,
`float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0))
         + min(max(q.x, max(q.y, q.z)), 0.0);
}`,
`float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}`,
`float sdCapsule(vec3 p, float h, float r) {
    p.y -= clamp(p.y, -h, h);
    return length(p) - r;
}`,
`float sdCylinder(vec3 p, float h, float r) {
    vec2 d = abs(vec2(length(p.xz), p.y))
           - vec2(r, h);
    return min(max(d.x, d.y), 0.0)
         + length(max(d, 0.0));
}`,
`float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    float m = p.x + p.y + p.z - s;
    vec3 q;
    if (3.0*p.x < m) q = p.xyz;
    else if (3.0*p.y < m) q = p.yzx;
    else if (3.0*p.z < m) q = p.zxy;
    else return m * 0.57735027;
    float k = clamp(0.5*(q.z-q.y+s), 0.0, s);
    return length(vec3(q.x, q.y-s+k, q.z-k));
}`,
    ];

    // Simple GLSL syntax highlighting
    function highlightGLSL(code) {
        var esc = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        esc = esc.replace(/\b(float|vec2|vec3|vec4|void|return|if|else|bool|int)\b/g,
            '<span style="color:#ff7b72">$1</span>');
        esc = esc.replace(/\b(length|abs|max|min|clamp|normalize|dot|sqrt|pow|sin|cos|mix)\b/g,
            '<span style="color:#79c0ff">$1</span>');
        esc = esc.replace(/\b(\d+\.\d+|\d+\.?)\b/g,
            '<span style="color:#f2cc60">$1</span>');
        return esc;
    }

    let currentShape = 0;
    let p1 = 0.60, p2 = 0.25;
    let loadedShader = '';

    function applyUniforms() {
        sandbox.setUniform('u_shape', parseFloat(currentShape));
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
        canvas.width = 360; canvas.height = 360;
        if (loadedShader) sandbox.load(loadedShader);
    }, { threshold: 0.01 }).observe(canvas);

    function updateInfoPanel(idx) {
        document.getElementById('formula-display').innerHTML = formulaHTML[idx];
        document.getElementById('code-display').innerHTML = highlightGLSL(glslRaw[idx]);
    }

    window.setShape = function (idx) {
        currentShape = idx;
        const cfg = shapeConfigs[idx];

        const sl1 = document.getElementById('sl-p1');
        sl1.min = cfg[1]; sl1.max = cfg[2]; sl1.step = cfg[3]; sl1.value = cfg[4];
        p1 = cfg[4];
        document.getElementById('label-p1').textContent = cfg[0];
        document.getElementById('val-p1').textContent = p1.toFixed(2);

        const sl2 = document.getElementById('sl-p2');
        const p2grp = document.getElementById('p2-group');
        p2grp.style.display = cfg[10] ? 'block' : 'none';
        if (cfg[10]) {
            sl2.min = cfg[6]; sl2.max = cfg[7]; sl2.step = cfg[8]; sl2.value = cfg[9];
            p2 = cfg[9];
            document.getElementById('label-p2').textContent = cfg[5];
            document.getElementById('val-p2').textContent = p2.toFixed(2);
        }

        for (var i = 0; i < 6; i++) {
            var btn = document.getElementById('btn-shape-' + i);
            var active = i === idx;
            btn.style.background = active ? '#4a90d9' : '#f0f0f0';
            btn.style.color = active ? '#fff' : '#333';
            btn.style.borderColor = active ? '#4a90d9' : '#bbb';
        }

        // sdBox (1) and sdOctahedron (5) have 47-char code lines - widen panel slightly
        document.getElementById('ctrl-panel').style.maxWidth =
            (idx === 1 || idx === 5) ? '385px' : '360px';

        updateInfoPanel(idx);
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

    // Initialize info panel
    updateInfoPanel(0);
})();
