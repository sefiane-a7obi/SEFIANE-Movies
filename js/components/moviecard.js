import { tmdbService } from '../services/tmdb.js';
import { storage } from '../services/storage.js';

export const MovieCard = {
  render(item) {
    const title = item.title || item.name;
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const date = item.release_date || item.first_air_date || '';
    const year = date ? date.split('-')[0] : 'N/A';
    const posterUrl = tmdbService.getImageUrl(item.poster_path);
    const mediaType = item.type || 'movie';

    // Badge Translation
    let badgeText = 'فيلم';
    if (mediaType === 'tv') badgeText = 'مسلسل';
    if (mediaType === 'anime') badgeText = 'أنمي';

    // Check progress for Continue Watching indicator
    const progress = storage.getProgress(item.id, mediaType);
    let progressHtml = '';
    if (progress && progress.percentage) {
      progressHtml = `
        <div class="movie-card-progress">
          <div class="movie-card-progress-bar" style="width: ${progress.percentage}%"></div>
        </div>
      `;
    }

    return `
      <div class="movie-card" onclick="location.hash='#/details?id=${item.id}&type=${mediaType}'" title="${title}">
        <span class="movie-card-badge">${badgeText}</span>
        <img class="movie-card-img shimmer" src="${posterUrl}" alt="${title}" loading="lazy" onload="this.classList.remove('shimmer')">
        <div class="movie-card-overlay">
          <div class="movie-card-info">
            <h4 class="movie-card-title">${title}</h4>
            <div class="movie-card-meta">
              <span class="movie-card-rating">⭐️ ${rating}</span>
              <span>📅 ${year}</span>
            </div>
          </div>
        </div>
        ${progressHtml}
      </div>
    `;
  }
};
