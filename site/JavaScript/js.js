document.addEventListener('DOMContentLoaded', () => {

  const burger = document.querySelector('.burger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const menuContent = document.querySelector('.mobile-menu__content');
  const header = document.querySelector('.header');
  const menuLinks = document.querySelectorAll('.mobile-nav-list a');

  if (!burger || !mobileMenu || !menuContent || !header) {
    console.warn('Не найдены элементы меню');
    return;
  }

  function openMenu() {
    burger.classList.add('active');
    mobileMenu.classList.add('active');
    document.body.classList.add('no-scroll');
    header.style.transform = 'translateY(0)';
  }

  function closeMenu() {
    burger.classList.remove('active');
    mobileMenu.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }

  function toggleMenu() {
    if (mobileMenu.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  // бургер
  burger.addEventListener('click', toggleMenu);

  // клик вне меню
  document.addEventListener('click', (e) => {

    const isClickInsideMenu = menuContent.contains(e.target);
    const isClickBurger = burger.contains(e.target);

    if (!isClickInsideMenu && !isClickBurger && mobileMenu.classList.contains('active')) {
      closeMenu();
    }

  });

  // закрытие при клике на ссылку
  menuLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
      closeMenu();
    }
  });

  // скрытие хедера при скролле
  let lastScroll = 0;

  window.addEventListener('scroll', () => {

    if (mobileMenu.classList.contains('active')) return;

    const currentScroll = window.scrollY;

    if (currentScroll > lastScroll && currentScroll > 120) {
      header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;

  }, { passive: true });

});