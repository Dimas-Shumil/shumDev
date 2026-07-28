(() => {
  const main = document.querySelector('#main');
  const modalRoot = document.querySelector('#modal-root');
  const toastRoot = document.querySelector('#toast-root');
  const state = {
    user: null,
    csrfToken: '',
    users: [],
    projects: [],
    searchTimer: null,
  };

  const labels = {
    roles: { OWNER: 'Владелец', MANAGER: 'Менеджер', STAFF: 'Сотрудник' },
    lead: {
      NEW: 'Новая',
      IN_PROGRESS: 'В работе',
      WAITING: 'Ждём ответа',
      PROPOSAL: 'Предложение',
      WON: 'Успешно',
      LOST: 'Закрыта',
      SPAM: 'Спам',
    },
    project: {
      PLANNED: 'Планируется',
      ACTIVE: 'В работе',
      PAUSED: 'На паузе',
      REVIEW: 'Проверка',
      LAUNCHED: 'Запущен',
      SUPPORT: 'Поддержка',
      ARCHIVED: 'Архив',
    },
    task: {
      DRAFT: 'Черновик',
      AVAILABLE: 'Свободна',
      ASSIGNED: 'Назначена',
      IN_PROGRESS: 'В работе',
      PAUSED: 'Пауза',
      BLOCKED: 'Заблокирована',
      REVIEW: 'На проверке',
      DONE: 'Готово',
      ARCHIVED: 'Архив',
    },
    priority: {
      LOW: 'Низкий',
      MEDIUM: 'Средний',
      HIGH: 'Высокий',
      URGENT: 'Срочно',
      CRITICAL: 'Критично',
    },
  };
  const taskColors = {
    DRAFT: 'gray',
    AVAILABLE: 'blue',
    ASSIGNED: 'purple',
    IN_PROGRESS: 'yellow',
    PAUSED: 'gray',
    BLOCKED: 'red',
    REVIEW: 'purple',
    DONE: 'green',
    ARCHIVED: 'gray',
  };
  const leadColors = {
    NEW: 'blue',
    IN_PROGRESS: 'yellow',
    WAITING: 'purple',
    PROPOSAL: 'purple',
    WON: 'green',
    LOST: 'gray',
    SPAM: 'red',
  };
  const projectColors = {
    PLANNED: 'gray',
    ACTIVE: 'blue',
    PAUSED: 'yellow',
    REVIEW: 'purple',
    LAUNCHED: 'green',
    SUPPORT: 'blue',
    ARCHIVED: 'gray',
  };
  const priorityColors = {
    LOW: 'blue',
    MEDIUM: 'yellow',
    HIGH: 'red',
    URGENT: 'red',
    CRITICAL: 'red',
  };

  const escapeHtml = (value = '') =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  const attr = (value = '') => escapeHtml(value);
  const initials = (name = '') =>
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'SD';
  const isManager = () => ['OWNER', 'MANAGER'].includes(state.user?.role);
  const date = (value, withTime = true) =>
    value
      ? new Intl.DateTimeFormat(
          'ru-RU',
          withTime
            ? {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }
            : { day: '2-digit', month: 'short', year: 'numeric' },
        ).format(new Date(value))
      : '—';
  const relative = (value) => {
    if (!value) return '—';
    const diff = Date.now() - new Date(value).getTime();
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    return date(value, false);
  };
  const formatDuration = (seconds = 0, compact = false) => {
    seconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (compact) return `${hours ? `${hours} ч ` : ''}${minutes} мин`;
    return [hours, minutes, secs]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
  };
  const avatar = (user, size = '') => {
    if (!user) return `<span class="avatar ${size}">—</span>`;
    return `<span class="avatar ${size}">${user.avatarPath ? `<img src="${attr(user.avatarPath)}" alt="">` : escapeHtml(initials(user.name))}</span>`;
  };
  const badge = (text, color = 'gray') =>
    `<span class="badge badge--${color}">${escapeHtml(text)}</span>`;
  const empty = (icon, title, text) =>
    `<div class="empty-state"><i class="ti ti-${icon}"></i><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`;
  const formValue = (form) => Object.fromEntries(new FormData(form));
  const pageHeader = (title, subtitle, actions = '', breadcrumb = '') =>
    `<header class="page-header"><div>${breadcrumb ? `<div class="breadcrumb">${breadcrumb}</div>` : ''}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="page-header__actions">${actions}</div></header>`;

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData))
      headers.set('Content-Type', 'application/json');
    if (!['GET', 'HEAD'].includes(options.method || 'GET'))
      headers.set('x-csrf-token', state.csrfToken);
    const response = await fetch(`/api/control${url}`, { ...options, headers });
    const data = await response
      .json()
      .catch(() => ({ success: false, message: 'Некорректный ответ сервера' }));
    if (response.status === 401) {
      window.location.replace('/control/login.html');
      throw new Error('Сессия завершена');
    }
    if (!response.ok)
      throw new Error(data.message || 'Не удалось выполнить запрос');
    return data;
  }

  function toast(message, type = 'success') {
    const item = document.createElement('div');
    item.className = `toast ${type === 'error' ? 'toast--error' : ''}`;
    item.innerHTML = `<i class="ti ti-${type === 'error' ? 'alert-triangle' : 'circle-check'}"></i><span>${escapeHtml(message)}</span><button type="button" aria-label="Закрыть"><i class="ti ti-x"></i></button>`;
    item.querySelector('button').addEventListener('click', () => item.remove());
    toastRoot.append(item);
    setTimeout(() => item.remove(), 4500);
  }

  function showError(error) {
    console.error(error);
    toast(error.message || 'Что-то пошло не так', 'error');
  }

  function modal(title, body, footer = '') {
    modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${attr(title)}"><header class="modal__header"><h2>${escapeHtml(title)}</h2><button class="icon-btn" type="button" data-close-modal aria-label="Закрыть"><i class="ti ti-x"></i></button></header><div class="modal__body">${body}</div>${footer ? `<footer class="modal__footer">${footer}</footer>` : ''}</section></div>`;
    modalRoot.querySelector('[data-close-modal]').focus();
  }
  function closeModal() {
    modalRoot.innerHTML = '';
  }
  function loading() {
    main.innerHTML = `<div class="page-loading"><span class="loader"></span><p>Загружаем данные…</p></div>`;
  }

  function setupUser() {
    document.querySelector('#sidebar-name').textContent = state.user.name;
    document.querySelector('#sidebar-role').textContent =
      labels.roles[state.user.role] || state.user.role;
    document.querySelector('#sidebar-avatar').innerHTML = state.user.avatarPath
      ? `<img src="${attr(state.user.avatarPath)}" alt="">`
      : initials(state.user.name);
    document.querySelector('#topbar-avatar').innerHTML = state.user.avatarPath
      ? `<img src="${attr(state.user.avatarPath)}" alt="">`
      : initials(state.user.name);
    if (!isManager())
      document
        .querySelectorAll('[data-manager]')
        .forEach((node) => node.remove());
  }

  function routeInfo() {
    const hash = location.hash.replace(/^#\//, '') || 'overview';
    const [route, id] = hash.split('/');
    return { route, id: Number(id) || null };
  }
  function setActiveRoute(route) {
    document
      .querySelectorAll('.nav a')
      .forEach((link) =>
        link.classList.toggle('is-active', link.dataset.route === route),
      );
  }

  async function renderRoute() {
    closeModal();
    const { route, id } = routeInfo();
    setActiveRoute(route);
    loading();
    try {
      if (route === 'overview') await renderOverview();
      else if (route === 'leads' && isManager()) await renderLeads();
      else if (route === 'projects') await renderProjects();
      else if (route === 'tasks' && id) await renderTaskDetail(id);
      else if (route === 'tasks') await renderTasks();
      else if (route === 'team') await renderTeam();
      else if (route === 'settings') renderSettings();
      else location.hash = '#/overview';
      main.focus({ preventScroll: true });
    } catch (error) {
      main.innerHTML = `<div class="page">${pageHeader('Не удалось загрузить раздел', 'Проверьте соединение и повторите попытку')}<div class="panel">${empty('cloud-off', 'Данные недоступны', error.message)}<div style="text-align:center;margin-bottom:20px"><button class="button" data-action="retry"><i class="ti ti-refresh"></i> Повторить</button></div></div></div>`;
    }
  }

  function renderProjectRow(project) {
    return `<article class="project-row">
            <div class="project-row__cover">${project.coverPath ? `<img src="${attr(project.coverPath)}" alt="">` : ''}</div>
            <div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.stage || labels.project[project.status])}</p><div class="progress" style="--progress:${project.progress}%"><span></span></div></div>
            <strong>${project.progress}%</strong>
        </article>`;
  }
  function renderTaskRow(task) {
    const free = task.assignmentType === 'POOL' && !task.assigneeId;
    return `<article class="task-row ${free ? 'task-row--free' : ''}" data-open-task="${task.id}">
            <div><h4>${escapeHtml(task.title)}</h4><p>${badge(labels.priority[task.priority], priorityColors[task.priority])} · ${escapeHtml(task.project?.name || 'Без проекта')}</p></div>
            ${free ? `<button class="button button--ghost" type="button" data-claim-task="${task.id}">Взять задачу</button>` : avatar(task.assignee, 'avatar--sm')}
            <span class="task-row__meta">${task.deadline ? date(task.deadline) : task.code}</span>
        </article>`;
  }

  async function renderOverview() {
    const data = await api('/dashboard');
    const navLeads = document.querySelector('#nav-leads');

    if (navLeads) navLeads.textContent = data.metrics.newLeads || '';

    const attentionItems = [
      isManager()
        ? `<a class="attention-row" href="#/leads"><i class="ti ti-file-description"></i><span><b>${data.metrics.newLeads}</b> новых заявок</span><i class="ti ti-chevron-right"></i></a>`
        : '',
      `<a class="attention-row" href="#/tasks"><i class="ti ti-list-check"></i><span><b>${data.metrics.reviewTasks}</b> задач на проверке</span><i class="ti ti-chevron-right"></i></a>`,
      `<a class="attention-row" href="#/projects"><i class="ti ti-folder"></i><span><b>${data.metrics.activeProjects}</b> активных проектов</span><i class="ti ti-chevron-right"></i></a>`,
    ].filter(Boolean);

    main.innerHTML = `<div class="page">
      ${pageHeader(`Добрый день, ${state.user.name.split(' ')[0]}`, 'Главное по работе команды на сегодня')}

      <section class="metric-grid ${isManager() ? '' : 'metric-grid--two'}">
        ${isManager() ? `<a class="metric-card metric-card--link" href="#/leads"><span class="metric-card__icon"><i class="ti ti-file-description"></i></span><div><small>Новые заявки</small><strong>${data.metrics.newLeads}</strong><em>Перейти к обращениям</em></div></a>` : ''}
        <a class="metric-card metric-card--link" href="#/projects"><span class="metric-card__icon"><i class="ti ti-folder"></i></span><div><small>Активные проекты</small><strong>${data.metrics.activeProjects}</strong><em>Открыть проекты</em></div></a>
        <a class="metric-card metric-card--link" href="#/tasks"><span class="metric-card__icon"><i class="ti ti-checkbox"></i></span><div><small>На проверке</small><strong>${data.metrics.reviewTasks}</strong><em>Посмотреть результаты</em></div></a>
      </section>

      <section class="dashboard-grid">
        <article class="panel panel--span-2 dashboard-attention">
          <div class="panel__header"><h2>Требуют внимания</h2></div>
          <div class="attention-list attention-list--overview">${attentionItems.join('')}</div>
        </article>

        <article class="panel">
          <div class="panel__header"><h2>Задачи на сегодня</h2><a href="#/tasks">Все задачи <i class="ti ti-chevron-right"></i></a></div>
          <div class="tabs"><button class="is-active" data-overview-tab="mine">Мои задачи</button><button data-overview-tab="free">Свободные</button><button data-overview-tab="review">На проверке</button></div>
          <div class="task-list" id="overview-tasks">${data.tasks.length ? data.tasks.slice(0, 8).map(renderTaskRow).join('') : empty('clipboard-off', 'Задач пока нет', 'Задачи появятся здесь после создания.')}</div>
        </article>

        <article class="panel">
          <div class="panel__header"><h2>Активные проекты</h2><a href="#/projects">Все проекты <i class="ti ti-chevron-right"></i></a></div>
          <div class="stack">${data.projects.length ? data.projects.map(renderProjectRow).join('') : empty('folder-off', 'Нет активных проектов', 'Создайте проект и добавьте участников.')}</div>
        </article>

        ${isManager() ? `<article class="panel panel--span-2"><div class="panel__header"><h2>Последние заявки</h2><a href="#/leads">Все заявки <i class="ti ti-chevron-right"></i></a></div>${leadTable(data.leads)}</article>` : ''}
      </section>
    </div>`;

    main.querySelectorAll('[data-overview-tab]').forEach((button) =>
      button.addEventListener('click', async () => {
        main
          .querySelectorAll('[data-overview-tab]')
          .forEach((item) =>
            item.classList.toggle('is-active', item === button),
          );

        const query =
          button.dataset.overviewTab === 'mine'
            ? '?mine=true'
            : button.dataset.overviewTab === 'free'
              ? '?free=true'
              : '?status=REVIEW';
        const result = await api(`/tasks${query}`);
        document.querySelector('#overview-tasks').innerHTML = result.tasks.length
          ? result.tasks.slice(0, 8).map(renderTaskRow).join('')
          : empty('clipboard-off', 'Задач нет', 'В этой выборке пока пусто.');
      }),
    );
  }

  function leadTable(leads) {
    if (!leads.length)
      return empty(
        'inbox',
        'Заявок пока нет',
        'Новые обращения с сайта появятся здесь автоматически.',
      );
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Клиент</th><th>Источник</th><th>Статус</th><th>Ответственный</th><th>Следующий контакт</th></tr></thead><tbody>${leads.map((lead) => `<tr data-open-lead="${lead.id}"><td><b>${escapeHtml(lead.name)}</b><br><small>${escapeHtml(lead.email || lead.phone || '')}</small></td><td>${escapeHtml(lead.source)}</td><td>${badge(labels.lead[lead.status], leadColors[lead.status])}</td><td>${lead.assignee ? person(lead.assignee) : '—'}</td><td>${date(lead.nextContactAt)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function person(user) {
    return `<span class="person">${avatar(user, 'avatar--sm')}<span><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.position || labels.roles[user.role] || '')}</small></span></span>`;
  }
  async function renderLeads() {
    const data = await api('/leads');
    main.innerHTML = `<div class="page">${pageHeader('Заявки', 'Все обращения с сайта и работа с потенциальными клиентами')}
          <section class="panel filters"><input class="input" id="lead-search" type="search" placeholder="Поиск по клиенту, email или телефону"><select class="select" id="lead-status"><option value="">Все статусы</option>${Object.entries(
            labels.lead,
          )
            .map(([value, text]) => `<option value="${value}">${text}</option>`)
            .join(
              '',
            )}</select><span style="margin-left:auto;color:#78869a;font-size:11px">Всего: <b>${data.total}</b></span></section>
          <section class="panel" id="lead-results">${leadTable(data.leads)}</section></div>`;
    let debounce;
    const reload = () => {
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        const params = new URLSearchParams({
          search: document.querySelector('#lead-search').value,
          status: document.querySelector('#lead-status').value,
        });
        const result = await api(`/leads?${params}`);
        document.querySelector('#lead-results').innerHTML = leadTable(
          result.leads,
        );
      }, 250);
    };
    document.querySelector('#lead-search').addEventListener('input', reload);
    document.querySelector('#lead-status').addEventListener('change', reload);
  }
  async function openLead(id) {
    const [{ lead }, users] = await Promise.all([
      api(`/leads/${id}`),
      ensureUsers(),
    ]);
    modal(
      `Заявка #${lead.id} · ${lead.name}`,
      `<div class="form-grid">
          <div class="field"><span>Контакт</span><div class="lead-contact">${lead.phone ? `<a href="tel:${attr(lead.phone)}"><i class="ti ti-phone"></i>${escapeHtml(lead.phone)}</a>` : '<span>Телефон не указан</span>'}${lead.email ? `<a href="mailto:${attr(lead.email)}"><i class="ti ti-mail"></i>${escapeHtml(lead.email)}</a>` : '<span>Email не указан</span>'}</div></div>
          <div class="field"><span>Источник</span><div>${escapeHtml(lead.source)} · ${date(lead.createdAt)}</div></div>
          <div class="field field--wide"><span>Сообщение</span><div style="padding:12px;background:#061124;border:1px solid #1a2a42;border-radius:7px;white-space:pre-wrap">${escapeHtml(lead.message)}</div></div>
          <label class="field"><span>Статус</span><select id="lead-modal-status">${Object.entries(
            labels.lead,
          )
            .map(
              ([value, text]) =>
                `<option value="${value}" ${lead.status === value ? 'selected' : ''}>${text}</option>`,
            )
            .join('')}</select></label>
          <label class="field"><span>Ответственный</span><select id="lead-modal-assignee"><option value="">Не назначен</option>${users.map((user) => `<option value="${user.id}" ${lead.assigneeId === user.id ? 'selected' : ''}>${escapeHtml(user.name)}</option>`).join('')}</select></label>
          <label class="field field--wide"><span>Следующий контакт</span><input id="lead-modal-date" type="datetime-local" value="${lead.nextContactAt ? new Date(new Date(lead.nextContactAt) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}"></label>
          <div class="field field--wide"><span>Комментарии</span><div class="comment-list">${lead.notes.map((note) => `<div class="comment">${avatar(note.author, 'avatar--sm')}<div><div class="comment__meta"><b>${escapeHtml(note.author.name)}</b><time>${date(note.createdAt)}</time></div><p>${escapeHtml(note.text)}</p></div></div>`).join('') || `<span style="color:#78869a">Комментариев пока нет</span>`}</div><form id="lead-note-form" class="comment-form"><input class="input" name="text" placeholder="Добавить комментарий…" required><button class="button" type="submit">Отправить</button></form></div>
        </div>`,
      `<button class="button" data-close-modal>Отмена</button><button class="button button--primary" data-save-lead="${id}">Сохранить</button>`,
    );
    document
      .querySelector('#lead-note-form')
      .addEventListener('submit', async (event) => {
        event.preventDefault();
        const value = formValue(event.currentTarget);
        await api(`/leads/${id}/notes`, {
          method: 'POST',
          body: JSON.stringify(value),
        });
        toast('Комментарий добавлен');
        await openLead(id);
      });
  }

  async function ensureUsers() {
    if (!state.users.length) state.users = (await api('/users')).users;
    return state.users;
  }
  async function ensureProjects() {
    if (!state.projects.length)
      state.projects = (await api('/projects')).projects;
    return state.projects;
  }

  function projectCard(project) {
    return `<article class="panel project-card" data-project="${project.id}">
          <div class="project-card__cover">${project.coverPath ? `<img src="${attr(project.coverPath)}" alt="">` : ''}</div>
          <div class="project-card__body"><div class="project-card__top"><div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description || project.stage || 'Внутренний проект ShumDev')}</p></div>${badge(labels.project[project.status], projectColors[project.status])}</div>
          <div class="progress" style="--progress:${project.progress}%"><span></span></div>
          <div class="project-card__footer"><div class="avatar-stack">${project.members
            .slice(0, 4)
            .map((member) => avatar(member.user, 'avatar--sm'))
            .join('')}</div><strong>${project.progress}%</strong></div></div>
        </article>`;
  }
  async function renderProjects() {
    const data = await api('/projects');
    state.projects = data.projects;
    main.innerHTML = `<div class="page">${pageHeader('Проекты', 'Рабочие пространства команды, сроки и прогресс', isManager() ? `<button class="button button--primary" data-action="new-project"><i class="ti ti-plus"></i> Создать проект</button>` : '')}
          <section class="panel filters"><input class="input" id="project-search" type="search" placeholder="Найти проект"><select class="select" id="project-filter"><option value="">Все статусы</option>${Object.entries(
            labels.project,
          )
            .map(([value, text]) => `<option value="${value}">${text}</option>`)
            .join('')}</select></section>
          <section class="project-grid" id="project-grid">${data.projects.length ? data.projects.map(projectCard).join('') : empty('folder-plus', 'Проектов пока нет', 'Создайте первый внутренний проект команды.')}</section></div>`;
    const filter = () => {
      const q = document.querySelector('#project-search').value.toLowerCase();
      const status = document.querySelector('#project-filter').value;
      const rows = data.projects.filter(
        (project) =>
          project.name.toLowerCase().includes(q) &&
          (!status || project.status === status),
      );
      document.querySelector('#project-grid').innerHTML = rows.length
        ? rows.map(projectCard).join('')
        : empty(
            'search-off',
            'Ничего не найдено',
            'Измените запрос или фильтры.',
          );
    };
    document.querySelector('#project-search').addEventListener('input', filter);
    document
      .querySelector('#project-filter')
      .addEventListener('change', filter);
  }
  async function projectModal(project = null) {
    const users = await ensureUsers();
    modal(
      project ? 'Редактировать проект' : 'Новый проект',
      `<form id="project-form" class="form-grid">
          <label class="field field--wide"><span>Название *</span><input name="name" value="${attr(project?.name || '')}" required maxlength="160"></label>
          <label class="field field--wide"><span>Описание</span><textarea name="description">${escapeHtml(project?.description || '')}</textarea></label>
          <label class="field"><span>Статус</span><select name="status">${Object.entries(
            labels.project,
          )
            .map(
              ([value, text]) =>
                `<option value="${value}" ${project?.status === value ? 'selected' : ''}>${text}</option>`,
            )
            .join('')}</select></label>
          <label class="field"><span>Этап</span><input name="stage" value="${attr(project?.stage || '')}" placeholder="Например: Разработка"></label>
          <label class="field"><span>Приоритет</span><select name="priority">${['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => `<option value="${value}" ${project?.priority === value ? 'selected' : ''}>${labels.priority[value]}</option>`).join('')}</select></label>
          <label class="field"><span>Дедлайн</span><input name="deadline" type="date" value="${project?.deadline ? project.deadline.slice(0, 10) : ''}"></label>
          <label class="field field--wide"><span>Ссылка на сайт</span><input name="siteUrl" type="url" value="${attr(project?.siteUrl || '')}" placeholder="https://"></label>
          <label class="field field--wide"><span>Обложка из проекта</span><input name="coverPath" value="${attr(project?.coverPath || '')}" placeholder="/control/media/..."></label>
          <div class="field field--wide"><span>Участники</span>${users.map((user) => `<label class="check-row"><input type="checkbox" name="memberIds" value="${user.id}" ${project?.members?.some((member) => member.user.id === user.id) ? 'checked' : ''}>${avatar(user, 'avatar--xs')} ${escapeHtml(user.name)}</label>`).join('')}</div>
          <div id="project-error" class="form-error field--wide" hidden></div>
        </form>`,
      `<button class="button" data-close-modal>Отмена</button><button class="button button--primary" data-submit-project="${project?.id || ''}">Сохранить проект</button>`,
    );
  }

  function taskCard(task) {
    const completed = task.checklist.filter((item) => item.isCompleted).length;
    const specialStatus = ['DRAFT', 'PAUSED', 'BLOCKED'].includes(task.status)
      ? badge(labels.task[task.status], taskColors[task.status])
      : '';

    return `<article class="task-card" data-open-task="${task.id}">
      <div class="task-card__labels">${badge(labels.priority[task.priority], priorityColors[task.priority])}${specialStatus}${task.project ? badge(task.project.name, 'purple') : ''}</div>
      <h4>${escapeHtml(task.title)}</h4>
      <p>${escapeHtml(task.description || task.code)}</p>
      <div class="task-card__footer"><span><i class="ti ti-calendar"></i>${task.deadline ? date(task.deadline, false) : 'Без срока'}</span><span>${task.checklist.length ? `<i class="ti ti-checkbox"></i>${completed}/${task.checklist.length}` : ''}${avatar(task.assignee, 'avatar--xs')}</span></div>
    </article>`;
  }

  async function renderTasks() {
    const data = await api('/tasks');
    const columns = [
      { title: 'Свободные', statuses: ['AVAILABLE'] },
      { title: 'Назначенные', statuses: ['DRAFT', 'ASSIGNED', 'PAUSED', 'BLOCKED'] },
      { title: 'В работе', statuses: ['IN_PROGRESS'] },
      { title: 'На проверке', statuses: ['REVIEW'] },
      { title: 'Готово', statuses: ['DONE'] },
    ];

    const renderBoard = (tasks) =>
      columns
        .map((column) => {
          const columnTasks = tasks.filter((task) =>
            column.statuses.includes(task.status),
          );

          return `<div class="task-column"><header class="task-column__head"><h3>${column.title}</h3><span>${columnTasks.length}</span></header><div class="task-column__list">${columnTasks.length ? columnTasks.map(taskCard).join('') : '<p class="task-column__empty">Пусто</p>'}</div></div>`;
        })
        .join('');

    main.innerHTML = `<div class="page">${pageHeader('Задачи', 'Свободная, назначенная и выполненная работа команды', isManager() ? `<button class="button button--primary" data-action="new-task"><i class="ti ti-plus"></i> Создать задачу</button>` : '')}
      <section class="panel filters">
        <input class="input" id="task-search" type="search" placeholder="Поиск по задаче или коду">
        <select class="select" id="task-project"><option value="">Все проекты</option>${[...new Map(data.tasks.filter((task) => task.project).map((task) => [task.project.id, task.project])).values()].map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join('')}</select>
        <select class="select" id="task-priority"><option value="">Любой приоритет</option>${Object.entries(labels.priority).map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select>
        <button class="button" id="task-mine"><i class="ti ti-user-check"></i> Только мои</button>
      </section>
      <section class="task-board" id="task-board">${renderBoard(data.tasks)}</section>
    </div>`;

    let mine = false;
    const filter = () => {
      const query = document.querySelector('#task-search').value.toLowerCase();
      const projectId = Number(document.querySelector('#task-project').value);
      const priority = document.querySelector('#task-priority').value;
      const filtered = data.tasks.filter(
        (task) =>
          (task.title.toLowerCase().includes(query) ||
            task.code.toLowerCase().includes(query)) &&
          (!projectId || task.project?.id === projectId) &&
          (!priority || task.priority === priority) &&
          (!mine || task.assignee?.id === state.user.id),
      );

      document.querySelector('#task-board').innerHTML = renderBoard(filtered);
    };

    document.querySelector('#task-search').addEventListener('input', filter);
    document.querySelector('#task-project').addEventListener('change', filter);
    document.querySelector('#task-priority').addEventListener('change', filter);
    document.querySelector('#task-mine').addEventListener('click', (event) => {
      mine = !mine;
      event.currentTarget.classList.toggle('button--primary', mine);
      event.currentTarget.setAttribute('aria-pressed', String(mine));
      filter();
    });
  }

  async function taskModal(task = null) {
    const [users, projects] = await Promise.all([
      ensureUsers(),
      ensureProjects(),
    ]);
    const localDeadline = task?.deadline
      ? new Date(
          new Date(task.deadline) - new Date().getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : '';
    modal(
      task ? `Редактировать ${task.code}` : 'Новая задача',
      `<form id="task-form" class="form-grid">
          <label class="field field--wide"><span>Название *</span><input name="title" required maxlength="240" value="${attr(task?.title || '')}" placeholder="Что нужно сделать"></label>
          <label class="field"><span>Проект</span><select name="projectId" ${task ? 'disabled' : ''}><option value="">Без проекта</option>${projects.map((project) => `<option value="${project.id}" ${task?.projectId === project.id ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('')}</select></label>
          <label class="field"><span>Тип назначения</span><select name="assignmentType" id="assignment-type" ${task ? 'disabled' : ''}><option value="DIRECT" ${task?.assignmentType !== 'POOL' ? 'selected' : ''}>Назначить сотруднику</option><option value="POOL" ${task?.assignmentType === 'POOL' ? 'selected' : ''}>Свободная задача</option></select></label>
          <label class="field" id="assignee-field" ${task?.assignmentType === 'POOL' && !task?.assigneeId ? 'hidden' : ''}><span>Исполнитель *</span><select name="assigneeId"><option value="">Выберите</option>${users
            .filter((u) => u.isActive)
            .map(
              (user) =>
                `<option value="${user.id}" ${task?.assigneeId === user.id ? 'selected' : ''}>${escapeHtml(user.name)}</option>`,
            )
            .join('')}</select></label>
          <label class="field"><span>Приоритет</span><select name="priority">${['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => `<option value="${value}" ${(task?.priority || 'MEDIUM') === value ? 'selected' : ''}>${labels.priority[value]}</option>`).join('')}</select></label>
          <label class="field"><span>Дедлайн</span><input name="deadline" type="datetime-local" value="${localDeadline}"></label>
          <label class="field"><span>Оценка, минут</span><input name="estimatedMinutes" type="number" min="0" step="15" value="${task?.estimatedMinutes || ''}" placeholder="360" ${task ? 'disabled' : ''}></label>
          <label class="field field--wide"><span>Описание</span><textarea name="description" placeholder="Контекст, материалы и ограничения">${escapeHtml(task?.description || '')}</textarea></label>
          <label class="field field--wide"><span>Ожидаемый результат</span><textarea name="expectedResult" placeholder="Что должно быть на выходе">${escapeHtml(task?.expectedResult || '')}</textarea></label>
          ${task ? '' : `<label class="field field--wide"><span>Критерии готовности — по одному в строке</span><textarea name="checklistText" placeholder="Адаптив на desktop и mobile&#10;Проверены все состояния"></textarea></label>`}
          <div id="task-error" class="form-error field--wide" hidden></div>
        </form>`,
      `<button class="button" data-close-modal>Отмена</button><button class="button button--primary" data-submit-task="${task?.id || ''}">${task ? 'Сохранить' : 'Создать задачу'}</button>`,
    );
    document
      .querySelector('#assignment-type')
      .addEventListener(
        'change',
        (event) =>
          (document.querySelector('#assignee-field').hidden =
            event.target.value === 'POOL'),
      );
  }
  async function renderTaskDetail(id) {
    const { task } = await api(`/tasks/${id}`);

    main.innerHTML = `<div class="page">
      ${pageHeader('', '', '', `<a href="#/tasks"><i class="ti ti-arrow-left"></i> К задачам</a> · ${escapeHtml(task.code)}`)}
      <section class="panel task-detail-header"><div class="task-detail-header__top"><div><span class="text-link">${escapeHtml(task.project?.name || 'ShumDev')}</span><h1>${escapeHtml(task.title)}</h1><div class="task-detail-header__meta"><span>Создал ${escapeHtml(task.creator.name)} · ${date(task.createdAt)}</span>${badge(labels.task[task.status], taskColors[task.status])}${badge(labels.priority[task.priority], priorityColors[task.priority])}</div></div><div class="page-header__actions">${isManager() ? `<button class="button" data-edit-task="${task.id}"><i class="ti ti-edit"></i> Редактировать</button>` : ''}${state.user.role === 'OWNER' ? `<button class="button button--danger" data-delete-task="${task.id}" data-task-title="${attr(task.title)}"><i class="ti ti-trash"></i> Удалить</button>` : ''}${task.assignmentType === 'POOL' && !task.assignee ? `<button class="button button--primary" data-claim-task="${task.id}">Взять задачу</button>` : ''}${statusActions(task)}</div></div></section>

      <section class="task-detail-grid">
        <article class="panel task-detail-main">
          <div class="prose-section"><h3>Описание</h3><p>${escapeHtml(task.description || 'Описание пока не добавлено.')}</p></div>
          <div class="prose-section"><h3>Ожидаемый результат</h3><p>${escapeHtml(task.expectedResult || 'Результат не описан.')}</p></div>
          <div class="prose-section"><div class="panel__header"><h3>Критерии готовности</h3><span class="text-link">${task.checklist.filter((item) => item.isCompleted).length} из ${task.checklist.length} выполнено</span></div><div class="checklist">${task.checklist.length ? task.checklist.map((item) => `<label class="check-item"><input type="checkbox" data-check-item="${item.id}" data-task="${task.id}" ${item.isCompleted ? 'checked' : ''} ${task.assignee?.id !== state.user.id && !isManager() ? 'disabled' : ''}>${escapeHtml(item.text)}</label>`).join('') : `<span class="muted-text">Чек-лист пока пуст</span>`}</div></div>
          <div class="prose-section"><div class="panel__header"><h3>Вложения и ссылки</h3><button class="button button--ghost" data-action="attachment" data-task="${task.id}"><i class="ti ti-plus"></i> Добавить</button></div><div class="attachment-list">${task.attachments.length ? task.attachments.map((file) => `<a class="attachment" href="/api/control/attachments/${file.id}/download" target="_blank" rel="noopener noreferrer"><i class="ti ti-${file.externalUrl ? 'link' : 'file'}"></i><span><b>${escapeHtml(file.originalName)}</b><small>${escapeHtml(file.uploader.name)}</small></span><small>${file.sizeBytes ? `${Math.round(file.sizeBytes / 1024)} КБ` : 'Открыть'}</small></a>`).join('') : `<span class="muted-text">Вложений пока нет</span>`}</div></div>
        </article>

        <div class="task-detail-side stack">
          <article class="panel"><div class="panel__header"><h3>Детали задачи</h3></div><dl class="details-list">
            <div class="detail-row"><dt>Проект</dt><dd>${escapeHtml(task.project?.name || '—')}</dd></div>
            <div class="detail-row"><dt>Тип</dt><dd>${task.assignmentType === 'POOL' ? 'Свободная' : 'Назначенная'}</dd></div>
            <div class="detail-row"><dt>Исполнитель</dt><dd>${task.assignee ? person(task.assignee) : 'Не назначен'}</dd></div>
            <div class="detail-row"><dt>Автор</dt><dd>${person(task.creator)}</dd></div>
            <div class="detail-row"><dt>Дедлайн</dt><dd>${date(task.deadline)}</dd></div>
            <div class="detail-row"><dt>Оценка</dt><dd>${task.estimatedMinutes ? formatDuration(task.estimatedMinutes * 60, true) : '—'}</dd></div>
          </dl></article>

          <article class="panel"><div class="panel__header"><h3>История задачи</h3></div><div class="history">${task.activities.length ? task.activities.slice(0, 8).map((item) => `<div class="history-item"><span class="history-item__dot"></span><div><p>${escapeHtml(item.title)}</p><time>${date(item.createdAt)}</time></div></div>`).join('') : `<span class="muted-text">История пока пуста</span>`}</div></article>
        </div>

        <article class="panel comments"><div class="panel__header"><h3>Комментарии</h3></div><div class="comment-list">${task.comments.map((comment) => `<div class="comment">${avatar(comment.author, 'avatar--sm')}<div><div class="comment__meta"><b>${escapeHtml(comment.author.name)}</b>${badge(labels.roles[comment.author.role] || comment.author.role, comment.author.role === 'OWNER' ? 'purple' : 'blue')}<time>${date(comment.createdAt)}</time></div><p>${escapeHtml(comment.text)}</p></div></div>`).join('') || `<span class="muted-text">Комментариев пока нет</span>`}</div><form id="comment-form" class="comment-form" data-task="${task.id}"><input class="input" name="text" placeholder="Добавить комментарий…" required><button class="button button--primary" type="submit">Отправить</button></form></article>
      </section>
    </div>`;

    document
      .querySelector('#comment-form')
      .addEventListener('submit', async (event) => {
        event.preventDefault();
        await api(`/tasks/${id}/comments`, {
          method: 'POST',
          body: JSON.stringify(formValue(event.currentTarget)),
        });
        toast('Комментарий добавлен');
        await renderTaskDetail(id);
      });
  }

  function statusActions(task) {
    if (task.status === 'REVIEW' && isManager())
      return `<button class="button" data-task-status="${task.id}" data-status="IN_PROGRESS"><i class="ti ti-arrow-back-up"></i> На доработку</button><button class="button button--primary" data-task-status="${task.id}" data-status="DONE"><i class="ti ti-check"></i> Принять</button>`;
    if (task.assignee?.id !== state.user.id) return '';
    if (task.status === 'ASSIGNED' || task.status === 'PAUSED' || task.status === 'BLOCKED')
      return `<button class="button button--primary" data-task-status="${task.id}" data-status="IN_PROGRESS"><i class="ti ti-player-play"></i> ${task.status === 'ASSIGNED' ? 'Начать' : 'Возобновить'}</button>`;
    if (task.status === 'IN_PROGRESS')
      return `<button class="button" data-task-status="${task.id}" data-status="PAUSED"><i class="ti ti-player-pause"></i> Пауза</button><button class="button button--primary" data-task-status="${task.id}" data-status="REVIEW"><i class="ti ti-send"></i> На проверку</button>`;
    return '';
  }

  async function renderTeam() {
    const data = await api('/users');
    state.users = data.users;
    main.innerHTML = `<div class="page">${pageHeader('Команда', 'Роли, доступ и текущая загрузка', state.user.role === 'OWNER' ? `<button class="button button--primary" data-action="new-user"><i class="ti ti-user-plus"></i> Добавить сотрудника</button>` : '')}
          <section class="team-grid">${data.users.map((user) => `<article class="panel member-card" data-user="${user.id}">${avatar(user)}<h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.position || labels.roles[user.role])}</p>${badge(labels.roles[user.role], user.role === 'OWNER' ? 'purple' : user.role === 'MANAGER' ? 'blue' : 'gray')} ${!user.isActive ? badge('Отключён', 'red') : ''}<div class="member-card__stats"><span><b>${user._count.assignedTasks}</b><small>задач</small></span><span><b>${user._count.memberships}</b><small>проектов</small></span></div></article>`).join('')}</section></div>`;
  }
  function userModal(user = null) {
    modal(
      user ? `Профиль · ${user.name}` : 'Новый сотрудник',
      `<form id="user-form" class="form-grid">
          <label class="field field--wide"><span>Имя *</span><input name="name" required maxlength="120" value="${attr(user?.name || '')}"></label>
          <label class="field"><span>Email *</span><input name="email" type="email" required value="${attr(user?.email || '')}"></label>
          <label class="field"><span>Роль</span><select name="role"><option value="STAFF" ${user?.role === 'STAFF' ? 'selected' : ''}>Сотрудник</option><option value="MANAGER" ${user?.role === 'MANAGER' ? 'selected' : ''}>Менеджер</option><option value="OWNER" ${user?.role === 'OWNER' ? 'selected' : ''}>Владелец</option></select></label>
          <label class="field field--wide"><span>Должность</span><input name="position" value="${attr(user?.position || '')}" placeholder="Frontend-разработчик"></label>
          <label class="field field--wide"><span>${user ? 'Новый пароль' : 'Временный пароль *'}</span><input name="password" type="password" minlength="12" ${user ? '' : 'required'}><small>${user ? 'Оставьте пустым, чтобы не менять.' : 'Не меньше 12 символов. Передайте безопасным каналом.'}</small></label>
          ${user && user.id !== state.user.id ? `<label class="check-row field--wide"><input type="checkbox" name="isActive" ${user.isActive ? 'checked' : ''}> Аккаунт активен</label>` : ''}
          <div id="user-error" class="form-error field--wide" hidden></div>
        </form>`,
      `<button class="button" data-close-modal>Отмена</button><button class="button button--primary" data-submit-user="${user?.id || ''}">${user ? 'Сохранить' : 'Добавить'}</button>`,
    );
  }

  function renderSettings() {
    main.innerHTML = `<div class="page">${pageHeader('Настройки', 'Профиль, безопасность и параметры внутренней системы')}
          <section class="content-grid"><article class="panel"><div class="panel__header"><h2>Мой профиль</h2></div><div class="form-grid"><div class="field"><span>Имя</span><div>${escapeHtml(state.user.name)}</div></div><div class="field"><span>Email</span><div>${escapeHtml(state.user.email)}</div></div><div class="field"><span>Роль</span><div>${badge(labels.roles[state.user.role], state.user.role === 'OWNER' ? 'purple' : 'blue')}</div></div><div class="field"><span>Должность</span><div>${escapeHtml(state.user.position || '—')}</div></div></div></article>
          <div class="stack"><article class="panel"><div class="panel__header"><h2>Безопасность</h2><i class="ti ti-shield-lock"></i></div><p style="color:#8591a6;font-size:11px">После смены пароля все остальные сессии будут завершены.</p><button class="button" data-action="change-password">Изменить пароль</button></article><article class="panel"><div class="panel__header"><h2>О системе</h2></div><div class="details-list"><div class="detail-row"><dt>Версия</dt><dd>1.0.0</dd></div><div class="detail-row"><dt>База данных</dt><dd>SQLite + Prisma</dd></div><div class="detail-row"><dt>Доступ</dt><dd>Только команда</dd></div></div></article></div></section></div>`;
  }

  async function showNotifications() {
    const popover = document.querySelector('#notifications-popover');
    if (!popover.hidden) {
      popover.hidden = true;
      return;
    }
    const data = await api('/notifications');
    popover.innerHTML = `<div class="panel__header" style="padding:7px"><h3>Уведомления</h3>${data.unread ? `<button class="button button--ghost" data-read-all>Прочитать все</button>` : ''}</div>${data.notifications.length ? data.notifications.map((item) => `<a class="notification-item ${item.isRead ? 'is-read' : ''}" href="${attr(item.href || '#/overview')}" data-notification="${item.id}"><span></span><div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.message || '')}</p><time>${relative(item.createdAt)}</time></div></a>`).join('') : empty('bell-off', 'Уведомлений нет', 'Здесь появятся назначения и комментарии.')}`;
    popover.hidden = false;
    document.querySelector('#notification-dot').hidden = data.unread === 0;
  }
  async function refreshNotificationDot() {
    try {
      const data = await api('/notifications');
      document.querySelector('#notification-dot').hidden = data.unread === 0;
    } catch {}
  }

  async function globalSearch(query) {
    const box = document.querySelector('#search-results');
    if (query.trim().length < 2) {
      box.hidden = true;
      return;
    }
    const data = await api(`/search?q=${encodeURIComponent(query)}`);
    box.innerHTML = data.results.length
      ? data.results
          .map(
            (item) =>
              `<a class="search-result" href="${attr(item.href)}"><i class="ti ti-${item.type === 'task' ? 'square-check' : item.type === 'project' ? 'folder' : 'file-description'}"></i><span>${escapeHtml(item.title)}</span></a>`,
          )
          .join('')
      : `<div class="search-empty">Ничего не найдено</div>`;
    box.hidden = false;
  }

  main.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const openTask = event.target.closest('[data-open-task]');
    const claim = event.target.closest('[data-claim-task]');
    const status = event.target.closest('[data-task-status]');
    const lead = event.target.closest('[data-open-lead]');
    const project = event.target.closest('[data-project]');
    const userCard = event.target.closest('[data-user]');
    const editTask = event.target.closest('[data-edit-task]');
    const deleteTask = event.target.closest('[data-delete-task]');
    try {
      if (action === 'retry') return renderRoute();
      if (action === 'new-task') return taskModal();
      if (action === 'new-project') return projectModal();
      if (action === 'new-user') return userModal();
      if (action === 'attachment')
        return attachmentModal(
          Number(event.target.closest('[data-task]').dataset.task),
        );
      if (action === 'change-password') return passwordModal();
      if (editTask) {
        const result = await api(`/tasks/${editTask.dataset.editTask}`);
        return taskModal(result.task);
      }
      if (deleteTask && state.user.role === 'OWNER') {
        return taskDeleteModal(
          Number(deleteTask.dataset.deleteTask),
          deleteTask.dataset.taskTitle || 'Без названия',
        );
      }
      if (claim) {
        event.stopPropagation();
        await api(`/tasks/${claim.dataset.claimTask}/claim`, {
          method: 'POST',
          body: '{}',
        });
        toast('Задача теперь ваша');
        return renderRoute();
      }
      if (status) {
        await api(`/tasks/${status.dataset.taskStatus}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: status.dataset.status }),
        });
        toast('Статус обновлён');
        return renderRoute();
      }
      if (lead) return openLead(Number(lead.dataset.openLead));
      if (project && isManager())
        return projectModal(
          state.projects.find(
            (item) => item.id === Number(project.dataset.project),
          ),
        );
      if (userCard && state.user.role === 'OWNER')
        return userModal(
          state.users.find((item) => item.id === Number(userCard.dataset.user)),
        );
      if (openTask) location.hash = `#/tasks/${openTask.dataset.openTask}`;
    } catch (error) {
      showError(error);
    }
  });
  main.addEventListener('change', async (event) => {
    if (event.target.matches('[data-check-item]')) {
      try {
        await api(
          `/tasks/${event.target.dataset.task}/checklist/${event.target.dataset.checkItem}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ isCompleted: event.target.checked }),
          },
        );
        toast('Чек-лист обновлён');
      } catch (error) {
        event.target.checked = !event.target.checked;
        showError(error);
      }
    }
  });

  modalRoot.addEventListener('click', async (event) => {
    if (
      event.target.classList.contains('modal-backdrop') ||
      event.target.closest('[data-close-modal]')
    )
      return closeModal();
    try {
      const saveLead = event.target.closest('[data-save-lead]');
      if (saveLead) {
        await api(`/leads/${saveLead.dataset.saveLead}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: document.querySelector('#lead-modal-status').value,
            assigneeId:
              document.querySelector('#lead-modal-assignee').value || null,
            nextContactAt:
              document.querySelector('#lead-modal-date').value || null,
          }),
        });
        toast('Заявка обновлена');
        closeModal();
        return renderRoute();
      }
      const deleteTaskButton = event.target.closest(
        '[data-confirm-delete-task]',
      );
      if (deleteTaskButton) {
        deleteTaskButton.disabled = true;
        deleteTaskButton.innerHTML =
          '<span class="button-loader"></span> Удаляем…';

        await api(`/tasks/${deleteTaskButton.dataset.confirmDeleteTask}`, {
          method: 'DELETE',
        });
        toast('Задача удалена');
        closeModal();
        location.hash = '#/tasks';
        return;
      }

      const projectButton = event.target.closest('[data-submit-project]');
      if (projectButton) {
        const form = document.querySelector('#project-form'),
          data = formValue(form);
        data.memberIds = new FormData(form).getAll('memberIds').map(Number);
        const id = Number(projectButton.dataset.submitProject);
        await api(id ? `/projects/${id}` : '/projects', {
          method: id ? 'PATCH' : 'POST',
          body: JSON.stringify(data),
        });
        state.projects = [];
        toast(id ? 'Проект обновлён' : 'Проект создан');
        closeModal();
        return renderRoute();
      }
      const taskButton = event.target.closest('[data-submit-task]');
      if (taskButton) {
        const data = formValue(document.querySelector('#task-form'));
        if (data.checklistText !== undefined) {
          data.checklist = data.checklistText
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean);
          delete data.checklistText;
        }
        const id = Number(taskButton.dataset.submitTask);
        await api(id ? `/tasks/${id}` : '/tasks', {
          method: id ? 'PATCH' : 'POST',
          body: JSON.stringify(data),
        });
        toast(id ? 'Задача обновлена' : 'Задача создана');
        closeModal();
        return renderRoute();
      }
      const userButton = event.target.closest('[data-submit-user]');
      if (userButton) {
        const form = document.querySelector('#user-form'),
          data = formValue(form),
          id = Number(userButton.dataset.submitUser);
        if (id && form.elements.isActive)
          data.isActive = form.elements.isActive.checked;
        if (!data.password) delete data.password;
        await api(id ? `/users/${id}` : '/users', {
          method: id ? 'PATCH' : 'POST',
          body: JSON.stringify(data),
        });
        state.users = [];
        toast(id ? 'Профиль обновлён' : 'Сотрудник добавлен');
        closeModal();
        return renderRoute();
      }
      if (event.target.closest('[data-submit-password]')) {
        await api('/auth/password', {
          method: 'POST',
          body: JSON.stringify(
            formValue(document.querySelector('#password-form')),
          ),
        });
        toast('Пароль изменён');
        return closeModal();
      }
      if (event.target.closest('[data-submit-attachment]')) {
        const taskId = event.target.closest('[data-submit-attachment]').dataset
          .submitAttachment;
        await api(`/tasks/${taskId}/attachments`, {
          method: 'POST',
          body: new FormData(document.querySelector('#attachment-form')),
        });
        toast('Вложение добавлено');
        closeModal();
        return renderRoute();
      }
    } catch (error) {
      const deleteTaskButton = modalRoot.querySelector(
        '[data-confirm-delete-task]',
      );
      if (deleteTaskButton) {
        deleteTaskButton.disabled = false;
        deleteTaskButton.innerHTML =
          '<i class="ti ti-trash"></i> Удалить задачу';
      }

      const errorNode = modalRoot.querySelector('.form-error');
      if (errorNode) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
      } else showError(error);
    }
  });

  async function attachmentModal(taskId) {
    modal(
      'Добавить вложение',
      `<form id="attachment-form" class="form-stack" enctype="multipart/form-data"><label class="field"><span>Файл до 5 МБ</span><input type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.zip,.docx,.xlsx"></label><label class="field"><span>Или внешняя ссылка</span><input type="url" name="externalUrl" placeholder="https://"></label><label class="field"><span>Название ссылки</span><input name="name" placeholder="Макет в Figma"></label><div class="form-error" hidden></div></form>`,
      `<button class="button" data-close-modal>Отмена</button><button class="button button--primary" data-submit-attachment="${taskId}">Добавить</button>`,
    );
  }
  function passwordModal() {
    modal(
      'Изменить пароль',
      `<form id="password-form" class="form-stack"><label class="field"><span>Текущий пароль</span><input type="password" name="currentPassword" required></label><label class="field"><span>Новый пароль</span><input type="password" name="newPassword" minlength="12" required><small>Минимум 12 символов</small></label><div class="form-error" hidden></div></form>`,
      `<button class="button" data-close-modal>Отмена</button><button class="button button--primary" data-submit-password>Изменить</button>`,
    );
  }
  function taskDeleteModal(taskId, taskTitle) {
    modal(
      'Удалить задачу?',
      `<div class="confirm-delete"><span class="confirm-delete__icon"><i class="ti ti-trash"></i></span><div><h3>${escapeHtml(taskTitle)}</h3><p>Задача, комментарии, чек-лист и связанные вложения будут удалены без возможности восстановления.</p></div><div class="form-error confirm-delete__error" hidden></div></div>`,
      `<button class="button" data-close-modal>Отмена</button><button class="button button--danger" data-confirm-delete-task="${taskId}"><i class="ti ti-trash"></i> Удалить задачу</button>`,
    );
  }

  document.querySelector('#profile-menu').addEventListener('click', () => {
    const pop = document.querySelector('#profile-popover');
    pop.hidden = !pop.hidden;
  });
  async function endSession(redirectUrl) {
    const buttons = document.querySelectorAll(
      '[data-return-to-site], [data-logout]',
    );

    buttons.forEach((button) => {
      button.disabled = true;
    });

    try {
      const response = await fetch('/api/control/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',

        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': state.csrfToken,
        },

        body: '{}',
      });

      if (!response.ok && response.status !== 401) {
        const data = await response.json().catch(() => ({}));

        throw new Error(data.message || 'Не удалось завершить сессию');
      }

      window.location.replace(redirectUrl);
    } catch (error) {
      showError(error);

      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  document
    .querySelector('[data-return-to-site]')
    ?.addEventListener('click', () => {
      endSession('/');
    });

  document.querySelector('[data-logout]')?.addEventListener('click', () => {
    endSession('/control/login.html');
  });
  document
    .querySelector('#quick-task')
    ?.addEventListener('click', () => taskModal());
  document
    .querySelector('#notification-button')
    .addEventListener('click', () => showNotifications().catch(showError));
  document
    .querySelector('#notifications-popover')
    .addEventListener('click', async (event) => {
      if (event.target.closest('[data-read-all]')) {
        await api('/notifications/read', { method: 'POST', body: '{}' });
        return showNotifications();
      }
      const item = event.target.closest('[data-notification]');
      if (item)
        api('/notifications/read', {
          method: 'POST',
          body: JSON.stringify({ id: Number(item.dataset.notification) }),
        }).catch(() => {});
    });
  const searchInput = document.querySelector('#global-search');
  searchInput.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(
      () => globalSearch(searchInput.value).catch(showError),
      220,
    );
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search'))
      document.querySelector('#search-results').hidden = true;
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === 'Escape') {
      closeModal();
      document.querySelector('#search-results').hidden = true;
      document.querySelector('#notifications-popover').hidden = true;
    }
  });
  const sidebar = document.querySelector('#sidebar'),
    backdrop = document.querySelector('#sidebar-backdrop');
  document.querySelector('#mobile-menu').addEventListener('click', () => {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
  });
  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('is-open');
    backdrop.hidden = true;
  });
  document.querySelector('.nav').addEventListener('click', () => {
    sidebar.classList.remove('is-open');
    backdrop.hidden = true;
  });
  window.addEventListener('hashchange', renderRoute);

  async function init() {
    try {
      const auth = await api('/auth/me');
      state.user = auth.user;
      state.csrfToken = auth.csrfToken;
      setupUser();
      await renderRoute();
      refreshNotificationDot();
      setInterval(refreshNotificationDot, 60000);
    } catch (error) {
      if (!state.user) window.location.replace('/control/login.html');
      else showError(error);
    }
  }
  init();
})();
