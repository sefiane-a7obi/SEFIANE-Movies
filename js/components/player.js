import { storage } from '../services/storage.js';
import { authService } from '../services/auth.js';

export const VideoPlayer = {
  // Global state for player
  state: {
    id: null,
    type: null,
    mappedType: null,
    title: '',
    posterPath: '',
    season: 1,
    episode: 1,
    currentServerIndex: 0,
    isFallback: false,
    episodes: [] // For series/anime
  },

  init(media, type, season = 1, episode = 1, playId = null, mappedType = null) {
    this.state.id = playId || media.id;
    this.state.type = type;
    this.state.mappedType = mappedType || (type === 'anime' ? 'tv' : type);
    this.state.title = media.title || media.name;
    this.state.posterPath = media.poster_path;
    this.state.season = parseInt(season);
    this.state.episode = parseInt(episode);
    this.state.isFallback = false;

    // Load saved progress to restore server or episode
    const progress = storage.getProgress(media.id, type);
    if (progress) {
      if (!season && !episode) {
        this.state.season = progress.season || 1;
        this.state.episode = progress.episode || 1;
      }
    }

    // Populate episodes if TV or Anime
    this.state.episodes = [];
    if (type === 'tv' && media.selectedSeasonEpisodes) {
      this.state.episodes = media.selectedSeasonEpisodes;
    } else if (type === 'anime' && media.seasons && media.seasons[0]) {
      this.state.episodes = media.seasons[0].episodes;
    }
  },

  getEmbedUrl() {
    const settings = storage.getSettings();
    const server = settings.customServers[this.state.currentServerIndex] || settings.customServers[0];
    let template = server.url;

    let mediaType = this.state.mappedType;
    const id = this.state.id;
    const s = this.state.season;
    const e = this.state.episode;
    let url = template;

    // ── VidLink ──
    if (template.includes('vidlink.pro')) {
      if (mediaType === 'movie') {
        url = `https://vidlink.pro/embed/movie/${id}?primaryColor=ff0055&secondaryColor=b30038&iconColor=ffffff`;
      } else {
        url = `https://vidlink.pro/embed/tv/${id}/${s}/${e}?primaryColor=ff0055&secondaryColor=b30038&iconColor=ffffff`;
      }
    // ── VidSrc.xyz ──
    } else if (template.includes('vidsrc.xyz')) {
      if (mediaType === 'movie') {
        url = `https://vidsrc.xyz/embed/movie?id=${id}`;
      } else {
        url = `https://vidsrc.xyz/embed/tv?id=${id}&s=${s}&e=${e}`;
      }
    // ── VidSrc.to ──
    } else if (template.includes('vidsrc.to')) {
      if (mediaType === 'movie') {
        url = `https://vidsrc.to/embed/movie/${id}`;
      } else {
        url = `https://vidsrc.to/embed/tv/${id}/${s}/${e}`;
      }
    // ── VidSrc.cc ──
    } else if (template.includes('vidsrc.cc')) {
      if (mediaType === 'movie') {
        url = `https://vidsrc.cc/v2/embed/movie/${id}`;
      } else {
        url = `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`;
      }
    // ── Embed.su ──
    } else if (template.includes('embed.su')) {
      if (mediaType === 'movie') {
        url = `https://embed.su/embed/movie/${id}`;
      } else {
        url = `https://embed.su/embed/tv/${id}/${s}/${e}`;
      }
    // ── SuperEmbed / multiembed.mov ──
    } else if (template.includes('multiembed.mov')) {
      if (mediaType === 'movie') {
        url = `https://multiembed.mov/?video_id=${id}&tmdb=1`;
      } else {
        url = `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`;
      }
    // ── SmashyStream ──
    } else if (template.includes('smashy.stream')) {
      if (mediaType === 'movie') {
        url = `https://player.smashy.stream/movie/${id}`;
      } else {
        url = `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}`;
      }
    // ── MoviesAPI.club ──
    } else if (template.includes('moviesapi.club')) {
      if (mediaType === 'movie') {
        url = `https://moviesapi.club/movie/${id}`;
      } else {
        url = `https://moviesapi.club/tv/${id}-${s}-${e}`;
      }
    // ── Generic template fallback ──
    } else {
      url = template
        .replace('{type}', mediaType)
        .replace('{id}', id)
        .replace('{season}', s)
        .replace('{episode}', e);

      if (mediaType === 'tv' && !template.includes('{season}') && !template.includes('{episode}')) {
        url += `?s=${s}&e=${e}`;
      }
    }
    return url;
  },



  render() {
    const settings = storage.getSettings();
    const servers = settings.customServers;
    
    // Server Switcher HTML
    let serverSwitcherHtml = servers.map((server, index) => {
      const activeClass = index === this.state.currentServerIndex && !this.state.isFallback ? 'active' : '';
      return `<button class="server-btn ${activeClass}" data-index="${index}">${server.name}</button>`;
    }).join('');

    // Fallback Player active class
    const fallbackActive = this.state.isFallback ? 'active' : '';
    serverSwitcherHtml += `<button class="server-btn ${fallbackActive}" id="btn-fallback-server">مشغل احتياطي (Direct)</button>`;

    // Main Player View
    let playerHtml = '';
    if (this.state.isFallback) {
      const settings = storage.getSettings();
      const directStreams = settings.directStreams || [];
      const matched = directStreams.find(s => s.type === this.state.type && String(s.id) === String(this.state.id));
      const customUrl = matched ? matched.url : storage.get(`custom_stream_${this.state.type}_${this.state.id}`, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      playerHtml = `
        <div class="fallback-player">
          <video id="html5-video-player" controls autoplay preload="auto">
            <source src="${customUrl}" type="video/mp4">
            متصفحك لا يدعم تشغيل الفيديو.
          </video>
          <div style="margin-top: 10px; font-size: 13px; color: var(--text-secondary);">
            يمكن للمسؤول تغيير هذا الرابط المباشر من لوحة التحكم.
          </div>
        </div>
      `;
    } else {
      playerHtml = `
        <div class="player-container" style="position: relative; width: 100%; height: 100%;">
          <div id="player-loading-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0a0b0d; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; gap: 15px; transition: opacity 0.5s ease;">
            <div class="spinner" style="width: 50px; height: 50px; border: 4px solid rgba(255, 0, 85, 0.1); border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span style="color: var(--text-secondary); font-size: 14px;">جاري تشفير وتجهيز سيرفر البث...</span>
          </div>
          
          <div id="player-failover-tip" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 17, 21, 0.95); border: 1px solid var(--primary); padding: 12px 20px; border-radius: var(--radius-md); display: none; z-index: 11; font-size: 13px; text-align: center; max-width: 90%; width: 400px; box-shadow: var(--shadow-lg);">
            <div style="color: var(--text-primary); margin-bottom: 8px;">⚠️ هل تواجه بطئاً أو مشكلة في تشغيل هذا السيرفر؟</div>
            <button id="btn-player-auto-failover" class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: var(--radius-sm);">🔄 التبديل التلقائي إلى خادم بديل</button>
          </div>

          <iframe 
            id="zenith-iframe-player"
            class="player-iframe" 
            src="${this.getEmbedUrl()}" 
            allowfullscreen 
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerpolicy="no-referrer"
            loading="eager">
          </iframe>
          <!-- Fullscreen Button -->
          <button id="btn-fullscreen-player" title="Fullscreen" style="position:absolute; top:10px; left:10px; z-index:20; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); color:#fff; width:38px; height:38px; border-radius:8px; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:background 0.2s;" onmouseover="this.style.background='rgba(255,0,85,0.7)'" onmouseout="this.style.background='rgba(0,0,0,0.6)'">⛶</button>
        </div>
        <div style="margin-top: 10px; font-size: 13px; color: var(--text-secondary); text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255, 255, 255, 0.02); padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); margin-bottom: 10px;">
          <span>💡 تلميح: في حال عدم استجابة المشغل الحالي، يرجى الانتقال إلى سيرفر بث آخر من قائمة الخوادم بالأسفل.</span>
        </div>
      `;
    }

    // Episode List Selector (For TV or Anime)
    let episodeSelectorHtml = '';
    if (this.state.type === 'tv' || this.state.type === 'anime') {
      let episodesGridHtml = this.state.episodes.map(ep => {
        const activeClass = ep.episode_number === this.state.episode ? 'active' : '';
        const nameText = ep.name || `حلقة ${ep.episode_number}`;
        return `
          <button class="episode-btn ${activeClass}" data-episode="${ep.episode_number}" title="${nameText}">
            ${ep.episode_number}
          </button>
        `;
      }).join('');

      episodeSelectorHtml = `
        <div class="episodes-section" style="margin-top: 30px;">
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">قائمة الحلقات</h3>
          <div class="episodes-grid">
            ${episodesGridHtml || '<div style="color: var(--text-muted); font-size: 14px;">لا توجد حلقات متاحة لهذا الموسم حالياً.</div>'}
          </div>
        </div>
      `;
    }

    return `
      <div>
        <div class="player-wrapper">
          ${playerHtml}
        </div>
        
        <div class="server-switcher">
          <span style="font-size: 14px; font-weight: 700; display:flex; align-items:center; margin-left: 10px;">خوادم البث:</span>
          ${serverSwitcherHtml}
        </div>

        ${episodeSelectorHtml}
      </div>
    `;
  },

  setupListeners(onEpisodeChange) {
    // Server Change Click
    const serverButtons = document.querySelectorAll('.server-btn:not(#btn-fallback-server)');
    serverButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.state.currentServerIndex = index;
        this.state.isFallback = false;
        this.reloadPlayer();
      });
    });

    // Fallback Player Toggle Click
    const fallbackBtn = document.getElementById('btn-fallback-server');
    if (fallbackBtn) {
      fallbackBtn.addEventListener('click', () => {
        this.state.isFallback = true;
        this.reloadPlayer();
      });
    }

    // Episode Click
    const episodeButtons = document.querySelectorAll('.episode-btn');
    episodeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const epNum = parseInt(e.target.dataset.episode);
        this.state.episode = epNum;
        
        // Save history immediately on episode change
        this.saveCurrentProgress(0); // reset time for new episode

        if (onEpisodeChange) {
          onEpisodeChange(this.state.season, epNum);
        } else {
          this.reloadPlayer();
        }
      });
    });

    // Sync progress tracking for HTML5 fallback player
    this.setupProgressTracker();
    this.setupIframeListeners();
  },

  reloadPlayer() {
    const container = document.querySelector('.player-wrapper');
    const switcher = document.querySelector('.server-switcher');
    
    if (container) {
      if (this.state.isFallback) {
        const settings = storage.getSettings();
        const directStreams = settings.directStreams || [];
        const matched = directStreams.find(s => s.type === this.state.type && String(s.id) === String(this.state.id));
        const customUrl = matched ? matched.url : storage.get(`custom_stream_${this.state.type}_${this.state.id}`, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
        container.innerHTML = `
          <div class="fallback-player">
            <video id="html5-video-player" controls autoplay preload="auto">
              <source src="${customUrl}" type="video/mp4">
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
            <div style="margin-top: 10px; font-size: 13px; color: var(--text-secondary);">
              يمكن للمسؤول تغيير هذا الرابط المباشر من لوحة التحكم.
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="player-container" style="position: relative; width: 100%; height: 100%;">
            <div id="player-loading-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0a0b0d; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; gap: 15px; transition: opacity 0.5s ease;">
              <div class="spinner" style="width: 50px; height: 50px; border: 4px solid rgba(255, 0, 85, 0.1); border-top: 4px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <span style="color: var(--text-secondary); font-size: 14px;">جاري تشفير وتجهيز سيرفر البث...</span>
            </div>
            
            <div id="player-failover-tip" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 17, 21, 0.95); border: 1px solid var(--primary); padding: 12px 20px; border-radius: var(--radius-md); display: none; z-index: 11; font-size: 13px; text-align: center; max-width: 90%; width: 400px; box-shadow: var(--shadow-lg);">
              <div style="color: var(--text-primary); margin-bottom: 8px;">⚠️ هل تواجه بطئاً أو مشكلة في تشغيل هذا السيرفر؟</div>
              <button id="btn-player-auto-failover" class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: var(--radius-sm);">🔄 التبديل التلقائي إلى خادم بديل</button>
            </div>

            <iframe 
              id="zenith-iframe-player"
              class="player-iframe" 
              src="${this.getEmbedUrl()}" 
              allowfullscreen 
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerpolicy="no-referrer"
              loading="eager">
            </iframe>
            <!-- Fullscreen Button -->
            <button id="btn-fullscreen-player" title="Fullscreen" style="position:absolute; top:10px; left:10px; z-index:20; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); color:#fff; width:38px; height:38px; border-radius:8px; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); transition:background 0.2s;" onmouseover="this.style.background='rgba(255,0,85,0.7)'" onmouseout="this.style.background='rgba(0,0,0,0.6)'">⛶</button>
          </div>
        `;
      }
      this.setupProgressTracker();
      this.setupIframeListeners();
    }

    // Update active state class in switcher buttons
    if (switcher) {
      const btns = switcher.querySelectorAll('.server-btn');
      btns.forEach((btn, index) => {
        btn.classList.remove('active');
        if (this.state.isFallback && btn.id === 'btn-fallback-server') {
          btn.classList.add('active');
        } else if (!this.state.isFallback && parseInt(btn.dataset.index) === this.state.currentServerIndex) {
          btn.classList.add('active');
        }
      });
    }
  },

  setupProgressTracker() {
    // HTML5 progress tracker
    const video = document.getElementById('html5-video-player');
    if (video) {
      // Try to load last saved time for fallback video
      const progress = storage.getProgress(this.state.id, this.state.type);
      if (progress && progress.time && progress.season === this.state.season && progress.episode === this.state.episode) {
        video.currentTime = progress.time;
      }

      // Save progress periodically
      video.addEventListener('timeupdate', () => {
        if (video.duration) {
          this.saveCurrentProgress(video.currentTime, video.duration);
        }
      });
    } else {
      // For Embed Iframe player, we cannot access iframe currentTime due to CORS policy
      // So we mock progress to say 'Watched' (e.g. 50%) when the player page loads, 
      // ensuring it shows up in "Continue Watching" row on homepage!
      this.saveCurrentProgress(1, 2); // 50% mock
    }
  },

  saveCurrentProgress(currentTime, duration = 100) {
    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    const progressData = {
      title: this.state.title,
      poster_path: this.state.posterPath,
      season: this.state.season,
      episode: this.state.episode,
      time: currentTime,
      duration: duration,
      percentage: Math.min(percentage, 100)
    };

    storage.saveProgress(this.state.id, this.state.type, progressData);

    const token = authService.getToken();
    if (token) {
      authService.detectMode().then(mode => {
        if (mode === 'server') {
          fetch('/api/progress/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              media_id: this.state.id,
              media_type: this.state.type,
              title: progressData.title,
              poster_path: progressData.poster_path,
              season: progressData.season,
              episode: progressData.episode,
              current_time: progressData.time,
              duration: progressData.duration,
              percentage: progressData.percentage
            })
          }).catch(err => console.error('Progress sync error:', err));
        }
      });
    }
  },

  switchToNextServer() {
    const settings = storage.getSettings();
    const nextIndex = (this.state.currentServerIndex + 1) % settings.customServers.length;
    this.state.currentServerIndex = nextIndex;
    this.state.isFallback = false;
    this.reloadPlayer();
  },

  setupIframeListeners() {
    const iframe = document.getElementById('zenith-iframe-player');
    const loadingOverlay = document.getElementById('player-loading-overlay');
    const failoverTip = document.getElementById('player-failover-tip');
    const failoverBtn = document.getElementById('btn-player-auto-failover');
    const fullscreenBtn = document.getElementById('btn-fullscreen-player');
    
    // Fullscreen button logic
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const container = fullscreenBtn.closest('.player-container') || fullscreenBtn.parentElement;
        if (container) {
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
          }
        }
      });

      // Update icon when fullscreen changes
      document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
          fullscreenBtn.textContent = '✕';
          fullscreenBtn.title = 'Exit Fullscreen';
        } else {
          fullscreenBtn.textContent = '⛶';
          fullscreenBtn.title = 'Fullscreen';
        }
      });
    }

    if (iframe) {
      iframe.addEventListener('load', () => {
        if (loadingOverlay) {
          loadingOverlay.style.opacity = '0';
          setTimeout(() => {
            loadingOverlay.style.display = 'none';
          }, 500);
        }
      });
      
      const failoverTimeout = setTimeout(() => {
        if (loadingOverlay && loadingOverlay.style.display !== 'none' && failoverTip) {
          failoverTip.style.display = 'block';
        }
      }, 7000);
      
      if (failoverBtn) {
        failoverBtn.addEventListener('click', () => {
          clearTimeout(failoverTimeout);
          this.switchToNextServer();
        });
      }
    }
  }
};
