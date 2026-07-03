(function () {
    const canvas = document.getElementById('canvas');
    const sandbox = new GlslCanvas(canvas);

    const state = { shadow: true, specular: true, ao: false };
    const u = {
        u_light_az: 0.0,
        u_light_el: 0.698,
        u_shininess: 32.0,
        u_bx: 1.2,
        u_by: 1.2,
        u_bz: 0.0,
        u_blocker_shape: 0.0,
        u_shadows: 1.0,
        u_specular: 1.0,
        u_ao: 0.0,
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
        canvas.width = 450; canvas.height = 450;
        if (loadedShader) sandbox.load(loadedShader);
    }, { threshold: 0.01 }).observe(canvas);

    window.toggleComponent = function (key) {
        state[key] = !state[key];
        var btn = document.getElementById('btn-' + key);
        var active = state[key];
        btn.style.background = active ? '#4a90d9' : '#1b1f27';
        btn.style.color = active ? '#fff' : '#d3d9e2';
        btn.style.borderColor = active ? '#4a90d9' : '#3a4250';

        u.u_shadows = state.shadow ? 1.0 : 0.0;
        u.u_specular = state.specular ? 1.0 : 0.0;
        u.u_ao = state.ao ? 1.0 : 0.0;
        sandbox.setUniform('u_shadows', u.u_shadows);
        sandbox.setUniform('u_specular', u.u_specular);
        sandbox.setUniform('u_ao', u.u_ao);

        document.getElementById('shine-group').style.display =
            state.specular ? 'block' : 'none';
    };

    window.setBlockerShape = function (shape) {
        u.u_blocker_shape = parseFloat(shape);
        sandbox.setUniform('u_blocker_shape', u.u_blocker_shape);
        [0, 1].forEach(function (i) {
            var btn = document.getElementById('btn-bshape-' + i);
            var active = i === shape;
            btn.style.background = active ? '#4a90d9' : '#1b1f27';
            btn.style.color = active ? '#fff' : '#d3d9e2';
            btn.style.borderColor = active ? '#4a90d9' : '#3a4250';
        });
    };

    function bindDeg(slId, dispId, uniformName) {
        document.getElementById(slId).addEventListener('input', function () {
            var deg = parseFloat(this.value);
            document.getElementById(dispId).textContent = deg + '°';
            u[uniformName] = deg * Math.PI / 180.0;
            sandbox.setUniform(uniformName, u[uniformName]);
        });
    }

    function bindVal(slId, dispId, uniformName, decimals) {
        document.getElementById(slId).addEventListener('input', function () {
            var v = parseFloat(this.value);
            document.getElementById(dispId).textContent = v.toFixed(decimals);
            u[uniformName] = v;
            sandbox.setUniform(uniformName, v);
        });
    }

    bindDeg('sl-az', 'val-az', 'u_light_az');
    bindDeg('sl-el', 'val-el', 'u_light_el');
    bindVal('sl-shine', 'val-shine', 'u_shininess', 0);
    bindVal('sl-bx', 'val-bx', 'u_bx', 1);
    bindVal('sl-by', 'val-by', 'u_by', 1);
    bindVal('sl-bz', 'val-bz', 'u_bz', 1);
})();
