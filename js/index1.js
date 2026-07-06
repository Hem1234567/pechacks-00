/* ==========================================================================
   PEC HACKS 4.0 — AI Core reactor behind the hero title
   Append as a NEW <script> tag, after the cinematic title-reveal script.
   Reuses the .pec-char / .pec-title-inner structure already created by that
   script — does not re-split text, does not edit any prior code.
   ========================================================================== */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function boot() {
    const h1 = document.querySelector('#hero-text h1');
    const inner = h1 && h1.querySelector('.pec-title-inner');
    if (!h1 || !inner || typeof gsap === 'undefined') return; // requires prior script to have run

    // ---- Inject scoped CSS ----
    const style = document.createElement('style');
    style.id = 'pec-core-fx-style';
    style.textContent = `
      .pec-core {
        position: absolute;
        left: 50%; top: 50%;
        width: min(60vw, 640px);
        height: min(60vw, 640px);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 0;
        opacity: 0;
        will-change: transform, opacity;
      }
      .pec-core-rings, .pec-core-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
      .pec-ring { transform-origin: 150px 150px; }
      .pec-shockwave {
        position: absolute; left: 50%; top: 50%;
        width: 40px; height: 40px; border-radius: 50%;
        border: 1px solid rgba(122,92,255,0.55);
        transform: translate(-50%, -50%) scale(0);
        opacity: 0; pointer-events: none;
      }
      .pec-title-shift { display: inline-block; position: relative; z-index: 5; }
      .pec-arc { fill: none; stroke: rgba(255,255,255,0.7); stroke-width: 1; opacity: 0; }
    `;
    document.head.appendChild(style);

    // ---- Wrap the existing title-inner so cursor-parallax has its own
    // property to animate, without colliding with the breathing/float
    // tweens already running on .pec-title-inner. ----
    const shiftWrap = document.createElement('span');
    shiftWrap.className = 'pec-title-shift';
    inner.parentNode.insertBefore(shiftWrap, inner);
    shiftWrap.appendChild(inner);

    // ---- Build the reactor DOM (SVG rings/glow + canvas plasma) ----
    const core = document.createElement('div');
    core.className = 'pec-core';
    core.innerHTML = `
      <svg class="pec-core-rings" viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <radialGradient id="pecCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
            <stop offset="28%" stop-color="#7a5cff" stop-opacity="0.45"/>
            <stop offset="65%" stop-color="#ff2d55" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="pecRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7a5cff"/>
            <stop offset="100%" stop-color="#ff2d55"/>
          </linearGradient>
        </defs>
        <circle class="pec-core-glow" cx="150" cy="150" r="120" fill="url(#pecCoreGlow)"/>
        <circle class="pec-ring pec-ring-1" cx="150" cy="150" r="95" fill="none" stroke="url(#pecRingGrad)" stroke-width="1" stroke-dasharray="3 11" opacity="0.55"/>
        <circle class="pec-ring pec-ring-2" cx="150" cy="150" r="118" fill="none" stroke="url(#pecRingGrad)" stroke-width="0.6" stroke-dasharray="1 7" opacity="0.4"/>
        <path class="pec-arc" d=""/>
      </svg>
      <canvas class="pec-core-canvas"></canvas>
      <div class="pec-shockwave"></div>
    `;
    // Insert behind the title text (first child of h1).
    h1.insertBefore(core, h1.firstChild);

    if (reduceMotion) {
      // Static, low-opacity reactor only — no motion, no canvas loop.
      gsap.set(core, { opacity: 0.25 });
      return;
    }

    const glow = core.querySelector('.pec-core-glow');
    const ring1 = core.querySelector('.pec-ring-1');
    const ring2 = core.querySelector('.pec-ring-2');
    const arcPath = core.querySelector('.pec-arc');
    const shockwave = core.querySelector('.pec-shockwave');
    const canvas = core.querySelector('.pec-core-canvas');
    const ctx = canvas.getContext('2d');

    // ---- Canvas plasma / particle field ----
    let cw, ch, particles, rafId;
    function sizeCanvas() {
      cw = canvas.width = canvas.offsetWidth;
      ch = canvas.height = canvas.offsetHeight;
    }
    function makeParticles() {
      particles = Array.from({ length: 46 }, () => ({
        angle: Math.random() * Math.PI * 2,
        radius: 20 + Math.random() * 100,
        speed: (Math.random() - 0.5) * 0.006,
        r: Math.random() * 1.6 + 0.4,
        a: Math.random() * 0.5 + 0.15,
        drift: Math.random() * 0.4 - 0.2,
        hue: Math.random() > 0.5 ? '122,92,255' : '255,45,85',
      }));
    }
    function drawParticles() {
      ctx.clearRect(0, 0, cw, ch);
      const cx = cw / 2, cy = ch / 2;
      for (const p of particles) {
        p.angle += p.speed;
        p.radius += p.drift * 0.03;
        if (p.radius < 15) p.radius = 15;
        if (p.radius > 140) p.radius = 20;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue},${p.a})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(drawParticles);
    }
    sizeCanvas();
    makeParticles();
    drawParticles();
    window.addEventListener('resize', () => { sizeCanvas(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else rafId = requestAnimationFrame(drawParticles);
    });

    // ---- Opening sequence: gather -> rotate up -> distort -> open ----
    const openTl = gsap.timeline({ delay: 0.05 });
    gsap.set(core, { opacity: 0, scale: 0.7 });
    gsap.set(glow, { scale: 0.4, transformOrigin: '150px 150px' });

    openTl
      .to(core, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0)
      .to(glow, { scale: 0.9, duration: 0.4, ease: 'power1.out' }, 0)
      .to(glow, { scale: 1.15, duration: 0.18, ease: 'power2.out' }, 0.4) // distortion pulse
      .to(glow, { scale: 1, duration: 0.3, ease: 'back.out(2)' }, 0.58); // portal "opens"

    // Continuous idle rotation (independent speeds, never stops)
    gsap.to(ring1, { rotate: 360, duration: 30, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
    gsap.to(ring2, { rotate: -360, duration: 45, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
    // Slow breathing of the whole core, independent of the title's own breathing
    gsap.to(core, { scale: 1.03, duration: 6, ease: 'sine.inOut', repeat: -1, yoyo: true });

    // ---- Shockwave once the title has finished materializing ----
    // Matches the timing of the title-reveal script's own stagger (~1.85s).
    gsap.delayedCall(1.85, () => {
      gsap.fromTo(
        shockwave,
        { opacity: 0.5, scale: 0 },
        { opacity: 0, scale: 8, duration: 0.9, ease: 'power2.out' }
      );
    });

    // ---- Lightning arcs, every 6-10s ----
    function scheduleArc() {
      const next = 6000 + Math.random() * 4000;
      setTimeout(() => {
        drawArc();
        scheduleArc();
      }, next);
    }
    function drawArc() {
      const startAngle = Math.random() * Math.PI * 2;
      const r1 = 95, r2 = 118;
      const x1 = 150 + Math.cos(startAngle) * r1;
      const y1 = 150 + Math.sin(startAngle) * r1;
      const x2 = 150 + Math.cos(startAngle + 0.3) * r2;
      const y2 = 150 + Math.sin(startAngle + 0.3) * r2;
      const midx = (x1 + x2) / 2 + (Math.random() - 0.5) * 10;
      const midy = (y1 + y2) / 2 + (Math.random() - 0.5) * 10;
      arcPath.setAttribute('d', `M${x1},${y1} Q${midx},${midy} ${x2},${y2}`);
      gsap.fromTo(arcPath, { opacity: 0.9 }, { opacity: 0, duration: 0.3, ease: 'power1.in' });
    }
    scheduleArc();

    // ---- Cursor interaction: portal + title shift, plus independent
    // parallax depth for rings vs glow. Letters themselves keep whatever
    // proximity behavior the title-reveal script already gave them. ----
    const quickCoreX = gsap.quickTo(core, 'x', { duration: 0.4, ease: 'power3.out' });
    const quickCoreY = gsap.quickTo(core, 'y', { duration: 0.4, ease: 'power3.out' });
    const quickRingX = gsap.quickTo(ring1, 'x', { duration: 0.5, ease: 'power3.out' });
    const quickTitleX = gsap.quickTo(shiftWrap, 'x', { duration: 0.35, ease: 'power3.out' });
    const quickTitleY = gsap.quickTo(shiftWrap, 'y', { duration: 0.35, ease: 'power3.out' });

    window.addEventListener('mousemove', (e) => {
      const rect = h1.getBoundingClientRect();
      const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      const clampedX = Math.max(-1, Math.min(1, relX));
      const clampedY = Math.max(-1, Math.min(1, relY));

      quickCoreX(clampedX * 8);
      quickCoreY(clampedY * 8);
      quickRingX(clampedX * 4); // rings drift a bit less than the core -> depth
      quickTitleX(clampedX * 4);
      quickTitleY(clampedY * 4);
    });

    window.addEventListener('mouseleave', () => {
      quickCoreX(0); quickCoreY(0); quickRingX(0);
      quickTitleX(0); quickTitleY(0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();