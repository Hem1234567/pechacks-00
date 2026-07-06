/* ==========================================================================
   PEC HACKS 4.0 — Apple Premium Restrained Background & AVP Cursor
   ========================================================================== */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const config = {
    colors: {
      lightBlue: 'rgba(100, 180, 255, 0.4)',
      twilightBlue: 'rgba(0, 89, 255, 0.22)',
      crescentWhite: 'rgba(255, 255, 255, 0.95)',
      white: 'rgba(255, 255, 255, 1)',
      whiteDim: 'rgba(255, 255, 255, 0.22)'
    }
  };

  let canvas, ctx;
  let cursorCanvas, cursorCtx;

  // Mouse coordinates & spring cursor
  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, tx: window.innerWidth / 2, ty: window.innerHeight / 2 };
  let cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 };
  let isHovered = false;
  let hoverType = 'normal'; // 'button', 'text', 'countdown', 'navigation'
  let hoverProgress = 0;

  // Parallax offsets (capped to max 5px movement)
  let parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollY = 0;
  let currentScrollY = 0;

  // Background elements
  let starsL1 = []; // 250 tiny stars
  let starsL2 = []; // 80 medium blue-tinted stars
  let starsL3 = []; // 20 larger stars with bloom
  let orbitalParticles = []; // Layer 2: rotating around Earth's gravity horizon
  let dustParticles = []; // Layer 3: diagonal cosmic dust with turbulence
  let satellites = []; // Horizon satellites
  let constellations = []; // Connected dot constellations
  let shootingStar = { x: 0, y: 0, vx: 0, vy: 0, len: 0, life: 0, active: false };
  let lastShootingStarTime = 0;
  let nextShootingStarDelay = 8;
  let clicks = [];

  // Title reveal timeline
  let timelineTime = 0;
  let lastTime = Date.now();
  let introCompleted = false;
  let blurSharpStarted = false;
  let lastLightSweep = 0;

  // Title bounds & layout
  let titleBounds = null;
  let chars = [];
  let letterRects = [];
  let interactiveRects = [];
  let lastInteractiveUpdate = 0;

  let lightSweepEl = null;

  let activeElement = null;
  let lastActiveElement = null;

  function init() {
    canvas = document.getElementById('splash-cursor');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Hide standard cursor follower
    const defaultFollower = document.getElementById('cursor-follower');
    if (defaultFollower) {
      defaultFollower.style.display = 'none';
    }

    // Inject styles for cursor overlay and letter reveal classes
    const style = document.createElement('style');
    style.id = 'pec-visual-styles';
    style.textContent = `
      body, html, a, button, [role="button"], #theme-toggle-btn, .nav-link, .nav-social {
        cursor: none !important;
      }
      #hero-text h1 {
        perspective: 900px;
        position: relative;
      }
      .pec-title-inner {
        display: inline-block;
        transform-style: preserve-3d;
        will-change: transform;
      }
      .pec-char {
        display: inline-block;
        opacity: 0;
        filter: blur(45px);
        transform: translateY(12px) scale(0.98);
        will-change: transform, filter, opacity;
      }
      .pec-light-sweep {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 2;
        background: linear-gradient(115deg,
          transparent 35%,
          rgba(255,255,255,0.22) 48%,
          rgba(255,255,255,0.38) 50%,
          rgba(255,255,255,0.22) 52%,
          transparent 65%);
        transform: translateX(-120%);
        mix-blend-mode: overlay;
        opacity: 0;
      }
    `;
    document.head.appendChild(style);

    // Create dynamic full-screen cursor canvas
    cursorCanvas = document.createElement('canvas');
    cursorCanvas.id = 'ai-cursor-canvas';
    cursorCanvas.style.position = 'fixed';
    cursorCanvas.style.top = '0';
    cursorCanvas.style.left = '0';
    cursorCanvas.style.width = '100vw';
    cursorCanvas.style.height = '100vh';
    cursorCanvas.style.zIndex = '99999';
    cursorCanvas.style.pointerEvents = 'none';
    document.body.appendChild(cursorCanvas);
    cursorCtx = cursorCanvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Dynamic layout splitting
    setupTitleAnimation();

    // Generate background elements
    buildEnvironment();
    updateInteractiveElements();

    requestAnimationFrame(loop);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    cursorCanvas.width = window.innerWidth * dpr;
    cursorCanvas.height = window.innerHeight * dpr;
    cursorCtx.scale(dpr, dpr);

    measureTitleLayout();
    buildEnvironment();
    updateInteractiveElements();
  }

  function handleScroll() {
    scrollY = window.scrollY;
    updateInteractiveElements();
  }

  function handleMouseMove(e) {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;

    // Parallax target mapping - capped at exactly 5px maximum offset
    parallax.tx = (e.clientX - window.innerWidth / 2) * 0.0058;
    parallax.ty = (e.clientY - window.innerHeight / 2) * 0.0058;

    const now = Date.now();
    if (now - lastInteractiveUpdate > 450) {
      updateInteractiveElements();
      lastInteractiveUpdate = now;
    }
  }

  function handleMouseDown(e) {
    clicks.push({
      x: cursor.x,
      y: cursor.y,
      radius: 10,
      maxRadius: 35,
      alpha: 1.0
    });
  }

  function handleTouchStart(e) {
    if (e.touches.length > 0) {
      mouse.tx = e.touches[0].clientX;
      mouse.ty = e.touches[0].clientY;
      handleMouseDown(e.touches[0]);
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length > 0) {
      mouse.tx = e.touches[0].clientX;
      mouse.ty = e.touches[0].clientY;
    }
  }

  function setupTitleAnimation() {
    const h1 = document.querySelector('#hero-text h1');
    const subtextEl = document.getElementById('hero-subtext');
    if (!h1) return;

    // Original text node is kept 100% intact.
    // Inject the light sweep overlay inside H1
    lightSweepEl = document.createElement('span');
    lightSweepEl.className = 'pec-light-sweep';
    h1.appendChild(lightSweepEl);

    // Initial state: visible, slightly blurred, scaled slightly down
    gsap.set(h1, {
      opacity: 1,
      filter: 'blur(6px)',
      y: 0,
      scale: 0.99
    });

    if (subtextEl) {
      subtextEl.style.opacity = '0';
      subtextEl.style.transform = 'translateY(16px)';
    }

    measureTitleLayout();
  }

  function measureTitleLayout() {
    const h1 = document.querySelector('#hero-text h1');
    if (!h1) return;
    
    const rect = h1.getBoundingClientRect();
    titleBounds = {
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2
    };
  }

  function updateInteractiveElements() {
    interactiveRects = [];
    const elements = document.querySelectorAll('a, button, .cta-wrap, [role="button"], #theme-toggle-btn, .nav-link, .nav-social, #countdown-container > div');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        let type = 'button';
        if (el.closest('#countdown-container')) type = 'countdown';
        else if (el.closest('.nav-toggle') || el.classList.contains('nav-link')) type = 'navigation';
        else if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'P') type = 'text';

        interactiveRects.push({
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
          w: rect.width,
          h: rect.height,
          type: type,
          el: el
        });
      }
    });
  }

  function buildEnvironment() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const er = Math.min(width, height) * 1.5;
    const cyEarth = height + er * 0.94;

    // Layer 1: 250 tiny stars, very low opacity, slow twinkling, almost static
    starsL1 = [];
    const countL1 = reduceMotion ? 100 : 250;
    for (let i = 0; i < countL1; i++) {
      starsL1.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.35 + Math.random() * 0.35,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.003 + Math.random() * 0.006,
        opacity: 0.08 + Math.random() * 0.22,
        parallax: 0.1 // Deep background static
      });
    }

    // Layer 2: 80 medium blue-tinted stars, slowly drifting
    starsL2 = [];
    const countL2 = reduceMotion ? 30 : 80;
    for (let i = 0; i < countL2; i++) {
      starsL2.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.75 + Math.random() * 0.4,
        alpha: 0.2 + Math.random() * 0.25,
        vx: 0.012 + Math.random() * 0.02,
        vy: -0.008 - Math.random() * 0.015,
        parallax: 0.4
      });
    }

    // Layer 2 Add-on: Orbital Particles (rotating around Earth's gravity horizon)
    orbitalParticles = [];
    if (!reduceMotion) {
      const countOrbital = 30;
      for (let i = 0; i < countOrbital; i++) {
        // Orbit radius just above Earth sliver edge
        const rOffset = er * (1.008 + Math.random() * 0.06);
        // Angle peaking over screen bottom (roughly 1.35 to 1.65 PI)
        const angle = Math.PI * (1.3 + Math.random() * 0.4);
        const dir = Math.random() > 0.5 ? 1 : -1;
        const omega = 0.00018 + Math.random() * 0.00035;

        orbitalParticles.push({
          r: rOffset,
          theta: angle,
          dir: dir,
          omega: omega,
          size: 0.5 + Math.random() * 0.8,
          alpha: 0.15 + Math.random() * 0.22,
          color: Math.random() > 0.4 ? 'rgba(160, 215, 255, ' : 'rgba(255, 255, 255, '
        });
      }
    }

    // Layer 3: Diagonal cosmic dust with turbulence
    dustParticles = [];
    const countDust = reduceMotion ? 4 : 10;
    for (let i = 0; i < countDust; i++) {
      dustParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.55 + Math.random() * 0.55,
        vx: 0.02 + Math.random() * 0.04,
        vy: -0.03 - Math.random() * 0.05,
        alpha: 0.03 + Math.random() * 0.06
      });
    }

    // Layer 4: Foreground particles (soft blur, subtle parallax)
    starsL3 = [];
    const countL3 = 18;
    for (let i = 0; i < countL3; i++) {
      starsL3.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1.4 + Math.random() * 0.6,
        alpha: 0.35 + Math.random() * 0.3,
        parallax: 0.9 // High parallax movement (up to 5px)
      });
    }

    // Horizon Satellites: 6 tiny connect beacons slowly orbiting left to right
    satellites = [];
    if (!reduceMotion) {
      const satCount = 6;
      for (let i = 0; i < satCount; i++) {
        satellites.push({
          r: er * (1.008 + i * 0.006),
          theta: Math.PI * (1.3 + (i * 0.06)),
          speed: 0.0003 + Math.random() * 0.0002,
          blinkPhase: Math.random() * Math.PI * 2,
          blinkSpeed: 0.04 + Math.random() * 0.04,
          beamActive: false,
          beamLife: 0,
          lastBeamTime: 0,
          beamInterval: 3.5 + Math.random() * 4.0 // seconds between beams
        });
      }
    }

    // Constellations: 5 groups of connected nodes, breathing over 20-30s
    constellations = [];
    if (!reduceMotion) {
      const groupCount = 4;
      for (let g = 0; g < groupCount; g++) {
        const nodes = [];
        const cx = width * (0.12 + Math.random() * 0.76);
        const cy = height * (0.12 + Math.random() * 0.48);
        const nodeCount = 4 + Math.floor(Math.random() * 3);

        for (let n = 0; n < nodeCount; n++) {
          nodes.push({
            x: cx + (Math.random() - 0.5) * 150,
            y: cy + (Math.random() - 0.5) * 150,
            size: 0.6 + Math.random() * 0.4
          });
        }

        constellations.push({
          nodes: nodes,
          phase: Math.random() * Math.PI * 2,
          breatheSpeed: 0.007 + Math.random() * 0.007
        });
      }
    }
  }

  function drawBackgroundParticles(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Deep-space atmosphere haze (Midnight blue to deep purple, under 10% opacity)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
    baseGrad.addColorStop(0, '#010102');
    baseGrad.addColorStop(0.42, '#03050d'); // Midnight blue
    baseGrad.addColorStop(0.72, '#06020e'); // Deep purple
    baseGrad.addColorStop(1, '#010102');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // Apply parallax offset coordinates
    const px = parallax.x;
    const py = parallax.y;

    const er = Math.min(width, height) * 1.5;
    const cxEarth = width * 0.5 + px * 0.15;
    const cyEarth = height + er * 0.94 - currentScrollY * 0.15 + py * 0.15;

    // 1. Draw Layer 1 (Deepest Space: 250 tiny stars, very slow twinkle)
    starsL1.forEach(s => {
      s.twinklePhase += s.twinkleSpeed;
      const alpha = s.opacity * (0.45 + Math.sin(s.twinklePhase) * 0.4);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(s.x + px * s.parallax, s.y + py * s.parallax, s.size, s.size);
    });

    // 2. Draw Layer 2 (Mid Space: 80 medium stars, slight blue tint, slow drift)
    starsL2.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;

      ctx.fillStyle = `rgba(165, 212, 255, ${s.alpha})`;
      ctx.fillRect(s.x + px * s.parallax, s.y + py * s.parallax, s.size, s.size);
    });

    // 2b. Draw Orbital Particles (rotating around Earth's gravity curve, soft snaps to cursor)
    orbitalParticles.forEach(p => {
      p.theta += p.omega * p.dir;

      // Compute perfect arc position around Earth sliver
      let ox = cxEarth + Math.cos(p.theta) * p.r;
      let oy = cyEarth + Math.sin(p.theta) * p.r;

      // Cursor Gravitational snaps
      const dx = cursor.x - ox;
      const dy = cursor.y - oy;
      const dist = Math.hypot(dx, dy);
      if (dist < 90 && dist > 10) {
        const force = (1 - dist / 90) * 0.45;
        ox += (dx / dist) * force;
        oy += (dy / dist) * force;
      }

      // Only draw if above screen and visible
      if (oy < height && oy > height - 120 && ox >= 0 && ox <= width) {
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fillRect(ox, oy, p.size, p.size);
      }
    });

    // 3. Draw Constellations (connected node networks, breathing)
    constellations.forEach(group => {
      const breatheAlpha = 0.012 + (Math.sin(time * 0.25 + group.phase) * 0.5 + 0.5) * 0.026;

      ctx.strokeStyle = `rgba(255, 255, 255, ${breatheAlpha * 0.45})`;
      ctx.lineWidth = 0.4;
      ctx.beginPath();

      for (let i = 0; i < group.nodes.length; i++) {
        const n = group.nodes[i];
        const nx = n.x + px * 0.2;
        const ny = n.y + py * 0.2;

        ctx.fillStyle = `rgba(255, 255, 255, ${breatheAlpha * 0.8})`;
        ctx.fillRect(nx - n.size * 0.5, ny - n.size * 0.5, n.size, n.size);

        if (i === 0) {
          ctx.moveTo(nx, ny);
        } else {
          ctx.lineTo(nx, ny);
        }
      }
      ctx.stroke();
    });

    // 4. Draw Layer 3 (Foreground: 20 larger stars with soft bloom)
    starsL3.forEach(s => {
      const sx = s.x + px * s.parallax;
      const sy = s.y + py * s.parallax;

      const auraGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.size * 3.5);
      auraGrad.addColorStop(0, `rgba(255, 255, 255, ${s.alpha * 0.15})`);
      auraGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size * 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Update and Draw Shooting Stars (Thin, fast)
    updateAndDrawShootingStar(time);

    // 6. Draw Layer 4 (Cosmic Dust: slow diagonal drift + turbulence)
    dustParticles.forEach(d => {
      // Minor random turbulence (noise)
      d.vx += (Math.random() - 0.5) * 0.003;
      d.vy += (Math.random() - 0.5) * 0.003;

      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x = width;
      if (d.x > width) d.x = 0;
      if (d.y < 0) d.y = height;

      let dxDust = d.x + px * 0.65;
      let dyDust = d.y + py * 0.65;

      // Cursor Gravitational snaps
      const snapX = cursor.x - dxDust;
      const snapY = cursor.y - dyDust;
      const dist = Math.hypot(snapX, snapY);
      if (dist < 90 && dist > 10) {
        const force = (1 - dist / 90) * 0.45;
        dxDust += (snapX / dist) * force;
        dyDust += (snapY / dist) * force;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha})`;
      ctx.fillRect(dxDust, dyDust, d.size, d.size);
    });

    // 7. Update and Draw Horizon Satellites & Beams
    drawSatellitesAndBeams(time, cxEarth, cyEarth, er);
  }

  function drawSatellitesAndBeams(time, cxEarth, cyEarth, er) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    satellites.forEach(s => {
      // Orbit clockwise left to right
      s.theta += s.speed;
      if (s.theta > Math.PI * 1.75) {
        s.theta = Math.PI * 1.25; // Reset back left
      }

      const sx = cxEarth + Math.cos(s.theta) * s.r;
      const sy = cyEarth + Math.sin(s.theta) * s.r;

      // Blink beacon light
      s.blinkPhase += s.blinkSpeed;
      const blinkAlpha = 0.3 + (Math.sin(s.blinkPhase) * 0.5 + 0.5) * 0.7;
      const isBlue = s.blinkSpeed > 0.06;

      // Only draw if peaking above screen bottom
      if (sy < height && sy > height - 100 && sx >= 0 && sx <= width) {
        // Draw satellite body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(sx - 1.0, sy - 1.0, 2, 2);

        // Draw blink beacon
        ctx.fillStyle = isBlue ? `rgba(0, 180, 255, ${blinkAlpha})` : `rgba(255, 255, 255, ${blinkAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Trigger Communication beams towards Earth
        if (!s.beamActive && time - s.lastBeamTime > s.beamInterval) {
          s.beamActive = true;
          s.beamLife = 1.0;
          s.lastBeamTime = time;
          s.beamInterval = 4.0 + Math.random() * 5.0;
        }

        if (s.beamActive) {
          s.beamLife -= 0.035; // fade beam in 1 second
          if (s.beamLife <= 0) {
            s.beamActive = false;
          } else {
            // Target directly down to Earth surface (along the radial vector)
            const tx = cxEarth + Math.cos(s.theta) * er;
            const ty = cyEarth + Math.sin(s.theta) * er;

            ctx.strokeStyle = `rgba(165, 215, 255, ${s.beamLife * 0.18})`;
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
            ctx.stroke();
          }
        }
      }
    });
  }

  function updateAndDrawShootingStar(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!shootingStar.active && time - lastShootingStarTime > nextShootingStarDelay) {
      shootingStar.active = true;
      shootingStar.x = Math.random() * width * 0.7;
      shootingStar.y = Math.random() * height * 0.5;

      const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.1; // Diagonal down
      const speed = 12 + Math.random() * 8;

      shootingStar.vx = Math.cos(angle) * speed;
      shootingStar.vy = Math.sin(angle) * speed;
      shootingStar.len = 38 + Math.random() * 22;
      shootingStar.life = 1.0;

      lastShootingStarTime = time;
      nextShootingStarDelay = 8 + Math.random() * 7; // trigger every 8-15 seconds
    }

    if (shootingStar.active) {
      shootingStar.x += shootingStar.vx;
      shootingStar.y += shootingStar.vy;
      shootingStar.life -= 0.025; // Decay rate

      if (shootingStar.life <= 0) {
        shootingStar.active = false;
        return;
      }

      const tailX = shootingStar.x - shootingStar.vx * shootingStar.len * 0.08;
      const tailY = shootingStar.y - shootingStar.vy * shootingStar.len * 0.08;

      ctx.strokeStyle = `rgba(255, 255, 255, ${shootingStar.life * 0.78})`;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(shootingStar.x, shootingStar.y);
      ctx.stroke();
    }
  }

  function drawCrescentEarth(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Capped parallax offsets (max 5px)
    const px = parallax.x;
    const py = parallax.y;

    // Large radius representing a massive planet
    const er = Math.min(width, height) * 1.5;

    // Positioned far below screen, revealing only top 5-8% curved edge peak
    const cx = width * 0.5 + px * 0.15;
    const cy = height + er * 0.94 - currentScrollY * 0.15 + py * 0.15;

    // Draw Earth curved sliver base
    ctx.fillStyle = '#010102';
    ctx.beginPath();
    ctx.arc(cx, cy, er, 0, Math.PI * 2);
    ctx.fill();

    // Faint atmospheric blue-white glow (Crescent twilight scattering edge)
    const scattering = ctx.createRadialGradient(cx, cy, er * 0.965, cx, cy, er * 1.012);
    scattering.addColorStop(0, 'rgba(0, 0, 0, 1)');
    scattering.addColorStop(0.86, 'rgba(0, 89, 255, 0.02)');
    scattering.addColorStop(0.97, 'rgba(0, 89, 255, 0.09)');
    scattering.addColorStop(0.99, 'rgba(100, 180, 255, 0.26)');
    scattering.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = scattering;
    ctx.beginPath();
    ctx.arc(cx, cy, er * 1.012, 0, Math.PI * 2);
    ctx.fill();
  }

  function handleTitleRevealStages() {
    if (timelineTime > 0.6 && !blurSharpStarted && typeof gsap !== 'undefined') {
      blurSharpStarted = true;
      const h1 = document.querySelector('#hero-text h1');
      const subtextEl = document.getElementById('hero-subtext');
      if (!h1) return;
      
      const tl = gsap.timeline();
      
      // Blur -> Focus (always visible)
      tl.to(h1, {
        opacity: 1.0,
        filter: 'blur(0px)',
        y: 0,
        scale: 1.0,
        duration: 1.2,
        ease: 'power2.out'
      });
      
      // Light Sweep
      tl.to(lightSweepEl, {
        xPercent: 120,
        duration: 1.8,
        ease: 'power2.inOut',
        onStart: () => {
          if (lightSweepEl) lightSweepEl.style.opacity = '0.9';
        },
        onComplete: () => {
          if (lightSweepEl) lightSweepEl.style.opacity = '0';
        }
      }, 1.0);
      
      // Fade in Subtitle
      if (subtextEl) {
        tl.to(subtextEl, {
          opacity: 0.85,
          y: 0,
          duration: 1.2,
          ease: 'power2.out'
        }, 1.5);
      }
      
      tl.eventCallback('onComplete', () => {
        // Clear temporary GSAP inline styles on H1 so it renders pixel-perfect
        gsap.set(h1, { clearProps: 'filter,transform,opacity' });
        
        introCompleted = true;
        startAmbientLoops();
      });
    }
  }

  function startAmbientLoops() {
    const h1 = document.querySelector('#hero-text h1');
    if (!h1 || typeof gsap === 'undefined') return;

    // Ambient breathing scale
    gsap.to(h1, {
      scale: 1.008,
      duration: 5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    // Floating drift
    gsap.to(h1, {
      y: '+=2.0',
      duration: 7,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    // Dynamic breathing text-shadow glow
    gsap.to(h1, {
      '--pec-bloom': 1.0,
      duration: 2.0,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      onUpdate: function () {
        const v = gsap.getProperty(h1, '--pec-bloom') || 0.5;
        h1.style.textShadow = `0 0 ${20 + v * 15}px rgba(122, 92, 255, ${0.15 + v * 0.15}), 0 0 ${40 + v * 25}px rgba(255, 45, 85, ${0.08 + v * 0.1})`;
      }
    });
  }

  function updateParallaxAndScroll() {
    parallax.x += (parallax.tx - parallax.x) * 0.055;
    parallax.y += (parallax.ty - parallax.y) * 0.055;

    // Scroll scale compression
    currentScrollY += (scrollY - currentScrollY) * 0.08;
    const scrollFactor = currentScrollY / window.innerHeight;
    const heroScale = Math.max(0.96, 1.0 - scrollFactor * 0.04);
    const heroText = document.getElementById('hero-text');
    if (heroText) {
      heroText.style.transform = `scale(${heroScale}) translateY(${-scrollFactor * 26}px)`;
    }
  }

  function handlePeriodicLoops(time) {
    if (!introCompleted) return;

    // Light sweep every 8 seconds
    if (time - lastLightSweep > 8.0) {
      lastLightSweep = time;
      if (lightSweepEl && typeof gsap !== 'undefined') {
        gsap.timeline()
          .set(lightSweepEl, { xPercent: -120, opacity: 0.85 })
          .to(lightSweepEl, { xPercent: 120, duration: 1.8, ease: 'power2.inOut' });
      }
    }
  }

  function updateCursorPhysics() {
    let tx = mouse.tx;
    let ty = mouse.ty;

    // Magnetic Attraction
    isHovered = false;
    hoverType = 'normal';
    let target = null;
    let minDist = 99999;

    interactiveRects.forEach(rect => {
      const dist = Math.hypot(mouse.tx - rect.cx, mouse.ty - rect.cy);
      if (dist < 40 && dist < minDist) {
        minDist = dist;
        target = rect;
      }
    });

    if (target) {
      const force = (1 - minDist / 40) * 0.52;
      tx = tx + (target.cx - tx) * force;
      ty = ty + (target.cy - ty) * force;
      isHovered = true;
      hoverType = target.type;
      activeElement = target;
    } else {
      activeElement = null;
    }

    const springK = 0.16;
    const damping = 0.58;

    const dx = tx - cursor.x;
    const dy = ty - cursor.y;

    const ax = dx * springK;
    const ay = dy * springK;

    cursor.vx = (cursor.vx + ax) * damping;
    cursor.vy = (cursor.vy + ay) * damping;

    cursor.x += cursor.vx;
    cursor.y += cursor.vy;

    if (isHovered) {
      hoverProgress += (1 - hoverProgress) * 0.12;
    } else {
      hoverProgress += (0 - hoverProgress) * 0.12;
    }
  }

  function drawAICursor(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    cursorCtx.clearRect(0, 0, width, height);

    const cx = cursor.x;
    const cy = cursor.y;

    const r1 = 4.5;
    const r2 = 10.5 + hoverProgress * 5.5;

    const orbColor = 'rgba(255, 255, 255, 0.42)';
    const ringColor = isHovered ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.22)';

    cursorCtx.save();
    // Drop shadow glow effect behind glass orb
    cursorCtx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    cursorCtx.shadowBlur = 5;
    cursorCtx.shadowOffsetY = 1.5;

    // 1. Central Glass Orb (Translucent radial gradient)
    const orbGrad = cursorCtx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, r1);
    orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');

    cursorCtx.fillStyle = orbGrad;
    cursorCtx.beginPath();
    cursorCtx.arc(cx, cy, r1, 0, Math.PI * 2);
    cursorCtx.fill();

    // Fine orb stroke
    cursorCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    cursorCtx.lineWidth = 0.6;
    cursorCtx.beginPath();
    cursorCtx.arc(cx, cy, r1, 0, Math.PI * 2);
    cursorCtx.stroke();

    cursorCtx.restore();

    // 2. Thin Hairline Outer Ring
    cursorCtx.strokeStyle = ringColor;
    cursorCtx.lineWidth = 0.6;
    cursorCtx.beginPath();
    cursorCtx.arc(cx, cy, r2, 0, Math.PI * 2);
    cursorCtx.stroke();

    // 3. Draw clicks ripples
    drawClickEffects();
  }

  function drawClickEffects() {
    for (let i = clicks.length - 1; i >= 0; i--) {
      const clk = clicks[i];
      clk.radius += 2.2;
      clk.alpha -= 0.024;

      if (clk.alpha <= 0 || clk.radius >= clk.maxRadius) {
        clicks.splice(i, 1);
        continue;
      }

      cursorCtx.strokeStyle = `rgba(255, 255, 255, ${clk.alpha * 0.45})`;
      cursorCtx.lineWidth = 0.8;
      cursorCtx.beginPath();
      cursorCtx.arc(clk.x, clk.y, clk.radius, 0, Math.PI * 2);
      cursorCtx.stroke();
    }
  }

  function loop(timestamp) {
    const time = timestamp * 0.001;
    const now = Date.now();
    const dt = Math.min((now - lastTime) / 1000, 0.016666);
    lastTime = now;

    timelineTime += dt;

    updateParallaxAndScroll();
    updateCursorPhysics();
    handlePeriodicLoops(time);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    drawBackgroundParticles(time);
    drawCrescentEarth(time);

    handleTitleRevealStages();

    drawAICursor(time);

    // Magnetic Button Transforms
    if (activeElement && activeElement.el) {
      if (activeElement.type === 'button' || activeElement.type === 'navigation') {
        const bdx = mouse.tx - activeElement.cx;
        const bdy = mouse.ty - activeElement.cy;
        activeElement.el.style.transform = `translate3d(${bdx * 0.15}px, ${bdy * 0.15}px, 0) scale(1.025)`;
        lastActiveElement = activeElement.el;
      }
    } else if (lastActiveElement) {
      lastActiveElement.style.transform = '';
      lastActiveElement = null;
    }

    requestAnimationFrame(loop);
  }

  function bootstrap() {
    const h1 = document.querySelector('#hero-text h1');
    const subtext = document.getElementById('hero-subtext');
    
    if (h1 && typeof gsap !== 'undefined') {
      gsap.killTweensOf(h1);
      // Keep H1 visible and clean, only slightly blurred initially for first frame reveal
      gsap.set(h1, { opacity: 1, y: 0, scale: 0.99, filter: 'blur(6px)', clearProps: 'all' });
      h1.style.opacity = '1';
      h1.style.transform = 'none';
    }
    if (subtext && typeof gsap !== 'undefined') {
      gsap.killTweensOf(subtext);
    }
    
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();


(function () {
  function initSplashCursor() {
    const canvas = document.getElementById('splash-cursor');
    if (!canvas) return;

    let config = {
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1440,
      CAPTURE_RESOLUTION: 512,
      DENSITY_DISSIPATION: 3.5,
      VELOCITY_DISSIPATION: 2,
      PRESSURE: 0.1,
      PRESSURE_ITERATIONS: 20,
      CURL: 3,
      SPLAT_RADIUS: 0.2,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLOR_UPDATE_SPEED: 10,
      PAUSED: false,
      BACK_COLOR: { r: 0.5, g: 0, b: 0 },
      TRANSPARENT: true
    };

    function pointerPrototype() {
      return {
        id: -1,
        texcoordX: 0,
        texcoordY: 0,
        prevTexcoordX: 0,
        prevTexcoordY: 0,
        deltaX: 0,
        deltaY: 0,
        down: false,
        moved: false,
        color: { r: 0, g: 0, b: 0 }
      };
    }

    let pointers = [pointerPrototype()];

    let gl = null;
    let ext = null;

    try {
      const result = getWebGLContext(canvas);
      gl = result.gl;
      ext = result.ext;
    } catch (e) {
      console.warn('WebGL not supported, SplashCursor disabled');
      return;
    }

    if (!gl || !ext) {
      return;
    }

    if (!ext.supportLinearFiltering) {
      config.DYE_RESOLUTION = 256;
      config.SHADING = false;
    }

    function getWebGLContext(canvas) {
      const params = {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false
      };

      let gl = canvas.getContext('webgl2', params);
      const isWebGL2 = !!gl;

      if (!isWebGL2) {
        gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
      }

      if (!gl) {
        throw new Error('Unable to initialize WebGL.');
      }

      let supportLinearFiltering = false;
      let halfFloat = null;

      if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');
      } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
      }

      gl.clearColor(0, 0, 0, 1);

      const halfFloatTexType = isWebGL2
        ? gl.HALF_FLOAT
        : (halfFloat && halfFloat.HALF_FLOAT_OES) || 0;

      let formatRGBA;
      let formatRG;
      let formatR;

      if (isWebGL2) {
        formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
      } else {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      }

      return {
        gl,
        ext: {
          formatRGBA,
          formatRG,
          formatR,
          halfFloatTexType,
          supportLinearFiltering
        }
      };
    }

    function getSupportedFormat(gl, internalFormat, format, type) {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        if ('drawBuffers' in gl) {
          switch (internalFormat) {
            case gl.R16F:
              return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F:
              return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default:
              return null;
          }
        }
        return null;
      }
      return { internalFormat, format };
    }

    function supportRenderTextureFormat(gl, internalFormat, format, type) {
      const texture = gl.createTexture();
      if (!texture) return false;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

      const fbo = gl.createFramebuffer();
      if (!fbo) return false;

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      return status === gl.FRAMEBUFFER_COMPLETE;
    }

    function hashCode(s) {
      if (!s.length) return 0;
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    }

    function addKeywords(source, keywords) {
      if (!keywords) return source;
      let keywordsString = '';
      for (let i = 0; i < keywords.length; i++) {
        keywordsString += `#define ${keywords[i]}\n`;
      }
      return keywordsString + source;
    }

    function compileShader(type, source, keywords = null) {
      const shaderSource = addKeywords(source, keywords);
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, shaderSource);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.trace(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
      if (!vertexShader || !fragmentShader) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.trace(gl.getProgramInfoLog(program));
      }
      return program;
    }

    function getUniforms(program) {
      let uniforms = {};
      const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformInfo = gl.getActiveUniform(program, i);
        if (uniformInfo) {
          uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
        }
      }
      return uniforms;
    }

    class Program {
      constructor(vertexShader, fragmentShader) {
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = this.program ? getUniforms(this.program) : {};
      }
      bind() {
        if (this.program) gl.useProgram(this.program);
      }
    }

    class Material {
      constructor(vertexShader, fragmentShaderSource) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = {};
        this.activeProgram = null;
        this.uniforms = {};
      }
      setKeywords(keywords) {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++) {
          hash += hashCode(keywords[i]);
        }
        let program = this.programs[hash];
        if (program == null) {
          const fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
          program = createProgram(this.vertexShader, fragmentShader);
          this.programs[hash] = program;
        }
        if (program === this.activeProgram) return;
        if (program) {
          this.uniforms = getUniforms(program);
        }
        this.activeProgram = program;
      }
      bind() {
        if (this.activeProgram) {
          gl.useProgram(this.activeProgram);
        }
      }
    }

    const baseVertexShader = compileShader(
      gl.VERTEX_SHADER,
      `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;

      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `
    );

    const copyShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;

      void main () {
          gl_FragColor = texture2D(uTexture, vUv);
      }
    `
    );

    const clearShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;

      void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `
    );

    const displayShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform vec2 texelSize;

      void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
              vec3 lc = texture2D(uTexture, vL).rgb;
              vec3 rc = texture2D(uTexture, vR).rgb;
              vec3 tc = texture2D(uTexture, vT).rgb;
              vec3 bc = texture2D(uTexture, vB).rgb;

              float dx = length(rc) - length(lc);
              float dy = length(tc) - length(bc);

              vec3 n = normalize(vec3(dx, dy, length(texelSize)));
              vec3 l = vec3(0.0, 0.0, 1.0);

              float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
              c *= diffuse;
          #endif

          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
      }
    `;

    const splatShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;

      void main () {
          vec2 p = vUv - point.xy;
          p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
      }
    `
    );

    const advectionShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;

      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);

          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }

      void main () {
          #ifdef MANUAL_FILTERING
              vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
              vec4 result = bilerp(uSource, coord, dyeTexelSize);
          #else
              vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
              vec4 result = texture2D(uSource, coord);
          #endif
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
      }
    `,
      ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
    );

    const divergenceShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uVelocity, vL).x;
          float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y;
          float B = texture2D(uVelocity, vB).y;

          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) { L = -C.x; }
          if (vR.x > 1.0) { R = -C.x; }
          if (vT.y > 1.0) { T = -C.y; }
          if (vB.y < 0.0) { B = -C.y; }

          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `
    );

    const curlShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;
          float vorticity = R - L - T + B;
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `
    );

    const vorticityShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;

      void main () {
          float L = texture2D(uCurl, vL).x;
          float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;

          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001;
          force *= curl * C;
          force.y *= -1.0;

          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity += force * dt;
          velocity = min(max(velocity, -1000.0), 1000.0);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `
    );

    const pressureShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;

      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `
    );

    const gradientSubtractShader = compileShader(
      gl.FRAGMENT_SHADER,
      `
      precision mediump float;
      precision mediump sampler2D;
      varying highp vec2 vUv;
      varying highp vec2 vL;
      varying highp vec2 vR;
      varying highp vec2 vT;
      varying highp vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;

      void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity.xy -= vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `
    );

    const blit = (() => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
      const elemBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elemBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);

      return (target, doClear = false) => {
        if (!gl) return;
        if (!target) {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
          gl.viewport(0, 0, target.width, target.height);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (doClear) {
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      };
    })();

    let dye;
    let velocity;
    let divergence;
    let curl;
    let pressure;

    const copyProgram = new Program(baseVertexShader, copyShader);
    const clearProgram = new Program(baseVertexShader, clearShader);
    const splatProgram = new Program(baseVertexShader, splatShader);
    const advectionProgram = new Program(baseVertexShader, advectionShader);
    const divergenceProgram = new Program(baseVertexShader, divergenceShader);
    const curlProgram = new Program(baseVertexShader, curlShader);
    const vorticityProgram = new Program(baseVertexShader, vorticityShader);
    const pressureProgram = new Program(baseVertexShader, pressureShader);
    const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
    const displayMaterial = new Material(baseVertexShader, displayShaderSource);

    function createFBO(w, h, internalFormat, format, type, param) {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const texelSizeX = 1 / w;
      const texelSizeY = 1 / h;

      return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach(id) {
          gl.activeTexture(gl.TEXTURE0 + id);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return id;
        }
      };
    }

    function createDoubleFBO(w, h, internalFormat, format, type, param) {
      const fbo1 = createFBO(w, h, internalFormat, format, type, param);
      const fbo2 = createFBO(w, h, internalFormat, format, type, param);
      return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        read: fbo1,
        write: fbo2,
        swap() {
          const tmp = this.read;
          this.read = this.write;
          this.write = tmp;
        }
      };
    }

    function resizeFBO(target, w, h, internalFormat, format, type, param) {
      const newFBO = createFBO(w, h, internalFormat, format, type, param);
      copyProgram.bind();
      if (copyProgram.uniforms.uTexture) gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
      blit(newFBO, false);
      return newFBO;
    }

    function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
      if (target.width === w && target.height === h) return target;
      target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
      target.write = createFBO(w, h, internalFormat, format, type, param);
      target.width = w;
      target.height = h;
      target.texelSizeX = 1 / w;
      target.texelSizeY = 1 / h;
      return target;
    }

    function initFramebuffers() {
      const simRes = getResolution(config.SIM_RESOLUTION);
      const dyeRes = getResolution(config.DYE_RESOLUTION);

      const texType = ext.halfFloatTexType;
      const rgba = ext.formatRGBA;
      const rg = ext.formatRG;
      const r = ext.formatR;
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
      gl.disable(gl.BLEND);

      if (!dye) {
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
      } else {
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
      }

      if (!velocity) {
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
      } else {
        velocity = resizeDoubleFBO(
          velocity,
          simRes.width,
          simRes.height,
          rg.internalFormat,
          rg.format,
          texType,
          filtering
        );
      }

      divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
      curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
      pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    }

    function updateKeywords() {
      const displayKeywords = [];
      if (config.SHADING) displayKeywords.push('SHADING');
      displayMaterial.setKeywords(displayKeywords);
    }

    function getResolution(resolution) {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const aspectRatio = w / h;
      let aspect = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio;
      const min = Math.round(resolution);
      const max = Math.round(resolution * aspect);
      if (w > h) {
        return { width: max, height: min };
      }
      return { width: min, height: max };
    }

    function scaleByPixelRatio(input) {
      const pixelRatio = window.devicePixelRatio || 1;
      return Math.floor(input * pixelRatio);
    }

    updateKeywords();
    initFramebuffers();

    let lastUpdateTime = Date.now();
    let colorUpdateTimer = 0.0;

    function updateFrame() {
      const dt = calcDeltaTime();
      if (resizeCanvas()) initFramebuffers();
      updateColors(dt);
      applyInputs();
      step(dt);
      render(null);
      requestAnimationFrame(updateFrame);
    }

    function calcDeltaTime() {
      const now = Date.now();
      let dt = (now - lastUpdateTime) / 1000;
      dt = Math.min(dt, 0.016666);
      lastUpdateTime = now;
      return dt;
    }

    function resizeCanvas() {
      const width = scaleByPixelRatio(canvas.clientWidth);
      const height = scaleByPixelRatio(canvas.clientHeight);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
      }
      return false;
    }

    function updateColors(dt) {
      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach(p => {
          p.color = generateColor();
        });
      }
    }

    function applyInputs() {
      for (const p of pointers) {
        if (p.moved) {
          p.moved = false;
          splatPointer(p);
        }
      }
    }

    function step(dt) {
      gl.disable(gl.BLEND);

      curlProgram.bind();
      if (curlProgram.uniforms.texelSize) {
        gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      if (curlProgram.uniforms.uVelocity) {
        gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
      }
      blit(curl);

      vorticityProgram.bind();
      if (vorticityProgram.uniforms.texelSize) {
        gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      if (vorticityProgram.uniforms.uVelocity) {
        gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
      }
      if (vorticityProgram.uniforms.uCurl) {
        gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
      }
      if (vorticityProgram.uniforms.curl) {
        gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
      }
      if (vorticityProgram.uniforms.dt) {
        gl.uniform1f(vorticityProgram.uniforms.dt, dt);
      }
      blit(velocity.write);
      velocity.swap();

      divergenceProgram.bind();
      if (divergenceProgram.uniforms.texelSize) {
        gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      if (divergenceProgram.uniforms.uVelocity) {
        gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
      }
      blit(divergence);

      clearProgram.bind();
      if (clearProgram.uniforms.uTexture) {
        gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
      }
      if (clearProgram.uniforms.value) {
        gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
      }
      blit(pressure.write);
      pressure.swap();

      pressureProgram.bind();
      if (pressureProgram.uniforms.texelSize) {
        gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      if (pressureProgram.uniforms.uDivergence) {
        gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
      }
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        if (pressureProgram.uniforms.uPressure) {
          gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
        }
        blit(pressure.write);
        pressure.swap();
      }

      gradienSubtractProgram.bind();
      if (gradienSubtractProgram.uniforms.texelSize) {
        gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      if (gradienSubtractProgram.uniforms.uPressure) {
        gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
      }
      if (gradienSubtractProgram.uniforms.uVelocity) {
        gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
      }
      blit(velocity.write);
      velocity.swap();

      advectionProgram.bind();
      if (advectionProgram.uniforms.texelSize) {
        gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
      }
      const velocityId = velocity.read.attach(0);
      if (advectionProgram.uniforms.uVelocity) {
        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
      }
      if (advectionProgram.uniforms.uSource) {
        gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
      }
      if (advectionProgram.uniforms.dt) {
        gl.uniform1f(advectionProgram.uniforms.dt, dt);
      }
      if (advectionProgram.uniforms.dissipation) {
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
      }
      blit(velocity.write);
      velocity.swap();

      if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
      }
      if (advectionProgram.uniforms.uVelocity) {
        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
      }
      if (advectionProgram.uniforms.uSource) {
        gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
      }
      if (advectionProgram.uniforms.dissipation) {
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
      }
      blit(dye.write);
      dye.swap();
    }

    function render(target) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      drawDisplay(target);
    }

    function drawDisplay(target) {
      const width = target ? target.width : gl.drawingBufferWidth;
      const height = target ? target.height : gl.drawingBufferHeight;
      displayMaterial.bind();
      if (config.SHADING && displayMaterial.uniforms.texelSize) {
        gl.uniform2f(displayMaterial.uniforms.texelSize, 1 / width, 1 / height);
      }
      if (displayMaterial.uniforms.uTexture) {
        gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
      }
      blit(target, false);
    }

    function splatPointer(pointer) {
      const dx = pointer.deltaX * config.SPLAT_FORCE;
      const dy = pointer.deltaY * config.SPLAT_FORCE;
      splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
    }

    function clickSplat(pointer) {
      const color = generateColor();
      color.r *= 10;
      color.g *= 10;
      color.b *= 10;
      const dx = 10 * (Math.random() - 0.5);
      const dy = 30 * (Math.random() - 0.5);
      splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
    }

    function splat(x, y, dx, dy, color) {
      splatProgram.bind();
      if (splatProgram.uniforms.uTarget) {
        gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
      }
      if (splatProgram.uniforms.aspectRatio) {
        gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
      }
      if (splatProgram.uniforms.point) {
        gl.uniform2f(splatProgram.uniforms.point, x, y);
      }
      if (splatProgram.uniforms.color) {
        gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
      }
      if (splatProgram.uniforms.radius) {
        gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100));
      }
      blit(velocity.write);
      velocity.swap();

      if (splatProgram.uniforms.uTarget) {
        gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
      }
      if (splatProgram.uniforms.color) {
        gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
      }
      blit(dye.write);
      dye.swap();
    }

    function correctRadius(radius) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) radius *= aspectRatio;
      return radius;
    }

    function updatePointerDownData(pointer, id, posX, posY) {
      pointer.id = id;
      pointer.down = true;
      pointer.moved = false;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1 - posY / canvas.height;
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.color = generateColor();
    }

    function updatePointerMoveData(pointer, posX, posY, color) {
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1 - posY / canvas.height;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
      pointer.color = color;
    }

    function updatePointerUpData(pointer) {
      pointer.down = false;
    }

    function correctDeltaX(delta) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio < 1) delta *= aspectRatio;
      return delta;
    }

    function correctDeltaY(delta) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) delta /= aspectRatio;
      return delta;
    }

    function generateColor() {
      const c = HSVtoRGB(Math.random(), 1.0, 1.0);
      c.r *= 0.15;
      c.g *= 0.15;
      c.b *= 0.15;
      return c;
    }

    function HSVtoRGB(h, s, v) {
      let r = 0,
        g = 0,
        b = 0;
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      switch (i % 6) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = v;
          b = p;
          break;
        case 2:
          r = p;
          g = v;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = v;
          break;
        case 4:
          r = t;
          g = p;
          b = v;
          break;
        case 5:
          r = v;
          g = p;
          b = q;
          break;
      }
      return { r, g, b };
    }

    function wrap(value, min, max) {
      const range = max - min;
      if (range === 0) return min;
      return ((value - min) % range) + min;
    }

    const handleMouseDown = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

      const pointer = pointers[0];
      const posX = scaleByPixelRatio(e.clientX - rect.left);
      const posY = scaleByPixelRatio(e.clientY - rect.top);
      updatePointerDownData(pointer, -1, posX, posY);
      clickSplat(pointer);
    };

    const handleFirstMouseMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

      const pointer = pointers[0];
      const posX = scaleByPixelRatio(e.clientX - rect.left);
      const posY = scaleByPixelRatio(e.clientY - rect.top);
      const color = generateColor();
      updatePointerMoveData(pointer, posX, posY, color);
      document.body.removeEventListener('mousemove', handleFirstMouseMove);
    };
    document.body.addEventListener('mousemove', handleFirstMouseMove);

    const handleMouseMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

      const pointer = pointers[0];
      const posX = scaleByPixelRatio(e.clientX - rect.left);
      const posY = scaleByPixelRatio(e.clientY - rect.top);
      const color = pointer.color;
      updatePointerMoveData(pointer, posX, posY, color);
    };

    const handleFirstTouchStart = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const touches = e.targetTouches;
      const pointer = pointers[0];
      let triggered = false;

      for (let i = 0; i < touches.length; i++) {
        const clientX = touches[i].clientX;
        const clientY = touches[i].clientY;
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          const posX = scaleByPixelRatio(clientX - rect.left);
          const posY = scaleByPixelRatio(clientY - rect.top);
          updatePointerDownData(pointer, touches[i].identifier, posX, posY);
          triggered = true;
        }
      }
      if (triggered) {
        document.body.removeEventListener('touchstart', handleFirstTouchStart);
      }
    };
    document.body.addEventListener('touchstart', handleFirstTouchStart, { passive: false });

    const handleTouchStart = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const touches = e.targetTouches;
      const pointer = pointers[0];

      for (let i = 0; i < touches.length; i++) {
        const clientX = touches[i].clientX;
        const clientY = touches[i].clientY;
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          const posX = scaleByPixelRatio(clientX - rect.left);
          const posY = scaleByPixelRatio(clientY - rect.top);
          updatePointerDownData(pointer, touches[i].identifier, posX, posY);
        }
      }
    };

    const handleTouchMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const touches = e.targetTouches;
      const pointer = pointers[0];

      for (let i = 0; i < touches.length; i++) {
        const clientX = touches[i].clientX;
        const clientY = touches[i].clientY;
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          const posX = scaleByPixelRatio(clientX - rect.left);
          const posY = scaleByPixelRatio(clientY - rect.top);
          updatePointerMoveData(pointer, posX, posY, pointer.color);
        }
      }
    };

    const handleTouchEnd = (e) => {
      const touches = e.changedTouches;
      const pointer = pointers[0];
      for (let i = 0; i < touches.length; i++) {
        updatePointerUpData(pointer);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    updateFrame();
  }

  // Expose to window or just initialize directly if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSplashCursor);
  } else {
    initSplashCursor();
  }
})();