// Storage Service for Zenith TV
const PREFIX = 'zenith_tv_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error writing to localStorage', e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return true;
    } catch (e) {
      console.error('Error removing from localStorage', e);
      return false;
    }
  },

  // Watchlist (Favorites)
  getWatchlist() {
    return this.get('watchlist', []);
  },

  toggleWatchlist(item) {
    const list = this.getWatchlist();
    const index = list.findIndex(i => i.id === item.id && i.type === item.type);
    
    if (index > -1) {
      list.splice(index, 1);
      this.set('watchlist', list);
      return false; // Removed
    } else {
      list.push({
        id: item.id,
        title: item.title || item.name,
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        release_date: item.release_date || item.first_air_date,
        type: item.type, // 'movie', 'tv', 'anime'
        addedAt: new Date().getTime()
      });
      this.set('watchlist', list);
      return true; // Added
    }
  },

  isInWatchlist(id, type) {
    const list = this.getWatchlist();
    return list.some(i => i.id === id && i.type === type);
  },

  // Continue Watching Progress
  saveProgress(mediaId, mediaType, progressData) {
    // progressData: { title, poster_path, season, episode, time, duration, percentage }
    const history = this.get('watch_history', {});
    const key = `${mediaType}_${mediaId}`;
    
    history[key] = {
      id: mediaId,
      type: mediaType,
      ...progressData,
      updatedAt: new Date().getTime()
    };
    
    this.set('watch_history', history);
  },

  getProgress(mediaId, mediaType) {
    const history = this.get('watch_history', {});
    const key = `${mediaType}_${mediaId}`;
    return history[key] || null;
  },

  getAllProgress() {
    const history = this.get('watch_history', {});
    return Object.values(history).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  // Comments and Ratings
  getComments(mediaId, mediaType) {
    const allComments = this.get('comments', {});
    const key = `${mediaType}_${mediaId}`;
    return allComments[key] || [
      // Pre-populate some dummy user comments for richness if empty
      {
        name: 'Ahmed',
        avatar: 'A',
        text: 'عمل رائع جداً وجودة البث خرافية! شكراً للقائمين على الموقع.',
        date: 'منذ يومين'
      },
      {
        name: 'Sara_Anime',
        avatar: 'S',
        text: 'أتمنى إضافة المزيد من سيرفرات الأنمي المترجم. الموقع رائع وسريع.',
        date: 'منذ 5 ساعات'
      }
    ];
  },

  addComment(mediaId, mediaType, username, text) {
    const allComments = this.get('comments', {});
    const key = `${mediaType}_${mediaId}`;
    if (!allComments[key]) {
      allComments[key] = [];
    }
    
    // Inline Sanitizer to prevent circular imports with security.js
    const sanitize = (val) => {
      if (!val) return '';
      return val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    const cleanUsername = sanitize(username || 'مستخدم مجهول');
    const cleanText = sanitize(text || '');

    allComments[key].unshift({
      name: cleanUsername,
      avatar: cleanUsername.charAt(0).toUpperCase(),
      text: cleanText,
      date: 'الآن'
    });
    
    this.set('comments', allComments);
    return allComments[key];
  },

  // Custom Settings (like API keys, custom sources)
  getSettings() {
    const defaultSettings = {
      tmdbApiKey: 'c9e7c891bf8bbb53ee3d259c8312a093',
      adBlockWarningActive: true,
      customServers: [
        { name: '🔴 VidLink (ترجمة تلقائية)', url: 'https://vidlink.pro/embed/{type}/{id}' },
        { name: '🟢 VidSrc Pro', url: 'https://vidsrc.xyz/embed/{type}/{id}' },
        { name: '🔵 VidSrc.to', url: 'https://vidsrc.to/embed/{type}/{id}' },
        { name: '🟣 Embed.su', url: 'https://embed.su/embed/{type}/{id}' },
        { name: '🟠 SuperEmbed', url: 'https://multiembed.mov/?video_id={id}&tmdb=1' },
        { name: '⚡ SmashyStream', url: 'https://player.smashy.stream/{type}/{id}' },
        { name: '🌐 VidSrc.cc', url: 'https://vidsrc.cc/v2/embed/{type}/{id}' },
        { name: '🎬 MoviesAPI.club', url: 'https://moviesapi.club/{type}/{id}' }
      ]
    };
    const settings = this.get('settings', defaultSettings);
    if (settings) {
      if (settings.tmdbApiKey === '8b78809e530fb1c86e06dd876378e918' || !settings.tmdbApiKey) {
        settings.tmdbApiKey = 'c9e7c891bf8bbb53ee3d259c8312a093';
      }
      // Force update if servers list is outdated (less than 8)
      if (!settings.customServers || settings.customServers.length < 8) {
        settings.customServers = defaultSettings.customServers;
      }
      this.saveSettings(settings);
    }
    return settings;
  },

  saveSettings(settings) {
    return this.set('settings', settings);
  },

  async loadGlobalConfig() {
    try {
      const res = await fetch('/api/config/public');
      if (res.ok) {
        const config = await res.json();
        const settings = {
          tmdbApiKey: config.tmdbApiKey,
          adBlockWarningActive: config.adBlockWarningActive,
          customServers: config.customServers.map(s => ({
            name: s.name,
            url: s.url || s.template
          }))
        };
        this.saveSettings(settings);
        console.log('[CONFIG] Loaded public configurations from Render backend.');
        return settings;
      }
    } catch (e) {
      console.warn('[CONFIG] Failed to connect to server for global config, using local fallbacks.', e);
    }
    return this.getSettings();
  }
};
