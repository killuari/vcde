(function () {
    var canvas = document.getElementById('canvas');
    var sandbox = new GlslCanvas(canvas);

    var u = {
        u_epsilon:     0.004,
        u_show_offset: 0.0
    };

    function applyUniforms() {
        Object.keys(u).forEach(function (k) { sandbox.setUniform(k, u[k]); });
    }

    var loadedShader = '';

    fetch('shader.frag')
        .then(function (r) { return r.text(); })
        .then(function (frag) {
            loadedShader = frag;
            sandbox.on('load', applyUniforms);
            sandbox.load(frag);
        });

    var wasHidden = false;
    new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) { wasHidden = true; return; }
        if (!wasHidden) return;
        wasHidden = false;
        canvas.width = 480; canvas.height = 340;
        if (loadedShader) sandbox.load(loadedShader);
    }, { threshold: 0.01 }).observe(canvas);

    function highlightGLSL(code) {
        var s = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        s = s.replace(/\b(float|int|vec2|vec3|vec4|void|return|for|if|bool)\b/g,
            '<span style="color:#ff7b72">$1</span>');
        s = s.replace(/\b(length|normalize|dot|abs|max|min|clamp|mix|pow)\b/g,
            '<span style="color:#79c0ff">$1</span>');
        s = s.replace(/\b(\d+\.\d+|\d+\.?)\b/g,
            '<span style="color:#f2cc60">$1</span>');
        return s;
    }

    function updateCode(eps) {
        var epsStr = eps.toFixed(3);
        var code =
'float rayMarch(vec3 ro, vec3 rd) {\n' +
'    float t = 0.0;\n' +
'    for (int i = 0; i < 150; i++) {\n' +
'        float d = map(ro + t * rd);\n' +
'        if (d < ' + epsStr + ') return t;\n' +
'        if (t > 20.0)      return -1.0;\n' +
'        t += d;\n' +
'    }\n' +
'    return -1.0;\n' +
'}';
        document.getElementById('code-display').innerHTML = highlightGLSL(code);
    }

    document.getElementById('sl-eps').addEventListener('input', function () {
        // Slider 1-150 -> epsilon 0.001-0.150
        var eps = parseFloat(this.value) / 1000.0;
        document.getElementById('val-eps').textContent = eps.toFixed(3);
        u.u_epsilon = eps;
        sandbox.setUniform('u_epsilon', eps);
        updateCode(eps);
    });

    window.toggleOffset = function () {
        u.u_show_offset = u.u_show_offset > 0.5 ? 0.0 : 1.0;
        var btn = document.getElementById('btn-offset');
        var active = u.u_show_offset > 0.5;
        btn.style.background  = active ? '#4a90d9' : '#1b1f27';
        btn.style.color       = active ? '#fff'    : '#d3d9e2';
        btn.style.borderColor = active ? '#4a90d9' : '#3a4250';
        sandbox.setUniform('u_show_offset', u.u_show_offset);
    };

    updateCode(0.004);
})();
