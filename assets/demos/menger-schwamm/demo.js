(function () {
    const canvas  = document.getElementById('canvas');
    const sandbox = new GlslCanvas(canvas);

    const u = {
        u_iter: 2.0,
        u_cut:  0.0,
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
        canvas.width = 520; canvas.height = 380;
        if (loadedShader) sandbox.load(loadedShader);
    }, { threshold: 0.01 }).observe(canvas);

    function setActive(prefix, count, active) {
        for (var i = 0; i < count; i++) {
            var btn = document.getElementById(prefix + i);
            if (!btn) continue;
            btn.style.background  = i === active ? '#4a90d9' : '#f0f0f0';
            btn.style.color       = i === active ? '#fff'    : '#333';
            btn.style.borderColor = i === active ? '#4a90d9' : '#bbb';
        }
    }

    window.setDetail = function (idx) {
        u.u_iter = parseFloat(idx);
        sandbox.setUniform('u_iter', u.u_iter);
        setActive('btn-iter-', 3, idx);
    };

    window.toggleCut = function () {
        u.u_cut = u.u_cut > 0.5 ? 0.0 : 1.0;
        var btn    = document.getElementById('btn-cut');
        var active = u.u_cut > 0.5;
        btn.style.background  = active ? '#4a90d9' : '#f0f0f0';
        btn.style.color       = active ? '#fff'    : '#333';
        btn.style.borderColor = active ? '#4a90d9' : '#bbb';
        sandbox.setUniform('u_cut', u.u_cut);
    };
})();
