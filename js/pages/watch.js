import { tmdbService } from '../services/tmdb.js';
import { storage } from '../services/storage.js';
import { VideoPlayer } from '../components/player.js';
import { security } from '../utils/security.js';

export const Watch = {
  async render() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const id = urlParams.get('id');
    const type = urlParams.get('type') || 'movie';
    const season = urlParams.get('season') || '1';
    const episode = urlParams.get('episode') || '1';

    if (!id) {
      return `<div class="container" style="margin-top:100px; text-align:center;">معرف العمل غير متاح.</div>`;
    }

    setTimeout(() => this.loadPlayerAndDetails(id, type, season, episode), 50);

    return `
      <div class="container watch-container">
        <!-- Main Video Player Section (Left) -->
        <div>
          <div id="player-mount-point">
            <!-- Skeleton Player -->
            <div class="player-wrapper shimmer" style="background-color: var(--bg-surface);"></div>
          </div>

          <!-- Watch Details -->
          <div class="watch-info" id="watch-info-container">
            <div style="height: 36px; width: 300px; border-radius: 6px; margin-bottom: 10px;" class="shimmer"></div>
            <div style="height: 20px; width: 150px; border-radius: 4px; margin-bottom: 15px;" class="shimmer"></div>
            <div style="height: 60px; width: 100%; border-radius: 8px;" class="shimmer"></div>
          </div>
        </div>

        <!-- Sidebar (Season selection / Info & Ads) (Right) -->
        <div>
          <!-- Placeholder for Episode switcher if loaded -->
          <div id="episodes-mount-point"></div>
          
          <!-- Watch page Sidebar Ad -->
          <div class="ad-slot ad-sidebar" id="watch-ad-slot">إعلان ممول - SEFIANE Movies</div>

          <!-- Comment Section -->
          <div class="comments-section" style="margin-top: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">مناقشة الحلقة / الفيلم</h3>
            
            <form class="comment-form" id="watch-comment-form">
              <input type="text" class="comment-input" id="watch-comment-input" placeholder="اكتب تعليقاً حول المشاهدة..." required>
              <button type="submit" class="btn btn-primary" style="padding: 10px 16px;">تعليق</button>
            </form>

            <div class="comments-list" id="watch-comments-list">
              <!-- populated dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async loadPlayerAndDetails(id, type, season, episode) {
    const playerMount = document.getElementById('player-mount-point');
    const infoContainer = document.getElementById('watch-info-container');
    const commentsList = document.getElementById('watch-comments-list');

    if (!playerMount || !infoContainer) return;

    try {
      // 1. Fetch details
      const media = await tmdbService.getDetails(id, type);
      const title = media.title || media.name;
      const releaseDate = media.release_date || media.first_air_date || '';
      const year = releaseDate ? releaseDate.split('-')[0] : 'N/A';
      const rating = media.vote_average ? media.vote_average.toFixed(1) : 'N/A';

      // 1.5. Anime ID Mapping (from MAL to TMDB using Multi Search)
      let playId = null;
      let mappedType = null;
      if (type === 'anime') {
        try {
          const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${tmdbService.getApiKey()}&query=${encodeURIComponent(title)}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
              // Prefer TV shows, then movies, then any valid result
              const bestMatch = searchData.results.find(item => item.media_type === 'tv') ||
                                searchData.results.find(item => item.media_type === 'movie') ||
                                searchData.results[0];
              if (bestMatch && (bestMatch.media_type === 'tv' || bestMatch.media_type === 'movie')) {
                playId = bestMatch.id;
                mappedType = bestMatch.media_type;
                console.log(`Zenith Player: Mapped Anime "${title}" to TMDB ${mappedType} ID ${playId}`);
              }
            }
          }
        } catch (err) {
          console.error('Error mapping anime MAL ID to TMDB ID:', err);
        }
      }

      // 2. Initialize Player
      VideoPlayer.init(media, type, season, episode, playId, mappedType);

      // 3. Render Player inside mount point
      playerMount.innerHTML = VideoPlayer.render();

      // 4. Setup Player Event listeners
      VideoPlayer.setupListeners((sNum, epNum) => {
        // Episode Change callback
        // Update URL hash - router will handle page reloading cleanly
        window.location.hash = `#/watch?id=${id}&type=${type}&season=${sNum}&episode=${epNum}`;
      });

      // 5. Render details
      let titleSuffix = '';
      if (type === 'tv' || type === 'anime') {
        titleSuffix = ` - الموسم ${VideoPlayer.state.season}، الحلقة ${VideoPlayer.state.episode}`;
      }

      infoContainer.innerHTML = `
        <div class="watch-title-row">
          <h1 class="watch-title">${title}${titleSuffix}</h1>
          <div class="watch-actions">
            <button class="btn btn-secondary" onclick="location.hash='#/details?id=${id}&type=${type}'">
              ℹ️ تفاصيل العمل
            </button>
          </div>
        </div>
        <div class="watch-details-meta">
          <span style="color: #fbbf24; font-weight:600;">⭐️ ${rating}</span>
          <span>📅 سنة العرض: ${year}</span>
          <span style="color: var(--primary); font-weight:600;">نوع: ${type === 'movie' ? 'فيلم' : (type === 'anime' ? 'أنمي' : 'مسلسل')}</span>
        </div>
        <p class="watch-desc">${media.overview || 'لا يوجد وصف متاح باللغة العربية حالياً.'}</p>
      `;

      // Manage Watch Page Ads Visibility
      const watchAd = document.getElementById('watch-ad-slot');
      if (watchAd) {
        if (window.isUserPremium) {
          watchAd.style.display = 'none';
        } else {
          watchAd.innerHTML = `
            <div class="ad-banner-premium-promo" style="background: linear-gradient(135deg, rgba(255, 0, 85, 0.05) 0%, rgba(121, 40, 202, 0.05) 100%); border: 1px solid var(--border-glass); padding: 15px; border-radius: var(--radius-md); text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 9px; background: var(--primary); color: #ffffff; padding: 2px 6px; border-radius: var(--radius-full); font-weight: 700; text-transform: uppercase;">إعلان ممول</span>
              <h5 style="margin: 2px 0; font-size: 13px; color: var(--text-primary); font-weight: 700;">Fast & Ad-Free Streaming!</h5>
              <p style="margin: 0; font-size: 11px; color: var(--text-secondary);">Premium Subscription! Contact me to activate your package.</p>
              <a href="https://www.instagram.com/sefiane.20/" target="_blank" class="btn btn-primary" style="padding: 4px 10px; font-size: 11px; margin-top: 2px; font-weight: 700; text-decoration: none; width: 100%; text-align: center; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border: none;">Contact me on Instagram</a>
            </div>
          `;
          watchAd.style.background = 'none';
          watchAd.style.border = 'none';
          watchAd.style.height = 'auto';
          watchAd.style.display = 'block';
        }
      }

      // 6. Setup Comments list and form listeners
      if (commentsList) {
        commentsList.innerHTML = this.renderComments(id, type);

        const form = document.getElementById('watch-comment-form');
        const input = document.getElementById('watch-comment-input');

        if (form && input) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (text) {
              // Rate Limiter: Max 3 comments per 45 seconds
              if (!security.rateLimit.isAllowed('comments_submission', 3, 45000)) {
                alert('تنبيه أمني: لقد قمت بكتابة تعليقات متكررة في فترة وجيزة. يرجى الانتظار قليلاً.');
                return;
              }
              storage.addComment(id, type, 'مستمع SEFIANE', text);
              input.value = '';
              commentsList.innerHTML = this.renderComments(id, type);
            }
          });
        }
      }

    } catch (e) {
      console.error('Error loading watch view:', e);
      playerMount.innerHTML = `
        <div class="fallback-player" style="padding: 60px 20px;">
          <h3 style="color: var(--primary); margin-bottom:10px;">عذراً، تعذر تشغيل مشغل الفيديو الرئيسي.</h3>
          <p>تأكد من معرفات المحتوى أو جرب خادم تشغيل آخر.</p>
          <a href="#/details?id=${id}&type=${type}" class="btn btn-primary" style="margin-top:20px;">العودة لصفحة التفاصيل</a>
        </div>
      `;
    }
  },

  renderComments(mediaId, mediaType) {
    const comments = storage.getComments(mediaId, mediaType);
    return comments.map(c => `
      <div class="comment-card" style="padding: 12px; margin-top: 10px;">
        <div class="comment-header" style="gap: 8px;">
          <div class="comment-avatar" style="width:24px; height:24px; font-size:11px;">${c.avatar}</div>
          <div>
            <div class="comment-name" style="font-size:12px;">${c.name}</div>
            <div class="comment-date" style="font-size:9px;">${c.date}</div>
          </div>
        </div>
        <div class="comment-text" style="font-size:12px; margin-top:5px;">${c.text}</div>
      </div>
    `).join('');
  }
};
