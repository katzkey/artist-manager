'use strict';

const SNS = {
  platformFilter: 'all',
  statusFilter: 'all',
  _checker: null,
  _hashtags: [],

  _abortCtrl: null,

  PLATFORMS: [
    { id: 'twitter',   label: 'X / Twitter', icon: '𝕏', limit: 280 },
    { id: 'instagram', label: 'Instagram',   icon: '📸', limit: 2200 },
    { id: 'youtube',   label: 'YouTube',     icon: '▶', limit: 5000 }
  ],

  init() {
    const artistId = App.state.activeArtistId;
    if (!artistId) {
      document.getElementById('content-area').innerHTML = this._noArtistHTML();
      return;
    }
    this.platformFilter = 'all';
    this.statusFilter = 'all';
    this.renderPosts();
    this.bindEvents();
    this.startStatusChecker();
  },

  bindEvents() {
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = new AbortController();
    const { signal } = this._abortCtrl;
    const area = document.getElementById('content-area');

    area.addEventListener('click', e => {
      // Platform filter
      const pfBtn = e.target.closest('.platform-filter-btn[data-platform]');
      if (pfBtn) {
        this.platformFilter = pfBtn.dataset.platform;
        document.querySelectorAll('.platform-filter-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.platform === this.platformFilter));
        this.renderPosts();
        return;
      }

      // Status filter
      const sfBtn = e.target.closest('.status-filter-btn[data-status]');
      if (sfBtn) {
        this.statusFilter = sfBtn.dataset.status;
        document.querySelectorAll('.status-filter-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.status === this.statusFilter));
        this.renderPosts();
        return;
      }

      // Post card click (not on action buttons)
      const card = e.target.closest('.post-card[data-post-id]');
      if (card && !e.target.closest('.post-actions')) {
        this.openComposer(card.dataset.postId);
        return;
      }

      // Edit button
      const editBtn = e.target.closest('.post-edit-btn[data-post-id]');
      if (editBtn) {
        this.openComposer(editBtn.dataset.postId);
        return;
      }

      // Delete button
      const delBtn = e.target.closest('.post-delete-btn[data-post-id]');
      if (delBtn) {
        this._deletePost(delBtn.dataset.postId);
        return;
      }
    }, { signal });
  },

  renderPosts() {
    const container = document.getElementById('post-grid');
    if (!container) return;

    let posts = Store.getPosts(App.state.activeArtistId);

    // Filter
    if (this.platformFilter !== 'all') {
      posts = posts.filter(p => (p.platforms || []).includes(this.platformFilter));
    }
    if (this.statusFilter !== 'all') {
      posts = posts.filter(p => p.status === this.statusFilter);
    }

    // Sort: scheduled first (by scheduledAt), then draft, then posted
    const order = { scheduled: 0, draft: 1, posted: 2 };
    posts.sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
      return 0;
    });

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">📣</div>
          <div class="empty-title">投稿がありません</div>
          <div class="empty-desc">「+ 投稿作成」から新しい投稿を作成してください</div>
        </div>`;
      return;
    }

    container.innerHTML = posts.map(p => this._postCardHTML(p)).join('');
  },

  _postCardHTML(p) {
    const statusLabel = { scheduled: 'スケジュール済', draft: '下書き', posted: '投稿済み' };
    const statusClass = { scheduled: 'badge-scheduled', draft: 'badge-draft', posted: 'badge-posted' };
    const platformChips = (p.platforms || []).map(id => {
      const pf = this.PLATFORMS.find(x => x.id === id);
      return pf ? `<span class="platform-chip ${id}">${pf.icon} ${pf.label}</span>` : '';
    }).join('');

    const dtStr = p.scheduledAt
      ? `🕐 ${UI.formatDateTime(p.scheduledAt)}`
      : (p.status === 'draft' ? '下書き保存中' : '');

    return `
      <div class="post-card" data-post-id="${p.id}">
        <div class="post-card-header">
          <div class="post-platforms">${platformChips}</div>
          <span class="badge ${statusClass[p.status] || 'badge-draft'}">${statusLabel[p.status] || p.status}</span>
        </div>
        <div class="post-content">${UI._esc(p.content)}</div>
        ${p.hashtags?.length ? `<div class="hashtags-preview" style="display:flex;gap:4px;flex-wrap:wrap">
          ${p.hashtags.map(h => `<span class="hashtag-chip">${UI._esc(h)}</span>`).join('')}
        </div>` : ''}
        <div class="post-footer">
          <span class="post-datetime">${dtStr}</span>
          <div class="post-actions">
            <button class="btn btn-icon post-edit-btn" data-post-id="${p.id}" title="編集">✏️</button>
            <button class="btn btn-icon post-delete-btn" data-post-id="${p.id}" title="削除">🗑️</button>
          </div>
        </div>
      </div>
    `;
  },

  openComposer(postId) {
    const post = postId ? Store.getPost(postId) : null;
    this._hashtags = post?.hashtags ? [...post.hashtags] : [];
    const isScheduled = post?.status === 'scheduled' || (post?.scheduledAt && post?.status !== 'posted');
    const dtLocal = post?.scheduledAt ? this._isoToLocal(post.scheduledAt) : '';

    const platformCheckboxes = this.PLATFORMS.map(pf => `
      <label class="platform-checkbox ${pf.id}">
        <input type="checkbox" name="platform" value="${pf.id}"
               ${(post?.platforms || []).includes(pf.id) ? 'checked' : ''}>
        ${pf.icon} ${pf.label}
      </label>
    `).join('');

    const body = `
      <input type="hidden" id="post-id" value="${post?.id || ''}">
      <div class="form-group">
        <label class="form-label">投稿プラットフォーム *</label>
        <div class="composer-platforms">${platformCheckboxes}</div>
      </div>
      <div class="form-group">
        <label class="form-label">本文 *</label>
        <textarea id="post-content" placeholder="投稿内容を入力..." maxlength="5000" rows="5">${UI._esc(post?.content || '')}</textarea>
        <div class="char-counter" id="char-counter">0 / 280</div>
      </div>
      <div class="form-group">
        <label class="form-label">ハッシュタグ</label>
        <div class="hashtag-input-row">
          <input type="text" id="hashtag-input" placeholder="#タグを入力してEnter" maxlength="50">
          <button class="btn btn-secondary btn-sm" id="hashtag-add-btn">追加</button>
        </div>
        <div class="hashtags-list" id="hashtags-list">${this._renderHashtagsList()}</div>
      </div>
      <div class="form-group">
        <label class="form-label">投稿日時（入力するとスケジュール予約、空なら下書き保存）</label>
        <input type="datetime-local" id="post-datetime" value="${dtLocal}">
      </div>
    `;

    const footer = `
      ${post ? `<button class="btn btn-danger btn-sm" id="post-delete-footer-btn" data-post-id="${post.id}">削除</button>` : ''}
      <div style="flex:1"></div>
      <button class="btn btn-secondary" id="post-cancel-btn">キャンセル</button>
      <button class="btn btn-primary" id="post-save-btn">${post?.status === 'posted' ? '更新する' : '保存する'}</button>
    `;

    UI.openModal(post ? '投稿を編集' : '投稿を作成', body, footer);

    // Character counter
    const contentEl = document.getElementById('post-content');
    const counterEl = document.getElementById('char-counter');
    const updateCounter = () => {
      const len = contentEl.value.length;
      const platforms = [...document.querySelectorAll('input[name="platform"]:checked')].map(c => c.value);
      const limit = Math.min(...platforms.map(id => this.PLATFORMS.find(p => p.id === id)?.limit || 5000), 5000);
      const effectiveLimit = platforms.length === 0 ? 280 : limit;
      counterEl.textContent = `${len} / ${effectiveLimit}`;
      counterEl.classList.toggle('over', len > effectiveLimit);
    };
    contentEl.addEventListener('input', updateCounter);
    document.querySelectorAll('input[name="platform"]').forEach(cb => cb.addEventListener('change', updateCounter));
    updateCounter();

    // No toggle needed - datetime field presence determines scheduling

    // Hashtag adding
    const addHashtag = () => {
      const input = document.getElementById('hashtag-input');
      let tag = input.value.trim();
      if (!tag) return;
      if (!tag.startsWith('#')) tag = '#' + tag;
      if (!this._hashtags.includes(tag)) {
        this._hashtags.push(tag);
        document.getElementById('hashtags-list').innerHTML = this._renderHashtagsList();
        this._bindHashtagRemove();
      }
      input.value = '';
    };

    document.getElementById('hashtag-add-btn').addEventListener('click', addHashtag);
    document.getElementById('hashtag-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addHashtag(); }
    });
    this._bindHashtagRemove();

    // Delete from footer
    if (post) {
      document.getElementById('post-delete-footer-btn')?.addEventListener('click', async () => {
        const ok = await UI.confirm('この投稿を削除しますか？');
        if (!ok) return;
        Store.deletePost(post.id);
        UI.closeModal();
        this.renderPosts();
        UI.showToast('投稿を削除しました');
      });
    }

    document.getElementById('post-cancel-btn').addEventListener('click', () => UI.closeModal());

    // Save button: auto-detect scheduled vs draft based on datetime
    document.getElementById('post-save-btn').addEventListener('click', () => {
      if (post?.status === 'posted') {
        this._savePost('posted', post);
      } else {
        const hasDatetime = !!document.getElementById('post-datetime').value;
        this._savePost(hasDatetime ? 'scheduled' : 'draft', post);
      }
    });
  },

  _flashField(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.style.outline = '2px solid var(--error)';
    el.style.outlineOffset = '2px';
    setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 2000);
  },

  _savePost(status, existingPost) {
    const content = document.getElementById('post-content').value.trim();
    if (!content) {
      UI.showToast('本文を入力してください', 'error');
      this._flashField('#post-content');
      document.getElementById('post-content')?.focus();
      return;
    }
    const platforms = [...document.querySelectorAll('input[name="platform"]:checked')].map(c => c.value);
    if (platforms.length === 0) {
      UI.showToast('プラットフォームを1つ以上選択してください', 'error');
      this._flashField('.composer-platforms');
      return;
    }

    let scheduledAt = null;
    if (status === 'scheduled') {
      const dtVal = document.getElementById('post-datetime').value;
      if (!dtVal) {
        UI.showToast('投稿日時を選択してください', 'error');
        this._flashField('#post-datetime');
        return;
      }
      scheduledAt = new Date(dtVal).toISOString();
    }

    const saved = {
      id:          document.getElementById('post-id').value || Store.generateId('post'),
      artistId:    App.state.activeArtistId,
      content,
      platforms,
      scheduledAt,
      status,
      hashtags:    [...this._hashtags],
      createdAt:   existingPost?.createdAt || new Date().toISOString()
    };

    Store.savePost(saved);
    UI.closeModal();
    this.renderPosts();
    const msg = { draft: '下書きとして保存しました（日時を設定するとスケジュール予約になります）', scheduled: 'スケジュールに追加しました', posted: '投稿を更新しました' };
    UI.showToast(msg[status] || '保存しました');
  },

  async _deletePost(postId) {
    const post = Store.getPost(postId);
    if (!post) return;
    const ok = await UI.confirm('この投稿を削除しますか？');
    if (!ok) return;
    Store.deletePost(postId);
    this.renderPosts();
    UI.showToast('投稿を削除しました');
  },

  _renderHashtagsList() {
    return this._hashtags.map((tag, i) => `
      <span class="hashtag-chip">
        ${UI._esc(tag)}
        <button data-idx="${i}" class="hashtag-remove-btn">×</button>
      </span>
    `).join('');
  },

  _bindHashtagRemove() {
    const list = document.getElementById('hashtags-list');
    if (!list) return;
    list.querySelectorAll('.hashtag-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this._hashtags.splice(idx, 1);
        list.innerHTML = this._renderHashtagsList();
        this._bindHashtagRemove();
      });
    });
  },

  startStatusChecker() {
    if (this._checker) clearInterval(this._checker);
    this._checker = setInterval(() => {
      const posts = Store.getPosts(App.state.activeArtistId);
      const now = Date.now();
      let updated = false;
      posts.forEach(p => {
        if (p.status === 'scheduled' && p.scheduledAt && new Date(p.scheduledAt).getTime() <= now) {
          p.status = 'posted';
          Store.savePost(p);
          updated = true;
        }
      });
      if (updated) {
        this.renderPosts();
        UI.showToast('スケジュールされた投稿が「投稿済み」になりました', 'info');
      }
    }, 60_000);
  },

  _isoToLocal(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  _noArtistHTML() {
    return `<div class="empty-state" style="margin-top:80px">
      <div class="empty-icon">📣</div>
      <div class="empty-title">アーティストが登録されていません</div>
      <div class="empty-desc">サイドバーの「+」からアーティストを追加してください</div>
    </div>`;
  }
};
