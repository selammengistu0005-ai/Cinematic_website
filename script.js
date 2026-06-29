/* =========================================================
   IRON FORGE — MAIN JS
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initDotField();
  initBounceCards();
  initContactForm();
});

/* =========================================================
   NAV TOGGLE (mobile menu)
   ========================================================= */
function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.classList.toggle('active');
  });

  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('active');
    });
  });
}

/* =========================================================
   DOT FIELD BACKGROUND
   Vanilla JS port of the DotField React component.
   Renders a canvas of dots that bulge away from the cursor,
   plus an SVG glow that follows the mouse.
   ========================================================= */
function initDotField() {
  const container = document.querySelector('.hero-bg');
  if (!container) return;

  const TWO_PI = Math.PI * 2;

  const options = {
    dotRadius: 3,
    dotSpacing: 22,
    cursorRadius: 500,
    cursorForce: 0.1,
    bulgeOnly: true,
    bulgeStrength: 67,
    glowRadius: 160,
    sparkle: false,
    waveAmplitude: 0,
    gradientFrom: 'rgba(168, 85, 247, 0.9)',
    gradientTo: 'rgba(180, 151, 207, 0.7)',
    glowColor: '#120F17',
  };

  // Build canvas
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });

  // Build SVG glow
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.style.position = 'absolute';
  svg.style.inset = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';

  const glowId = `dot-field-glow-${Math.random().toString(36).slice(2, 9)}`;
  const defs = document.createElementNS(svgNS, 'defs');
  const radialGradient = document.createElementNS(svgNS, 'radialGradient');
  radialGradient.setAttribute('id', glowId);
  const stop1 = document.createElementNS(svgNS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', options.glowColor);
  const stop2 = document.createElementNS(svgNS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('stop-color', 'transparent');
  radialGradient.appendChild(stop1);
  radialGradient.appendChild(stop2);
  defs.appendChild(radialGradient);
  svg.appendChild(defs);

  const glowCircle = document.createElementNS(svgNS, 'circle');
  glowCircle.setAttribute('cx', '-9999');
  glowCircle.setAttribute('cy', '-9999');
  glowCircle.setAttribute('r', options.glowRadius);
  glowCircle.setAttribute('fill', `url(#${glowId})`);
  glowCircle.style.opacity = '0';
  glowCircle.style.willChange = 'opacity';
  svg.appendChild(glowCircle);

  container.appendChild(svg);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let dots = [];
  let size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
  const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
  let glowOpacity = 0;
  let engagement = 0;
  let frameCount = 0;
  let resizeTimer;

  function buildDots(w, h) {
    const step = options.dotRadius + options.dotSpacing;
    const cols = Math.floor(w / step);
    const rows = Math.floor(h / step);
    const padX = (w % step) / 2;
    const padY = (h % step) / 2;
    const arr = new Array(rows * cols);
    let idx = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ax = padX + col * step + step / 2;
        const ay = padY + row * step + step / 2;
        arr[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
      }
    }
    dots = arr;
  }

  function doResize() {
    const w = window.innerWidth;
    const h = document.body.scrollHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    size = {
      w, h,
      offsetX: 0,
      offsetY: 0,
    };

    buildDots(w, h);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(doResize, 100);
  }

  function onMouseMove(e) {
    mouse.x = e.pageX - size.offsetX;
    mouse.y = e.pageY - size.offsetY;
  }

  function updateMouseSpeed() {
    const dx = mouse.prevX - mouse.x;
    const dy = mouse.prevY - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    mouse.speed += (dist - mouse.speed) * 0.5;
    if (mouse.speed < 0.001) mouse.speed = 0;
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
  }

  function tick() {
    frameCount++;
    const { w, h } = size;
    const len = dots.length;
    const t = frameCount * 0.02;

    const targetEngagement = Math.min(mouse.speed / 5, 1);
    engagement += (targetEngagement - engagement) * 0.06;
    if (engagement < 0.001) engagement = 0;

    glowOpacity += (engagement - glowOpacity) * 0.08;

    glowCircle.setAttribute('cx', mouse.x);
    glowCircle.setAttribute('cy', mouse.y);
    glowCircle.style.opacity = glowOpacity;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, options.gradientFrom);
    grad.addColorStop(1, options.gradientTo);
    ctx.fillStyle = grad;

    const cr = options.cursorRadius;
    const crSq = cr * cr;
    const rad = options.dotRadius / 2;
    const isBulge = options.bulgeOnly;

    ctx.beginPath();

    for (let i = 0; i < len; i++) {
      const d = dots[i];
      const dx = mouse.x - d.ax;
      const dy = mouse.y - d.ay;
      const distSq = dx * dx + dy * dy;

      if (distSq < crSq && engagement > 0.01) {
        const dist = Math.sqrt(distSq);
        if (isBulge) {
          const tt = 1 - dist / cr;
          const push = tt * tt * options.bulgeStrength * engagement;
          const angle = Math.atan2(dy, dx);
          d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
          d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
        } else {
          const angle = Math.atan2(dy, dx);
          const move = (500 / dist) * (mouse.speed * options.cursorForce);
          d.vx += Math.cos(angle) * -move;
          d.vy += Math.sin(angle) * -move;
        }
      } else if (isBulge) {
        d.sx += (d.ax - d.sx) * 0.1;
        d.sy += (d.ay - d.sy) * 0.1;
      }

      if (!isBulge) {
        d.vx *= 0.9;
        d.vy *= 0.9;
        d.x = d.ax + d.vx;
        d.y = d.ay + d.vy;
        d.sx += (d.x - d.sx) * 0.1;
        d.sy += (d.y - d.sy) * 0.1;
      }

      let drawX = d.sx;
      let drawY = d.sy;
      if (options.waveAmplitude > 0) {
        drawY += Math.sin(d.ax * 0.03 + t) * options.waveAmplitude;
        drawX += Math.cos(d.ay * 0.03 + t * 0.7) * options.waveAmplitude * 0.5;
      }

      if (options.sparkle) {
        const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
        if ((hash % 100) < 3) {
          ctx.moveTo(drawX + rad * 1.8, drawY);
          ctx.arc(drawX, drawY, rad * 1.8, 0, TWO_PI);
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      } else {
        ctx.moveTo(drawX + rad, drawY);
        ctx.arc(drawX, drawY, rad, 0, TWO_PI);
      }
    }

    ctx.fill();
    requestAnimationFrame(tick);
  }

  doResize();
  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  setInterval(updateMouseSpeed, 20);
  requestAnimationFrame(tick);
}

/* =========================================================
   BOUNCE CARDS (Gallery — Card 2)
   Vanilla JS port using GSAP: scale-in on load,
   optional hover-push between siblings.
   ========================================================= */
function initBounceCards() {
  const container = document.querySelector('.gallery-bounce');
  if (!container || typeof gsap === 'undefined') return;

  const cards = Array.from(container.querySelectorAll('.card'));
  const enableHover = true;

  const transformStyles = [
    'rotate(5deg) translate(-150px)',
    'rotate(0deg) translate(-70px)',
    'rotate(-5deg)',
    'rotate(5deg) translate(70px)',
    'rotate(-5deg) translate(150px)'
  ];

  // Entrance animation
  gsap.from(
    cards,
    {
      scale: 0,
      stagger: 0.08,
      ease: 'elastic.out(1, 0.5)',
      delay: 1
    }
  );

  if (!enableHover) return;

  function getNoRotationTransform(transformStr) {
    const hasRotate = /rotate\([\s\S]*?\)/.test(transformStr);
    if (hasRotate) return transformStr.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)');
    if (transformStr === 'none') return 'rotate(0deg)';
    return `${transformStr} rotate(0deg)`;
  }

  function getPushedTransform(baseTransform, offsetX) {
    const translateRegex = /translate\(([-0-9.]+)px\)/;
    const match = baseTransform.match(translateRegex);
    if (match) {
      const currentX = parseFloat(match[1]);
      const newX = currentX + offsetX;
      return baseTransform.replace(translateRegex, `translate(${newX}px)`);
    }
    return baseTransform === 'none' ? `translate(${offsetX}px)` : `${baseTransform} translate(${offsetX}px)`;
  }

  function pushSiblings(hoveredIdx) {
    cards.forEach((card, i) => {
      gsap.killTweensOf(card);
      const baseTransform = transformStyles[i] || 'none';
      if (i === hoveredIdx) {
        gsap.to(card, {
          transform: getNoRotationTransform(baseTransform),
          duration: 0.4,
          ease: 'back.out(1.4)',
          overwrite: 'auto'
        });
      } else {
        const offsetX = i < hoveredIdx ? -160 : 160;
        const distance = Math.abs(hoveredIdx - i);
        gsap.to(card, {
          transform: getPushedTransform(baseTransform, offsetX),
          duration: 0.4,
          ease: 'back.out(1.4)',
          delay: distance * 0.05,
          overwrite: 'auto'
        });
      }
    });
  }

  function resetSiblings() {
    cards.forEach((card, i) => {
      gsap.killTweensOf(card);
      gsap.to(card, {
        transform: transformStyles[i] || 'none',
        duration: 0.4,
        ease: 'back.out(1.4)',
        overwrite: 'auto'
      });
    });
  }

  cards.forEach((card, idx) => {
    card.addEventListener('mouseenter', () => pushSiblings(idx));
    card.addEventListener('mouseleave', resetSiblings);
  });
}

/* =========================================================
   CONTACT FORM
   ========================================================= */
function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // TODO: hook up to backend / email service
    alert('Thanks! Your message has been sent. We will get back to you soon.');
    form.reset();
  });
}