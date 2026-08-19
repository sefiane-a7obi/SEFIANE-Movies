import { tmdbService } from '../services/tmdb.js';
import { storage } from '../services/storage.js';
import { MovieCard } from '../components/moviecard.js';

// All content sections definition - easy to add more
const SECTIONS = [
  { id: 'trending-row',    title: '🔥 الأكثر شيوعاً اليوم',               link: '#/browse?sort=popularity.desc',      key: 'trending' },
  { id: 'nowplaying-row',  title: '🎬 يُعرض الآن في السينمات',            link: '#/browse?type=movie&sort=now_playing', key: 'nowPlaying' },
  { id: 'movies-row',      title: '🎥 أفلام مميزة',                       link: '#/browse?type=movie',                 key: 'popularMovies' },
  { id: 'tv-row',          title: '📺 مسلسلات رائجة',                     link: '#/browse?type=tv',                    key: 'popularTV' },
  { id: 'netflix-row',     title: '🔴 Netflix Originals',                  link: '#/browse?type=tv&network=netflix',    key: 'netflix' },
  { id: 'action-row',      title: '💥 أفلام أكشن ومغامرات',              link: '#/browse?type=movie&genre=28',        key: 'action' },
  { id: 'scifi-row',       title: '🚀 خيال علمي (Sci-Fi)',               link: '#/browse?type=movie&genre=878',       key: 'sciFi' },
  { id: 'horror-row',      title: '👻 أفلام رعب',                         link: '#/browse?type=movie&genre=27',        key: 'horror' },
  { id: 'anime-row',       title: '⛩️ عالم الأنمي (Anime)',              link: '#/browse?type=anime',                 key: 'anime' },
  { id: 'kdrama-row',      title: '🇰🇷 دراما كورية (K-Drama)',           link: '#/browse?type=tv&country=KR',         key: 'kdrama' },
  { id: 'turkish-row',     title: '🇹🇷 مسلسلات تركية رائجة',            link: '#/browse?type=tv&country=TR',         key: 'turkish' },
  { id: 'bollywood-row',   title: '🇮🇳 أفلام هندية (Bollywood)',          link: '#/browse?type=movie&country=IN',      key: 'bollywood' },
  { id: 'indiaseries-row', title: '🎭 مسلسلات هندية',                    link: '#/browse?type=tv&country=IN',         key: 'indiaSeries' },
  { id: 'animation-row',   title: '🎨 أفلام رسوم متحركة وكرتون',        link: '#/browse?type=movie&genre=16',        key: 'animation' },
  { id: 'toprated-row',    title: '⭐ أعلى تقييماً IMDB (أفلام)',        link: '#/browse?sort=vote_average.desc',     key: 'topRated' },
  { id: 'topratedtv-row',  title: '🏆 أعلى تقييماً IMDB (مسلسلات)',     link: '#/browse?type=tv&sort=top_rated',     key: 'topRatedTV' },
  { id: 'documentary-row', title: '🌍 وثائقيات عالمية',                  link: '#/browse?type=movie&genre=99',        key: 'documentary' },
  { id: 'upcoming-row',    title: '🗓️ قادم قريباً في السينمات',         link: '#/browse?sort=upcoming',              key: 'upcoming' },
];

export const Home = {
  async render() {
    // Trigger data load after DOM is inserted
    setTimeout(() => this.loadData(), 80);

    const sectionsHtml = SECTIONS.map(s => `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">${s.title}</h2>
          <a href="${s.link}" class="section-more">عرض الكل ➔</a>
        </div>
        <div class="movie-row" id="${s.id}">
          ${this.renderSkeletons(8)}
        </div>
      </div>
    `).join('');

    return `
      <div id="home-page-container">

        <!-- Hero Banner -->
        <div class="hero shimmer" id="hero-banner" style="background-color: var(--bg-surface);">
          <div class="hero-overlay"></div>
          <div class="container" style="height: 100%; display: flex; align-items: center;">
            <div class="hero-content" style="width: 100%;">
              <div style="height: 24px; width: 100px; border-radius: 4px; margin-bottom: 15px;" class="shimmer"></div>
              <div style="height: 48px; width: 300px; border-radius: 8px; margin-bottom: 15px;" class="shimmer"></div>
              <div style="height: 20px; width: 180px; border-radius: 4px; margin-bottom: 20px;" class="shimmer"></div>
              <div style="height: 80px; width: 100%; border-radius: 8px; margin-bottom: 30px;" class="shimmer"></div>
              <div style="display: flex; gap: 15px;">
                <div style="height: 45px; width: 140px; border-radius: 8px;" class="shimmer"></div>
                <div style="height: 45px; width: 140px; border-radius: 8px;" class="shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="container">
          <!-- Continue Watching -->
          <div id="continue-watching-section" class="section" style="display: none;">
            <div class="section-header">
              <h2 class="section-title">▶️ متابعة المشاهدة</h2>
            </div>
            <div class="movie-row" id="continue-watching-row"></div>
          </div>

          <!-- Premium Promo Banner -->
          <div class="ad-slot ad-leaderboard" id="home-ad-slot"></div>

          <!-- All Content Sections -->
          ${sectionsHtml}
        </div>
      </div>
    `;
  },

  renderSkeletons(count) {
    let s = '';
    for (let i = 0; i < count; i++) {
      s += `<div class="movie-card shimmer" style="aspect-ratio: 2/3; border-radius: var(--radius-md); min-width: 160px; flex-shrink:0;"></div>`;
    }
    return s;
  },

  async loadData() {
    try {
      const data = await tmdbService.getHomeData();

      // ── Hero Banner ──
      if (data.hero) {
        const heroBanner = document.getElementById('hero-banner');
        if (heroBanner) {
          heroBanner.classList.remove('shimmer');
          const backdrop = tmdbService.getBackdropUrl(data.hero.backdrop_path);
          heroBanner.style.backgroundImage = `url('${backdrop}')`;

          const rating   = data.hero.vote_average ? data.hero.vote_average.toFixed(1) : 'N/A';
          const title    = data.hero.title || data.hero.name;
          const type     = data.hero.type || 'movie';
          const overview = data.hero.overview || 'استمتع بمشاهدة هذا العمل المميز مجاناً وبجودة عالية على SEFIANE Movies.';
          const badge    = type === 'movie' ? '🎬 فيلم' : '📺 مسلسل';

          heroBanner.innerHTML = `
            <div class="hero-overlay"></div>
            <div class="container" style="height:100%;display:flex;align-items:center;position:relative;z-index:2;">
              <div class="hero-content">
                <span class="hero-tag">${badge}</span>
                <h1 class="hero-title">${title}</h1>
                <div class="hero-meta">
                  <span class="hero-rating">⭐ ${rating}</span>
                  <span>📅 ${data.hero.release_date || data.hero.first_air_date || ''}</span>
                </div>
                <p class="hero-desc">${overview.substring(0, 200)}${overview.length > 200 ? '...' : ''}</p>
                <div class="hero-actions">
                  <a href="#/details?id=${data.hero.id}&type=${type}" class="btn btn-primary">▶️ شاهد الآن</a>
                  <a href="#/details?id=${data.hero.id}&type=${type}" class="btn btn-secondary">ℹ️ تفاصيل</a>
                </div>
              </div>
            </div>
          `;
        }
      }

      // ── Continue Watching ──
      const progressList = storage.getAllProgress();
      if (progressList.length > 0) {
        const sec = document.getElementById('continue-watching-section');
        const row = document.getElementById('continue-watching-row');
        if (sec && row) {
          sec.style.display = 'block';
          row.innerHTML = progressList.map(item => MovieCard.render(item)).join('');
        }
      }

      // ── Premium Banner ──
      const homeAd = document.getElementById('home-ad-slot');
      if (homeAd) {
        if (window.isUserPremium) {
          homeAd.style.display = 'none';
        } else {
          homeAd.innerHTML = `
            <div style="background:linear-gradient(135deg,rgba(255,0,85,0.07),rgba(121,40,202,0.07));border:1px solid var(--border-glass);padding:18px;border-radius:var(--radius-md);text-align:center;margin:16px 0;display:flex;flex-direction:column;align-items:center;gap:8px;">
              <span style="font-size:10px;background:var(--primary);color:#fff;padding:2px 8px;border-radius:999px;font-weight:700;letter-spacing:1px;">SEFIANE PREMIUM</span>
              <h4 style="margin:4px 0;font-size:15px;font-weight:700;">🚀 Get Rid of Ads & Enjoy Ultra-Fast Streaming!</h4>
              <p style="margin:0;font-size:13px;color:var(--text-secondary);">Premium Subscription! Contact me to activate your package.</p>
              <a href="https://www.instagram.com/sefiane.20/" target="_blank" class="btn btn-primary" style="padding:7px 20px;font-size:13px;font-weight:700;text-decoration:none;margin-top:4px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border: none;">Contact me on Instagram ✨</a>
            </div>
          `;
          homeAd.style.background = 'none';
          homeAd.style.border = 'none';
          homeAd.style.height = 'auto';
          homeAd.style.display = 'block';
        }
      }

      // ── Populate All Rows ──
      const populateRow = (rowId, list) => {
        const row = document.getElementById(rowId);
        if (!row) return;
        if (list && list.length > 0) {
          row.innerHTML = list.map(item => MovieCard.render(item)).join('');
        } else {
          row.innerHTML = `<div style="color:var(--text-muted);padding:20px;font-size:14px;">جاري التحميل أو لا يوجد محتوى متاح حالياً.</div>`;
        }
      };

      SECTIONS.forEach(section => {
        populateRow(section.id, data[section.key] || []);
      });

    } catch (error) {
      console.error('Error loading home data:', error);
    }
  }
};
