/* ==========================================================================
   PEC HACKS 4.0 — Awwwards Premium Visual Layer & Cursor System
   ========================================================================== */
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const config = {
    colors: {
      cyan: 'rgba(0, 243, 255, 1)',
      cyanDim: 'rgba(0, 243, 255, 0.22)',
      magenta: 'rgba(255, 45, 85, 1)',
      magentaDim: 'rgba(255, 45, 85, 0.22)',
      purple: 'rgba(122, 92, 255, 1)',
      purpleDim: 'rgba(122, 92, 255, 0.22)',
      white: 'rgba(255, 255, 255, 1)',
      whiteDim: 'rgba(255, 255, 255, 0.22)'
    }
  };

  let canvas, ctx;
  let cursorCanvas, cursorCtx;
  
  // Coordinates & interpolation
  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, tx: window.innerWidth / 2, ty: window.innerHeight / 2 };
  let cursor = { x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0 };
  let isHovered = false;
  let hoverType = 'normal'; // 'button', 'text', 'countdown', 'navigation'
  let hoverProgress = 0;
  
  let parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollY = 0;
  let currentScrollY = 0;

  // Background elements
  let particles = [];
  let lightRays = [];
  let energyPulses = [];
  let clicks = [];
  let sparks = [];
  let trail = [];
  
  // Title reveal timeline state
  let timelineTime = 0;
  let lastTime = Date.now();
  let textAssembleParticles = [];
  let introCompleted = false;
  let blurSharpStarted = false;
  
  // Layout metrics
  let titleBounds = null;
  let interactiveRects = [];
  let lastInteractiveUpdate = 0;
  
  // Ambient loops trackers
  let lastLightSweep = 0;
  let lastParticleBurst = 0;
  let lastEnergyPulse = 0;
  let lastGlitchTime = 0;

  let lightSweepEl = null;
  
  let activeElement = null;
  let lastActiveElement = null;

  function init() {
    canvas = document.getElementById('bg-particles');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    // Hide standard cursor follower
    const defaultFollower = document.getElementById('cursor-follower');
    if (defaultFollower) {
      defaultFollower.style.display = 'none';
    }
    
    // Inject styles for cursor overlay and sweep elements
    const style = document.createElement('style');
    style.id = 'pec-visual-styles';
    style.textContent = `
      body, html, a, button, [role="button"], #theme-toggle-btn, .nav-link, .nav-social {
        cursor: none !important;
      }
      #hero-text h1 {
        perspective: 900px;
        position: relative;
        font-family: 'Blanka', 'Inter', sans-serif !important;
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

    // Create dynamic full-screen AI cursor canvas
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

    // Prepare text nodes and sweep layout
    setupTitleAnimation();

    // Generate background elements
    buildEnvironment();
    updateInteractiveElements();
    observeCountdown();

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
    
    // Parallax target mapping
    parallax.tx = (e.clientX - window.innerWidth / 2) * 0.05;
    parallax.ty = (e.clientY - window.innerHeight / 2) * 0.05;
    
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
      radius: 6,
      maxRadius: 50,
      alpha: 1.0
    });
    
    // Sparks
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.5;
      sparks.push({
        x: cursor.x,
        y: cursor.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.8 + Math.random() * 1.8,
        life: 1.0
      });
    }
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
      subtextEl.style.transform = 'translateY(18px)';
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

    if (!introCompleted) {
      initEnergyGathers();
    }
  }

  function initEnergyGathers() {
    textAssembleParticles = [];
    if (reduceMotion || !titleBounds) return;

    // Spawn 150 particles converging to the H1 bounds
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.max(window.innerWidth, window.innerHeight) * 0.65;
      const startX = titleBounds.cx + Math.cos(angle) * radius;
      const startY = titleBounds.cy + Math.sin(angle) * radius;
      
      const targetX = titleBounds.x + Math.random() * titleBounds.w;
      const targetY = titleBounds.y + Math.random() * titleBounds.h;
      
      const staggerDelay = 0.3 + Math.random() * 0.8;
      
      textAssembleParticles.push({
        x: startX,
        y: startY,
        tx: targetX,
        ty: targetY,
        vx: 0,
        vy: 0,
        startDelay: staggerDelay,
        assembled: false,
        color: Math.random() > 0.4 ? config.colors.cyan : config.colors.purple,
        size: 1.0 + Math.random() * 1.5
      });
    }
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
    
    // Background floating neural nodes
    particles = [];
    const pCount = reduceMotion ? 12 : 55;
    for (let i = 0; i < pCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.8 + Math.random() * 1.6,
        vx: Math.random() * 0.16 - 0.08,
        vy: -0.12 - Math.random() * 0.28,
        life: Math.random(),
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
    
    // Volumetric light beams
    lightRays = [];
    for (let i = 0; i < 3; i++) {
      lightRays.push({
        x: width * (0.22 + i * 0.28),
        w: 110 + Math.random() * 90,
        opacity: 0.015 + Math.random() * 0.02,
        angle: -0.22 - Math.random() * 0.08,
        drift: Math.random() * Math.PI
      });
    }
  }

  function drawBackgroundParticles(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 1. Draw light rays
    lightRays.forEach(ray => {
      ray.drift += 0.0018;
      const angle = ray.angle + Math.sin(ray.drift) * 0.04;
      const opacity = ray.opacity * (0.75 + Math.sin(ray.drift * 2.2) * 0.25);
      
      const grad = ctx.createLinearGradient(ray.x, 0, ray.x + Math.tan(angle) * height, height);
      grad.addColorStop(0, `rgba(122, 92, 255, ${opacity})`);
      grad.addColorStop(0.5, `rgba(255, 45, 85, ${opacity * 0.5})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ray.x - ray.w * 0.5, 0);
      ctx.lineTo(ray.x + ray.w * 0.5, 0);
      ctx.lineTo(ray.x + Math.tan(angle) * height + ray.w * 0.8, height);
      ctx.lineTo(ray.x + Math.tan(angle) * height - ray.w * 0.8, height);
      ctx.closePath();
      ctx.fill();
    });

    // 2. Draw ambient energy pulses
    for (let i = energyPulses.length - 1; i >= 0; i--) {
      const pulse = energyPulses[i];
      pulse.r += 4.5;
      pulse.alpha -= 0.012;
      
      if (pulse.alpha <= 0) {
        energyPulses.splice(i, 1);
        continue;
      }
      
      const pulseGrad = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, pulse.r);
      pulseGrad.addColorStop(0, 'rgba(122, 92, 255, 0)');
      pulseGrad.addColorStop(0.8, `rgba(122, 92, 255, ${pulse.alpha * 0.08})`);
      pulseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = pulseGrad;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw connected neural nodes
    ctx.strokeStyle = 'rgba(122, 92, 255, 0.06)';
    ctx.lineWidth = 0.55;
    
    particles.forEach(p => {
      const dx = cursor.x - p.x;
      const dy = cursor.y - p.y;
      const dist = Math.hypot(dx, dy);
      
      // Repel from cursor
      if (dist < 110) {
        const force = (1 - dist / 110) * 1.35;
        p.x -= (dx / dist) * force;
        p.y -= (dy / dist) * force;
      }
      
      p.twinklePhase += 0.012;
      const alpha = 0.2 + (0.5 + Math.sin(p.twinklePhase) * 0.4) * p.life * 0.65;
      ctx.fillStyle = `rgba(122, 92, 255, ${alpha})`;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.0012;
      
      if (p.life <= 0 || p.y < -15) {
        p.x = Math.random() * width;
        p.y = height + 15;
        p.life = 1.0;
      }
    });
    
    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < 70) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
    }
    ctx.stroke();
  }

  function animateTextAssemblyParticles() {
    if (timelineTime < 0.2 || reduceMotion) return;
    
    textAssembleParticles.forEach(p => {
      if (timelineTime < p.startDelay) return;
      
      const springK = 0.08;
      const damping = 0.76;
      
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      
      const ax = dx * springK;
      const ay = dy * springK;
      
      p.vx = (p.vx + ax) * damping;
      p.vy = (p.vy + ay) * damping;
      
      p.x += p.vx;
      p.y += p.vy;
      
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
  }

  function handleTitleRevealStages() {
    if (timelineTime > 0.8 && !blurSharpStarted && typeof gsap !== 'undefined') {
      blurSharpStarted = true;
      const h1 = document.querySelector('#hero-text h1');
      const subtextEl = document.getElementById('hero-subtext');
      if (!h1) return;
      
      const tl = gsap.timeline();
      
      // Blur -> Focus (H1 is always visible)
      tl.to(h1, {
        opacity: 1.0,
        filter: 'blur(0px)',
        y: 0,
        scale: 1.0,
        duration: 1.2,
        ease: 'power2.out'
      });
      
      // Light sweep
      tl.to(lightSweepEl, {
        xPercent: 120,
        duration: 1.8,
        ease: 'power2.inOut',
        onStart: () => {
          if (lightSweepEl) lightSweepEl.style.opacity = '0.85';
        },
        onComplete: () => {
          if (lightSweepEl) lightSweepEl.style.opacity = '0';
        }
      }, 1.0);
      
      // Subtext fade in
      if (subtextEl) {
        tl.to(subtextEl, {
          opacity: 1.0,
          y: 0,
          duration: 0.9,
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
      duration: 4.8,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    // Floating drift
    gsap.to(h1, {
      y: '+=2.0',
      duration: 6.5,
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
    
    const bgGradient = document.getElementById('bg-gradient');
    const bgFog = document.getElementById('bg-fog');
    const bgHexagon = document.getElementById('bg-hexagon');
    const bgBeam = document.getElementById('bg-beam');
    
    if (bgGradient) {
      bgGradient.style.transform = `translate3d(${parallax.x * 0.28}px, ${parallax.y * 0.28}px, 0)`;
    }
    if (bgFog) {
      bgFog.style.transform = `translate3d(${parallax.x * 0.55}px, ${parallax.y * 0.55}px, 0) scale(1.05)`;
    }
    if (bgHexagon) {
      bgHexagon.style.transform = `translate(calc(-50% + ${parallax.x * 0.4}px), calc(-50% + ${parallax.y * 0.4}px))`;
    }
    if (bgBeam) {
      bgBeam.style.transform = `translate3d(${parallax.x * 0.35}px, ${parallax.y * 0.35}px, 0) translateX(-50%)`;
    }

    // Scroll scale compression
    currentScrollY += (scrollY - currentScrollY) * 0.08;
    const scrollFactor = currentScrollY / window.innerHeight;
    const heroScale = Math.max(0.95, 1.0 - scrollFactor * 0.05);
    const heroText = document.getElementById('hero-text');
    if (heroText) {
      heroText.style.transform = `scale(${heroScale}) translateY(${-scrollFactor * 32}px)`;
    }
  }

  function handlePeriodicLoops(time) {
    if (!introCompleted) return;

    // 1. Light sweep every 8 seconds
    if (time - lastLightSweep > 8.0) {
      lastLightSweep = time;
      if (lightSweepEl && typeof gsap !== 'undefined') {
        gsap.timeline()
          .set(lightSweepEl, { xPercent: -120, opacity: 0.85 })
          .to(lightSweepEl, { xPercent: 120, duration: 1.8, ease: 'power2.inOut' });
      }
    }

    // 2. Glitch every 15 seconds
    if (time - lastGlitchTime > 15.0) {
      lastGlitchTime = time;
      triggerGlitch();
    }

    // 3. Particle burst from H1 center every 10 seconds
    if (time - lastParticleBurst > 10.0) {
      lastParticleBurst = time;
      triggerParticleBurst();
    }

    // 4. Energy pulse every 20 seconds
    if (time - lastEnergyPulse > 20.0) {
      lastEnergyPulse = time;
      energyPulses.push({
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.4,
        r: 10,
        alpha: 1.0
      });
    }
  }

  function triggerGlitch() {
    const h1 = document.querySelector('#hero-text h1');
    if (!h1 || typeof gsap === 'undefined') return;
    
    const tl = gsap.timeline();
    tl.set(h1, { x: -3.5 })
      .to(h1, { x: 3.5, duration: 0.05, ease: 'none' })
      .to(h1, { x: 0, duration: 0.05, ease: 'none' });
      
    gsap.fromTo(h1,
      { textShadow: '2.5px 0 0 rgba(255,45,85,0.7), -2.5px 0 0 rgba(122,92,255,0.7)' },
      {
        textShadow: '0 0 30px rgba(122, 92, 255, 0.25), 0 0 60px rgba(255, 45, 85, 0.15)',
        duration: 0.14,
        ease: 'none'
      }
    );
  }

  function triggerParticleBurst() {
    if (!titleBounds) return;
    for (let k = 0; k < 12; k++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.0;
      sparks.push({
        x: titleBounds.x + Math.random() * titleBounds.w,
        y: titleBounds.y + Math.random() * titleBounds.h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.8 + Math.random() * 1.2,
        life: 0.85
      });
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
      const force = (1 - minDist / 40) * 0.55;
      tx = tx + (target.cx - tx) * force;
      ty = ty + (target.cy - ty) * force;
      isHovered = true;
      hoverType = target.type;
      activeElement = target;
    }
    
    if (target) {
      activeElement = target;
    } else {
      activeElement = null;
    }
    
    if (!isHovered) {
      const countdown = document.getElementById('countdown-container');
      if (countdown) {
        const rect = countdown.getBoundingClientRect();
        if (mouse.tx >= rect.left && mouse.tx <= rect.right && mouse.ty >= rect.top && mouse.ty <= rect.bottom) {
          isHovered = true;
          hoverType = 'countdown';
        }
      }
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
    
    // Trail tracking
    if (Math.random() > 0.45) {
      trail.push({
        x: cursor.x,
        y: cursor.y,
        life: 0.9,
        size: 0.8 + Math.random() * 1.3
      });
    }
    
    if (trail.length > 15) {
      trail.shift();
    }
  }

  function drawAICursor(time) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isDark = !document.body.classList.contains('bg-white');
    
    cursorCtx.clearRect(0, 0, width, height);
    
    const cx = cursor.x;
    const cy = cursor.y;
    
    // 1. Constellation Trail
    cursorCtx.lineWidth = 0.5;
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.life -= 0.028;
      if (p.life <= 0) {
        trail.splice(i, 1);
        continue;
      }
      
      cursorCtx.fillStyle = `rgba(0, 243, 255, ${p.life * 0.8})`;
      cursorCtx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      
      if (i < trail.length - 1) {
        const next = trail[i + 1];
        const dist = Math.hypot(p.x - next.x, p.y - next.y);
        if (dist < 32) {
          cursorCtx.strokeStyle = `rgba(0, 243, 255, ${0.16 * p.life})`;
          cursorCtx.beginPath();
          cursorCtx.moveTo(p.x, p.y);
          cursorCtx.lineTo(next.x, next.y);
          cursorCtx.stroke();
        }
      }
    }
    
    const r1 = 11 + hoverProgress * 8;
    const r2 = 18 + hoverProgress * 11;
    const r3 = 26 + hoverProgress * 14;
    
    const cursorColor = isHovered && hoverType === 'button' ? config.colors.magenta : (isDark ? '#00f3ff' : '#0059ff');
    const ringColor = isDark 
      ? (isHovered && hoverType === 'button' ? 'rgba(255, 45, 85, 0.85)' : 'rgba(0, 243, 255, 0.55)') 
      : (isHovered && hoverType === 'button' ? 'rgba(255, 45, 85, 0.85)' : 'rgba(0, 89, 255, 0.55)');
    const auraColor = isDark 
      ? (isHovered && hoverType === 'button' ? 'rgba(255, 45, 85, 0.3)' : 'rgba(0, 243, 255, 0.12)') 
      : (isHovered && hoverType === 'button' ? 'rgba(255, 45, 85, 0.25)' : 'rgba(0, 89, 255, 0.08)');

    // 2. Aura Glow
    const auraGrad = cursorCtx.createRadialGradient(cx, cy, 0, cx, cy, r3 * 1.5);
    auraGrad.addColorStop(0, auraColor);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    cursorCtx.fillStyle = auraGrad;
    cursorCtx.beginPath();
    cursorCtx.arc(cx, cy, r3 * 1.5, 0, Math.PI * 2);
    cursorCtx.fill();
    
    // 3. Central AI core orb
    cursorCtx.fillStyle = cursorColor;
    cursorCtx.beginPath();
    cursorCtx.arc(cx, cy, 3.2, 0, Math.PI * 2);
    cursorCtx.fill();

    // Hover states rendering
    if (isHovered && hoverType === 'countdown') {
      cursorCtx.strokeStyle = ringColor;
      cursorCtx.lineWidth = 0.8;
      const bOffset = r3 - 4;
      const bLen = 5;
      
      // top-left
      cursorCtx.beginPath();
      cursorCtx.moveTo(cx - bOffset + bLen, cy - bOffset);
      cursorCtx.lineTo(cx - bOffset, cy - bOffset);
      cursorCtx.lineTo(cx - bOffset, cy - bOffset + bLen);
      cursorCtx.stroke();
      
      // top-right
      cursorCtx.beginPath();
      cursorCtx.moveTo(cx + bOffset - bLen, cy - bOffset);
      cursorCtx.lineTo(cx + bOffset, cy - bOffset);
      cursorCtx.lineTo(cx + bOffset, cy - bOffset + bLen);
      cursorCtx.stroke();
      
      // bottom-left
      cursorCtx.beginPath();
      cursorCtx.moveTo(cx - bOffset + bLen, cy + bOffset);
      cursorCtx.lineTo(cx - bOffset, cy + bOffset);
      cursorCtx.lineTo(cx - bOffset, cy + bOffset - bLen);
      cursorCtx.stroke();
      
      // bottom-right
      cursorCtx.beginPath();
      cursorCtx.moveTo(cx + bOffset - bLen, cy + bOffset);
      cursorCtx.lineTo(cx + bOffset, cy + bOffset);
      cursorCtx.lineTo(cx + bOffset, cy + bOffset - bLen);
      cursorCtx.stroke();
      
    } else if (isHovered && hoverType === 'navigation') {
      const compassAngle = time * 1.6;
      cursorCtx.save();
      cursorCtx.translate(cx, cy);
      cursorCtx.rotate(compassAngle);
      cursorCtx.strokeStyle = ringColor;
      cursorCtx.lineWidth = 0.8;
      
      cursorCtx.beginPath();
      cursorCtx.arc(0, 0, r2, 0, Math.PI * 2);
      cursorCtx.stroke();
      
      for (let a = 0; a < 4; a++) {
        cursorCtx.save();
        cursorCtx.rotate(a * Math.PI / 2);
        cursorCtx.fillRect(-0.5, -r2 - 2, 1, 3.5);
        cursorCtx.restore();
      }
      
      cursorCtx.strokeStyle = config.colors.magenta;
      cursorCtx.lineWidth = 1;
      cursorCtx.beginPath();
      cursorCtx.moveTo(0, -r2 + 4);
      cursorCtx.lineTo(0, r2 - 4);
      cursorCtx.stroke();
      cursorCtx.restore();
      
    } else {
      const rotFactor = hoverType === 'text' ? 2.5 : 1.0;
      
      // Inner solid ring with gaps
      const innerAngle = time * 1.5 * rotFactor;
      cursorCtx.save();
      cursorCtx.translate(cx, cy);
      cursorCtx.rotate(innerAngle);
      cursorCtx.strokeStyle = ringColor;
      cursorCtx.lineWidth = 0.8;
      cursorCtx.setLineDash([r1 * Math.PI * 0.7, r1 * Math.PI * 0.3]);
      cursorCtx.beginPath();
      cursorCtx.arc(0, 0, r1, 0, Math.PI * 2);
      cursorCtx.stroke();
      cursorCtx.restore();
      
      // Mid ring (ticks)
      const midAngle = -time * 1.0 * rotFactor;
      cursorCtx.save();
      cursorCtx.translate(cx, cy);
      cursorCtx.rotate(midAngle);
      cursorCtx.strokeStyle = ringColor;
      cursorCtx.lineWidth = 0.5;
      cursorCtx.beginPath();
      cursorCtx.arc(0, 0, r2, 0, Math.PI * 2);
      cursorCtx.stroke();
      
      cursorCtx.fillStyle = ringColor;
      for (let a = 0; a < 4; a++) {
        cursorCtx.save();
        cursorCtx.rotate(a * Math.PI / 2);
        cursorCtx.fillRect(-0.5, -r2 - 1.5, 1, 3);
        cursorCtx.restore();
      }
      cursorCtx.restore();
      
      // Outer dashed ring
      const outerAngle = time * 0.8 * rotFactor;
      cursorCtx.save();
      cursorCtx.translate(cx, cy);
      cursorCtx.rotate(outerAngle);
      cursorCtx.strokeStyle = ringColor;
      cursorCtx.lineWidth = 0.55;
      cursorCtx.setLineDash([4, 6]);
      cursorCtx.beginPath();
      cursorCtx.arc(0, 0, r3, 0, Math.PI * 2);
      cursorCtx.stroke();
      cursorCtx.restore();
    }
    
    drawClickEffects();
  }

  function drawClickEffects() {
    for (let i = clicks.length - 1; i >= 0; i--) {
      const clk = clicks[i];
      clk.radius += 2.8;
      clk.alpha -= 0.026;
      
      if (clk.alpha <= 0 || clk.radius >= clk.maxRadius) {
        clicks.splice(i, 1);
        continue;
      }
      
      cursorCtx.strokeStyle = `rgba(255, 45, 85, ${clk.alpha})`;
      cursorCtx.lineWidth = 1.0;
      cursorCtx.beginPath();
      cursorCtx.arc(clk.x, clk.y, clk.radius, 0, Math.PI * 2);
      cursorCtx.stroke();
    }
    
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.08;
      sp.vx *= 0.98;
      sp.vy *= 0.98;
      sp.life -= 0.022;
      
      if (sp.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      
      cursorCtx.fillStyle = `rgba(255, 45, 85, ${sp.life})`;
      cursorCtx.beginPath();
      cursorCtx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      cursorCtx.fill();
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
    
    animateTextAssemblyParticles();
    handleTitleRevealStages();
    
    drawAICursor(time);
    
    // Magnetic Button Transforms
    if (activeElement && activeElement.el) {
      if (activeElement.type === 'button' || activeElement.type === 'navigation') {
        const bdx = mouse.tx - activeElement.cx;
        const bdy = mouse.ty - activeElement.cy;
        activeElement.el.style.transform = `translate3d(${bdx * 0.15}px, ${bdy * 0.15}px, 0) scale(1.03)`;
        lastActiveElement = activeElement.el;
      }
    } else if (lastActiveElement) {
      lastActiveElement.style.transform = '';
      lastActiveElement = null;
    }
    
    requestAnimationFrame(loop);
  }

  function observeCountdown() {
    const container = document.getElementById('countdown-container');
    if (!container) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mut => {
        let el = null;
        if (mut.target.nodeType === Node.TEXT_NODE) {
          el = mut.target.parentElement;
        } else if (mut.target.nodeType === Node.ELEMENT_NODE) {
          el = mut.target;
        }
        if (el && el.tagName === 'SPAN' && el.id.startsWith('cd-')) {
          if (!el.classList.contains('pec-digit-pop')) {
            el.classList.add('pec-digit-pop');
            setTimeout(() => {
              el.classList.remove('pec-digit-pop');
            }, 400);
          }
        }
      });
    });
    
    observer.observe(container, { characterData: true, childList: true, subtree: true });
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
