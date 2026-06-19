(function () {
    const canvas = document.getElementById('canvas');
    const ctx    = canvas.getContext('2d');

    const CX = 360, CY = 185, CR = 88;
    const ROX = 55,  ROY = 300;
    const RDX = 0.8321, RDY = -0.5547;
    const EPS = 1.5;

    const steps = [];
    let pos = {x: ROX, y: ROY};
    for (let i = 0; i < 20; i++) {
        const d    = Math.sqrt((pos.x - CX) ** 2 + (pos.y - CY) ** 2) - CR;
        const next = {x: pos.x + RDX * d, y: pos.y + RDY * d};
        const hit  = Math.abs(d) < EPS;
        steps.push({pos: {x: pos.x, y: pos.y}, d: d, next: {x: next.x, y: next.y}, hit: hit});
        if (hit || next.x > canvas.width + 50) break;
        pos = next;
    }
    const maxStep = steps.length;
    document.getElementById('sl-steps').max = maxStep;

    let currentStep = 0;
    let animTimer   = null;

    function drawDashedCircle(x, y, r, strokeColor) {
        if (r < 0.5) return;
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = 1.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function draw(n) {
        const W = canvas.width, H = canvas.height;
        const toShow = Math.min(n, maxStep);

        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 1;
        for (let gx = 0; gx <= W; gx += 40) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (let gy = 0; gy <= H; gy += 40) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }

        ctx.save();
        ctx.strokeStyle = 'rgba(255,204,51,0.15)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(ROX, ROY);
        ctx.lineTo(ROX + RDX * 650, ROY + RDY * 650);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(CX, CY, CR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(70,110,160,0.22)';
        ctx.fill();
        ctx.strokeStyle = '#5588bb';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.fillStyle   = '#7799cc';
        ctx.font        = '12px monospace';
        ctx.fillText('Objekt', CX - 21, CY + 4);

        for (let i = 0; i < toShow; i++) {
            const s     = steps[i];
            const alpha = (0.28 + 0.18 * (i / maxStep)).toFixed(2);
            drawDashedCircle(s.pos.x, s.pos.y, Math.abs(s.d), 'rgba(50,210,230,' + alpha + ')');
        }

        ctx.lineWidth = 1.5;
        for (let i = 0; i < toShow; i++) {
            const s = steps[i];
            ctx.strokeStyle = '#ffcc33';
            ctx.beginPath();
            ctx.moveTo(s.pos.x, s.pos.y);
            ctx.lineTo(s.next.x, s.next.y);
            ctx.stroke();
        }

        ctx.font = '11px monospace';
        for (let i = 0; i < toShow; i++) {
            const s = steps[i];
            ctx.fillStyle = '#99bbdd';
            ctx.beginPath();
            ctx.arc(s.pos.x, s.pos.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aaccee';
            ctx.fillText(i, s.pos.x + 6, s.pos.y - 5);
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ROX, ROY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bbbbbb';
        ctx.font      = '12px monospace';
        ctx.fillText('Kamera', ROX + 8, ROY + 4);

        if (toShow > 0) {
            const last   = steps[toShow - 1];
            const endPos = last.next;
            const hit    = last.hit;

            ctx.fillStyle = hit ? '#44ff88' : '#ffcc33';
            ctx.beginPath();
            ctx.arc(endPos.x, endPos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = hit ? '#22cc66' : '#cc9900';
            ctx.lineWidth   = 1.5;
            ctx.stroke();

            ctx.fillStyle = hit ? '#44ff88' : '#ffffff';
            ctx.font      = 'bold 13px monospace';
            var label = hit
                ? 'Schritt ' + toShow + ': Treffer!   d ≈ ' + Math.abs(last.d).toFixed(2) + ' px'
                : 'Schritt ' + toShow + ': d = ' + Math.abs(last.d).toFixed(1) + ' px';
            ctx.fillText(label, 10, 24);
        } else {
            ctx.fillStyle = '#666666';
            ctx.font      = '13px monospace';
            ctx.fillText('Slider ziehen oder ▶ Play drücken', 10, 24);
        }
    }

    function stopAnim() {
        if (animTimer) { clearInterval(animTimer); animTimer = null; }
        document.getElementById('btn-play').textContent = '▶ Play';
    }

    document.getElementById('btn-play').addEventListener('click', function () {
        if (animTimer) { stopAnim(); return; }
        if (currentStep >= maxStep) currentStep = 0;
        this.textContent = '⏸ Pause';
        animTimer = setInterval(function () {
            currentStep++;
            document.getElementById('sl-steps').value        = currentStep;
            document.getElementById('val-steps').textContent = currentStep;
            draw(currentStep);
            if (currentStep >= maxStep) stopAnim();
        }, 700);
    });

    document.getElementById('sl-steps').addEventListener('input', function () {
        stopAnim();
        currentStep = parseInt(this.value);
        document.getElementById('val-steps').textContent = currentStep;
        draw(currentStep);
    });

    draw(0);
})();
