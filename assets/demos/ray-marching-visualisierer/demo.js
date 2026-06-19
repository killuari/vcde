(function () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    var showCircles = true;
    var showLabels = true;
    var speedMs = 700;
    var currentSceneIdx = 0;
    var currentStep = 0;
    var animTimer = null;

    var SCENES = [
        {
            objects: [{cx: 360, cy: 185, cr: 88, label: 'Objekt'}],
            ray: {ox: 55, oy: 300},
            baseAngle: -34 // degrees
        },
        {
            objects: [
                {cx: 215, cy: 165, cr: 55, label: 'Objekt A'},
                {cx: 400, cy: 215, cr: 60, label: 'Objekt B'}
            ],
            ray: {ox: 50, oy: 305},
            baseAngle: -18
        }
    ];

    var currentAngleDeg = SCENES[0].baseAngle;

    function sceneSDF(scene, px, py) {
        var d = Infinity;
        for (var i = 0; i < scene.objects.length; i++) {
            var o = scene.objects[i];
            var di = Math.sqrt((px - o.cx) * (px - o.cx) + (py - o.cy) * (py - o.cy)) - o.cr;
            if (di < d) d = di;
        }
        return d;
    }

    var EPS = 1.5;

    function getDir() {
        var rad = currentAngleDeg * Math.PI / 180;
        return {dx: Math.cos(rad), dy: Math.sin(rad)};
    }

    function computeSteps(scene) {
        var dir = getDir();
        var steps = [];
        var pos = {x: scene.ray.ox, y: scene.ray.oy};
        for (var i = 0; i < 25; i++) {
            var d = sceneSDF(scene, pos.x, pos.y);
            var next = {x: pos.x + dir.dx * d, y: pos.y + dir.dy * d};
            var hit = Math.abs(d) < EPS;
            steps.push({pos: {x: pos.x, y: pos.y}, d: d, next: {x: next.x, y: next.y}, hit: hit});
            if (hit || next.x > W + 80 || next.y < -80 || next.x < -80) break;
            pos = next;
        }
        return steps;
    }

    var steps = computeSteps(SCENES[0]);
    var maxStep = steps.length;
    document.getElementById('sl-steps').max = maxStep;
    document.getElementById('sl-steps').value = 0;

    function drawDashedCircle(x, y, r, strokeColor) {
        if (r < 0.5) return;
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function draw(n) {
        var scene = SCENES[currentSceneIdx];
        var toShow = Math.min(n, maxStep);
        var dir = getDir();

        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (var gx = 0; gx <= W; gx += 40) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (var gy = 0; gy <= H; gy += 40) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }

        ctx.save();
        ctx.strokeStyle = 'rgba(255,204,51,0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(scene.ray.ox, scene.ray.oy);
        ctx.lineTo(scene.ray.ox + dir.dx * 700, scene.ray.oy + dir.dy * 700);
        ctx.stroke();
        ctx.restore();

        for (var oi = 0; oi < scene.objects.length; oi++) {
            var obj = scene.objects[oi];
            ctx.beginPath();
            ctx.arc(obj.cx, obj.cy, obj.cr, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(70,110,160,0.22)';
            ctx.fill();
            ctx.strokeStyle = '#5588bb';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#7799cc';
            ctx.font = '12px monospace';
            var lw = ctx.measureText(obj.label).width;
            ctx.fillText(obj.label, obj.cx - lw / 2, obj.cy + 4);
        }

        if (showCircles) {
            for (var ci = 0; ci < toShow; ci++) {
                var s = steps[ci];
                var alpha = (0.25 + 0.20 * (ci / Math.max(maxStep, 1))).toFixed(2);
                drawDashedCircle(s.pos.x, s.pos.y, Math.abs(s.d), 'rgba(50,210,230,' + alpha + ')');
            }
        }

        ctx.lineWidth = 1.5;
        for (var li = 0; li < toShow; li++) {
            var seg = steps[li];
            ctx.strokeStyle = '#ffcc33';
            ctx.beginPath();
            ctx.moveTo(seg.pos.x, seg.pos.y);
            ctx.lineTo(seg.next.x, seg.next.y);
            ctx.stroke();
        }

        ctx.font = '11px monospace';
        for (var di = 0; di < toShow; di++) {
            var st = steps[di];
            ctx.fillStyle = '#99bbdd';
            ctx.beginPath();
            ctx.arc(st.pos.x, st.pos.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            if (showLabels) {
                ctx.fillStyle = '#aaccee';
                ctx.fillText(di, st.pos.x + 6, st.pos.y - 5);
            }
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(scene.ray.ox, scene.ray.oy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bbbbbb';
        ctx.font = '12px monospace';
        ctx.fillText('Kamera', scene.ray.ox + 8, scene.ray.oy + 4);

        if (toShow > 0) {
            var last = steps[toShow - 1];
            var endPos = last.next;
            var hit = last.hit;
            ctx.fillStyle = hit ? '#44ff88' : '#ffcc33';
            ctx.beginPath();
            ctx.arc(endPos.x, endPos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = hit ? '#22cc66' : '#cc9900';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = hit ? '#44ff88' : '#ffffff';
            ctx.font = 'bold 13px monospace';
            var statusLabel = hit
                ? 'Schritt ' + toShow + ': Treffer!   d ≈ ' + Math.abs(last.d).toFixed(2) + ' px'
                : 'Schritt ' + toShow + ': d = ' + Math.abs(last.d).toFixed(1) + ' px  (max: ' + maxStep + ')';
            ctx.fillText(statusLabel, 10, 24);
        } else {
            ctx.fillStyle = '#555e6d';
            ctx.font = '13px monospace';
            ctx.fillText('Slider ziehen oder ▶ Play drücken', 10, 24);
        }
    }

    function recompute() {
        stopAnim();
        steps = computeSteps(SCENES[currentSceneIdx]);
        maxStep = steps.length;
        var sl = document.getElementById('sl-steps');
        sl.max = maxStep;
        if (currentStep > maxStep) currentStep = 0;
        sl.value = currentStep;
        document.getElementById('val-steps').textContent = currentStep;
        draw(currentStep);
    }

    function stopAnim() {
        if (animTimer) { clearInterval(animTimer); animTimer = null; }
        var btn = document.getElementById('btn-play');
        if (btn) {
            btn.textContent = '▶ Play';
            btn.style.background = '#44aa66';
            btn.style.borderColor = '#44aa66';
        }
    }

    document.getElementById('btn-play').addEventListener('click', function () {
        if (animTimer) { stopAnim(); return; }
        if (currentStep >= maxStep) currentStep = 0;
        this.textContent = '⏸ Pause';
        this.style.background = '#888';
        this.style.borderColor = '#888';
        animTimer = setInterval(function () {
            currentStep++;
            document.getElementById('sl-steps').value = currentStep;
            document.getElementById('val-steps').textContent = currentStep;
            draw(currentStep);
            if (currentStep >= maxStep) stopAnim();
        }, speedMs);
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
        stopAnim();
        currentStep = 0;
        document.getElementById('sl-steps').value = 0;
        document.getElementById('val-steps').textContent = 0;
        draw(0);
    });

    document.getElementById('sl-steps').addEventListener('input', function () {
        stopAnim();
        currentStep = parseInt(this.value);
        document.getElementById('val-steps').textContent = currentStep;
        draw(currentStep);
    });

    document.getElementById('sl-angle').addEventListener('input', function () {
        currentAngleDeg = parseInt(this.value);
        document.getElementById('val-angle').textContent = currentAngleDeg;
        recompute();
    });

    window.setSpeed = function (level) {
        var map = {slow: 1200, normal: 700, fast: 250};
        speedMs = map[level] || 700;
        ['slow', 'normal', 'fast'].forEach(function (k) {
            var btn = document.getElementById('btn-speed-' + k);
            if (k === level) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        if (animTimer) { stopAnim(); document.getElementById('btn-play').click(); }
    };

    window.toggleCircles = function () {
        showCircles = !showCircles;
        var btn = document.getElementById('btn-circles');
        if (showCircles) btn.classList.add('active');
        else btn.classList.remove('active');
        draw(currentStep);
    };

    window.toggleLabels = function () {
        showLabels = !showLabels;
        var btn = document.getElementById('btn-labels');
        if (showLabels) btn.classList.add('active');
        else btn.classList.remove('active');
        draw(currentStep);
    };

    window.setScene = function (idx) {
        currentSceneIdx = idx;
        currentAngleDeg = SCENES[idx].baseAngle;
        var slAngle = document.getElementById('sl-angle');
        slAngle.value = currentAngleDeg;
        document.getElementById('val-angle').textContent = currentAngleDeg;
        currentStep = 0;
        [0, 1].forEach(function (i) {
            var btn = document.getElementById('btn-scene-' + i);
            if (i === idx) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        recompute();
    };

    draw(0);
})();
