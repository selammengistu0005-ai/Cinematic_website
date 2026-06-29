/* ═══════════════════════════════════════
   CINEMATIC SCROLL — MAIN JS
═══════════════════════════════════════ */

(function () {

  /* ── DOM refs ── */
  const loader      = document.getElementById('loader');
  const loaderFill  = document.getElementById('loaderBarFill');
  const loaderLabel = document.getElementById('loaderLabel');
  const scenes      = Array.from(document.querySelectorAll('.scene'));
  const cta         = document.getElementById('cta');
  const scrollHint  = document.getElementById('scroll-hint');
  const imageUrls   = scenes.map(s => {
    const bg = s.querySelector('.scene-image').style.backgroundImage;
    return bg.slice(5, -2);
  });

  /* ── State ── */
  let current        = 0;
  let isTransitioning = false;
  let loadedCount    = 0;
  const totalImages  = imageUrls.length;
  let journeyStarted = false;

  /* ── Wheel: one-scroll-one-scene gate ── */
  let wheelLocked    = false;
  let wheelAccum     = 0;
  let wheelTimer     = null;
  const WHEEL_THRESHOLD = 20;

  /* ════════════════════════════════════
     1. IMAGE PRELOADER
  ════════════════════════════════════ */
  const labels = [
    'Preparing your journey',
    'Curating the light',
    'Setting the scene',
    'Almost there',
    'Welcome'
  ];

  function getLabel(progress) {
    if (progress < 0.25) return labels[0];
    if (progress < 0.50) return labels[1];
    if (progress < 0.75) return labels[2];
    if (progress < 0.95) return labels[3];
    return labels[4];
  }

  function preloadImages() {
    imageUrls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        const progress = loadedCount / totalImages;
        loaderFill.style.width = (progress * 100) + '%';
        loaderLabel.textContent = getLabel(progress);
        if (loadedCount === totalImages) onAllLoaded();
      };
      img.src = url;
    });
  }

  function onAllLoaded() {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => {
        loader.style.display = 'none';
        startExperience();
      }, 1200);
    }, 600);
  }

  /* ════════════════════════════════════
     2. START EXPERIENCE
  ════════════════════════════════════ */
  function startExperience() {
    journeyStarted = true;
    scenes[0].classList.add('active');
    setTimeout(() => {
      scrollHint.classList.add('visible');
    }, 1800);
  }

  /* ════════════════════════════════════
     3. TRANSITION ENGINE
  ════════════════════════════════════ */
  function goTo(next) {
    if (isTransitioning) return;
    if (next === current && !isCta()) return;

    isTransitioning = true;

    /* hide scroll hint on first move */
    if (scrollHint.classList.contains('visible')) {
      scrollHint.classList.remove('visible');
      scrollHint.classList.add('hidden');
    }

    /* going to CTA */
    if (next >= scenes.length) {
      transitionToCta();
      return;
    }

    /* going back from CTA */
    if (isCta()) {
      cta.classList.remove('active');
      setTimeout(() => {
        scenes[current].classList.add('active');
        isTransitioning = false;
      }, 300);
      return;
    }

    const outgoing = scenes[current];
    const incoming = scenes[next];

    /* 1. text exits immediately */
    outgoing.classList.add('leaving');

    /* 2. prime incoming */
    incoming.classList.add('entering');
    incoming.style.visibility = 'visible';

    /* 3. crossfade starts after short pause */
    setTimeout(() => {
      outgoing.classList.remove('active');
      incoming.classList.add('active');

      /* 4. update current index early */
      current = next;

      /* 5. unlock transition — but keep wheelLocked until
            the user physically lifts and re-scrolls */
      setTimeout(() => {
        isTransitioning = false;
      }, 250);

      /* 6. clean up outgoing */
      setTimeout(() => {
        outgoing.classList.remove('leaving');
        outgoing.style.visibility = '';
      }, 400);

      /* 7. clean up entering */
      setTimeout(() => {
        incoming.classList.remove('entering');
      }, 900);

    }, 150);
  }

  function goBack() {
    if (isTransitioning) return;

    if (isCta()) {
      isTransitioning = true;
      cta.classList.remove('active');
      setTimeout(() => {
        scenes[current].classList.add('active');
        isTransitioning = false;
      }, 300);
      return;
    }

    if (current === 0) return;
    goTo(current - 1);
  }

  function isCta() {
    return cta.classList.contains('active');
  }

  function transitionToCta() {
    const outgoing = scenes[current];
    outgoing.classList.add('leaving');

    setTimeout(() => {
      outgoing.classList.remove('active');
      cta.classList.add('active');

      setTimeout(() => {
        isTransitioning = false;
      }, 300);

      setTimeout(() => {
        outgoing.classList.remove('leaving');
        outgoing.style.visibility = '';
      }, 400);

    }, 150);
  }

  /* ════════════════════════════════════
     4. INPUT — WHEEL (desktop)
     One scroll gesture = one scene.
     wheelLocked stays true until the
     user's scroll momentum fully stops,
     then resets — requiring a fresh
     deliberate scroll for the next scene.
  ════════════════════════════════════ */
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!journeyStarted) return;

    /* if locked, keep draining the timer but don't accumulate */
    if (wheelLocked) {
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelLocked = false;
        wheelAccum  = 0;
      }, 400);
      return;
    }

    wheelAccum += e.deltaY;
    clearTimeout(wheelTimer);

    if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
      const dir = wheelAccum > 0 ? 1 : -1;

      /* lock immediately so continued momentum is ignored */
      wheelLocked = true;
      wheelAccum  = 0;

      if (dir > 0) goTo(isCta() ? scenes.length : current + 1);
      else         goBack();

      /* unlock only after scroll momentum has fully died */
      wheelTimer = setTimeout(() => {
        wheelLocked = false;
      }, 400);
    } else {
      /* accumulation window — reset if user pauses */
      wheelTimer = setTimeout(() => { wheelAccum = 0; }, 200);
    }

  }, { passive: false });

  /* ════════════════════════════════════
     5. INPUT — TOUCH (mobile)
     One swipe gesture = one scene.
  ════════════════════════════════════ */
  let touchStartY  = null;
  let touchStartX  = null;
  let touchHandled = false;
  const SWIPE_THRESHOLD = 40;

  window.addEventListener('touchstart', (e) => {
    touchStartY  = e.touches[0].clientY;
    touchStartX  = e.touches[0].clientX;
    touchHandled = false;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (touchStartY === null || !journeyStarted || touchHandled) return;

    const dy = touchStartY - e.changedTouches[0].clientY;
    const dx = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_THRESHOLD) {
      touchHandled = true;
      if (dy > 0) goTo(isCta() ? scenes.length : current + 1);
      else        goBack();
    }

    touchStartY = null;
    touchStartX = null;
  }, { passive: true });

  /* ════════════════════════════════════
     6. INPUT — KEYBOARD
  ════════════════════════════════════ */
  window.addEventListener('keydown', (e) => {
    if (!journeyStarted) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      goTo(isCta() ? scenes.length : current + 1);
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      goBack();
    }
  });

  /* ════════════════════════════════════
     7. BOOT
  ════════════════════════════════════ */
  preloadImages();

})();
