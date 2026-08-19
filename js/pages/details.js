import { tmdbService } from '../services/tmdb.js';
import { storage } from '../services/storage.js';
import { MovieCard } from '../components/moviecard.js';
import { security } from '../utils/security.js';

export const Details = {
  async render() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const id = urlParams.get('id');
    const type = urlParams.get('type') || 'movie';

    if (!id) {
      return `<div class="container" style="margin-top:100px; text-align:center;">معرف العمل غير متاح.</div>`;
    }

    // Schedule fetching and rendering details
    setTimeout(() => this.loadDetails(id, type), 50);

    return `
      <div id="details-page-container">
        <!-- Details Hero Skeleton -->
        <div class="details-hero shimmer" id="details-header" style="background-color: var(--bg-surface); min-height: 60vh;">
          <div class="hero-overlay"></div>
          <div class="container">
            <div class="details-wrapper">
              <div class="details-poster shimmer" style="background-color: var(--bg-main); width: 250px; height: 375px;"></div>
              <div class="details-info" style="flex-grow: 1;">
                <div style="height: 40px; width: 300px; border-radius: 8px; margin-bottom: 15px;" class="shimmer"></div>
                <div style="height: 20px; width: 150px; border-radius: 4px; margin-bottom: 20px;" class="shimmer"></div>
                <div style="height: 80px; width: 100%; border-radius: 8px; margin-bottom: 20px;" class="shimmer"></div>
                <div style="height: 45px; width: 200px; border-radius: 8px;" class="shimmer"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async loadDetails(id, type) {
    const container = document.getElementById('details-page-container');
    if (!container) return;

    try {
      const media = await tmdbService.getDetails(id, type);
      const title = media.title || media.name;
      const originalTitle = media.original_title || media.original_name || '';
      const tagline = media.tagline || '';
      const rating = media.vote_average ? media.vote_average.toFixed(1) : 'N/A';
      const releaseDate = media.release_date || media.first_air_date || '';
      const year = releaseDate ? releaseDate.split('-')[0] : 'N/A';
      const runtime = media.runtime ? `${media.runtime} دقيقة` : (media.episode_run_time ? `${media.episode_run_time[0]} دقيقة` : '');
      const genresList = media.genres ? media.genres.map(g => g.name).join(' • ') : '';
      
      const posterUrl = tmdbService.getImageUrl(media.poster_path, 'w500');
      const backdropUrl = tmdbService.getBackdropUrl(media.backdrop_path, 'original');

      const inWatchlist = storage.isInWatchlist(media.id, type);
      const watchlistText = inWatchlist ? '❤️ في المفضلة' : '🤍 أضف للمفضلة';

      // HTML Render
      container.innerHTML = `
        <div class="details-hero" style="background-image: url('${backdropUrl}')">
          <div class="hero-overlay"></div>
          <div class="container" style="position: relative; z-index: 2;">
            <div class="details-wrapper">
              <div class="details-poster">
                <img src="${posterUrl}" alt="${title}">
              </div>
              <div class="details-info">
                <span class="hero-tag" style="background: var(--primary-gradient);">${type === 'movie' ? 'فيلم' : (type === 'anime' ? 'أنمي' : 'مسلسل')}</span>
                <h1 class="hero-title" style="margin-bottom: 5px;">${title}</h1>
                ${originalTitle ? `<h3 style="font-size: 16px; color: var(--text-secondary); font-weight:500; margin-bottom:15px;">${originalTitle}</h3>` : ''}
                ${tagline ? `<p style="font-style: italic; color: var(--accent); margin-bottom: 15px;">"${tagline}"</p>` : ''}
                
                <div class="hero-meta">
                  <span class="hero-rating">⭐️ ${rating}</span>
                  <span>📅 ${year}</span>
                  ${runtime ? `<span>⏱️ ${runtime}</span>` : ''}
                </div>
                
                <div style="font-size: 14px; margin-bottom: 20px; color: var(--text-secondary);">${genresList}</div>
                
                <p class="hero-desc" style="-webkit-line-clamp: unset; max-height: none;">${media.overview || 'لا يوجد وصف متاح لهذا العمل باللغة العربية حالياً.'}</p>
                
                <div class="hero-actions" style="margin-top: 15px;">
                  <a href="#/watch?id=${media.id}&type=${type}" class="btn btn-primary" style="font-size: 16px; padding: 14px 36px; box-shadow: var(--shadow-glow);">
                    ▶️ ابدأ المشاهدة الآن
                  </a>
                  <button id="btn-watchlist-toggle" class="btn btn-secondary">
                    ${watchlistText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="container" style="margin-top: 40px;">
          <div class="details-grid-layout" style="display: grid; grid-template-columns: 1fr 320px; gap: 40px;">
            <!-- Left Panel (Cast & Recommendations) -->
            <div>
              <!-- Cast Section -->
              ${media.credits && media.credits.cast && media.credits.cast.length > 0 ? `
                <div class="section" style="margin-top: 0;">
                  <h2 class="section-title">طاقم العمل المميز</h2>
                  <div style="display: flex; gap: 15px; overflow-x: auto; padding: 15px 0;">
                    ${media.credits.cast.slice(0, 10).map(cast => `
                      <div style="min-width: 100px; text-align: center;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; margin: 0 auto 10px auto; border: 2px solid var(--border-glass);" class="shimmer">
                          <img src="${tmdbService.getImageUrl(cast.profile_path, 'w185')}" 
                               alt="${cast.name}" 
                               style="width:100%; height:100%; object-fit:cover;"
                               onload="this.parentElement.classList.remove('shimmer')">
                        </div>
                        <h4 style="font-size: 12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${cast.name}">${cast.name}</h4>
                        <p style="font-size: 10px; color: var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${cast.character}">${cast.character}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Comments Section -->
              <div class="comments-section section">
                <h2 class="section-title">التعليقات والمناقشات</h2>
                
                <form class="comment-form" id="detail-comment-form">
                  <div class="comment-avatar">M</div>
                  <input type="text" class="comment-input" id="detail-comment-input" placeholder="اكتب رأيك في هذا العمل..." required>
                  <button type="submit" class="btn btn-primary" style="padding: 10px 20px;">إرسال</button>
                </form>

                <div class="comments-list" id="detail-comments-list">
                  ${this.renderComments(media.id, type)}
                </div>
              </div>
            </div>

            <!-- Right Panel (Similar Works) -->
            <div>
              <div class="section" style="margin-top: 0;">
                <h2 class="section-title">أعمال مشابهة</h2>
                <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 20px;">
                  ${media.similar && media.similar.results && media.similar.results.length > 0 ? 
                    media.similar.results.slice(0, 4).map(sim => `
                      <div style="display: flex; gap: 15px; cursor: pointer;" onclick="location.hash='#/details?id=${sim.id}&type=${type}'">
                        <div style="width: 80px; aspect-ratio: 2/3; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-glass);" class="shimmer">
                          <img src="${tmdbService.getImageUrl(sim.poster_path, 'w185')}" 
                               style="width:100%; height:100%; object-fit:cover;"
                               onload="this.parentElement.classList.remove('shimmer')">
                        </div>
                        <div style="display:flex; flex-direction:column; justify-content:center;">
                          <h4 style="font-size:14px; font-weight:700; line-height:1.3; margin-bottom:5px;">${sim.title || sim.name}</h4>
                          <span style="font-size:12px; color:#fbbf24;">⭐️ ${sim.vote_average ? sim.vote_average.toFixed(1) : 'N/A'}</span>
                        </div>
                      </div>
                    `).join('')
                    : '<div style="color: var(--text-muted); font-size:14px;">لا توجد أعمال مشابهة متاحة حالياً.</div>'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.setupListeners(media, type);

    } catch (e) {
      console.error('Error loading details:', e);
      container.innerHTML = `
        <div class="container" style="margin-top: 150px; text-align: center;">
          <h2>عذراً، فشل تحميل تفاصيل العمل.</h2>
          <p style="margin-top:10px; color: var(--text-secondary);">يرجى التأكد من صحة معرف العمل واتصال الإنترنت.</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 20px;">العودة للرئيسية</a>
        </div>
      `;
    }
  },

  renderComments(mediaId, mediaType) {
    const comments = storage.getComments(mediaId, mediaType);
    return comments.map(c => `
      <div class="comment-card">
        <div class="comment-header">
          <div class="comment-avatar">${c.avatar}</div>
          <div>
            <div class="comment-name">${c.name}</div>
            <div class="comment-date">${c.date}</div>
          </div>
        </div>
        <div class="comment-text">${c.text}</div>
      </div>
    `).join('');
  },

  setupListeners(media, type) {
    // Watchlist Toggle
    const watchlistBtn = document.getElementById('btn-watchlist-toggle');
    if (watchlistBtn) {
      watchlistBtn.addEventListener('click', () => {
        const added = storage.toggleWatchlist(media);
        watchlistBtn.innerText = added ? '❤️ في المفضلة' : '🤍 أضف للمفضلة';
      });
    }

    // Comment Form Submit
    const commentForm = document.getElementById('detail-comment-form');
    const commentInput = document.getElementById('detail-comment-input');
    const commentsList = document.getElementById('detail-comments-list');

    if (commentForm && commentInput && commentsList) {
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (text) {
          // Rate Limiter: Max 3 comments per 45 seconds
          if (!security.rateLimit.isAllowed('comments_submission', 3, 45000)) {
            alert('تنبيه أمني: لقد قمت بكتابة تعليقات متكررة في فترة وجيزة. يرجى الانتظار قليلاً.');
            return;
          }
          storage.addComment(media.id, type, 'مستخدم Zenith TV', text);
          commentInput.value = '';
          // Reload comment list
          commentsList.innerHTML = this.renderComments(media.id, type);
        }
      });
    }
  }
};
