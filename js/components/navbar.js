import { storage } from '../services/storage.js';
import { security } from '../utils/security.js';
import { authService } from '../services/auth.js';

export const Navbar = {
  render() {
    const currentHash = window.location.hash || '#/';
    const isHomeActive = currentHash === '#/' ? 'active' : '';
    const isBrowseActive = currentHash.startsWith('#/browse') ? 'active' : '';
    const isWatchlistActive = currentHash === '#/watchlist' ? 'active' : '';
    const isAdminActive = currentHash === '#/admin' ? 'active' : '';

    const token = authService.getToken();
    const userJson = localStorage.getItem('zenith_tv_user') || sessionStorage.getItem('zenith_tv_user');
    let profileAreaHtml = '';
    let isAdmin = false;
    
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        const letter = user.email.charAt(0).toUpperCase();
        isAdmin = user.email === 'test_dev@zenith.tv';
        profileAreaHtml = `<div class="btn-profile" onclick="location.hash='#/profile'" title="الملف الشخصي" style="cursor: pointer; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff;">${letter}</div>`;
      } catch (e) {
        profileAreaHtml = `<div class="btn-profile" onclick="location.hash='#/profile'" title="الملف الشخصي" style="cursor: pointer;">U</div>`;
      }
    } else {
      profileAreaHtml = `<a href="#/auth" class="btn btn-primary" style="padding: 8px 18px; font-size: 13px; font-weight: 700; border-radius: 20px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 36px; white-space: nowrap;">تسجيل الدخول</a>`;
    }

    const adminLinkHtml = isAdmin ? `<li><a href="#/admin" class="nav-link ${isAdminActive}">الإدارة</a></li>` : '';

    return `
      <nav class="navbar">
        <div class="container">
          <div class="nav-left">
            <a href="#/" class="logo logo-glow">
              <span class="rgb-text-animated">SEFIANE Movies</span>
            </a>
            <ul class="nav-menu" id="nav-menu">
              <li><a href="#/" class="nav-link ${isHomeActive}">الرئيسية</a></li>
              <li><a href="#/browse" class="nav-link ${isBrowseActive}">تصفح الكل</a></li>
              <li><a href="#/watchlist" class="nav-link ${isWatchlistActive}">مفضلتي</a></li>
              ${adminLinkHtml}
            </ul>
          </div>
          
          <div class="nav-right">
            <form class="nav-search-box" id="nav-search-form">
              <span class="nav-search-icon">🔍</span>
              <input type="text" class="nav-search-input" id="nav-search-input" placeholder="ابحث عن فيلم، مسلسل، أنمي..." required>
            </form>
            ${profileAreaHtml}
          </div>
        </div>
      </nav>
    `;
  },

  setupListeners() {
    const form = document.getElementById('nav-search-form');
    const input = document.getElementById('nav-search-input');
    
    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = input.value.trim();
        if (query) {
          // Rate Limiter: Max 8 searches per minute
          if (!security.rateLimit.isAllowed('search_queries', 8, 60000)) {
            alert('تنبيه أمني: لقد قمت بعمليات بحث مفرطة في وقت قصير. يرجى الانتظار قليلاً.');
            return;
          }
          const cleanQuery = security.sanitize(query);
          window.location.hash = `#/browse?search=${encodeURIComponent(cleanQuery)}`;
        }
      });
    }

    // Scroll effect
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
    });
  }
};
