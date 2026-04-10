'use strict';

const Store = {
  KEY: 'amd_data',

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || 'null') || this._defaults();
    } catch {
      return this._defaults();
    }
  },

  _defaults() {
    return {
      artists: [],
      events: [],
      snsPosts: [],
      meta: { activeArtistId: null, version: 1 }
    };
  },

  _save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  migrate() {
    const data = this._load();
    if (!data.meta) data.meta = { activeArtistId: null, version: 1 };
    if (!data.artists) data.artists = [];
    if (!data.events) data.events = [];
    if (!data.snsPosts) data.snsPosts = [];
    this._save(data);
  },

  // ── Artists ──
  getArtists() { return this._load().artists || []; },

  getArtist(id) { return this.getArtists().find(a => a.id === id) || null; },

  saveArtist(artist) {
    const data = this._load();
    const idx = data.artists.findIndex(a => a.id === artist.id);
    if (idx >= 0) data.artists[idx] = artist;
    else data.artists.push(artist);
    this._save(data);
  },

  deleteArtist(id) {
    const data = this._load();
    data.artists = data.artists.filter(a => a.id !== id);
    data.events = data.events.filter(e => e.artistId !== id);
    data.snsPosts = data.snsPosts.filter(p => p.artistId !== id);
    if (data.meta.activeArtistId === id) {
      data.meta.activeArtistId = data.artists[0]?.id || null;
    }
    this._save(data);
  },

  // ── Events ──
  getEvents(artistId) {
    return this._load().events.filter(e => e.artistId === artistId);
  },

  getEvent(id) {
    return this._load().events.find(e => e.id === id) || null;
  },

  saveEvent(event) {
    const data = this._load();
    const idx = data.events.findIndex(e => e.id === event.id);
    if (idx >= 0) data.events[idx] = event;
    else data.events.push(event);
    this._save(data);
  },

  deleteEvent(id) {
    const data = this._load();
    data.events = data.events.filter(e => e.id !== id);
    this._save(data);
  },

  // ── SNS Posts ──
  getPosts(artistId) {
    return this._load().snsPosts.filter(p => p.artistId === artistId);
  },

  getPost(id) {
    return this._load().snsPosts.find(p => p.id === id) || null;
  },

  savePost(post) {
    const data = this._load();
    const idx = data.snsPosts.findIndex(p => p.id === post.id);
    if (idx >= 0) data.snsPosts[idx] = post;
    else data.snsPosts.push(post);
    this._save(data);
  },

  deletePost(id) {
    const data = this._load();
    data.snsPosts = data.snsPosts.filter(p => p.id !== id);
    this._save(data);
  },

  // ── Meta ──
  getMeta(key) { return this._load().meta?.[key] ?? null; },

  setMeta(key, val) {
    const data = this._load();
    data.meta = data.meta || {};
    data.meta[key] = val;
    this._save(data);
  },

  // ── Helpers ──
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }
};
