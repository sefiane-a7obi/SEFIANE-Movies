import { tmdbService } from '../services/tmdb.js';
import { MovieCard } from '../components/moviecard.js';

export const Browse = {
  // Store page query/filter state
  state: {
    searchQuery: '',
    mediaType: 'movie',
    genreId: '',
    year: '',
    sortBy: 'popularity.desc',
    page: 1
  },

  async render() {
    // Parse query params from hash URL (e.g. #/browse?search=john or #/browse?type=tv)
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    
    this.state.searchQuery = urlParams.get('search') || '';
    const initialType = urlParams.get('type');
    if (initialType && ['movie', 'tv', 'anime'].includes(initialType)) {
      this.state.mediaType = initialType;
    }
    
    // Reset page for new search/browse criteria
    this.state.page = 1;

    setTimeout(() => {
      this.setupSelectors();
      this.loadResults(true);
    }, 50);

    const isSearchMode = !!this.state.searchQuery;
    const headerTitle = isSearchMode ? `نتائج البحث عن: "${this.state.searchQuery}"` : 'تصفح واستكشف الأعمال';

    return `
      <div class="container browse-section">
        <div class="section-header" style="margin-bottom: 30px;">
          <h1 class="section-title" id="browse-title" style="font-size: 28px;">${headerTitle}</h1>
        </div>

        <!-- Filters Wrapper -->
        <div class="filters-wrapper" id="filters-container" style="${isSearchMode ? 'display: none;' : ''}">
          <!-- Type Select -->
          <div class="filter-group">
            <span style="font-size: 13px; font-weight:600; display:block; margin-bottom:5px; color:var(--text-secondary);">نوع المحتوى</span>
            <select class="filter-select" id="select-media-type">
              <option value="movie" ${this.state.mediaType === 'movie' ? 'selected' : ''}>أفلام</option>
              <option value="tv" ${this.state.mediaType === 'tv' ? 'selected' : ''}>مسلسلات</option>
              <option value="anime" ${this.state.mediaType === 'anime' ? 'selected' : ''}>أنمي</option>
            </select>
          </div>

          <!-- Genre Select -->
          <div class="filter-group">
            <span style="font-size: 13px; font-weight:600; display:block; margin-bottom:5px; color:var(--text-secondary);">التصنيف / النوع</span>
            <select class="filter-select" id="select-genre">
              <option value="">كل التصنيفات</option>
            </select>
          </div>

          <!-- Year Select -->
          <div class="filter-group">
            <span style="font-size: 13px; font-weight:600; display:block; margin-bottom:5px; color:var(--text-secondary);">سنة الإنتاج</span>
            <select class="filter-select" id="select-year">
              <option value="">جميع السنوات</option>
              ${this.generateYearOptions()}
            </select>
          </div>

          <!-- Sort Select -->
          <div class="filter-group">
            <span style="font-size: 13px; font-weight:600; display:block; margin-bottom:5px; color:var(--text-secondary);">ترتيب حسب</span>
            <select class="filter-select" id="select-sort">
              <option value="popularity.desc" ${this.state.sortBy === 'popularity.desc' ? 'selected' : ''}>الأكثر شعبية</option>
              <option value="vote_average.desc" ${this.state.sortBy === 'vote_average.desc' ? 'selected' : ''}>التقييم الأعلى</option>
              <option value="release_date.desc" ${this.state.sortBy === 'release_date.desc' ? 'selected' : ''}>الأحدث</option>
            </select>
          </div>
        </div>

        <!-- Media Grid -->
        <div class="movies-grid" id="browse-grid">
          ${this.renderSkeletons(12)}
        </div>

        <!-- Load More Container -->
        <div style="display: flex; justify-content: center; margin-top: 40px; margin-bottom: 40px;">
          <button id="btn-load-more" class="btn btn-secondary" style="padding: 12px 35px; font-weight: 700; font-size: 14px; border-radius: 30px; display: none; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-glass); transition: all var(--transition-fast);">🔄 تحميل المزيد من الأعمال</button>
        </div>
      </div>
    `;
  },

  generateYearOptions() {
    const currentYear = new Date().getFullYear();
    let options = '';
    for (let y = currentYear; y >= 1990; y--) {
      options += `<option value="${y}" ${this.state.year == y ? 'selected' : ''}>${y}</option>`;
    }
    return options;
  },

  renderSkeletons(count) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
      skeletons += `
        <div class="movie-card shimmer" style="aspect-ratio: 2/3; border-radius: var(--radius-md);"></div>
      `;
    }
    return skeletons;
  },

  async setupSelectors() {
    const selectType = document.getElementById('select-media-type');
    const selectGenre = document.getElementById('select-genre');
    const selectYear = document.getElementById('select-year');
    const selectSort = document.getElementById('select-sort');
    const loadMoreBtn = document.getElementById('btn-load-more');

    if (selectType) {
      // Load genres for initial type
      await this.loadGenres(this.state.mediaType);

      // Add listeners
      selectType.addEventListener('change', async (e) => {
        this.state.mediaType = e.target.value;
        this.state.genreId = ''; // reset genre on type change
        this.state.page = 1;
        await this.loadGenres(this.state.mediaType);
        this.loadResults(true);
      });
    }

    if (selectGenre) {
      selectGenre.addEventListener('change', (e) => {
        this.state.genreId = e.target.value;
        this.state.page = 1;
        this.loadResults(true);
      });
    }

    if (selectYear) {
      selectYear.addEventListener('change', (e) => {
        this.state.year = e.target.value;
        this.state.page = 1;
        this.loadResults(true);
      });
    }

    if (selectSort) {
      selectSort.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.state.page = 1;
        this.loadResults(true);
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.state.page += 1;
        this.loadResults(false);
      });
    }
  },

  async loadGenres(type) {
    const selectGenre = document.getElementById('select-genre');
    if (!selectGenre) return;

    try {
      const genres = await tmdbService.getGenres(type);
      let optionsHtml = '<option value="">كل التصنيفات</option>';
      genres.forEach(genre => {
        const isSelected = this.state.genreId == genre.id ? 'selected' : '';
        optionsHtml += `<option value="${genre.id}" ${isSelected}>${genre.name}</option>`;
      });
      selectGenre.innerHTML = optionsHtml;
    } catch (e) {
      console.error('Error loading genres:', e);
    }
  },

  async loadResults(isNewQuery = true) {
    const grid = document.getElementById('browse-grid');
    const loadMoreBtn = document.getElementById('btn-load-more');
    if (!grid) return;

    if (isNewQuery) {
      grid.innerHTML = this.renderSkeletons(12);
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else if (loadMoreBtn) {
      loadMoreBtn.innerText = 'جاري التحميل...';
      loadMoreBtn.style.pointerEvents = 'none';
    }

    try {
      let results = [];
      if (this.state.searchQuery) {
        // Search Mode
        results = await tmdbService.search(this.state.searchQuery, this.state.page);
      } else {
        // Discover Mode
        results = await tmdbService.discover(
          this.state.mediaType,
          this.state.genreId,
          this.state.year,
          this.state.sortBy,
          this.state.page
        );
      }

      // Render cards
      if (isNewQuery) {
        if (results && results.length > 0) {
          grid.innerHTML = results.map(item => MovieCard.render(item)).join('');
          if (loadMoreBtn) {
            // Show load more if we got a full page of results
            loadMoreBtn.style.display = results.length >= 10 ? 'block' : 'none';
          }
        } else {
          grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
              <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
              <h3>لم نجد أي نتائج تطابق بحثك أو تصنيفك المختار.</h3>
              <p style="font-size:14px; margin-top:5px; color:var(--text-muted);">حاول اختيار تصفية أخرى أو تغيير كلمة البحث.</p>
            </div>
          `;
        }
      } else {
        // Append cards for pagination
        if (results && results.length > 0) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = results.map(item => MovieCard.render(item)).join('');
          while (tempDiv.firstChild) {
            grid.appendChild(tempDiv.firstChild);
          }
        }
        if (loadMoreBtn) {
          loadMoreBtn.style.display = results.length >= 10 ? 'block' : 'none';
        }
      }
    } catch (e) {
      console.error('Error loading browse results:', e);
      if (isNewQuery) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--primary); padding: 40px;">فشل الاتصال بالخادم. يرجى التحقق من إعدادات المفتاح TMDB API.</div>`;
      }
    } finally {
      if (loadMoreBtn) {
        loadMoreBtn.innerText = '🔄 تحميل المزيد من الأعمال';
        loadMoreBtn.style.pointerEvents = 'auto';
      }
    }
  }
};
