import { storage } from './storage.js';

// Session Cache to avoid duplicate API requests
const cache = new Map();

// Helper to handle API requests with caching
async function fetchWithCache(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    cache.set(url, data);
    return data;
  } catch (error) {
    console.error('API Fetch error:', error);
    throw error;
  }
}

export const tmdbService = {
  getApiKey() {
    const settings = storage.getSettings();
    return settings.tmdbApiKey || 'c9e7c891bf8bbb53ee3d259c8312a093';
  },

  getBaseUrl() {
    return 'https://api.themoviedb.org/3';
  },

  getImageUrl(path, size = 'w500') {
    if (!path) return 'https://placehold.co/500x750/0f1115/ffffff?text=No+Poster';
    if (path.startsWith('http')) return path; // direct link (used for anime)
    return `https://image.tmdb.org/t/p/${size}${path}`;
  },

  getBackdropUrl(path, size = 'original') {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  },

  // Get Home Page Contents (Full Multi-Category)
  async getHomeData() {
    const apiKey = this.getApiKey();
    const base = this.getBaseUrl();

    // Helper to safely fetch and map
    const safe = async (url, mapper) => {
      try {
        const d = await fetchWithCache(url);
        return (d.results || d.data || []).map(mapper).filter(i => i.poster_path || i.type === 'anime');
      } catch (e) {
        console.warn('TMDB fetch failed:', url, e.message);
        return [];
      }
    };

    const movieMap  = item => ({ ...item, type: 'movie' });
    const tvMap     = item => ({ ...item, type: 'tv' });

    // Fetch ALL categories in parallel for speed
    const [
      trendingRes,
      popularMoviesRes,
      popularTVRes,
      animeRes,
      kdramaRes,
      turkishRes,
      bollywoodRes,
      topRatedRes,
      topRatedTVRes,
      nowPlayingRes,
      actionRes,
      horrorRes,
      animationRes,
      indiaSeriesRes,
      upcomingRes,
      documentaryRes,
      netflixRes,
      sci_fiRes
    ] = await Promise.all([
      // 1. Trending All
      safe(`${base}/trending/all/day?api_key=${apiKey}&language=ar-SA`, item => ({
        ...item, type: item.media_type || (item.title ? 'movie' : 'tv')
      })),
      // 2. Popular Movies
      safe(`${base}/movie/popular?api_key=${apiKey}&language=ar-SA&page=1`, movieMap),
      // 3. Popular TV
      safe(`${base}/tv/popular?api_key=${apiKey}&language=ar-SA&page=1`, tvMap),
      // 4. Anime (Jikan)
      (async () => {
        try {
          const jikanRes = await fetchWithCache('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=20');
          return (jikanRes.data || []).map(anime => ({
            id: anime.mal_id,
            title: anime.title_english || anime.title,
            original_name: anime.title_japanese,
            poster_path: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
            backdrop_path: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
            vote_average: anime.score || 0,
            release_date: anime.aired?.from ? anime.aired.from.split('T')[0] : 'N/A',
            overview: anime.synopsis || '',
            type: 'anime'
          }));
        } catch (e) { return []; }
      })(),
      // 5. K-Drama
      safe(`${base}/discover/tv?api_key=${apiKey}&language=ar-SA&with_origin_country=KR&sort_by=popularity.desc&page=1`, tvMap),
      // 6. Turkish Series
      safe(`${base}/discover/tv?api_key=${apiKey}&language=ar-SA&with_origin_country=TR&sort_by=popularity.desc&page=1`, tvMap),
      // 7. Bollywood
      safe(`${base}/discover/movie?api_key=${apiKey}&language=ar-SA&with_origin_country=IN&sort_by=popularity.desc&page=1`, movieMap),
      // 8. Top Rated Movies (IMDB high)
      safe(`${base}/movie/top_rated?api_key=${apiKey}&language=ar-SA&page=1`, movieMap),
      // 9. Top Rated TV
      safe(`${base}/tv/top_rated?api_key=${apiKey}&language=ar-SA&page=1`, tvMap),
      // 10. Now Playing in Cinemas
      safe(`${base}/movie/now_playing?api_key=${apiKey}&language=ar-SA&page=1`, movieMap),
      // 11. Action & Adventure Movies
      safe(`${base}/discover/movie?api_key=${apiKey}&language=ar-SA&with_genres=28,12&sort_by=popularity.desc&page=1`, movieMap),
      // 12. Horror Movies
      safe(`${base}/discover/movie?api_key=${apiKey}&language=ar-SA&with_genres=27&sort_by=popularity.desc&page=1`, movieMap),
      // 13. Animation Movies & Cartoons
      safe(`${base}/discover/movie?api_key=${apiKey}&language=ar-SA&with_genres=16&sort_by=popularity.desc&page=1`, movieMap),
      // 14. Indian Series (Bollywood TV)
      safe(`${base}/discover/tv?api_key=${apiKey}&language=ar-SA&with_origin_country=IN&sort_by=popularity.desc&page=1`, tvMap),
      // 15. Upcoming Movies
      safe(`${base}/movie/upcoming?api_key=${apiKey}&language=ar-SA&page=1`, movieMap),
      // 16. Documentary
      safe(`${base}/discover/movie?api_key=${apiKey}&language=ar-SA&with_genres=99&sort_by=popularity.desc&page=1`, movieMap),
      // 17. Netflix / Streaming Originals (network_id=213 = Netflix)
      safe(`${base}/discover/tv?api_key=${apiKey}&language=ar-SA&with_networks=213&sort_by=popularity.desc&page=1`, tvMap),
      // 18. Sci-Fi Movies
      safe(`${base}/discover/movie?api_key=${apiKey}&language=ar-SA&with_genres=878&sort_by=popularity.desc&page=1`, movieMap),
    ]);

    const heroItem = trendingRes.find(i => i.backdrop_path) || trendingRes[0];

    return {
      hero: heroItem,
      trending: trendingRes,
      popularMovies: popularMoviesRes,
      popularTV: popularTVRes,
      anime: animeRes,
      kdrama: kdramaRes,
      turkish: turkishRes,
      bollywood: bollywoodRes,
      topRated: topRatedRes,
      topRatedTV: topRatedTVRes,
      nowPlaying: nowPlayingRes,
      action: actionRes,
      horror: horrorRes,
      animation: animationRes,
      indiaSeries: indiaSeriesRes,
      upcoming: upcomingRes,
      documentary: documentaryRes,
      netflix: netflixRes,
      sciFi: sci_fiRes
    };
  },



  // Get Media Details (Movie, TV, or Anime)
  async getDetails(id, type) {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();

    if (type === 'anime') {
      try {
        const data = await fetchWithCache(`https://api.jikan.moe/v4/anime/${id}/full`);
        const anime = data.data;
        
        // Fetch episodes for anime
        let episodes = [];
        try {
          const epData = await fetchWithCache(`https://api.jikan.moe/v4/anime/${id}/episodes`);
          episodes = epData.data.map(ep => ({
            id: ep.mal_id,
            episode_number: ep.mal_id,
            name: ep.title || `حلقة ${ep.mal_id}`,
            air_date: ep.aired || ''
          }));
        } catch (e) {
          // If episodes endpoint fails or is empty, mock some episodes
          const count = anime.episodes || 12;
          for (let i = 1; i <= count; i++) {
            episodes.push({ id: i, episode_number: i, name: `الحلقة ${i}` });
          }
        }

        // Map Jikan to TMDB-like structure
        return {
          id: anime.mal_id,
          title: anime.title_english || anime.title,
          original_name: anime.title_japanese,
          overview: anime.synopsis || 'لا يوجد وصف متاح باللغة العربية.',
          poster_path: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
          backdrop_path: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
          vote_average: anime.score || 0,
          release_date: anime.aired?.from ? anime.aired.from.split('T')[0] : 'N/A',
          genres: anime.genres ? anime.genres.map(g => ({ name: g.name })) : [],
          status: anime.status,
          runtime: anime.duration ? parseInt(anime.duration) || 24 : 24,
          episodes_count: anime.episodes || episodes.length,
          seasons: [{ season_number: 1, name: 'موسم 1', episodes }],
          credits: {
            cast: anime.producers ? anime.producers.map(p => ({ name: p.name, character: 'الاستوديو المنتج' })) : []
          },
          videos: { results: [] },
          similar: { results: [] },
          type: 'anime'
        };
      } catch (err) {
        console.error('Error fetching anime details:', err);
        throw err;
      }
    }

    // Movies and TV Shows
    try {
      const details = await fetchWithCache(`${baseUrl}/${type}/${id}?api_key=${apiKey}&language=ar-SA&append_to_response=videos,credits,similar`);
      
      // If it's a TV show, fetch details of season 1 to list episodes out of the box
      if (type === 'tv' && details.seasons && details.seasons.length > 0) {
        // filter out season 0 (Specials) if present
        const activeSeason = details.seasons.find(s => s.season_number > 0) || details.seasons[0];
        try {
          const seasonData = await fetchWithCache(`${baseUrl}/tv/${id}/season/${activeSeason.season_number}?api_key=${apiKey}&language=ar-SA`);
          details.selectedSeasonEpisodes = seasonData.episodes;
        } catch (e) {
          details.selectedSeasonEpisodes = [];
        }
      }
      
      // Fallback to English overview if Arabic overview is missing or empty
      if (!details.overview || details.overview.trim() === '') {
        try {
          const engDetails = await fetchWithCache(`${baseUrl}/${type}/${id}?api_key=${apiKey}&language=en-US`);
          if (engDetails && engDetails.overview) {
            details.overview = engDetails.overview;
          }
        } catch (e) {
          console.warn('English fallback details fetch failed:', e);
        }
      }
      
      return {
        ...details,
        type
      };
    } catch (err) {
      console.error('Error fetching media details:', err);
      // Fallback in case of failure or EN-US translation required
      return fetchWithCache(`${baseUrl}/${type}/${id}?api_key=${apiKey}&language=en-US&append_to_response=videos,credits,similar`);
    }
  },

  // Get specific TV Season Episodes
  async getTVSeason(tvId, seasonNumber) {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    try {
      const data = await fetchWithCache(`${baseUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=ar-SA`);
      return data.episodes;
    } catch (err) {
      console.error('Error fetching season data:', err);
      // Try english fallback
      const data = await fetchWithCache(`${baseUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=en-US`);
      return data.episodes;
    }
  },

  // Search movies, shows, and anime
  async search(query, page = 1) {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    
    let tmdbResults = [];
    try {
      const tmdbSearch = await fetchWithCache(`${baseUrl}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ar-SA&page=${page}`);
      tmdbResults = tmdbSearch.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => ({
          ...item,
          type: item.media_type
        }));
    } catch (err) {
      console.error('TMDB search error:', err);
    }

    let animeResults = [];
    // Only search anime on the first page to avoid mixing schemas too much
    if (page === 1) {
      try {
        const jikanSearch = await fetchWithCache(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`);
        animeResults = jikanSearch.data.map(anime => ({
          id: anime.mal_id,
          title: anime.title_english || anime.title,
          original_name: anime.title_japanese,
          poster_path: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
          vote_average: anime.score || 0,
          release_date: anime.aired?.from ? anime.aired.from.split('T')[0] : 'N/A',
          overview: anime.synopsis || '',
          type: 'anime'
        }));
      } catch (err) {
        console.error('Jikan search error:', err);
      }
    }

    return [...tmdbResults, ...animeResults];
  },

  // Discover and Filter movies/shows by parameters
  async discover(mediaType, genreId, year, sortBy = 'popularity.desc', page = 1) {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();

    if (mediaType === 'anime') {
      // Anime filter using Jikan
      let url = `https://api.jikan.moe/v4/anime?limit=24&page=${page}`;
      if (genreId) url += `&genres=${genreId}`;
      if (sortBy) {
        if (sortBy.includes('popularity')) url += '&order_by=popularity';
        else if (sortBy.includes('vote_average')) url += '&order_by=score&sort=desc';
        else if (sortBy.includes('release_date')) url += '&order_by=start_date&sort=desc';
      }
      try {
        const data = await fetchWithCache(url);
        return data.data.map(anime => ({
          id: anime.mal_id,
          title: anime.title_english || anime.title,
          original_name: anime.title_japanese,
          poster_path: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
          vote_average: anime.score || 0,
          release_date: anime.aired?.from ? anime.aired.from.split('T')[0] : 'N/A',
          overview: anime.synopsis || '',
          type: 'anime'
        }));
      } catch (err) {
        console.error('Error discovering anime:', err);
        return [];
      }
    }

    // Movies and TV discover
    let url = `${baseUrl}/discover/${mediaType}?api_key=${apiKey}&language=ar-SA&sort_by=${sortBy}&page=${page}`;
    if (genreId) url += `&with_genres=${genreId}`;
    if (year) {
      if (mediaType === 'movie') url += `&primary_release_year=${year}`;
      else url += `&first_air_date_year=${year}`;
    }

    try {
      const data = await fetchWithCache(url);
      return data.results.map(item => ({ ...item, type: mediaType }));
    } catch (err) {
      console.error('Discover error:', err);
      return [];
    }
  },

  // Load lists of Genres
  async getGenres(mediaType) {
    if (mediaType === 'anime') {
      // Return hardcoded common anime genres for speed and offline availability
      return [
        { id: 1, name: 'أكشن (Action)' },
        { id: 2, name: 'مغامرة (Adventure)' },
        { id: 4, name: 'كوميديا (Comedy)' },
        { id: 8, name: 'دراما (Drama)' },
        { id: 10, name: 'خيال (Fantasy)' },
        { id: 24, name: 'خيال علمي (Sci-Fi)' },
        { id: 37, name: 'خارق للطبيعة (Supernatural)' },
        { id: 22, name: 'رومانسية (Romance)' }
      ];
    }

    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    try {
      const data = await fetchWithCache(`${baseUrl}/genre/${mediaType}/list?api_key=${apiKey}&language=ar-SA`);
      return data.genres;
    } catch (err) {
      console.error('Error fetching genres:', err);
      return [];
    }
  }
};
