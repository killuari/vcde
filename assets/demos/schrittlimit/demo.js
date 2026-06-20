(function () {
    var canvas = document.getElementById('canvas');
    var sandbox = new GlslCanvas(canvas);

    var u = {
        u_max_steps: 80.0,
        u_show_miss: 0.0
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

    function updateCode(maxSteps) {
        var steps = Math.round(maxSteps);
        var code =
'float rayMarch(vec3 ro, vec3 rd) {\n' +
'    float t = 0.0;\n' +
'    for (int i = 0; i < 200; i++) {\n' +
'        if (float(i) >= ' + steps + '.0) return -2.0;\n' +
'        float d = map(ro + t * rd);\n' +
'        if (d < 0.005) return t;\n' +
'        if (t > 30.0)  return -1.0;\n' +
'        t += d;\n' +
'    }\n' +
'    return -1.0;\n' +
'}';
        document.getElementById('code-display').innerHTML = highlightGLSL(code);
    }

    document.getElementById('sl-steps').addEventListener('input', function () {
        var v = parseFloat(this.value);
        document.getElementById('val-steps').textContent = Math.round(v);
        u.u_max_steps = v;
        sandbox.setUniform('u_max_steps', v);
        updateCode(v);
    });

    window.toggleMiss = function () {
        u.u_show_miss = u.u_show_miss > 0.5 ? 0.0 : 1.0;
        var btn = document.getElementById('btn-miss');
        var active = u.u_show_miss > 0.5;
        btn.style.background  = active ? '#4a90d9' : '#f0f0f0';
        btn.style.color       = active ? '#fff'    : '#333';
        btn.style.borderColor = active ? '#4a90d9' : '#bbb';
        sandbox.setUniform('u_show_miss', u.u_show_miss);
    };

    updateCode(80);
})();
