'use strict';

const Seed = {
  load() {
    const existing = Store.getArtists();
    if (existing.length > 0) return; // already seeded

    const artists = [
      { id: 'art_demo1', name: '佐藤 美咲', role: 'ソロアーティスト', genre: 'J-Pop', color: '#7C3AED', createdAt: '2026-01-10T00:00:00Z' },
      { id: 'art_demo2', name: 'StarLight', role: 'グループ', genre: 'K-Pop', color: '#EC4899', createdAt: '2026-02-01T00:00:00Z' }
    ];

    const today = new Date();
    const d = (offset) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + offset);
      return dt.toISOString().slice(0, 10);
    };

    const events = [
      { id: 'evt_d1', artistId: 'art_demo1', title: 'サマーライブ 2026', type: 'show', date: d(5), startTime: '18:00', endTime: '21:00', venue: 'Zepp Tokyo', location: '東京', notes: 'ワンマンライブ', createdAt: new Date().toISOString() },
      { id: 'evt_d2', artistId: 'art_demo1', title: 'リハーサル', type: 'rehearsal', date: d(3), startTime: '14:00', endTime: '17:00', venue: 'スタジオA', location: '渋谷', notes: '', createdAt: new Date().toISOString() },
      { id: 'evt_d3', artistId: 'art_demo1', title: 'レーベル打ち合わせ', type: 'meeting', date: d(1), startTime: '10:00', endTime: '11:30', venue: 'オフィス', location: '新宿', notes: '新アルバムについて', createdAt: new Date().toISOString() },
      { id: 'evt_d4', artistId: 'art_demo1', title: 'MV撮影', type: 'other', date: d(10), startTime: '09:00', endTime: '20:00', venue: '撮影スタジオ', location: '横浜', notes: '', createdAt: new Date().toISOString() },
      { id: 'evt_d5', artistId: 'art_demo2', title: 'ファンミーティング', type: 'show', date: d(7), startTime: '13:00', endTime: '16:00', venue: 'イベントホール', location: '大阪', notes: '', createdAt: new Date().toISOString() },
      { id: 'evt_d6', artistId: 'art_demo2', title: 'ダンスリハーサル', type: 'rehearsal', date: d(2), startTime: '15:00', endTime: '18:00', venue: 'ダンススタジオ', location: '渋谷', notes: '', createdAt: new Date().toISOString() }
    ];

    const futureISO = (offset, h, m) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + offset);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString();
    };

    const pastISO = (offset, h, m) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - offset);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString();
    };

    const posts = [
      { id: 'post_d1', artistId: 'art_demo1', content: '新曲「星空のメロディ」が今週金曜日にリリース！\n皆さんのご支援に感謝💜\n\nSpotify / Apple Music で先行配信中です🎵', platforms: ['twitter', 'instagram'], scheduledAt: futureISO(2, 9, 0), status: 'scheduled', hashtags: ['#新曲リリース', '#佐藤美咲'], createdAt: new Date().toISOString() },
      { id: 'post_d2', artistId: 'art_demo1', content: 'サマーライブのチケット一般販売が始まりました🎤\n今すぐゲットしてね！', platforms: ['twitter'], scheduledAt: futureISO(1, 12, 0), status: 'scheduled', hashtags: ['#サマーライブ', '#チケット'], createdAt: new Date().toISOString() },
      { id: 'post_d3', artistId: 'art_demo1', content: 'リハーサル中の様子をチラ見せ👀\n本番まであと少し！', platforms: ['instagram'], scheduledAt: pastISO(1, 18, 0), status: 'posted', hashtags: ['#リハーサル'], createdAt: new Date().toISOString() },
      { id: 'post_d4', artistId: 'art_demo1', content: '夏の新ビジュアル撮影オフショット🌸\n詳細は後日発表します✨', platforms: ['twitter', 'instagram'], scheduledAt: null, status: 'draft', hashtags: ['#オフショット'], createdAt: new Date().toISOString() },
      { id: 'post_d5', artistId: 'art_demo2', content: 'StarLight Japan Tour 2026 開催決定！🌟\n東京・大阪・名古屋の3都市を回ります！', platforms: ['twitter', 'instagram', 'youtube'], scheduledAt: futureISO(3, 10, 0), status: 'scheduled', hashtags: ['#StarLight', '#JapanTour'], createdAt: new Date().toISOString() },
      { id: 'post_d6', artistId: 'art_demo2', content: '新MV「Shine」ティザー映像公開中🎬\nYouTubeをチェック！', platforms: ['youtube', 'twitter'], scheduledAt: pastISO(2, 15, 0), status: 'posted', hashtags: ['#Shine', '#StarLight'], createdAt: new Date().toISOString() }
    ];

    artists.forEach(a => Store.saveArtist(a));
    events.forEach(e => Store.saveEvent(e));
    posts.forEach(p => Store.savePost(p));

    Store.setMeta('activeArtistId', 'art_demo1');
  }
};
