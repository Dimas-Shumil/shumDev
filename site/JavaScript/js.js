const burger     = document.querySelector('.burger');
const mobileMenu = document.querySelector('.mobile-menu');
const closeBtn   = document.querySelector('.mobile-menu__close');
const header     = document.querySelector('.header');

function toggleMenu() {
  burger.classList.toggle('active');
  mobileMenu.classList.toggle('active');
  document.body.classList.toggle('no-scroll');

  // если закрыли меню — возвращаем header в видимое состояние
  if (!mobileMenu.classList.contains('active')) {
    header.style.transform = 'translateY(0)';
  }
}

burger.addEventListener('click', toggleMenu);
closeBtn.addEventListener('click', toggleMenu);

mobileMenu.addEventListener('click', (e) => {
  if (!e.target.closest('.mobile-menu__content')) {
    toggleMenu();
  }
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
    toggleMenu();
  }
});

// Скрытие/показ хедера при скролле
let lastScrollTop = 0;

window.addEventListener('scroll', () => {
  if (mobileMenu.classList.contains('active')) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop > lastScrollTop && scrollTop > 120) {
    header.style.transform = 'translateY(-100%)';
  } else {
    header.style.transform = 'translateY(0)';
  }

  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, { passive: true });