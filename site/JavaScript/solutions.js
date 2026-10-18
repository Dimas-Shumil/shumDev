(() => {
  const root = document.querySelector('.solutions-page');
  if (!root) return;
  document.querySelectorAll('[data-solution-choice]').forEach((link) => {
    link.addEventListener('click', () => {
      const message = document.querySelector('#contact-message');
      if (message && !message.value.trim()) {
        message.value = `Интересует решение ${link.dataset.solutionChoice}. Хотелось бы обсудить проект.`;
      }
    });
  });
  if (window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    root.querySelectorAll('[data-sol-reveal]').forEach((element) => {
      window.gsap.fromTo(element, {autoAlpha: 0, y: 35}, {
        autoAlpha: 1, y: 0, duration: 1.15, ease: 'power2.out',
        scrollTrigger: {trigger: element, start: 'top 94%', once: true}
      });
    });
  }
})();
