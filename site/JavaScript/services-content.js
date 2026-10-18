// Аккордеоны и появление контента страницы «Решения».
(() => {
  const faq = document.querySelector('.solutions-faq__list');
  const items = document.querySelectorAll('[data-solutions-item]');
  const setOpen = (item, open) => {
    item.classList.toggle('active', open);
    item.querySelector('.products__trigger').setAttribute('aria-expanded', String(open));
    const panel = item.querySelector('.solutions-accordion__panel');
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
  };

  items.forEach((item) => {
    item.querySelector('.products__trigger').addEventListener('click', () => {
      const open = !item.classList.contains('active');
      if (open && faq?.contains(item)) {
        faq.querySelectorAll('[data-solutions-item].active').forEach((active) => setOpen(active, false));
      }
      setOpen(item, open);
    });
  });

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const motion = gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    document.querySelectorAll('.solutions-offer__header, .solutions-details__header, .solutions-offer__grid, .solutions-payment__grid, .solutions-extension__grid, .solutions-faq__list').forEach((group) => {
      const targets = group.matches('.solutions-offer__header, .solutions-details__header') ? group.children : group.querySelectorAll(':scope > article, :scope > [data-solutions-item]');
      gsap.fromTo(targets, { y: 28, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1.3, ease: 'power3.out', stagger: 0.09,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: group, start: 'top 90%', once: true },
      });
    });
  });
})();
