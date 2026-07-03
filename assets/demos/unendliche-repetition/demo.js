(function () {
    const canvas = document.getElementById('canvas');
    const sandbox = new GlslCanvas(canvas);

    const u = {
        u_shape: 0.0,
        u_spacing: 3.0,
        u_shadows: 1.0,
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
        canvas.width = 520; canvas.height = 340;
        if (loadedShader) sandbox.load(loadedShader);
    }, { threshold: 0.01 }).observe(canvas);

    function setActive(prefix, count, active) {
        for (var i = 0; i < count; i++) {
            var btn = document.getElementById(prefix + i);
            if (!btn) continue;
            btn.style.background = i === active ? '#4a90d9' : '#1b1f27';
            btn.style.color = i === active ? '#fff' : '#d3d9e2';
            btn.style.borderColor = i === active ? '#4a90d9' : '#3a4250';
        }
    }

    window.setShape = function (idx) {
        u.u_shape = parseFloat(idx);
        sandbox.setUniform('u_shape', u.u_shape);
        setActive('btn-shape-', 3, idx);
    };

    window.toggleEffect = function (key, btnId) {
        u[key] = u[key] > 0.5 ? 0.0 : 1.0;
        var btn = document.getElementById(btnId);
        var active = u[key] > 0.5;
        btn.style.background = active ? '#4a90d9' : '#1b1f27';
        btn.style.color = active ? '#fff' : '#d3d9e2';
        btn.style.borderColor = active ? '#4a90d9' : '#3a4250';
        sandbox.setUniform(key, u[key]);
    };

    document.getElementById('sl-spacing').addEventListener('input', function () {
        u.u_spacing = parseFloat(this.value);
        document.getElementById('val-spacing').textContent = u.u_spacing.toFixed(1);
        sandbox.setUniform('u_spacing', u.u_spacing);
    });
})();
