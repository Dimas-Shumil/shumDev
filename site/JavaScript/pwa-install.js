(() => {
  'use strict';
  if (!window.isSecureContext || location.pathname.startsWith('/control')) return;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone()) return;
  let promptEvent = null;
  let panel = null;
  let ready = false;
  let sessionHidden = false;
  const key = 'shumdev-install-after';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const postponed = () => {
    try { return Date.now() < Number(localStorage.getItem(key) || 0); } catch { return false; }
  };
  const remove = () => { panel?.remove(); panel = null; };
  const dismiss = () => {
    sessionHidden = true;
    try { localStorage.setItem(key, String(Date.now() + 7 * 86400000)); } catch { /* Storage may be unavailable. */ }
    remove();
  };
  const show = () => {
    if (!ready || panel || sessionHidden || standalone() || postponed() || (!promptEvent && !ios)) return;
    panel = document.createElement('aside');
    panel.className = 'pwa-install';
    panel.setAttribute('aria-label', 'Установка приложения ShumDev');
    panel.innerHTML = '<img class="pwa-install__icon" src="/site/image/pwa-192.png" width="48" height="48" alt=""><div class="pwa-install__body"><strong class="pwa-install__title">ShumDev всегда под рукой</strong><p class="pwa-install__text">Установите приложение для быстрого доступа к платформе.</p><div class="pwa-install__actions"><button class="pwa-install__install" type="button">Установить</button><button class="pwa-install__later" type="button">Позже</button></div><p class="pwa-install__help" role="status" hidden></p></div>';
    document.body.append(panel);
    panel.querySelector('.pwa-install__later').addEventListener('click', dismiss);
    panel.querySelector('.pwa-install__install').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const help = panel.querySelector('.pwa-install__help');
      if (!promptEvent) {
        help.textContent = 'В меню браузера нажмите «Поделиться», затем «На экран “Домой”» и «Добавить». Если пункта нет, откройте эту страницу в Safari.';
        help.hidden = false;
        button.hidden = true;
        panel.querySelector('.pwa-install__later').textContent = 'Понятно';
        return;
      }
      const pending = promptEvent;
      promptEvent = null;
      button.disabled = true;
      try {
        await pending.prompt();
        const choice = await pending.userChoice;
        if (choice.outcome === 'accepted') remove();
        else dismiss();
      } catch {
        help.hidden = false;
        help.textContent = 'Откройте меню браузера и выберите «Установить приложение» или «На главный экран».';
        button.hidden = true;
      }
    });
  };
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    promptEvent = event;
    show();
  });
  window.addEventListener('appinstalled', () => { sessionHidden = true; promptEvent = null; remove(); });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => { if (standalone()) remove(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  window.setTimeout(() => { ready = true; show(); }, 12000);
})();
