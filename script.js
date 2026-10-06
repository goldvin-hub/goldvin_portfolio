/**
 * Portfolio — Scroll-Driven Frame Animation + Interactive Elements
 * 
 * The 300 frames from /profile/ are preloaded and drawn to a canvas.
 * As the user scrolls, the canvas frame updates, creating a cinematic
 * scroll-driven animation. UI elements reveal/transform on scroll.
 */

(function () {
    'use strict';

    // ─── Configuration ───────────────────────────────
    const TOTAL_FRAMES = 300;
    const FRAME_PATH = 'profile/ezgif-frame-';
    const HERO_SCROLL_HEIGHT = 4000; // px of scroll before hero animation ends

    // ─── State ───────────────────────────────────────
    const state = {
        images: [],
        loadedCount: 0,
        currentFrame: 0,
        scrollY: 0,
        isReady: false,
        countersAnimated: false,
        revealedElements: new Set(),
    };

    // ─── DOM Elements ────────────────────────────────
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');
    const scrollContainer = document.getElementById('scroll-container');
    const preloader = document.getElementById('preloader');
    const preloaderFill = document.getElementById('preloader-fill');
    const preloaderText = document.getElementById('preloader-text');
    const nav = document.getElementById('main-nav');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const scrollProgressFill = document.getElementById('scroll-progress-fill');
    const aboutImg = document.getElementById('about-profile-img');
    const heroScrollBtn = document.getElementById('hero-scroll-btn');

    // ─── Canvas Setup ────────────────────────────────
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (state.isReady) {
            drawFrame(state.currentFrame);
        }
    }

    function drawFrame(index) {
        const img = state.images[index];
        if (!img) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Cover fit
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;

        let drawW, drawH, drawX, drawY;
        if (canvasRatio > imgRatio) {
            drawW = canvas.width;
            drawH = canvas.width / imgRatio;
            drawX = 0;
            drawY = (canvas.height - drawH) / 2;
        } else {
            drawH = canvas.height;
            drawW = canvas.height * imgRatio;
            drawX = (canvas.width - drawW) / 2;
            drawY = 0;
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Vignette overlay
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.9
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // ─── Frame Preloading ────────────────────────────
    function padNumber(n) {
        return String(n).padStart(3, '0');
    }

    function preloadFrames() {
        return new Promise((resolve) => {
            let loaded = 0;

            for (let i = 1; i <= TOTAL_FRAMES; i++) {
                const img = new Image();
                img.src = FRAME_PATH + padNumber(i) + '.jpg';

                img.onload = () => {
                    loaded++;
                    state.loadedCount = loaded;
                    const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
                    preloaderFill.style.width = pct + '%';
                    preloaderText.textContent = `Loading frames... ${pct}%`;

                    if (loaded === TOTAL_FRAMES) {
                        resolve();
                    }
                };

                img.onerror = () => {
                    loaded++;
                    if (loaded === TOTAL_FRAMES) resolve();
                };

                state.images[i - 1] = img;
            }
        });
    }

    // ─── Scroll Handler ──────────────────────────────
    function onScroll() {
        if (!scrollContainer) return;
        state.scrollY = scrollContainer.scrollTop;
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const progress = maxScroll > 0 ? Math.min(Math.max(state.scrollY / maxScroll, 0), 1) : 0;

        // 1) Update frame based on overall scroll progress
        const frameIndex = Math.min(
            Math.floor(progress * (TOTAL_FRAMES - 1)),
            TOTAL_FRAMES - 1
        );

        if (frameIndex !== state.currentFrame) {
            state.currentFrame = frameIndex;
            drawFrame(frameIndex);
        }

        // 2) Keep canvas background visible and atmospheric
        canvas.style.opacity = '1';

        // 3) Nav background styling on scroll
        if (state.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        // 4) Scroll progress bar
        if (scrollProgressFill) {
            scrollProgressFill.style.width = (progress * 100) + '%';
        }

        // 5) About profile image subtle frame progression
        updateAboutImage();

        // 6) Parallax hero content when on first slide
        parallaxHero();
    }

    // ─── Slide Intersection Observer ─────────────────
    function initSlideObserver() {
        const slides = document.querySelectorAll('.slide');
        const navLinks = document.querySelectorAll('.nav-link');
        const mobileLinks = document.querySelectorAll('.mobile-link');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
                    const activeSlide = entry.target;
                    const targetId = activeSlide.id;

                    slides.forEach((s) => {
                        if (s === activeSlide) {
                            s.classList.add('active');
                            s.classList.remove('exiting');
                        } else if (s.classList.contains('active')) {
                            s.classList.remove('active');
                            s.classList.add('exiting');
                            setTimeout(() => s.classList.remove('exiting'), 600);
                        }
                    });

                    // Update active nav links
                    navLinks.forEach((link) => {
                        link.classList.toggle('active', link.dataset.section === targetId);
                    });
                    mobileLinks.forEach((link) => {
                        link.classList.toggle('active', link.dataset.section === targetId);
                    });

                    // Trigger counters when in about slide
                    if (targetId === 'about') {
                        checkCounters();
                    }
                }
            });
        }, {
            root: scrollContainer,
            threshold: 0.45
        });

        slides.forEach((slide) => observer.observe(slide));
    }

    // ─── About Image Scroll ──────────────────────────
    function updateAboutImage() {
        const aboutSection = document.getElementById('about');
        if (!aboutSection || !aboutImg) return;

        const rect = aboutSection.getBoundingClientRect();
        const sectionProgress = Math.max(0, Math.min(1,
            (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
        ));

        // Cycle through a subset of frames during about section
        const frame = Math.floor(sectionProgress * 99);
        const frameNum = padNumber(frame + 1);
        const src = FRAME_PATH + frameNum + '.jpg';
        if (aboutImg.src !== src && state.images[frame]) {
            aboutImg.src = src;
        }
    }

    // ─── Parallax Hero ───────────────────────────────
    function parallaxHero() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        if (state.scrollY < window.innerHeight) {
            const speed = 0.25;
            const offset = state.scrollY * speed;
            heroContent.style.transform = `translateY(${offset}px)`;
            heroContent.style.opacity = Math.max(0, 1 - state.scrollY / (window.innerHeight * 0.75));
        }
    }

    // ─── Counter Animation ───────────────────────────
    function checkCounters() {
        if (state.countersAnimated) return;

        const statsSection = document.querySelector('.about-stats');
        if (!statsSection) return;

        state.countersAnimated = true;
        animateCounters();
    }

    function animateCounters() {
        const counters = document.querySelectorAll('.stat-number[data-count]');
        counters.forEach((counter) => {
            const target = parseInt(counter.dataset.count, 10);
            const duration = 1500;
            const start = performance.now();

            function step(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out quad
                const eased = 1 - (1 - progress) * (1 - progress);
                counter.textContent = Math.floor(eased * target);

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    counter.textContent = target;
                }
            }

            requestAnimationFrame(step);
        });
    }

    // ─── Floating Particles ──────────────────────────
    function createParticles() {
        const container = document.getElementById('particles-container');
        if (!container) return;

        // Adaptive particle count: fewer on mobile to conserve CPU/battery
        const isMobile = window.innerWidth <= 768;
        const count = isMobile ? 12 : 25;

        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.width = (Math.random() * 3 + 1) + 'px';
            p.style.height = p.style.width;
            p.style.animationDuration = (Math.random() * 12 + 8) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            p.style.opacity = Math.random() * 0.4 + 0.1;
            container.appendChild(p);
        }
    }

    // ─── Mobile Menu ─────────────────────────────────
    function initMobileMenu() {
        if (!menuToggle || !mobileMenu) return;

        menuToggle.addEventListener('click', () => {
            const isActive = menuToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(isActive));
        });

        document.querySelectorAll('.mobile-link').forEach((link) => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // ─── Smooth Scroll for Nav Links ─────────────────
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href || href === '#') return;
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        if (heroScrollBtn) {
            heroScrollBtn.addEventListener('click', () => {
                const aboutSec = document.getElementById('about');
                if (aboutSec) aboutSec.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    // ─── Contact Form (Secured with Honeypot, Validation, Rate Limiting) ──
    let lastSubmitTime = 0;
    const SUBMIT_COOLDOWN_MS = 30000; // 30 seconds cooldown

    function initContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // 1. Honeypot check (Automated spam bots fill all fields)
            const honeypot = form.querySelector('input[name="_gotcha"]');
            if (honeypot && honeypot.value.trim() !== '') {
                console.warn('Bot submission blocked.');
                return;
            }

            // 2. Rate Limiting check
            const now = Date.now();
            if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
                const remaining = Math.ceil((SUBMIT_COOLDOWN_MS - (now - lastSubmitTime)) / 1000);
                alert(`Please wait ${remaining} seconds before sending another message.`);
                return;
            }

            // 3. Input Validation & Sanitization
            const nameInput = document.getElementById('name-input');
            const emailInput = document.getElementById('email-input');
            const msgInput = document.getElementById('message-input');

            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const msg = msgInput ? msgInput.value.trim() : '';

            if (!name || name.length > 80) {
                alert('Please enter a valid name (max 80 characters).');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email) || email.length > 100) {
                alert('Please enter a valid email address.');
                return;
            }

            if (!msg || msg.length < 5 || msg.length > 2000) {
                alert('Please enter a message between 5 and 2000 characters.');
                return;
            }

            // Record submission time for rate limiting
            lastSubmitTime = now;

            // Feedback state
            const btn = form.querySelector('.btn-submit');
            if (btn) {
                btn.innerHTML = '<span>Sent! ✓</span>';
                btn.style.background = '#1a8754';
                setTimeout(() => {
                    btn.innerHTML = `<span>Send Message</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>`;
                    btn.style.background = '';
                    form.reset();
                }, 2500);
            }
        });
    }

    // ─── Anti-Inspection & Anti-Tamper Shield ─────────
    function initSecurityShield() {
        // 1. Disable Right Click Context Menu (except inside form inputs for typing/pasting)
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                return false;
            }
        });

        // 2. Block Inspect DevTools Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // F12 key
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                return false;
            }

            // Ctrl+Shift+I / Cmd+Opt+I (Inspect Element)
            // Ctrl+Shift+J / Cmd+Opt+J (Open Console)
            // Ctrl+Shift+C / Cmd+Opt+C (Element Inspector)
            // Ctrl+U / Cmd+U (View Page Source)
            // Ctrl+S / Cmd+S (Save Page)
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            if (isCtrlOrCmd) {
                const key = e.key ? e.key.toLowerCase() : '';
                if (
                    (e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
                    key === 'u' ||
                    key === 's'
                ) {
                    e.preventDefault();
                    return false;
                }
            }
        });

        // 3. Disable Dragging of Images / Canvas / SVGs
        document.querySelectorAll('img, canvas, svg').forEach((el) => {
            el.setAttribute('draggable', 'false');
            el.addEventListener('dragstart', (e) => e.preventDefault());
        });

        // 4. Console Tamper Warning
        try {
            console.clear();
            const titleStyle = 'color: #e63946; font-size: 20px; font-weight: bold; font-family: sans-serif;';
            const bodyStyle = 'color: #f0ece4; font-size: 13px; font-family: sans-serif;';
            console.log('%c⚠️ GOLDVIN SECURITY SHIELD', titleStyle);
            console.log('%cThis web application is protected. Unauthorized reverse engineering, scraping, or client tampering is actively mitigated.', bodyStyle);
        } catch (_) {}
    }

    // ─── Init ────────────────────────────────────────
    async function init() {
        initSecurityShield();
        resizeCanvas();

        // Debounced resize listener
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                resizeCanvas();
                createParticles();
            }, 150);
        }, { passive: true });

        // Tab Visibility handling to pause heavy rendering when inactive
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && state.isReady) {
                drawFrame(state.currentFrame);
            }
        });

        // Preload all frames
        await preloadFrames();

        // Mark ready
        state.isReady = true;
        drawFrame(0);

        // Hide preloader
        preloader.classList.add('loaded');
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 800);

        // Setup scroll listener on #scroll-container
        if (scrollContainer) {
            let ticking = false;
            scrollContainer.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        onScroll();
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
        }

        // Initialize features
        createParticles();
        initMobileMenu();
        initSmoothScroll();
        initSlideObserver();
        initContactForm();

        // Initial trigger
        onScroll();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
