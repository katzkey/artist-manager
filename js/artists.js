'use strict';

const Artists = {
  COLORS: [
    '#7C3AED', '#3B82F6', '#EC4899', '#10B981',
    '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'
  ],

  openAddModal() {
    this._openModal(null);
  },

  openEditModal(id) {
    this._openModal(id);
  },

  _openModal(id) {
    const artist = id ? Store.getArtist(id) : null;
    const title = artist ? 'アーティスト編集' : 'アーティスト追加';
    const selectedColor = artist?.color || this.COLORS[0];

    const colorOptions = this.COLORS.map(c => `
      <div class="color-option ${c === selectedColor ? 'selected' : ''}"
           style="background:${c}"
           data-color="${c}"
           title="${c}"></div>
    `).join('');

    const body = `
      <input type="hidden" id="artist-id" value="${UI._esc(id || '')}">
      <div class="form-group">
        <label class="form-label">名前 *</label>
        <input type="text" id="artist-name" placeholder="例: 山田 花音" value="${UI._esc(artist?.name || '')}" maxlength="50">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">役割</label>
          <input type="text" id="artist-role" placeholder="例: ソロ / グループ" value="${UI._esc(artist?.role || '')}" maxlength="30">
        </div>
        <div class="form-group">
          <label class="form-label">ジャンル</label>
          <input type="text" id="artist-genre" placeholder="例: Pop / R&B" value="${UI._esc(artist?.genre || '')}" maxlength="30">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">カラー</label>
        <div class="color-options" id="color-options">${colorOptions}</div>
        <input type="hidden" id="artist-color" value="${selectedColor}">
      </div>
      ${artist ? `
      <div class="form-group" style="margin-top:8px;">
        <button class="btn btn-danger btn-sm" id="artist-delete-btn">
          このアーティストを削除
        </button>
      </div>` : ''}
    `;

    const footer = `
      <button class="btn btn-secondary" id="artist-cancel-btn">キャンセル</button>
      <button class="btn btn-primary"   id="artist-save-btn">${artist ? '更新する' : '追加する'}</button>
    `;

    UI.openModal(title, body, footer);

    // Color picker
    document.getElementById('color-options').addEventListener('click', e => {
      const opt = e.target.closest('.color-option');
      if (!opt) return;
      document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
      document.getElementById('artist-color').value = opt.dataset.color;
    });

    document.getElementById('artist-cancel-btn').addEventListener('click', () => UI.closeModal());

    document.getElementById('artist-save-btn').addEventListener('click', () => {
      const name = document.getElementById('artist-name').value.trim();
      if (!name) { UI.showToast('名前を入力してください', 'error'); return; }
      const saved = {
        id: document.getElementById('artist-id').value || Store.generateId('art'),
        name,
        role:      document.getElementById('artist-role').value.trim(),
        genre:     document.getElementById('artist-genre').value.trim(),
        color:     document.getElementById('artist-color').value || this.COLORS[0],
        createdAt: artist?.createdAt || new Date().toISOString()
      };
      Store.saveArtist(saved);
      if (!App.state.activeArtistId) {
        App.state.activeArtistId = saved.id;
        Store.setMeta('activeArtistId', saved.id);
      }
      UI.closeModal();
      UI.renderSidebar();
      UI.showToast(artist ? 'アーティストを更新しました' : 'アーティストを追加しました');
    });

    if (artist) {
      document.getElementById('artist-delete-btn').addEventListener('click', async () => {
        const ok = await UI.confirm(`「${artist.name}」を削除しますか？関連するイベントや投稿もすべて削除されます。`);
        if (!ok) return;
        Store.deleteArtist(id);
        const artists = Store.getArtists();
        App.state.activeArtistId = artists[0]?.id || null;
        Store.setMeta('activeArtistId', App.state.activeArtistId);
        UI.closeModal();
        UI.renderSidebar();
        App.navigate('overview');
        UI.showToast('アーティストを削除しました');
      });
    }
  }
};
