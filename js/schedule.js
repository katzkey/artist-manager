'use strict';

const Schedule = {
  currentMonth: new Date(),
  selectedDate: null,
  filterType: 'all',

  _abortCtrl: null,

  init() {
    const artistId = App.state.activeArtistId;
    if (!artistId) {
      document.getElementById('content-area').innerHTML = this._noArtistHTML();
      return;
    }
    this.currentMonth = new Date();
    this.currentMonth.setDate(1);
    this.selectedDate = null;
    this.filterType = 'all';
    this.renderCalendar();
    this.renderEventList();
    this.bindEvents();
  },

  bindEvents() {
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = new AbortController();
    const { signal } = this._abortCtrl;
    const area = document.getElementById('content-area');

    // Calendar nav
    area.addEventListener('click', e => {
      if (e.target.closest('#cal-prev')) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.renderCalendar();
        return;
      }
      if (e.target.closest('#cal-next')) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.renderCalendar();
        return;
      }
      // Calendar day click
      const day = e.target.closest('.calendar-day[data-date]');
      if (day) {
        this.selectedDate = day.dataset.date;
        this.renderCalendar();
        this.renderEventList();
        return;
      }
      // Event card click
      const card = e.target.closest('.event-card[data-event-id]');
      if (card) {
        this.openEventModal(card.dataset.eventId);
        return;
      }
      // Filter tabs
      const tab = e.target.closest('.filter-tab[data-type]');
      if (tab) {
        this.filterType = tab.dataset.type;
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.type === this.filterType));
        this.renderEventList();
        return;
      }
    }, { signal });
  },

  renderCalendar() {
    const cal = document.getElementById('calendar-grid-inner');
    if (!cal) return;

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const today = new Date();
    today.setHours(0,0,0,0);

    // Month label
    const label = document.getElementById('cal-month-label');
    if (label) label.textContent = `${year}年${month + 1}月`;

    // Build day cells
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    // Get events + scheduled SNS posts for dot rendering
    const events = Store.getEvents(App.state.activeArtistId);
    const snsPosts = Store.getPosts(App.state.activeArtistId)
      .filter(p => p.status === 'scheduled' && p.scheduledAt);
    const snsPostDates = new Set(snsPosts.map(p => p.scheduledAt.slice(0, 10)));
    const eventDates = new Set(events.map(e => e.date));

    let html = '';
    // Pad previous month days
    for (let i = 0; i < startDow; i++) {
      const prevDate = new Date(year, month, -startDow + i + 1);
      html += `<div class="calendar-day other-month">
        <span class="cal-num">${prevDate.getDate()}</span>
        <div class="cal-dots"></div>
      </div>`;
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayDate = new Date(year, month, d);
      const isToday   = dayDate.getTime() === today.getTime();
      const isSelected = dateStr === this.selectedDate;
      const hasEvent  = eventDates.has(dateStr);
      const hasSNS    = snsPostDates.has(dateStr);
      const classes   = ['calendar-day', isToday ? 'today' : '', isSelected ? 'selected' : ''].filter(Boolean).join(' ');

      const dots = [
        hasEvent ? '<div class="cal-dot"></div>' : '',
        hasSNS   ? '<div class="cal-dot" style="background:var(--warning)"></div>' : ''
      ].join('');

      html += `<div class="${classes}" data-date="${dateStr}">
        <span class="cal-num">${d}</span>
        <div class="cal-dots">${dots}</div>
      </div>`;
    }

    // Pad next month
    const remaining = 42 - (startDow + totalDays);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day other-month">
        <span class="cal-num">${i}</span>
        <div class="cal-dots"></div>
      </div>`;
    }

    cal.innerHTML = html;
  },

  renderEventList() {
    const listEl = document.getElementById('event-list');
    if (!listEl) return;

    let events = Store.getEvents(App.state.activeArtistId);

    // Merge scheduled SNS posts as pseudo-events
    const snsPosts = Store.getPosts(App.state.activeArtistId)
      .filter(p => p.status === 'scheduled' && p.scheduledAt);
    const snsAsEvents = snsPosts.map(p => {
      const dt = new Date(p.scheduledAt);
      const pad = n => String(n).padStart(2, '0');
      return {
        id: p.id,
        artistId: p.artistId,
        title: '📣 ' + (p.content || '').slice(0, 30) + (p.content.length > 30 ? '...' : ''),
        type: 'sns',
        date: `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`,
        startTime: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
        endTime: '',
        venue: (p.platforms || []).map(id => { const pf = SNS.PLATFORMS.find(x => x.id === id); return pf ? pf.label : id; }).join(', '),
        location: '',
        _isSNS: true
      };
    });

    events = [...events, ...snsAsEvents];

    // Filter by type
    if (this.filterType !== 'all' && this.filterType !== 'sns') {
      events = events.filter(e => e.type === this.filterType);
    } else if (this.filterType === 'sns') {
      events = events.filter(e => e._isSNS);
    }

    // Filter by selected date
    if (this.selectedDate) {
      events = events.filter(e => e.date === this.selectedDate);
    }

    // Sort by date + time
    events.sort((a, b) => {
      const da = `${a.date}T${a.startTime || '00:00'}`;
      const db = `${b.date}T${b.startTime || '00:00'}`;
      return da.localeCompare(db);
    });

    if (events.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div class="empty-title">${this.selectedDate ? 'この日のイベントはありません' : 'イベントがありません'}</div>
          <div class="empty-desc">「+ イベント追加」から登録してください</div>
        </div>`;
      return;
    }

    // Group by date
    const groups = {};
    events.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });

    const html = Object.entries(groups).map(([date, evts]) => `
      <div class="event-group">
        <div class="event-group-date">${UI.formatDateShort(date)}</div>
        ${evts.map(ev => this._eventCardHTML(ev)).join('')}
      </div>
    `).join('');

    listEl.innerHTML = html;
  },

  _eventCardHTML(ev) {
    const typeLabel = { show: 'ライブ', rehearsal: 'リハーサル', meeting: '打ち合わせ', other: 'その他', sns: 'SNS投稿' };
    const badgeClass = { show: 'badge-show', rehearsal: 'badge-rehearsal', meeting: 'badge-meeting', other: 'badge-other', sns: 'badge-scheduled' };
    return `
      <div class="event-card" data-event-id="${ev.id}">
        <div class="event-time-col">
          <div class="event-time-start">${ev.startTime || '--:--'}</div>
          ${ev.endTime ? `<div class="text-muted">${ev.endTime}</div>` : ''}
        </div>
        <div class="event-main">
          <div class="event-title">${UI._esc(ev.title)}</div>
          ${ev.venue ? `<div class="event-venue">📍 ${UI._esc(ev.venue)}${ev.location ? ` · ${UI._esc(ev.location)}` : ''}</div>` : ''}
          <div class="event-meta">
            <span class="badge ${badgeClass[ev.type] || 'badge-other'}">${typeLabel[ev.type] || ev.type}</span>
          </div>
        </div>
      </div>
    `;
  },

  openEventModal(eventId) {
    const ev = eventId ? Store.getEvent(eventId) : null;
    const title = ev ? 'イベント編集' : 'イベント追加';

    const body = `
      <input type="hidden" id="ev-id" value="${ev?.id || ''}">
      <div class="form-group">
        <label class="form-label">タイトル *</label>
        <input type="text" id="ev-title" placeholder="例: サマーライブ 2026" value="${UI._esc(ev?.title || '')}" maxlength="80">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">種別</label>
          <select id="ev-type">
            ${[['show','ライブ'],['rehearsal','リハーサル'],['meeting','打ち合わせ'],['other','その他']]
              .map(([v,l]) => `<option value="${v}" ${ev?.type===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">日付 *</label>
          <input type="date" id="ev-date" value="${ev?.date || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">開始時刻</label>
          <input type="time" id="ev-start" value="${ev?.startTime || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">終了時刻</label>
          <input type="time" id="ev-end" value="${ev?.endTime || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">会場</label>
          <input type="text" id="ev-venue" placeholder="例: Zepp Tokyo" value="${UI._esc(ev?.venue || '')}" maxlength="60">
        </div>
        <div class="form-group">
          <label class="form-label">場所</label>
          <input type="text" id="ev-location" placeholder="例: 東京" value="${UI._esc(ev?.location || '')}" maxlength="40">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">メモ</label>
        <textarea id="ev-notes" placeholder="詳細メモを入力...">${UI._esc(ev?.notes || '')}</textarea>
      </div>
    `;

    const footer = `
      ${ev ? `<button class="btn btn-danger btn-sm" id="ev-delete-btn">削除</button>` : ''}
      <div style="flex:1"></div>
      <button class="btn btn-secondary" id="ev-cancel-btn">キャンセル</button>
      <button class="btn btn-primary"   id="ev-save-btn">${ev ? '更新する' : '追加する'}</button>
    `;

    UI.openModal(title, body, footer);

    document.getElementById('ev-cancel-btn').addEventListener('click', () => UI.closeModal());

    document.getElementById('ev-save-btn').addEventListener('click', () => {
      const t = document.getElementById('ev-title').value.trim();
      const d = document.getElementById('ev-date').value;
      if (!t) { UI.showToast('タイトルを入力してください', 'error'); return; }
      if (!d) { UI.showToast('日付を選択してください', 'error'); return; }

      const saved = {
        id:        document.getElementById('ev-id').value || Store.generateId('evt'),
        artistId:  App.state.activeArtistId,
        title:     t,
        type:      document.getElementById('ev-type').value,
        date:      d,
        startTime: document.getElementById('ev-start').value,
        endTime:   document.getElementById('ev-end').value,
        venue:     document.getElementById('ev-venue').value.trim(),
        location:  document.getElementById('ev-location').value.trim(),
        notes:     document.getElementById('ev-notes').value.trim(),
        createdAt: ev?.createdAt || new Date().toISOString()
      };

      Store.saveEvent(saved);
      UI.closeModal();
      this.renderCalendar();
      this.renderEventList();
      UI.showToast(ev ? 'イベントを更新しました' : 'イベントを追加しました');
    });

    if (ev) {
      document.getElementById('ev-delete-btn').addEventListener('click', async () => {
        const ok = await UI.confirm(`「${ev.title}」を削除しますか？`);
        if (!ok) return;
        Store.deleteEvent(ev.id);
        UI.closeModal();
        this.renderCalendar();
        this.renderEventList();
        UI.showToast('イベントを削除しました');
      });
    }
  },

  _noArtistHTML() {
    return `<div class="empty-state" style="margin-top:80px">
      <div class="empty-icon">🎵</div>
      <div class="empty-title">アーティストが登録されていません</div>
      <div class="empty-desc">サイドバーの「+」からアーティストを追加してください</div>
    </div>`;
  }
};
