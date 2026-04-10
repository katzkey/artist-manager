'use strict';

const App = {
  state: {
    activeArtistId: null,
    activePage: 'overview'
  },

  init() {
    Store.migrate();
    Seed.load();
    this.state.activeArtistId = Store.getMeta('activeArtistId') || Store.getArtists()[0]?.id || null;

    UI.renderSidebar();
    this.navigate('overview');
    this.bindGlobalEvents();
  },

  navigate(page) {
    this.state.activePage = page;
    Store.setMeta('activePage', page);
    UI.renderSidebar();
    this._renderPage(page);
  },

  _renderPage(page) {
    const area = document.getElementById('content-area');
    if (!area) return;

    if (page === 'overview') {
      area.innerHTML = this._overviewHTML();
      return;
    }

    if (page === 'schedule') {
      area.innerHTML = this._scheduleHTML();
      Schedule.init();
      return;
    }

    if (page === 'sns') {
      area.innerHTML = this._snsHTML();
      SNS.init();
      return;
    }
  },

  bindGlobalEvents() {
    // Sidebar: single delegation for artist switching and nav
    document.querySelector('.sidebar')?.addEventListener('click', e => {
      const artistEl = e.target.closest('[data-artist-id]');
      if (artistEl) { UI.setActiveArtist(artistEl.dataset.artistId); return; }

      const pageEl = e.target.closest('[data-page]');
      if (pageEl) { this.navigate(pageEl.dataset.page); return; }

      if (e.target.closest('#add-artist-btn')) { Artists.openAddModal(); return; }
    });

    // Topbar menu toggle
    document.getElementById('topbar-menu-btn')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('collapsed');
    });

    // Topbar action button (+ イベント追加 / + 投稿作成)
    document.getElementById('topbar-action-btn')?.addEventListener('click', () => {
      if (this.state.activePage === 'schedule') Schedule.openEventModal(null);
      if (this.state.activePage === 'sns')      SNS.openComposer(null);
    });

    // Topbar settings gear -> settings menu
    document.getElementById('topbar-settings-btn')?.addEventListener('click', () => {
      this._openSettingsModal();
    });

    // Content area delegation: overview buttons (すべて見る / アーティスト設定)
    document.getElementById('content-area')?.addEventListener('click', e => {
      const pageEl = e.target.closest('[data-page]');
      if (pageEl) { this.navigate(pageEl.dataset.page); return; }

      if (e.target.closest('#overview-edit-artist')) {
        if (this.state.activeArtistId) Artists.openEditModal(this.state.activeArtistId);
        return;
      }
    });
  },

  _openSettingsModal() {
    const body = `
      <div style="display:flex;flex-direction:column;gap:12px">
        ${this.state.activeArtistId ? `
        <button class="btn btn-secondary" id="settings-edit-artist" style="width:100%;justify-content:flex-start">
          🎤 アーティスト設定
        </button>` : ''}
        <button class="btn btn-secondary" id="settings-export" style="width:100%;justify-content:flex-start">
          💾 データをバックアップ (JSON)
        </button>
        <button class="btn btn-secondary" id="settings-import" style="width:100%;justify-content:flex-start">
          📂 バックアップから復元
        </button>
        <button class="btn btn-danger btn-sm" id="settings-reset" style="width:100%;justify-content:flex-start;margin-top:8px">
          🗑️ すべてのデータをリセット
        </button>
      </div>
    `;
    UI.openModal('設定', body, '');

    document.getElementById('settings-edit-artist')?.addEventListener('click', () => {
      UI.closeModal();
      Artists.openEditModal(this.state.activeArtistId);
    });

    document.getElementById('settings-export').addEventListener('click', () => {
      Store.exportJSON();
      UI.showToast('バックアップをダウンロードしました');
    });

    document.getElementById('settings-import').addEventListener('click', async () => {
      try {
        await Store.importJSON();
        UI.closeModal();
        this.state.activeArtistId = Store.getMeta('activeArtistId') || Store.getArtists()[0]?.id || null;
        UI.renderSidebar();
        this.navigate('overview');
        UI.showToast('データを復元しました');
      } catch (err) {
        UI.showToast(String(err), 'error');
      }
    });

    document.getElementById('settings-reset').addEventListener('click', async () => {
      const ok = await UI.confirm('すべてのデータを削除してデモデータに戻しますか？この操作は元に戻せません。');
      if (!ok) return;
      localStorage.removeItem(Store.KEY);
      Store.migrate();
      Seed.load();
      this.state.activeArtistId = Store.getMeta('activeArtistId') || Store.getArtists()[0]?.id || null;
      UI.closeModal();
      UI.renderSidebar();
      this.navigate('overview');
      UI.showToast('データをリセットしました');
    });
  },

  // ── Page HTML templates ──

  _overviewHTML() {
    const artistId = this.state.activeArtistId;
    if (!artistId) {
      return `
        <div class="page-header">
          <div>
            <div class="page-title">概要</div>
          </div>
        </div>
        <div class="empty-state" style="margin-top:60px">
          <div class="empty-icon">🎵</div>
          <div class="empty-title">アーティストが登録されていません</div>
          <div class="empty-desc">サイドバーの「+」からアーティストを追加してください</div>
        </div>`;
    }

    const artist = Store.getArtist(artistId);
    const events = Store.getEvents(artistId);
    const posts  = Store.getPosts(artistId);
    const today  = new Date().toISOString().slice(0, 10);

    const upcoming = events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    const pendingPosts = posts.filter(p => p.status === 'scheduled');
    const thisWeek = events.filter(e => {
      const diff = (new Date(e.date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000;
      return diff >= 0 && diff < 7;
    });

    const typeLabel = { show: 'ライブ', rehearsal: 'リハーサル', meeting: '打ち合わせ', other: 'その他' };
    const badgeClass = { show: 'badge-show', rehearsal: 'badge-rehearsal', meeting: 'badge-meeting', other: 'badge-other' };

    const upcomingHTML = upcoming.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">直近の予定はありません</div></div>`
      : upcoming.map(ev => `
        <div class="event-card" style="cursor:default;margin-bottom:8px;">
          <div class="event-time-col">
            <div style="font-size:11px;color:var(--text-muted)">${UI.formatDateShort(ev.date)}</div>
            <div class="event-time-start">${ev.startTime || ''}</div>
          </div>
          <div class="event-main">
            <div class="event-title">${UI._esc(ev.title)}</div>
            ${ev.venue ? `<div class="event-venue">📍 ${UI._esc(ev.venue)}</div>` : ''}
            <div class="event-meta"><span class="badge ${badgeClass[ev.type] || 'badge-other'}">${typeLabel[ev.type] || ev.type}</span></div>
          </div>
        </div>
      `).join('');

    const pendingHTML = pendingPosts.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📣</div><div class="empty-title">スケジュール済みの投稿はありません</div></div>`
      : pendingPosts.slice(0, 4).map(p => {
          const platforms = (p.platforms || []).map(id => {
            const pf = SNS.PLATFORMS.find(x => x.id === id);
            return pf ? `<span class="platform-chip ${id}">${pf.icon}</span>` : '';
          }).join('');
          return `
            <div class="card" style="margin-bottom:8px;padding:12px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
                <div style="display:flex;gap:4px">${platforms}</div>
                <span class="badge badge-scheduled">スケジュール済</span>
              </div>
              <div style="font-size:12px;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${UI._esc(p.content)}</div>
              ${p.scheduledAt ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px">🕐 ${UI.formatDateTime(p.scheduledAt)}</div>` : ''}
            </div>`;
        }).join('');

    return `
      <div class="page-header">
        <div>
          <div class="page-title">${UI._esc(artist?.name || '')} の概要</div>
          <div class="page-subtitle">${UI._esc(artist?.genre || '')}${artist?.role ? ' · ' + UI._esc(artist.role) : ''}</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="overview-edit-artist">アーティスト設定</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">今後のイベント</div>
          <div class="kpi-value">${upcoming.length}</div>
          <div class="kpi-sub">件の予定</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">今週のスケジュール</div>
          <div class="kpi-value">${thisWeek.length}</div>
          <div class="kpi-sub">件（7日以内）</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">投稿予約中</div>
          <div class="kpi-value">${pendingPosts.length}</div>
          <div class="kpi-sub">件のSNS投稿</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📅 直近のイベント</span>
            <button class="btn btn-ghost btn-sm" data-page="schedule">すべて見る →</button>
          </div>
          ${upcomingHTML}
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">📣 スケジュール済みSNS投稿</span>
            <button class="btn btn-ghost btn-sm" data-page="sns">すべて見る →</button>
          </div>
          ${pendingHTML}
        </div>
      </div>
    `;
  },

  _scheduleHTML() {
    return `
      <div class="page-header">
        <div>
          <div class="page-title">スケジュール管理</div>
          <div class="page-subtitle">ライブ・リハーサル・打ち合わせを管理</div>
        </div>
      </div>

      <div class="filter-tabs">
        <div class="filter-tab active" data-type="all">すべて</div>
        <div class="filter-tab" data-type="show">ライブ</div>
        <div class="filter-tab" data-type="rehearsal">リハーサル</div>
        <div class="filter-tab" data-type="meeting">打ち合わせ</div>
        <div class="filter-tab" data-type="other">その他</div>
      </div>

      <div class="schedule-layout">
        <div>
          <div class="calendar" id="calendar">
            <div class="calendar-header">
              <span class="calendar-month" id="cal-month-label"></span>
              <div class="calendar-nav">
                <button class="calendar-nav-btn" id="cal-prev">‹</button>
                <button class="calendar-nav-btn" id="cal-next">›</button>
              </div>
            </div>
            <div class="calendar-grid">
              ${['日','月','火','水','木','金','土'].map(d => `<div class="calendar-dow">${d}</div>`).join('')}
              <div id="calendar-grid-inner" style="display:contents"></div>
            </div>
          </div>
        </div>

        <div>
          <div class="event-list-header">
            <h3 style="font-size:14px;font-weight:600">イベント一覧</h3>
          </div>
          <div id="event-list"></div>
        </div>
      </div>
    `;
  },

  _snsHTML() {
    return `
      <div class="page-header">
        <div>
          <div class="page-title">SNS投稿管理</div>
          <div class="page-subtitle">各プラットフォームの投稿をスケジュール管理</div>
        </div>
      </div>

      <div class="sns-toolbar">
        <div class="platform-filter">
          <button class="platform-filter-btn active" data-platform="all">すべて</button>
          <button class="platform-filter-btn twitter"   data-platform="twitter">𝕏 Twitter</button>
          <button class="platform-filter-btn instagram" data-platform="instagram">📸 Instagram</button>
          <button class="platform-filter-btn youtube"   data-platform="youtube">▶ YouTube</button>
        </div>
        <div class="status-filter">
          <button class="status-filter-btn active" data-status="all">すべて</button>
          <button class="status-filter-btn" data-status="scheduled">予約済み</button>
          <button class="status-filter-btn" data-status="draft">下書き</button>
          <button class="status-filter-btn" data-status="posted">投稿済み</button>
        </div>
      </div>

      <div class="post-grid" id="post-grid"></div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
