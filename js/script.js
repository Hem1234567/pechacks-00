(function(){
    // 1. Lenis Smooth Scrolling Setup
    // On touch devices we let the OS handle native touch scrolling (fling/momentum),
    // which is always smoother and lighter on low-end phones than a JS-driven touch loop.
    // syncTouch:true was hijacking every touch-move, which is why scrolling only advanced
    // while a finger was actively dragging and felt inconsistent between sections.
    const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        syncTouch: false,
        touchMultiplier: isCoarsePointer ? 1 : 0.7,
    });
    window.lenis = lenis; // expose for scroll-to-top button
    
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0, 0);

    // Mark active scrolling on <body>. On mobile, CSS uses this to pause the rotating
    // blurred border behind the Domains stack cards, so it isn't competing with the
    // scroll-driven stacking transform for the same animation frame (see styles.css).
    let scrollStopTimer;
    document.body.classList.add('is-scrolling');
    const markScrollStopped = () => document.body.classList.remove('is-scrolling');
    scrollStopTimer = setTimeout(markScrollStopped, 150);
    lenis.on('scroll', () => {
        document.body.classList.add('is-scrolling');
        clearTimeout(scrollStopTimer);
        scrollStopTimer = setTimeout(markScrollStopped, 150);
    });

    // 2. Cursor Follower
    const cursor = document.getElementById('cursor-follower');
    if (cursor) {
        let mouseX = 0;
        let mouseY = 0;
        let cursorX = 0;
        let cursorY = 0;
        const speed = 0.15;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        const animateCursor = () => {
            cursorX += (mouseX - cursorX) * speed;
            cursorY += (mouseY - cursorY) * speed;
            cursor.style.transform = `translate3d(calc(${cursorX}px - 50%), calc(${cursorY}px - 50%), 0)`;
            requestAnimationFrame(animateCursor);
        };
        animateCursor();
    }

    // 3. Navigation Overlay Animations
    const navToggle = document.getElementById('nav-toggle');
    const navOverlay = document.getElementById('nav-overlay');
    const navLinks = document.querySelectorAll('.nav-link');
    const navSocials = document.querySelectorAll('.nav-social');
    const navCopyright = document.querySelector('.nav-copyright');
    let navOpen = false;
    let navTimeline = gsap.timeline({ paused: true });

    navTimeline
        .to(navOverlay, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1,
            ease: "power4.inOut"
        })
        .to(navLinks, {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 1,
            ease: "power3.out"
        }, "-=0.6")
        .to(navSocials, {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 0.8,
            ease: "power3.out"
        }, "-=0.8")
        .to(navCopyright, {
            opacity: 1,
            duration: 0.8
        }, "-=0.5");

    navToggle.addEventListener('click', () => {
        navOpen = !navOpen;
        if (navOpen) {
            // Animate hamburger to X
            gsap.to('.top-line', { rotation: 45, y: 6.5, scaleX: 0.8, duration: 0.6, ease: "power3.out" });
            gsap.to('.mid-line', { opacity: 0, scaleX: 0, duration: 0.4, ease: "power3.out" });
            gsap.to('.bot-line', { rotation: -45, y: -6.5, scaleX: 0.8, duration: 0.6, ease: "power3.out" });
            document.body.style.overflow = "hidden";
            navTimeline.timeScale(1).play();
        } else {
            // Animate X to hamburger
            gsap.to('.top-line', { rotation: 0, y: 0, scaleX: 1, duration: 0.6, ease: "power3.out" });
            gsap.to('.mid-line', { opacity: 1, scaleX: 1, duration: 0.4, ease: "power3.out" });
            gsap.to('.bot-line', { rotation: 0, y: 0, scaleX: 1, duration: 0.6, ease: "power3.out" });
            document.body.style.overflow = "";
            navTimeline.timeScale(1.5).reverse();
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                navToggle.click();
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    setTimeout(() => {
                        lenis.scrollTo(targetElement, { offset: 0, duration: 1.5 });
                    }, 300);
                }
            } else {
                navToggle.click();
            }
        });
    });

    document.querySelectorAll('a[href^="#"]:not(.nav-link)').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    lenis.scrollTo(targetElement, { offset: 0, duration: 1.5 });
                }
            }
        });
    });

    // 3.5 Mobile Navbar Sticky Background Logic
    const mobileNavbarBg = document.getElementById('mobile-navbar-bg');
    const brandLogoWrap = document.getElementById('brand-logo-wrap');
    const brandLogoText = document.getElementById('brand-logo-text');
    const navToggleWrap = document.getElementById('nav-toggle-wrap');
    const navBtn = document.getElementById('nav-toggle');

    if (mobileNavbarBg) {
        const updateNavbarBg = () => {
            const isMobile = window.innerWidth < 768;
            if (window.scrollY > 50 && isMobile) {
                mobileNavbarBg.classList.remove('bg-transparent', 'border-transparent', 'h-[76px]');
                mobileNavbarBg.classList.add('bg-black', 'border-white/10', 'h-[60px]');

                if (brandLogoWrap) {
                    brandLogoWrap.classList.remove('top-4', 'h-11');
                    brandLogoWrap.classList.add('top-2.5', 'h-10');
                }
                if (brandLogoText) {
                    brandLogoText.classList.remove('text-xl');
                    brandLogoText.classList.add('text-lg');
                }
                if (navToggleWrap) {
                    navToggleWrap.classList.remove('top-4', 'h-11');
                    navToggleWrap.classList.add('top-2.5', 'h-10');
                }
                if (navBtn) {
                    navBtn.classList.remove('w-11', 'h-11');
                    navBtn.classList.add('w-10', 'h-10');
                }
            } else {
                mobileNavbarBg.classList.remove('bg-black', 'border-white/10', 'h-[60px]');
                mobileNavbarBg.classList.add('bg-transparent', 'border-transparent', 'h-[76px]');

                if (brandLogoWrap) {
                    brandLogoWrap.classList.remove('top-2.5', 'h-10');
                    brandLogoWrap.classList.add('top-4', 'h-11');
                }
                if (brandLogoText) {
                    brandLogoText.classList.remove('text-lg');
                    brandLogoText.classList.add('text-xl');
                }
                if (navToggleWrap) {
                    navToggleWrap.classList.remove('top-2.5', 'h-10');
                    navToggleWrap.classList.add('top-4', 'h-11');
                }
                if (navBtn) {
                    navBtn.classList.remove('w-10', 'h-10');
                    navBtn.classList.add('w-11', 'h-11');
                }
            }
        };
        window.addEventListener('scroll', updateNavbarBg, { passive: true });
        window.addEventListener('resize', updateNavbarBg, { passive: true });
        lenis.on('scroll', updateNavbarBg);
        updateNavbarBg();
    }

    // Desktop navbar: transparent → black on scroll
    const desktopNav = document.getElementById('desktop-nav');
    if (desktopNav) {
        const updateDesktopNav = () => {
            if (window.scrollY > 60) {
                desktopNav.classList.add('scrolled');
            } else {
                desktopNav.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', updateDesktopNav, { passive: true });
        lenis.on('scroll', updateDesktopNav);
        updateDesktopNav();
    }

    // Desktop nav scroll-spy: highlight active section link
    const desktopNavLinks = document.querySelectorAll('.desktop-nav-link');
    if (desktopNavLinks.length) {
        const sectionIds = ['about', 'domains', 'timeline', 'prizes', 'partners', 'faqs'];
        const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

        const setActive = (id) => {
            desktopNavLinks.forEach(link => {
                if (link.getAttribute('href') === '#' + id) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        };

        const spyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActive(entry.target.id);
                }
            });
        }, {
            rootMargin: '-40% 0px -55% 0px',
            threshold: 0
        });

        sections.forEach(sec => spyObserver.observe(sec));
    }

    // 4. Scroll Animations (Hero & About)
    gsap.registerPlugin(ScrollTrigger);

    // Hero Entry
    gsap.to('#hero-text h1', { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0 });
    gsap.to('#hero-subtext div', { opacity: 1, x: 0, duration: 0.7, ease: "power3.out", delay: 0.3 });

    // About Section (Stacking Scroll logic)
    const aboutContainer = document.getElementById('about'); // the invisible spacer
    ScrollTrigger.create({
        trigger: aboutContainer,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
            if (window.innerWidth < 768) return;
            const p = self.progress; // 0 to 1
            // Context Label
            if(p > 0.05) gsap.to('#about-ctx', { opacity: Math.min((p-0.05)*5, 1), y: Math.max(80 - (p-0.05)*400, 0), overwrite: "auto", duration: 0.1 });
            // Education
            if(p > 0.15) gsap.to('#about-ed', { opacity: Math.min((p-0.15)*5, 1), y: Math.max(80 - (p-0.15)*400, 0), overwrite: "auto", duration: 0.1 });
            // Experience
            if(p > 0.25) gsap.to('#about-exp', { opacity: Math.min((p-0.25)*5, 1), y: Math.max(80 - (p-0.25)*400, 0), overwrite: "auto", duration: 0.1 });
            // Focus
            if(p > 0.35) gsap.to('#about-foc', { opacity: Math.min((p-0.35)*5, 1), y: Math.max(80 - (p-0.35)*400, 0), overwrite: "auto", duration: 0.1 });
        }
    });

    // 5. Selected Works (3D Stacking Cards)
    const worksContainer = document.getElementById('works-stack-container');
    const cards = document.querySelectorAll('.scroll-stack-card');
    const endElement = document.querySelector('.scroll-stack-end');
    
    if (cards.length > 0 && endElement) {
        // We remove the old ScrollTrigger and use a manual scroll handler to exactly match React logic
        const BASE_CONFIG = {
            itemDistance: 100,
            itemScale: 0.015,
            itemStackDistance: 18,
            stackPosition: 0.08,
            scaleEndPosition: 0.05,
            baseScale: 0.92,
        };

        let cardOffsets = [];
        let endOffset = 0;
        let timelineRunwayOffset = 0;
        let timelineHeadingOffset = 0;
        const timelineRunwayEl = document.getElementById('timeline-runway');
        const timelineHeadingEl = document.getElementById('timeline');
        const stackInnerEl = document.getElementById('works-stack-container');
        let stackInnerTopCache = 0;
        let threadLenCache = 0;
        const threadEl = document.getElementById('thread-path');

        const cachePositions = () => {
            cards.forEach(card => card.style.transform = '');
            const scrollY = window.scrollY;
            cardOffsets = Array.from(cards).map(card => card.getBoundingClientRect().top + scrollY);
            endOffset = endElement.getBoundingClientRect().top + scrollY;
            if (timelineRunwayEl) timelineRunwayOffset = timelineRunwayEl.getBoundingClientRect().top + scrollY;
            if (timelineHeadingEl) timelineHeadingOffset = timelineHeadingEl.getBoundingClientRect().top + scrollY;
            // Cache layout-dependent reads here (once per load/resize) instead of every scroll
            // frame — getBoundingClientRect() and getTotalLength() force a synchronous layout
            // reflow, and calling them on each scroll tick is what made low-end phones stutter.
            if (stackInnerEl) stackInnerTopCache = stackInnerEl.getBoundingClientRect().top + scrollY;
            if (threadEl) {
                try { threadLenCache = threadEl.getTotalLength(); } catch (e) {}
            }
        };

        const updateStacking = () => {
            if (cardOffsets.length === 0) return;
            const scroll = window.scrollY;
            const containerHeight = window.innerHeight;
            const firstCardHeight = cards[0].offsetHeight;

            const stackPositionPx = (containerHeight - firstCardHeight) / 2;
            const scaleEndPositionPx = stackPositionPx - (BASE_CONFIG.stackPosition - BASE_CONFIG.scaleEndPosition) * containerHeight;
            
            const lastCardTop = cardOffsets[cards.length - 1];
            const isLaptopTimeline = window.innerWidth >= 768;
            const voidStart = lastCardTop - scaleEndPositionPx;
            const voidDistance = isLaptopTimeline ? containerHeight * 0.03 : containerHeight * 0.08;
            // Anchor the timeline S-curve to the dedicated runway element so it never overlaps the Domains stack.
            const runwayAnchor = timelineRunwayOffset || (voidStart + voidDistance);
            // Start only once the runway is comfortably in view (well after the Domains stack finishes).
            const timelineStart = runwayAnchor + containerHeight * 0.15;
            const timelineDistance = isLaptopTimeline ? containerHeight * 2.4 : containerHeight * 2.8;
            const timelineEnd = timelineStart + timelineDistance;

            cards.forEach((card, i) => {
                const cardTop = cardOffsets[i];
                const triggerStart = cardTop - stackPositionPx - BASE_CONFIG.itemStackDistance * i;
                const triggerEnd = cardTop - scaleEndPositionPx;
                const pinStart = triggerStart;
                const pinEnd = Math.max(endOffset - containerHeight * 0.5, voidStart + voidDistance);

                let scaleProgress = 0;
                if (scroll >= triggerEnd) {
                    scaleProgress = 1;
                } else if (scroll > triggerStart) {
                    scaleProgress = (scroll - triggerStart) / (triggerEnd - triggerStart);
                }
                scaleProgress = Math.min(Math.max(scaleProgress, 0), 1);

                const targetScale = BASE_CONFIG.baseScale + i * BASE_CONFIG.itemScale;
                const scale = Number((1 - scaleProgress * (1 - targetScale)).toFixed(4));

                let translateY = 0;
                if (scroll >= pinStart && scroll <= pinEnd) {
                    translateY = scroll - cardTop + stackPositionPx + BASE_CONFIG.itemStackDistance * i;
                } else if (scroll > pinEnd) {
                    translateY = pinEnd - cardTop + stackPositionPx + BASE_CONFIG.itemStackDistance * i;
                }

                card.style.transform = `translate3d(0, ${Math.round(translateY * 10) / 10}px, 0) scale(${scale})`;
            });

            // Void container falling effect
            const voidContainer = document.getElementById('void-container');
            const stackInner = document.getElementById('works-stack-container');
            let voidProgress = 0;
            if (scroll > voidStart) {
                voidProgress = (scroll - voidStart) / voidDistance;
                voidProgress = Math.min(Math.max(voidProgress, 0), 1);
            }

            let timelineProgress = 0;
            if (scroll > timelineStart) {
                timelineProgress = (scroll - timelineStart) / timelineDistance;
                timelineProgress = Math.min(Math.max(timelineProgress, 0), 1);
            }

            if (voidContainer && stackInner) {
                const originY = scroll + containerHeight / 2 - stackInnerTopCache;
                stackInner.style.perspectiveOrigin = `50% ${originY}px`;

                voidContainer.style.transformOrigin = `50% ${originY}px`;
                voidContainer.style.transform = 'translate3d(0, 0, 0) scale(1)';
                voidContainer.style.opacity = '1';
                voidContainer.style.visibility = 'visible';
            }

            // Kinetic Wheel Animation
            const kineticWheel = document.getElementById('kinetic-wheel');
            const mobileSvg = document.getElementById('kinetic-svg-mobile');
            const desktopSvg = document.getElementById('kinetic-svg-desktop');
            const isMobile = true; // Use vertical thread layout on all viewports
            
            if (kineticWheel) {
                // Show/hide appropriate SVGs
                if (isMobile && mobileSvg && desktopSvg) {
                    mobileSvg.classList.remove('hidden');
                    desktopSvg.classList.add('hidden');
                } else if (mobileSvg && desktopSvg) {
                    mobileSvg.classList.add('hidden');
                    desktopSvg.classList.remove('hidden');
                }
                
                // Adjust layout — vertical thread is handset-sized on phones and viewport-fitted on laptop/desktop
                const isHandset = window.innerWidth < 768;
                kineticWheel.style.top = isHandset ? '50%' : '52%';
                kineticWheel.style.bottom = 'auto';
                kineticWheel.style.left = '50%';
                if (isHandset) {
                    kineticWheel.style.width = '100vw';
                    kineticWheel.style.height = '100vw';
                    kineticWheel.style.marginTop = 'calc(-50vw)';
                    kineticWheel.style.marginLeft = 'calc(-50vw)';
                } else {
                    // On laptop/desktop, keep the full S-curve inside the viewport with a clean top/bottom margin
                    kineticWheel.style.width = 'min(78vw, 68vh)';
                    kineticWheel.style.height = '90vh';
                    kineticWheel.style.marginTop = 'calc(-44vh)';
                    kineticWheel.style.marginLeft = 'calc(0px - min(39vw, 34vh))';
                }

                if (scroll > timelineEnd + containerHeight * 0.6) {
                    kineticWheel.style.display = 'none';
                    kineticWheel.style.visibility = 'hidden';
                } else if (timelineProgress > 0) {
                    kineticWheel.style.display = 'block';
                    kineticWheel.style.visibility = 'visible';

                    if (isMobile) {
                        kineticWheel.style.opacity = '1';
                        kineticWheel.style.transform = `translate3d(0, 0, 0)`;

                        // animate path
                        const thread = threadEl;
                        if (thread) {
                            try {
                                const threadLen = threadLenCache || thread.getTotalLength();
                                let drawP = timelineProgress / 0.96;
                                drawP = Math.min(Math.max(drawP, 0), 1);
                                thread.style.strokeDasharray = `${threadLen}`;
                                thread.style.strokeDashoffset = `${(threadLen * (1 - drawP)).toFixed(2)}`;
                                
                                const animateText = (id, targetP) => {
                                    const ref = document.getElementById(id);
                                    if (!ref) return;
                                    const threshold = 0.15;
                                    const dist = Math.abs(drawP - targetP);
                                    let intensity = dist < threshold ? 1 - (dist / threshold) : 0;
                                    if (drawP >= targetP) intensity = 1;
                                    ref.style.opacity = (0.3 + 0.7 * intensity).toFixed(2);
                                    ref.style.transform = `scale(${1 + 0.05 * intensity})`;
                                    ref.style.transformOrigin = 'center';
                                    ref.style.transformBox = 'fill-box';
                                };
                                animateText('text-start', 0.02);
                                animateText('text-phase-1', 0.07);
                                animateText('text-phase-2', 0.21);
                                animateText('text-phase-3', 0.35);
                                animateText('text-phase-4', 0.49);
                                animateText('text-phase-5', 0.63);
                                animateText('text-phase-6', 0.77);
                                animateText('text-phase-7', 0.91);
                                animateText('text-end', 0.97);
                            } catch(e) {}
                        }

                        const figureGroup = document.getElementById('figure-group');
                        if (figureGroup) {
                            if (timelineProgress >= 0.98) {
                                const textFade = 1 - ((timelineProgress - 0.98) / 0.02);
                                figureGroup.style.opacity = Math.max(0, textFade).toFixed(3);
                            } else {
                                figureGroup.style.opacity = '1';
                            }
                        }

                    } else {
                        kineticWheel.style.opacity = Math.min(timelineProgress * 4, 1).toFixed(3);
                        const targetRotation = 180 * (1 - timelineProgress);
                        kineticWheel.style.transformOrigin = '50% 100%';
                        kineticWheel.style.transform = `rotate(${targetRotation}deg)`;
                    }
                } else {
                    kineticWheel.style.display = 'block';
                    kineticWheel.style.opacity = '0';
                    kineticWheel.style.visibility = 'hidden';
                    if (isMobile) {
                        kineticWheel.style.transform = `translate3d(0, 0, 0)`;
                        const figureGroup = document.getElementById('figure-group');
                        if (figureGroup) figureGroup.style.opacity = '1';
                    } else {
                        kineticWheel.style.transform = `rotate(180deg)`;
                    }
                }
            }
        };

        window.addEventListener('resize', () => {
            cachePositions();
            updateStacking();
        });
        
        if (typeof lenis !== 'undefined') {
            lenis.on('scroll', updateStacking);
        } else {
            window.addEventListener('scroll', updateStacking, { passive: true });
        }
        
        // Initial cache & update after a slight delay to ensure layout is settled
        setTimeout(() => {
            cachePositions();
            updateStacking();
        }, 100);
    }

    // 6. Vector Bridge SVG Animation
    const vectorBridge = document.getElementById('vector-bridge');
    const bridgePath = document.getElementById('bridge-path');
    const bridgePortal = document.getElementById('bridge-portal');
    const portalInner = document.getElementById('portal-inner');
    const svgContainer = document.getElementById('bridge-svg-container');

    if (vectorBridge && bridgePath && bridgePortal && portalInner && svgContainer) {
        const RECT_W = 340;
        const RECT_H = 220;
        let bridgeTop = 0;
        let bridgeTotalLen = 0;
        let bridgeIsMobile = false;
        
        function ease(t) {
            const p1x = 0.76, p1y = 0, p2x = 0.24, p2y = 1;
            const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
            const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
            let s = t;
            for (let i = 0; i < 8; i++) {
                const ex = ((ax * s + bx) * s + cx) * s - t;
                const dx = (3 * ax * s + 2 * bx) * s + cx;
                if (Math.abs(dx) < 1e-7) break;
                s -= ex / dx;
            }
            return ((ay * s + by) * s + cy) * s;
        }

        const measureBridge = () => {
            if (window.innerWidth < 768) {
                vectorBridge.style.height = '';
                vectorBridge.style.minHeight = '';
                return;
            }
            bridgeIsMobile = true; // always use straight vertical line
            bridgeTop = vectorBridge.getBoundingClientRect().top + window.scrollY;

            const vw = window.innerWidth;
            const vh = window.innerHeight;

            const startX = vw / 2;
            const startY = -10;
            const endX = vw / 2;
            const endY = vh / 2 - RECT_H / 2;
            const newPath = `M ${startX},${startY} L ${endX},${endY}`;
            bridgePath.style.strokeWidth = bridgeIsMobile ? '0.8vw' : '10px';

            bridgePath.setAttribute('d', newPath);
            try {
                const len = bridgePath.getTotalLength();
                if (len > 0) bridgeTotalLen = len;
            } catch (e) {}

            const innerHeightPx = portalInner.scrollHeight;
            const totalRequiredHeight = (vh * 1.2) + innerHeightPx;
            vectorBridge.style.height = `${totalRequiredHeight}px`;
            vectorBridge.style.minHeight = `${totalRequiredHeight}px`;
        };

        const updateBridge = () => {
            if (window.innerWidth < 768) return;
            const scroll = window.scrollY;
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const localScroll = scroll - bridgeTop;

            if (bridgeTotalLen > 0) {
                const drawProgress = Math.min(Math.max((localScroll + vh) / vh, 0), 1);
                bridgePath.style.strokeDasharray = `${bridgeTotalLen}`;
                bridgePath.style.strokeDashoffset = `${(bridgeTotalLen - (drawProgress * bridgeTotalLen)).toFixed(1)}`;
            }

            if (localScroll < -vh * 0.35) {
                bridgePortal.style.visibility = 'hidden';
                bridgePortal.style.opacity = '0';
            } else {
                bridgePortal.style.visibility = 'visible';
                bridgePortal.style.opacity = '1';
            }

            if (localScroll <= 0) {
                bridgePortal.style.position = 'absolute';
                bridgePortal.style.top = '50vh';
                bridgePortal.style.transform = `translate3d(0, 0, 0) scale(1)`;
                svgContainer.style.position = 'absolute';
                svgContainer.style.top = '0';
                portalInner.style.transform = `scale(1)`;
                bridgePortal.style.overflow = 'hidden';
            } else {
                const expansionRunway = vh * 1.2;
                const expansionProgress = Math.min(Math.max(localScroll / expansionRunway, 0), 1);

                if (expansionProgress < 1) {
                    bridgePortal.style.position = 'fixed';
                    bridgePortal.style.top = '50%';
                    svgContainer.style.position = 'fixed';
                    svgContainer.style.top = '0';
                    bridgePortal.style.overflow = 'hidden';
                } else {
                    bridgePortal.style.position = 'absolute';
                    bridgePortal.style.top = `${expansionRunway + vh / 2}px`;
                    svgContainer.style.position = 'absolute';
                    svgContainer.style.top = `${expansionRunway}px`;
                    bridgePortal.style.overflow = 'visible';
                }

                const e = ease(expansionProgress);
                const scaleX = 1 + e * (vw / RECT_W - 1);
                const scaleY = 1 + e * (vh / RECT_H - 1);

                bridgePortal.style.transform = `translate3d(0, 0, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
                portalInner.style.transform = `scale(${(1 / scaleX).toFixed(4)}, ${(1 / scaleY).toFixed(4)})`;

                const bOpacity = Math.max(0, 1 - e / 0.5);
                bridgePortal.style.borderWidth = bOpacity < 0.01 ? '0px' : '2px';
                bridgePortal.style.borderColor = `color-mix(in srgb, var(--palette-black) ${(bOpacity * 100).toFixed(0)}%, transparent)`;
            }
        };

        window.addEventListener('resize', measureBridge, { passive: true });
        if (typeof lenis !== 'undefined') {
            lenis.on('scroll', updateBridge);
        } else {
            window.addEventListener('scroll', updateBridge, { passive: true });
        }

        setTimeout(() => {
            measureBridge();
            updateBridge();
        }, 150);
    }

    // 7. Magic Bento Counters
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        ScrollTrigger.create({
            trigger: counter,
            start: "top 80%",
            once: true,
            onEnter: () => {
                const target = parseInt(counter.getAttribute('data-target'));
                gsap.to(counter, {
                    innerHTML: target,
                    duration: 1.2,
                    snap: { innerHTML: 1 },
                    ease: "power2.out"
                });
            }
        });
    });

    // 8. Footer Parallax
    const footerContainer = document.getElementById('footer-container');
    const footer = document.getElementById('footer');
    if (footerContainer && footer) {
        gsap.to(footer, {
            y: "0%",
            ease: "none",
            scrollTrigger: {
                trigger: footerContainer,
                start: "top bottom",
                end: "bottom bottom",
                scrub: true
            }
        });
    }

    // 9. Contact Form
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    const submitBtn = document.getElementById('submit-btn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const data = new URLSearchParams(formData);

            submitBtn.querySelector('span').innerText = "Sending...";
            submitBtn.disabled = true;
            formStatus.classList.add('hidden');

            try {
                // Same URL as original React code
                await fetch("https://script.google.com/macros/s/AKfycbz6_hmNogiRhIAkAdfWU9q0wQb2WdEvswPCTHCd9U-giehtMTgKcmZq2NsQES-XYuxd/exec", {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: data.toString(),
                });
                
                formStatus.innerText = "✓ Message sent! I'll get back to you soon.";
                formStatus.className = "text-sm font-medium mt-2 text-green-600 block";
                contactForm.reset();
            } catch (err) {
                formStatus.innerText = "✗ Something went wrong. Please try again.";
                formStatus.className = "text-sm font-medium mt-2 text-red-500 block";
            } finally {
                submitBtn.querySelector('span').innerText = "Send Message";
                submitBtn.disabled = false;
            }
        });
    }


    // 10. Timeline Animation
    const timelineScrollContainer = document.getElementById('timeline-scroll-container');
    const timelineProgressLine = document.getElementById('timeline-progress-line');
    if (timelineScrollContainer && timelineProgressLine) {
        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: timelineScrollContainer,
                start: "top 10%",
                end: "bottom 50%",
                scrub: true,
            }
        });
        tl.to(timelineProgressLine, { opacity: 1, duration: 0.1 })
          .to(timelineProgressLine, { scaleY: 1, duration: 0.9 }, 0);
    }

})();
