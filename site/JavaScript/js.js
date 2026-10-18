document.addEventListener('DOMContentLoaded', () => {
    // Элементы
    const preloader = document.getElementById('preloader');
    const smokeContainer = document.getElementById('smokeContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const header = document.querySelector('.header');
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');
    const swiperContainer = document.querySelector('.projects-swiper');
    const contactForm = document.querySelector('.contacts-right-form');
    const floatingElements = document.querySelectorAll('.floating-element');
    const statsNumbers = document.querySelectorAll('.stat-number');

    //  прелоудер

    if (preloader) {
        let progress = 0;
        let smokeParticles = [];
        let sparks = [];

        function createSmoke() {
            const particleCount = 80 + Math.floor(Math.random() * 40);
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.classList.add('smoke-particle');

                const size = 40 + Math.random() * 110;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;

                const posX = Math.random() * 100;
                const posY = 70 + Math.random() * 30;
                particle.style.left = `${posX}%`;
                particle.style.top = `${posY}%`;

                const darkness = 10 + Math.random() * 20;
                particle.style.background = `radial-gradient(circle, rgba(${darkness},${darkness},${darkness},0.9) 0%, rgba(0,0,0,0.7) 70%)`;

                const duration = 3 + Math.random() * 4;
                particle.style.animation = `smoke-dissipate ${duration}s ease-out forwards`;
                particle.style.animationDelay = `${Math.random() * 2}s`;

                smokeContainer.appendChild(particle);
                smokeParticles.push(particle);

                setTimeout(() => {
                    if (particle.parentNode) particle.remove();
                }, duration * 1000);
            }
        }

        function createSparks() {
            const sparkCount = 10 + Math.floor(Math.random() * 10);
            for (let i = 0; i < sparkCount; i++) {
                const spark = document.createElement('div');
                spark.classList.add('spark');

                const size = 3 + Math.random() * 8;
                spark.style.width = `${size}px`;
                spark.style.height = `${size}px`;

                const posX = 40 + Math.random() * 20;
                spark.style.left = `${posX}%`;
                spark.style.top = `85%`;

                const hue = 30 + Math.random() * 20;
                spark.style.background = `radial-gradient(circle,
                    hsla(${hue}, 100%, 50%, 0.9) 0%,
                    hsla(${hue + 10}, 100%, 60%, 0.7) 50%,
                    transparent 70%)`;

                const duration = 1 + Math.random() * 1.5;
                const sparkX = (Math.random() - 0.5) * 100;
                spark.style.setProperty('--spark-x', `${sparkX}px`);
                spark.style.animation = `spark-fly ${duration}s ease-out forwards`;

                smokeContainer.appendChild(spark);
                sparks.push(spark);

                setTimeout(() => {
                    if (spark.parentNode) spark.remove();
                }, duration * 1000);
            }
        }

        function updateProgress() {
            if (progress >= 100) return;

            const increment = 1 + Math.random() * 4;
            progress = Math.min(progress + increment, 100);
            progressBar.style.width = `${progress}%`;

            if (progress < 20) progressText.textContent = "Запуск темных протоколов...";
            else if (progress < 40) progressText.textContent = "Генерация дымовой завесы...";
            else if (progress < 60) progressText.textContent = "Активация искровых систем...";
            else if (progress < 80) progressText.textContent = "Загрузка креативных модулей...";
            else if (progress < 95) progressText.textContent = "Финальная инициализация...";
            else progressText.textContent = "Система готова. Входим в темноту...";

            if (progress < 30) {
                if (progress % 5 < 1) createSmoke();
            } else if (progress < 70) {
                if (progress % 4 < 1) createSmoke();
                if (progress % 6 < 1) createSparks();
            } else {
                if (progress % 8 < 1) createSmoke();
                if (progress % 3 < 1) createSparks();
            }

            if (progress < 100) {
                setTimeout(updateProgress, 50 + Math.random() * 150);
            } else {
                setTimeout(() => {
                    smokeParticles.forEach(p => p.style.animationDuration = '0.5s');
                    sparks.forEach(s => s.style.animationDuration = '0.3s');

                    setTimeout(() => {
                        preloader.style.animation = 'fadeOut 1.2s ease forwards';
                        setTimeout(() => {
                            preloader.style.display = 'none';
                            document.body.style.overflow = 'auto';
                        }, 1200);
                    }, 800);
                }, 1000);
            }
        }

        for (let i = 0; i < 3; i++) {
            setTimeout(() => createSmoke(), i * 300);
        }
        setTimeout(updateProgress, 800);
    }

//  мобильное меню

const mobileMenu = document.querySelector('.mobile-menu');
const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
const mobileMenuClose = document.querySelector('.mobile-menu__close');
const mobileMenuLinks = document.querySelectorAll(
    '.mobile-menu__link, .mobile-menu__cta, .mobile-menu__social'
);

if (burger && mobileMenu && mobileMenuOverlay && mobileMenuClose) {
    function openMenu() {
        burger.classList.add('active');
        burger.setAttribute('aria-expanded', 'true');

        mobileMenu.classList.add('active');
        mobileMenuOverlay.classList.add('active');

        document.body.classList.add('menu-open');
    }

    function closeMenu() {
        burger.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');

        mobileMenu.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');

        document.body.classList.remove('menu-open');
    }

    burger.addEventListener('click', (e) => {
        e.stopPropagation();

        if (mobileMenu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    mobileMenuClose.addEventListener('click', closeMenu);
    mobileMenuOverlay.addEventListener('click', closeMenu);

    mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) {
        closeMenu();
    }
});

    mobileMenuLinks.forEach((link) => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && mobileMenu.classList.contains('active')) {
            closeMenu();
        }
    });
}

    // свайпер

    if (swiperContainer && typeof Swiper !== 'undefined') {
        const projectsSwiper = new Swiper('.projects-swiper', {
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            slidesPerView: 1,
            spaceBetween: 30,
            speed: 600,
            grabCursor: true,
            breakpoints: {
                640: { slidesPerView: 1, spaceBetween: 20 },
                768: { slidesPerView: 2, spaceBetween: 20 },
                1024: { slidesPerView: 3, spaceBetween: 30 },
                1450: { slidesPerView: 4, spaceBetween: 30 },
                1920: { slidesPerView: 5, spaceBetween: 30 },
            },
            a11y: {
                prevSlideMessage: 'Предыдущий слайд',
                nextSlideMessage: 'Следующий слайд',
                firstSlideMessage: 'Первый слайд',
                lastSlideMessage: 'Последний слайд',
                paginationBulletMessage: 'Перейти к слайду {{index}}',
            },
        });

        swiperContainer.addEventListener('mouseenter', () => projectsSwiper.autoplay.stop());
        swiperContainer.addEventListener('mouseleave', () => projectsSwiper.autoplay.start());

        const updateSlideCounter = () => {
            const current = projectsSwiper.realIndex + 1;
            const total = projectsSwiper.slides.length - 2;
            let counter = document.querySelector('.swiper-counter');
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'swiper-counter';
                counter.style.cssText = `
                    position: absolute; bottom: 20px; right: 20px;
                    background: rgba(0,0,0,0.7); color: white;
                    padding: 5px 10px; border-radius: 15px;
                    font-size: 12px; z-index: 10;
                `;
                swiperContainer.appendChild(counter);
            }
            counter.textContent = `${current} / ${total}`;
        };
        projectsSwiper.on('slideChange', updateSlideCounter);
        updateSlideCounter();

        window.addEventListener('resize', () => setTimeout(() => projectsSwiper.update(), 300));
    }

    // хедер при скролле

    if (header) {
        let lastScroll = 0;
        const scrollThreshold = 100;
        const headerHeight = header.offsetHeight;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > scrollThreshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            if (currentScroll > lastScroll && currentScroll > headerHeight) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }

            lastScroll = currentScroll;
        });

        header.addEventListener('mouseenter', () => {
            header.style.transform = 'translateY(0)';
        });
    }

    // плавная прокрутка

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            const headerHeight = header?.offsetHeight || 0;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });


    // мобильные плавающие кнопки
    const mobileFloatingActions = document.querySelector('.mobile-floating-actions');
    const pageFooter = document.querySelector('.footer');

    if (mobileFloatingActions && pageFooter) {
        const footerObserver = new IntersectionObserver(([entry]) => {
            mobileFloatingActions.classList.toggle('is-hidden', entry.isIntersecting);
        }, {
            threshold: 0.01
        });

        footerObserver.observe(pageFooter);
    }

    // плавающие элементы

    floatingElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.9}s`;
    });

    // счетчики статистики

    function initStatsCounter() {
        const statsNumbers = document.querySelectorAll('.stat-number');
        if (!statsNumbers.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const stat = entry.target;
                    const originalText = stat.textContent.trim();
                    const numberMatch = originalText.match(/\d+(\.\d+)?/);
                    if (!numberMatch) return;

                    const target = parseFloat(numberMatch[0]);
                    const suffix = originalText.slice(numberMatch[0].length);

                    animateCounter(stat, target, suffix);
                    observer.unobserve(stat);
                }
            });
        }, { threshold: 0.2 });

        statsNumbers.forEach(stat => observer.observe(stat));
    }

    function animateCounter(element, target, suffix) {
        let current = 0;
        const steps = 50;
        const increment = target / steps;
        const stepTime = 1500 / steps;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target + suffix;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current) + suffix;
            }
        }, stepTime);
    }

    initStatsCounter();

    // карточки услуг

    const serviceCards = document.querySelectorAll('.advantages-card');
    if (serviceCards.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, 100);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -20px 0px'
        });

        serviceCards.forEach(card => observer.observe(card));
    }

    // обработка ошибок изображений

    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            e.target.style.opacity = '0.5';
            e.target.alt = 'Изображение не загружено';
        }
    }, true);

    // автосохранение формы

    if (contactForm) {
        const savedData = JSON.parse(localStorage.getItem('contactFormData') || '{}');
        Object.keys(savedData).forEach(key => {
            const input = contactForm.querySelector(`[name="${key}"]`);
            if (input) input.value = savedData[key];
        });

        contactForm.addEventListener('input', (e) => {
            if (e.target.matches('.form-control')) {
                const formData = new FormData(contactForm);
                const data = Object.fromEntries(formData.entries());
                localStorage.setItem('contactFormData', JSON.stringify(data));
            }
        });

        contactForm.addEventListener('submit', () => {
            localStorage.removeItem('contactFormData');
        });
    }

    // Единый аккордеон для состава платформы и FAQ.
    document.querySelectorAll('[data-accordion]').forEach((accordion, accordionIndex) => {
        const items = accordion.querySelectorAll('.products__item');

        items.forEach((item, itemIndex) => {
            const trigger = item.querySelector('.products__trigger');
            const content = item.querySelector('.products__content');

            if (!trigger || !content) return;

            trigger.type = 'button';

            if (!content.id) {
                content.id = `accordion-${accordionIndex + 1}-panel-${itemIndex + 1}`;
            }

            trigger.setAttribute('aria-controls', content.id);
            trigger.setAttribute('aria-expanded', String(item.classList.contains('active')));
            content.setAttribute('aria-hidden', String(!item.classList.contains('active')));

            trigger.addEventListener('click', () => {
                const willOpen = !item.classList.contains('active');
                const active = accordion.querySelector('.products__item.active');

                if (active && active !== item) {
                    active.classList.remove('active');
                    active.querySelector('.products__trigger')?.setAttribute('aria-expanded', 'false');
                    active.querySelector('.products__content')?.setAttribute('aria-hidden', 'true');
                }

                item.classList.toggle('active', willOpen);
                trigger.setAttribute('aria-expanded', String(willOpen));
                content.setAttribute('aria-hidden', String(!willOpen));
            });
        });
    });
});

// табы для секции "double"

const projectCards = document.querySelectorAll('[data-modal]');
const modals = document.querySelectorAll('.projects-modal');

projectCards.forEach(card => {
    card.addEventListener('click', event => {
        if (event.defaultPrevented) return;

        const modalId = card.dataset.modal;
        const modal = document.getElementById(modalId);

        if (modal) {

            // Ленивая загрузка изображений модалки
            const modalImages = modal.querySelectorAll('img[data-src]');

            modalImages.forEach(img => {
                if (!img.getAttribute('src')) {
                    img.src = img.dataset.src;
                }
            });

            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    });
});

modals.forEach(modal => {
    const overlay = modal.querySelector('.projects-modal__overlay');
    const closeBtn = modal.querySelector('.projects-modal__close');

    function closeModal() {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        modals.forEach(modal => {
            modal.classList.remove('active');
        });

        document.body.classList.remove('modal-open');
    }
});

// Интерактивная 3D-карусель избранных проектов
document.querySelectorAll('[data-round-carousel]').forEach(carousel => {
    const ring = carousel.querySelector('.round-carousel__ring');
    const items = [...carousel.querySelectorAll('.round-carousel__item')];

    if (!ring || items.length < 2) return;

    const angle = 360 / items.length;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let radius = 0;
    let rotation = 0;
    let velocity = 0;
    let lastFrame = 0;
    let isDragging = false;
    let isHovered = false;
    let isFocused = false;
    let isVisible = true;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let dragDistance = 0;
    let suppressClickUntil = 0;
    let activeItem = -1;
    let capturedPointerId = null;

    const updateFrontItem = () => {
        const normalized = ((-rotation % 360) + 360) % 360;
        const nextActive = Math.round(normalized / angle) % items.length;

        if (nextActive === activeItem) return;
        activeItem = nextActive;
        items.forEach((item, index) => item.classList.toggle('is-front', index === activeItem));
    };

    const layout = () => {
        const itemWidth = items[0].getBoundingClientRect().width;
        const spacingFactor = window.innerWidth <= 576 ? 1.2 : 1.34;
        radius = (itemWidth * spacingFactor) / (2 * Math.tan(Math.PI / items.length));

        items.forEach((item, index) => {
            item.style.transform = `rotateY(${index * angle}deg) translateZ(${radius}px)`;
        });

        ring.style.transform = `translateZ(${-radius}px) rotateY(${rotation}deg)`;
        updateFrontItem();
    };

    const render = now => {
        const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0;
        lastFrame = now;

        if (!isDragging && isVisible && !document.hidden) {
            if (Math.abs(velocity) > 0.08 && !reducedMotion.matches) {
                rotation += velocity * delta;
                velocity *= Math.pow(0.92, delta * 60);
            } else if (!isHovered && !isFocused && !reducedMotion.matches) {
                velocity = 0;
                rotation += 9 * delta;
            }
        }

        ring.style.transform = `translateZ(${-radius}px) rotateY(${rotation}deg)`;
        updateFrontItem();
        requestAnimationFrame(render);
    };

    carousel.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;

        isDragging = true;
        dragDistance = 0;
        velocity = 0;
        lastPointerX = event.clientX;
        lastPointerTime = performance.now();
        carousel.classList.add('is-dragging');
    });

    carousel.addEventListener('pointermove', event => {
        if (!isDragging) return;

        const now = performance.now();
        const deltaX = event.clientX - lastPointerX;
        const deltaTime = Math.max(now - lastPointerTime, 8);
        const rotationDelta = deltaX * 0.28;

        dragDistance += Math.abs(deltaX);

        // Не перехватываем указатель при обычном клике: на desktop ранний
        // pointer capture меняет цель click с карточки на контейнер карусели.
        // Захват нужен только после того, как пользователь действительно
        // начал вращать кольцо.
        if (dragDistance > 7 && capturedPointerId === null) {
            carousel.setPointerCapture?.(event.pointerId);
            capturedPointerId = event.pointerId;
        }

        rotation += rotationDelta;
        velocity = (rotationDelta / deltaTime) * 1000;
        lastPointerX = event.clientX;
        lastPointerTime = now;
    });

    const endDrag = event => {
        if (!isDragging) return;

        isDragging = false;
        carousel.classList.remove('is-dragging');

        if (capturedPointerId !== null) {
            carousel.releasePointerCapture?.(capturedPointerId);
            capturedPointerId = null;
        }

        if (dragDistance > 7) {
            suppressClickUntil = performance.now() + 350;
        }
    };

    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);

    carousel.addEventListener('click', event => {
        if (performance.now() < suppressClickUntil) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    carousel.addEventListener('mouseenter', () => {
        isHovered = true;
    });

    carousel.addEventListener('mouseleave', () => {
        isHovered = false;
    });

    carousel.addEventListener('focusin', () => {
        isFocused = true;
    });

    carousel.addEventListener('focusout', event => {
        if (!carousel.contains(event.relatedTarget)) isFocused = false;
    });

    carousel.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

        event.preventDefault();
        velocity = 0;
        rotation += event.key === 'ArrowLeft' ? angle : -angle;
    });

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            isVisible = entries[0]?.isIntersecting ?? true;
        }, { threshold: 0.05 });
        observer.observe(carousel);
    }

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(layout);
    });

    layout();
    requestAnimationFrame(render);
});
// team section animation

// gsap.registerPlugin(ScrollTrigger);
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

// карточки с анимацией

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

function initHeroCardsAnimation(options) {
  const {
    sectionSelector,
    cardSelector,
    introSelector,
    featureSelector,
    cardMoveX = 45,
    cardMoveY = 35,
    introDelay = 0.12,
    cardsDelay = 0.4,
    featuresDelay = 0.75,
  } = options;

  const section = document.querySelector(sectionSelector);
  const cards = document.querySelectorAll(cardSelector);
  const features = document.querySelectorAll(featureSelector);

  if (!section) return;

  if (window.gsap) {
    if (introSelector) {
      gsap.from(introSelector, {
        y: 34,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        delay: introDelay,
      });
    }

    if (cards.length) {
      gsap.from(cards, {
        y: 80,
        opacity: 0,
        scale: 0.82,
        duration: 1.2,
        stagger: 0.16,
        ease: 'power3.out',
        delay: cardsDelay,
      });
    }

    if (features.length) {
      gsap.from(features, {
        y: 26,
        opacity: 0,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
        delay: featuresDelay,
      });
    }
  }

  if (!cards.length) return;

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!canHover) return;

  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;

  section.addEventListener('mousemove', (event) => {
    const rect = section.getBoundingClientRect();

    mouseX = (event.clientX - rect.left) / rect.width - 0.5;
    mouseY = (event.clientY - rect.top) / rect.height - 0.5;
  });

  section.addEventListener('mouseleave', () => {
    mouseX = 0;
    mouseY = 0;
  });

  function animateCards() {
    currentX += (mouseX - currentX) * 0.08;
    currentY += (mouseY - currentY) * 0.08;

    cards.forEach((card) => {
      const depth = Number(card.dataset.depth) || 1;

      const moveX = currentX * cardMoveX * depth;
      const moveY = currentY * cardMoveY * depth;

      card.style.translate = `${moveX}px ${moveY}px`;
    });

    requestAnimationFrame(animateCards);
  }

  animateCards();
}

// Главная страница — единая плавная intro-анимация hero
function initHomeHeroIntro() {
  const hero = document.querySelector('.hero');

  if (!hero || !window.gsap) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion) return;

  const background = hero.querySelector('.hero__bg');
  const overlay = hero.querySelector('.hero__overlay');
  const badge = hero.querySelector('.hero-badge');
  const titleLines = hero.querySelectorAll('.hero-title span');
  const description = hero.querySelector('.hero-description');
  const buttons = hero.querySelectorAll('.hero-buttons .btn');
  const features = hero.querySelectorAll('.hero-feature');

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
      { opacity: 0 },
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

initHomeHeroIntro();

// Страница "О компании" — такая же плавная intro-анимация, как на главной
function initCompanyHeroIntro() {
  const hero = document.querySelector('.company-hero');

  if (!hero || !window.gsap) return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion) return;

  const background = hero.querySelector('.company-hero__bg');
  const overlay = hero.querySelector('.company-hero__overlay');
  const badge = hero.querySelector('.company-hero__badge');
  const titleLines = hero.querySelectorAll('.company-hero__title-line');
  const description = hero.querySelector('.company-hero__description');
  const buttons = hero.querySelectorAll('.company-hero__actions a');
  const features = hero.querySelectorAll('.company-hero-feature');

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

initCompanyHeroIntro();

// Анимация секции "Цифровые решения"
const previewSection = document.querySelector('.preview');
const previewHeader = document.querySelector('.preview__header');
const previewCards = document.querySelectorAll('.preview-card');

if (previewSection && window.gsap) {
  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  const previewElements = [
    previewHeader,
    ...previewCards,
  ].filter(Boolean);

  gsap.set(previewElements, {
    opacity: 0,
    y: 44,
  });

  const previewTl = gsap.timeline({
    scrollTrigger: window.ScrollTrigger
      ? {
          trigger: previewSection,
          start: 'top 72%',
          once: true,
        }
      : undefined,
  });

  previewTl
    .to(previewHeader, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
    })
    .to(
      previewCards,
      {
        opacity: 1,
        y: 0,
        duration: 0.95,
        stagger: 0.12,
        ease: 'power3.out',
      },
      '-=0.42'
    );
}

// анимация страницы команда

const companyTeamSection = document.querySelector('.company-team');
const companyTeamHeader = document.querySelector('.company-team__header');
const companyTeamCards = document.querySelectorAll('.company-team-card');
const companyTeamStack = document.querySelector('.company-team-stack');

if (companyTeamSection && window.gsap) {
  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  const companyTeamElements = [
    companyTeamHeader,
    ...companyTeamCards,
    companyTeamStack,
  ].filter(Boolean);

  gsap.set(companyTeamElements, {
    opacity: 0,
    y: 44,
  });

  const companyTeamTl = gsap.timeline({
    scrollTrigger: window.ScrollTrigger
      ? {
          trigger: companyTeamSection,
          start: 'top 72%',
          once: true,
        }
      : undefined,
  });

  companyTeamTl
    .to(companyTeamHeader, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
    })
    .to(
      companyTeamCards,
      {
        opacity: 1,
        y: 0,
        duration: 0.95,
        stagger: 0.12,
        ease: 'power3.out',
      },
      '-=0.42'
    )
    .to(
      companyTeamStack,
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: 'power3.out',
      },
      '-=0.48'
    );
}

// форма отправки

const contactForm = document.getElementById('contactForm');

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (contactForm) {
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const submitBtnText = submitBtn?.querySelector('span') || submitBtn;

    const savedData = JSON.parse(localStorage.getItem('contactFormData') || '{}');

    Object.keys(savedData).forEach((key) => {
        const input = contactForm.querySelector(`[name="${key}"]`);
        if (!input) return;

        if (input.type === 'checkbox') {
            input.checked = Boolean(savedData[key]);
        } else {
            input.value = savedData[key];
        }
    });

    contactForm.addEventListener('input', () => {
        const data = {
            name: contactForm.querySelector('[name="name"]')?.value.trim() || '',
            phone: contactForm.querySelector('[name="phone"]')?.value.trim() || '',
            email: contactForm.querySelector('[name="email"]')?.value.trim() || '',
            message: contactForm.querySelector('[name="message"]')?.value.trim() || '',
            personal_data_consent:
                contactForm.querySelector('[name="personal_data_consent"]')?.checked || false
        };

        localStorage.setItem('contactFormData', JSON.stringify(data));
    });

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (submitBtn?.disabled) return;

        const name = contactForm.querySelector('[name="name"]')?.value.trim() || '';
        const phone = contactForm.querySelector('[name="phone"]')?.value.trim() || '';
        const email = contactForm.querySelector('[name="email"]')?.value.trim() || '';
        const message = contactForm.querySelector('[name="message"]')?.value.trim() || '';
        const consent = contactForm.querySelector('[name="personal_data_consent"]')?.checked || false;
        const company = contactForm.querySelector('[name="company"]')?.value.trim() || '';

        if (!name) {
            showNotification('Введите ваше имя.', 'error');
            return;
        }

        if (!message) {
            showNotification('Введите сообщение.', 'error');
            return;
        }

        if (!phone && !email) {
            showNotification('Укажите хотя бы телефон или email.', 'error');
            return;
        }

        if (email && !isValidEmail(email)) {
            showNotification('Введите корректный email.', 'error');
            return;
        }

        if (!consent) {
            showNotification('Нужно согласие на обработку персональных данных.', 'error');
            return;
        }

        const originalText = submitBtnText?.textContent || 'Отправить';

        if (submitBtn) {
            submitBtn.disabled = true;
        }

        if (submitBtnText) {
            submitBtnText.textContent = 'Отправка...';
        }

        try {
            const response = await fetch('/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    phone,
                    email,
                    message,
                    personal_data_consent: consent,
                    company,
                }),
            });

            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка отправки формы');
            }

            showNotification('Заявка отправлена! Мы скоро свяжемся с вами 🚀', 'success');
            contactForm.reset();
            localStorage.removeItem('contactFormData');
        } catch (error) {
            console.error('Ошибка отправки формы:', error);

            showNotification(
                error.message || 'Ошибка соединения. Попробуйте позже.',
                'error'
            );
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
            }

            if (submitBtnText) {
                submitBtnText.textContent = originalText;
            }
        }
    });
}

// уведомления

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 360px;
        width: calc(100% - 40px);
        padding: 16px 22px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: #fff;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-size: 14px;
        line-height: 1.45;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(120%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(120%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Digital products: manual, keyboard-accessible tabs. No timers or auto-rotation.
(() => {
    const section = document.querySelector('.digital-products');
    if (!section) return;
    const tabs = [...section.querySelectorAll('[role="tab"]')];
    const panels = [...section.querySelectorAll('[role="tabpanel"]')];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    section.classList.add('is-enhanced');

    function selectProduct(tab, moveFocus = false) {
        const key = tab.dataset.product;
        tabs.forEach((item) => {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;
        });
        panels.forEach((panel) => {
            const selected = panel.dataset.product === key;
            panel.hidden = !selected;
            panel.inert = !selected;
            panel.classList.toggle('is-entering', selected && !reducedMotion.matches);
        });
        if (moveFocus) tab.focus();
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            if (tab.getAttribute('aria-selected') !== 'true') selectProduct(tab);
        });
        tab.addEventListener('keydown', (event) => {
            let next;
            if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % tabs.length;
            if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index - 1 + tabs.length) % tabs.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = tabs.length - 1;
            if (next === undefined) return;
            event.preventDefault();
            selectProduct(tabs[next], true);
        });
    });
    section.querySelectorAll('[data-product-cta]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const form = document.getElementById('contactForm');
            const message = form?.querySelector('[name="message"]');
            if (!message) return; // Preserve the working #contact link as a fallback.
            event.preventDefault();
            const productLine = `Интересует продукт ShumDev ${link.dataset.productCta}.`;
            const existing = message.value.replace(/^Интересует продукт ShumDev (START|BUSINESS|SYSTEM)\.\s*/u, '');
            message.value = existing ? `${productLine}\n${existing}` : `${productLine}\n`;
            message.dispatchEvent(new Event('input', { bubbles: true }));
            const nameInput = form.querySelector('[name="name"]');
            nameInput?.focus({ preventScroll: true });
            form.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
        });
    });
    if ('IntersectionObserver' in window && !reducedMotion.matches) {
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            section.classList.add('is-revealing');
            observer.disconnect();
        }, { threshold: 0.12 });
        observer.observe(section);
    }
})();
