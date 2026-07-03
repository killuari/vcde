(function () {
    const canvas = document.getElementById('canvas');
    const sandbox = new GlslCanvas(canvas);

    var camX = 5.0, camZ = 8.0;
    var keys = {};

    const u = {
        u_cam_pos: [5.0, 8.0],
        u_detail: 1.0,
        u_fog: 0.025,
    };

    function applyUniforms() {
        sandbox.setUniform('u_cam_pos', u.u_cam_pos[0], u.u_cam_pos[1]);
        sandbox.setUniform('u_detail', u.u_detail);
        sandbox.setUniform('u_fog', u.u_fog);
    }

    var loadedShader = '';
    var loopStarted = false;

    function startLoop() {
        if (loopStarted) return;
        loopStarted = true;
        (function loop() {
            var speed = 0.07;
            if (keys['w'] || keys['W'] || keys['ArrowUp']) camZ -= speed;
            if (keys['s'] || keys['S'] || keys['ArrowDown']) camZ += speed;
            if (keys['a'] || keys['A'] || keys['ArrowLeft']) camX -= speed;
            if (keys['d'] || keys['D'] || keys['ArrowRight']) camX += speed;
            u.u_cam_pos[0] = camX;
            u.u_cam_pos[1] = camZ;
            sandbox.setUniform('u_cam_pos', camX, camZ);
            requestAnimationFrame(loop);
        })();
    }

    fetch('shader.frag')
        .then(function (r) { return r.text(); })
        .then(function (frag) {
            loadedShader = frag;
            sandbox.on('load', function () {
                applyUniforms();
                startLoop();
            });
            sandbox.load(frag);
        });

    var wasHidden = false;
    new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) { wasHidden = true; return; }
        if (!wasHidden) return;
        wasHidden = false;
        canvas.width = 560; canvas.height = 380;
        if (loadedShader) sandbox.load(loadedShader);
    }, { threshold: 0.01 }).observe(canvas);

    // Tastatureingaben im Iframe-Kontext einfangen
    window.addEventListener('keydown', function (e) {
        keys[e.key] = true;
        // Seitenscrolling für Pfeiltasten unterbinden
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
            e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', function (e) { keys[e.key] = false; });

    function setActive(prefix, count, active) {
        for (var i = 0; i < count; i++) {
            var btn = document.getElementById(prefix + i);
            if (!btn) continue;
            btn.style.background = i === active ? '#4a90d9' : '#1b1f27';
            btn.style.color = i === active ? '#fff' : '#d3d9e2';
            btn.style.borderColor = i === active ? '#4a90d9' : '#3a4250';
        }
    }

    window.setDetail = function (idx) {
        u.u_detail = parseFloat(idx);
        sandbox.setUniform('u_detail', u.u_detail);
        setActive('btn-detail-', 3, idx);
    };

    document.getElementById('sl-fog').addEventListener('input', function () {
        u.u_fog = parseFloat(this.value);
        document.getElementById('val-fog').textContent = Math.round(u.u_fog / 0.08 * 100) + '%';
        sandbox.setUniform('u_fog', u.u_fog);
    });
})();
