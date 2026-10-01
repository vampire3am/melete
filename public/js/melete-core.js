/**
 * Melete Platform Core JavaScript Engine
 * Features:
 * - Scroll-driven & IntersectionObserver reveal system
 * - 3D Card tilt physics with specular highlight
 * - High-tech real-time Canvas audio visualizer
 * - Number count-up animation engine
 * - Navigation, speech synthesis & session management
 */

// 1. Core Navigation & Active Highlights
document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileDrawerClose = document.getElementById('mobile-drawer-close');

  function openDrawer() {
    if (mobileDrawer) {
      mobileDrawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDrawer() {
    if (mobileDrawer) {
      mobileDrawer.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openDrawer);
  }

  if (mobileDrawerClose) {
    mobileDrawerClose.addEventListener('click', closeDrawer);
  }

  if (mobileDrawer) {
    // Close on backdrop overlay click
    mobileDrawer.addEventListener('click', (e) => {
      if (e.target === mobileDrawer) {
        closeDrawer();
      }
    });

    // Close when navigating via drawer link
    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileDrawer.classList.contains('hidden')) {
        closeDrawer();
      }
    });
  }

  // Active navigation highlight based on current pathname
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('nav a, #mobile-drawer a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html') || (currentPath === 'index.html' && href === 'index.html')) {
      link.classList.add('text-primary', 'font-medium', 'border-b-2', 'border-primary');
      link.classList.remove('text-on-surface-variant');
    }
  });

  // Initialize Advanced Animations Suite
  initScrollReveals();
  initTiltCards();
  initCardSpotlight();
  initMagneticButtons();
  initButtonRipples();
  initTextScramble();
  initCountUpCounters();
  initCanvasVisualizer();
});

// Global exports for dynamic page scripts
window.initTextScramble = initTextScramble;
window.initCountUpCounters = initCountUpCounters;
window.initCardSpotlight = initCardSpotlight;
window.initMagneticButtons = initMagneticButtons;
window.initButtonRipples = initButtonRipples;

// 2. Scroll Reveal Engine (IntersectionObserver with Stagger Support)
function initScrollReveals() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const revealElements = document.querySelectorAll('.reveal-init, .scroll-reveal-item');
  if (revealElements.length === 0) {
    // Auto-tag feature cards, grids, and headings if not manually tagged
    const autoElements = document.querySelectorAll('main section > div, .grid > div, article');
    autoElements.forEach(el => {
      if (!el.classList.contains('no-reveal')) {
        el.classList.add('reveal-init');
      }
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal-init').forEach(el => observer.observe(el));
}

// 3. 3D Card Tilt Physics with Specular Glare Reflection
function initTiltCards() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none) or (pointer: coarse)').matches;
  if (prefersReduced || isTouch) return;

  const cards = document.querySelectorAll('.tilt-card, .group.p-8, .category-block, .specimen-card');
  cards.forEach(card => {
    card.classList.add('tilt-card');
    
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -3.5; // max -3.5 to 3.5 deg
      const rotateY = ((x - centerX) / centerX) * 3.5;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
      card.style.setProperty('--glare-x', `${x}px`);
      card.style.setProperty('--glare-y', `${y}px`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

// 4. Interactive Card Spotlight Engine (Cursor-Tracking Specular Radial Gradient)
function initCardSpotlight() {
  const isTouch = window.matchMedia('(hover: none) or (pointer: coarse)').matches;
  if (isTouch) return;

  const cards = document.querySelectorAll('.spotlight-card, .melete-card, .tilt-card, .category-block, .specimen-card, .faq-item');
  cards.forEach(card => {
    card.classList.add('spotlight-card');
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--spotlight-x', `${x}px`);
      card.style.setProperty('--spotlight-y', `${y}px`);
    });
  });
}

// 5. Magnetic Micro-Interactions (Physics Spring Hover)
function initMagneticButtons() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none) or (pointer: coarse)').matches;
  if (prefersReduced || isTouch) return;

  const buttons = document.querySelectorAll('.btn-magnetic, .btn-primary, .btn-secondary, #next-question-btn, #terminal-mic-btn, #terminal-cam-btn, .pill-magnetic');
  buttons.forEach(btn => {
    btn.classList.add('btn-magnetic');

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) * 0.22;
      const deltaY = (e.clientY - centerY) * 0.22;

      btn.style.transform = `translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px, 0)`;

      // Subtle parallax on inner label/icon
      const inner = btn.querySelector('span, [class*="material-symbols"]');
      if (inner) {
        inner.style.transform = `translate3d(${(deltaX * 0.12).toFixed(2)}px, ${(deltaY * 0.12).toFixed(2)}px, 0)`;
      }
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate3d(0, 0, 0)';
      const inner = btn.querySelector('span, [class*="material-symbols"]');
      if (inner) {
        inner.style.transform = 'translate3d(0, 0, 0)';
      }
    });
  });
}

// 6. Interactive Click Radial Ripple / Shockwave
function initButtonRipples() {
  const interactiveTargets = document.querySelectorAll('.btn-primary, .btn-secondary, button:not(#mobile-menu-btn), .melete-card');
  interactiveTargets.forEach(el => {
    el.classList.add('melete-ripple-container');
    el.addEventListener('pointerdown', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const diameter = Math.max(rect.width, rect.height) * 2;

      const ripple = document.createElement('span');
      ripple.className = 'melete-ripple';
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${x - diameter / 2}px`;
      ripple.style.top = `${y - diameter / 2}px`;

      // Theme-adaptive ripple color
      const isDark = el.classList.contains('btn-primary') || el.classList.contains('bg-primary') || el.classList.contains('bg-on-surface');
      ripple.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(26, 60, 143, 0.18)';

      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  });
}

// 7. Alphanumeric Cybernetic Text Scramble / Decoder Engine
function initTextScramble() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const scrambleElements = document.querySelectorAll('[data-scramble], .scramble-hover');
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%*+~';

  function scrambleText(el) {
    if (el.dataset.scrambling === 'true') return;
    el.dataset.scrambling = 'true';

    const originalText = el.dataset.scrambleOriginal || el.textContent.trim();
    el.dataset.scrambleOriginal = originalText;
    
    let iteration = 0;
    const maxIterations = originalText.length;
    const interval = setInterval(() => {
      el.textContent = originalText
        .split('')
        .map((char, index) => {
          if (char === ' ' || char === '•' || char === '/') return char;
          if (index < iteration) return originalText[index];
          return glyphs[Math.floor(Math.random() * glyphs.length)];
        })
        .join('');

      if (iteration >= maxIterations) {
        clearInterval(interval);
        el.textContent = originalText;
        el.dataset.scrambling = 'false';
      }
      iteration += 1 / 2; // Smooth solve pace
    }, 28);
  }

  scrambleElements.forEach(el => {
    el.addEventListener('mouseenter', () => scrambleText(el));
  });

  // Auto-scramble on viewport entrance
  const scrambleObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        scrambleText(entry.target);
        scrambleObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  scrambleElements.forEach(el => scrambleObserver.observe(el));
}

// 8. Number Count-Up Animation Engine
function initCountUpCounters() {
  const counterElements = document.querySelectorAll('[data-counter]');
  if (counterElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.getAttribute('data-counter')) || 0;
        const suffix = el.getAttribute('data-counter-suffix') || '';
        const duration = 1200; // ms
        const startTime = performance.now();

        function updateCount(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease Out Quad
          const easeProgress = 1 - (1 - progress) * (1 - progress);
          const current = Math.floor(easeProgress * target);
          el.textContent = current + suffix;

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            el.textContent = target + suffix;
          }
        }

        requestAnimationFrame(updateCount);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counterElements.forEach(el => observer.observe(el));
}

// 9. Canvas Real-Time Audio Spectrum, Dual Wave & Particle Visualizer
function initCanvasVisualizer() {
  const canvas = document.getElementById('live-waveform-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationId;
  let phase = 0;
  let isVisible = true;

  function resize() {
    canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));

  // Pause when offscreen to save energy
  const visObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
  }, { threshold: 0.05 });
  visObserver.observe(canvas);

  const numBars = 36;
  const barHeights = Array(numBars).fill(8);
  const targetHeights = Array(numBars).fill(8);

  // Voice Energy Micro-Particles
  const particles = [];
  const maxParticles = 24;

  function spawnParticle(x, y) {
    if (particles.length >= maxParticles) return;
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(Math.random() * 1.2 + 0.5),
      radius: Math.random() * 1.5 + 0.8,
      alpha: 0.75,
      life: 1
    });
  }

  function draw() {
    if (!isVisible) {
      animationId = requestAnimationFrame(draw);
      return;
    }

    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const isMuted = window.meleteIsMicMuted || false;

    // Update target heights with organic voice frequencies
    if (!isMuted) {
      phase += 0.06;
      for (let i = 0; i < numBars; i++) {
        if (Math.random() < 0.3) {
          const factor = Math.sin((i / numBars) * Math.PI); // Arc peak near center
          targetHeights[i] = Math.sin(phase + i * 0.35) * (h * 0.32 * factor) + (h * 0.35 * factor) + (Math.random() * 6) + 4;
        }
      }
    } else {
      for (let i = 0; i < numBars; i++) targetHeights[i] = 4;
    }

    // Smooth lerp
    for (let i = 0; i < numBars; i++) {
      barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.22;
    }

    // 1. Draw Rounded Spectrum Equalizer Bars
    const barWidth = 3;
    const gap = (w - (numBars * barWidth)) / (numBars - 1);
    const centerY = h / 2;

    for (let i = 0; i < numBars; i++) {
      const bh = barHeights[i];
      const x = i * (barWidth + gap);
      const y = centerY - bh / 2;

      // Color gradation (Royal Blue accent at center, dark ink at edges)
      const distFromCenter = Math.abs(i - numBars / 2) / (numBars / 2);
      ctx.fillStyle = distFromCenter < 0.45 && !isMuted ? '#1A3C8F' : '#222222';

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, bh, 1.5);
      ctx.fill();

      // Occasionally emit acoustic particles from tallest bars
      if (!isMuted && bh > h * 0.45 && Math.random() < 0.08) {
        spawnParticle(x + barWidth / 2, y);
      }
    }

    // 2. Harmonic Dual Sine Waves
    // Primary Wave (Royal Blue)
    ctx.beginPath();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = isMuted ? 'rgba(0, 0, 0, 0.15)' : 'rgba(26, 60, 143, 0.55)';
    for (let x = 0; x <= w; x += 3) {
      const waveY = centerY + Math.sin(x * 0.028 + phase * 1.4) * (isMuted ? 0 : 7);
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();

    // Secondary Ghost Harmonic Wave (Charcoal Tint)
    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = isMuted ? 'transparent' : 'rgba(13, 42, 96, 0.22)';
    for (let x = 0; x <= w; x += 3) {
      const waveY = centerY + Math.cos(x * 0.022 - phase * 1.1) * (isMuted ? 0 : 5);
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();

    // 3. Acoustic Micro-Particles Update & Render
    for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
      const p = particles[pIdx];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;
      p.alpha = Math.max(p.life * 0.7, 0);

      if (p.life <= 0 || p.y < 0) {
        particles.splice(pIdx, 1);
        continue;
      }

      ctx.fillStyle = `rgba(26, 60, 143, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    animationId = requestAnimationFrame(draw);
  }

  draw();
}

// 6. Storage Helpers for Interview Practice Sessions
const MeleteStorage = {
  saveSession(sessionData) {
    sessionStorage.setItem('melete_last_session', JSON.stringify(sessionData));
  },
  getSession() {
    const data = sessionStorage.getItem('melete_last_session');
    if (data) {
      try { return JSON.parse(data); } catch (e) { return null; }
    }
    return null;
  },
  getDefaultSession() {
    return null;
  }
};
