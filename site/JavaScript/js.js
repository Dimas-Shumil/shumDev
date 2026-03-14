// Единый JS файл

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

    // ========== ПРЕЛОУДЕР ==========
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

    // ========== БУРГЕР-МЕНЮ ==========
    if (burger && nav) {
        const navLinks = document.querySelectorAll('.nav-link');

        function toggleMenu() {
            burger.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        }

        function closeMenu() {
            burger.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
        }

        burger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !burger.contains(e.target) && nav.classList.contains('active')) {
                closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && nav.classList.contains('active')) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                closeMenu();
            }
        });
    }

    // ========== SWIPER ==========
    
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

    // ========== ХЕДЕР ПРИ СКРОЛЛЕ ==========
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

    // ========== ПЛАВНАЯ ПРОКРУТКА ==========
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

    // ========== ФОРМА ОБРАТНОЙ СВЯЗИ ==========
    if (contactForm) {
        const submitBtn = contactForm.querySelector('button[type="submit"]');

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);
            const originalText = submitBtn.textContent;

            submitBtn.textContent = "Отправка...";
            submitBtn.disabled = true;

            try {
                const response = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    showNotification("Сообщение успешно отправлено!", "success");
                    contactForm.reset();
                } else {
                    showNotification("Ошибка: " + (data.message || "Неизвестная ошибка"), "error");
                }
            } catch (error) {
                showNotification("Ошибка соединения. Попробуйте позже.", "error");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ========== УВЕДОМЛЕНИЯ ==========
    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 25px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 9999; animation: slideIn 0.3s ease;
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
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    // ========== ПЛАВАЮЩИЕ ЭЛЕМЕНТЫ ==========
    floatingElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.9}s`;
    });

    // ========== СЧЁТЧИКИ СТАТИСТИКИ ==========
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

    // ========== АНИМАЦИЯ КАРТОЧЕК УСЛУГ (ДОБАВЛЕНО) ==========
    const serviceCards = document.querySelectorAll('.service-card');
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

    // ========== ОБРАБОТКА ОШИБОК ИЗОБРАЖЕНИЙ ==========
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            e.target.style.opacity = '0.5';
            e.target.alt = 'Изображение не загружено';
        }
    }, true);

    // ========== АВТОСОХРАНЕНИЕ ФОРМЫ ==========
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
});
