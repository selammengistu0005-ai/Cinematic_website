/* ═══════════════════════════════════════
   CINEMATIC SCROLL — MAIN JS
═══════════════════════════════════════ */

(function () {

  /* ── DOM refs ── */
  const loader        = document.getElementById('loader');
  const loaderFill    = document.getElementById('loaderBarFill');
  const loaderLabel   = document.getElementById('loaderLabel');
  const scenes        = Array.from(document.querySelectorAll('.scene'));
  const cta           = document.getElementById('cta');
  const scrollHint    = document.getElementById('scroll-hint');
  const imageUrls     = scenes.map(s => {
    const bg = s.querySelector('.scene-image').style.backgroundImage;
    return bg.slice(5, -2);
  });

  /* ── State ── */
  let current       = 0;
  let isTransitioning = false;
  let loadedCount   = 0;
  let totalImages   = imageUrls.length;
  let journeyStarted = false;

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
        if (loadedCount === totalImages) {
          onAllLoaded();
        }
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

    /* hide scroll hint after first move */
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
      }, 800);
      return;
    }

    const outgoing = scenes[current];
    const incoming = scenes[next];

    /* 1. mark outgoing as leaving → text fades out fast */
    outgoing.classList.add('leaving');

    /* 2. prime incoming (blur, scale reset) */
    incoming.classList.add('entering');
    incoming.style.visibility = 'visible';

    /* 3. after text has left (~400ms), crossfade images */
    setTimeout(() => {
      outgoing.classList.remove('active');
      incoming.classList.add('active');

      /* 4. after crossfade begins, clear leaving state */
      setTimeout(() => {
        outgoing.classList.remove('leaving');
        outgoing.style.visibility = '';

        /* 5. clear entering so zoom resets for re-entry */
        setTimeout(() => {
          incoming.classList.remove('entering');
          current = next;
          isTransitioning = false;
        }, 1200);

      }, 600);
    }, 420);
  }

  function goBack() {
    if (isTransitioning) return;

    if (isCta()) {
      /* from CTA back to scene 9 */
      isTransitioning = true;
      cta.classList.remove('active');
      setTimeout(() => {
        scenes[current].classList.add('active');
        isTransitioning = false;
      }, 900);
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
        outgoing.classList.remove('leaving');
        outgoing.style.visibility = '';
        isTransitioning = false;
      }, 1400);
    }, 420);
  }

  /* ════════════════════════════════════
     4. INPUT — WHEEL (desktop)
  ════════════════════════════════════ */
  let wheelAccum  = 0;
  let wheelTimer  = null;
  const WHEEL_THRESHOLD = 60;

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!journeyStarted) return;

    wheelAccum += e.deltaY;
    clearTimeout(wheelTimer);

    if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      if (dir > 0) goTo(isCta() ? scenes.length : current + 1);
      else         goBack();
    }

    wheelTimer = setTimeout(() => { wheelAccum = 0; }, 300);
  }, { passive: false });

  /* ════════════════════════════════════
     5. INPUT — TOUCH (mobile)
  ════════════════════════════════════ */
  let touchStartY = null;
  let touchStartX = null;
  const SWIPE_THRESHOLD = 50;

  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (touchStartY === null || !journeyStarted) return;

    const dy = touchStartY - e.changedTouches[0].clientY;
    const dx = touchStartX - e.changedTouches[0].clientX;

    /* only act on predominantly vertical swipes */
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_THRESHOLD) {
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
