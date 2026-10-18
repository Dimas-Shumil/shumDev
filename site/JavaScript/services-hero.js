// Та же GSAP intro-схема, что у главной и страницы «О компании».
(() => {
  const hero = document.querySelector('.services-hero');
  if (!hero) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  hero.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!reducedMotion.matches) return;
      const target = document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerHeight, behavior: 'instant' });
    }, true);
  });

  function initServicesHeroIntro() {
    const hero = document.querySelector('.services-hero');
  
    if (!hero || !window.gsap) return;
  
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  
    if (reducedMotion) return;
  
    const background = hero.querySelector('.services-hero__bg');
    const overlay = hero.querySelector('.services-hero__overlay');
    const badge = hero.querySelector('.services-hero__badge');
    const titleLines = hero.querySelectorAll('.services-hero__title-line');
    const description = hero.querySelector('.services-hero__description');
    const buttons = hero.querySelectorAll('.services-hero__actions a');
    const features = hero.querySelectorAll('.services-hero__feature');
  
    const duration = 1.3;
  
    const timeline = gsap.timeline({
      defaults: {
        duration,
        ease: 'power3.out',
      },
    });
  
    if (background) {
      timeline.fromTo(
        background,
        {
          scale: 1.055,
          opacity: 0.72,
        },
        {
          scale: 1.01,
          opacity: 1,
          clearProps: 'opacity',
        },
        0
      );
    }
  
    if (overlay) {
      timeline.fromTo(
        overlay,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          clearProps: 'opacity',
        },
        0.08
      );
    }
  
    if (badge) {
      timeline.fromTo(
        badge,
        {
          y: 16,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          clearProps: 'transform,opacity',
        },
        0.14
      );
    }
  
    if (titleLines.length) {
      timeline.fromTo(
        titleLines,
        {
          y: 28,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          stagger: 0.08,
          clearProps: 'transform,opacity',
        },
        0.2
      );
    }
  
    if (description) {
      timeline.fromTo(
        description,
        {
          y: 22,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          clearProps: 'transform,opacity',
        },
        0.42
      );
    }
  
    if (buttons.length) {
      timeline.fromTo(
        buttons,
        {
          y: 18,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          stagger: 0.09,
          clearProps: 'transform,opacity',
        },
        0.52
      );
    }
  
    if (features.length) {
      timeline.fromTo(
        features,
        {
          y: 18,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          stagger: 0.08,
          clearProps: 'transform,opacity',
        },
        0.68
      );
    }
  }

  initServicesHeroIntro();
})();
