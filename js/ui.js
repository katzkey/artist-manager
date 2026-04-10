'use strict';

const UI = {
  // ── Sidebar ──
  renderSidebar() {
    const artists = Store.getArtists();
    const activeId = App.state.activeArtistId;
    const activePage = App.state.activePage;
    const activeArtist = Store.getArtist(activeId);

    // Update topbar artist info
    const artistInfo = document.getElementById('topbar-artist');
    if (artistInfo) {
      artistInfo.innerHTML = activeArtist
        ? `<span style="color:var(--text-muted)">アーティスト：</span><strong>${this._esc(activeArtist.name)}</strong>`
        : '<span style="color:var(--text-muted)">アーティストを選択</span>';
    }

    // Artist list
    const artistList = document.getElementById('sidebar-artists');
    if (!artistList) return;

    artistList.innerHTML = artists.map(a => `
      <div class="sidebar__artist ${a.id === activeId ? 'active' : ''}"
           data-artist-id="${a.id}"
           title="${this._esc(a.name)}">
        <div class="artist-avatar ${a.id === activeId ? 'active-ring' : ''}"
             style="background:${a.color || '#7C3AED'}">
          ${this._initials(a.name)}
        </div>
        <div class="sidebar__artist-text">
          <div class="sidebar__artist-name">${this._esc(a.name)}</div>
          <div class="sidebar__artist-role">${this._esc(a.role || '')}</div>
        </div>
      </div>
    `).join('');

    // Nav links
    const nav = document.getElementById('sidebar-nav');
    if (nav) {
      const pages = [
        { id: 'overview',  icon: '⊞', label: '概要' },
        { id: 'schedule',  icon: '📅', label: 'スケジュール' },
        { id: 'sns',       icon: '📣', label: 'SNS投稿' },
      ];
      nav.innerHTML = pages.map(p => `
        <div class="sidebar__nav-item ${p.id === activePage ? 'active' : ''}"
             data-page="${p.id}">
          <span class="sidebar__nav-icon">${p.icon}</span>
          <span>${p.label}</span>
        </div>
      `).join('');
    }

    // Update accent CSS variable per active artist
    if (activeArtist) {
      document.documentElement.style.setProperty('--accent', activeArtist.color || '#7C3AED');
    }

    // Topbar context button label
    this._updateTopbarAction(activePage);
  },

  _updateTopbarAction(page) {
    const btn = document.getElementById('topbar-action-btn');
    if (!btn) return;
    const labels = { overview: null, schedule: '+ イベント追加', sns: '+ 投稿作成' };
    const label = labels[page];
    if (label) {
      btn.textContent = label;
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  },

  // ── Artist switching ──
  setActiveArtist(id) {
    Store.setMeta('activeArtistId', id);
    App.state.activeArtistId = id;
    this.renderSidebar();
    App.navigate(App.state.activePage);
  },

  // ── Modal ──
  openModal(title, bodyHTML, footerHTML) {
    this.closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">${this._esc(title)}</h2>
          <button class="modal-close" id="modal-close-btn" aria-label="閉じる">✕</button>
        </div>
        <div class="modal-body" id="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) this.closeModal();
    });
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());
    // Trap focus
    const firstInput = backdrop.querySelector('input, textarea, select, button');
    if (firstInput) firstInput.focus();
  },

  closeModal() {
    const el = document.getElementById('modal-backdrop');
    if (el) el.remove();
  },

  // ── Toast ──
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-dot"></div><span>${this._esc(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  // ── Confirm ──
  confirm(message) {
    return new Promise(resolve => {
      this.openModal(
        '確認',
        `<p class="confirm-msg">${this._esc(message)}</p>`,
        `<button class="btn btn-secondary" id="confirm-no">キャンセル</button>
         <button class="btn btn-danger"    id="confirm-yes">削除する</button>`
      );
      document.getElementById('confirm-yes').addEventListener('click', () => {
        this.closeModal();
        resolve(true);
      });
      document.getElementById('confirm-no').addEventListener('click', () => {
        this.closeModal();
        resolve(false);
      });
    });
  },

  // ── Date helpers ──
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
  },

  formatDateTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  // ── Private helpers ──
  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _initials(name) {
    return (name || '?').slice(0, 2).toUpperCase();
  }
};
