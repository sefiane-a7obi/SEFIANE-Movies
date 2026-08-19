import { Navbar } from './components/navbar.js';
import { Footer } from './components/footer.js';
import { adBlockDetector } from './components/adblock.js';
import { authService } from './services/auth.js';
import { storage } from './services/storage.js';

// Import Pages
import { Home } from './pages/home.js';
import { Browse } from './pages/browse.js';
import { Details } from './pages/details.js';
import { Watch } from './pages/watch.js';
import { Watchlist } from './pages/watchlist.js';
import { Admin } from './pages/admin.js';
import { Auth } from './pages/auth.js';
import { Profile } from './pages/profile.js';

// Routes mapping
const routes = {
  '/': Home,
  '/browse': Browse,
  '/details': Details,
  '/watch': Watch,
  '/watchlist': Watchlist,
  '/admin': Admin,
  '/auth': Auth,
  '/profile': Profile
};

class App {
  constructor() {
    this.mainContainer = null;
    this.navbarContainer = null;
    this.footerContainer = null;
  }

  async init() {
    this.mainContainer = document.getElementById('main-content');
    this.navbarContainer = document.getElementById('navbar-container');
    this.footerContainer = document.getElementById('footer-container');

    // Enable RTL by default since language is Arabic
    document.body.classList.add('rtl');

    // 0. Load Global Config from Backend Database
    try {
      await storage.loadGlobalConfig();
    } catch (e) {
      console.warn('Failed to load global config from database:', e);
    }

    // 1. Initial User Session Check
    await this.checkUserSession();

    // 2. Initial Render layout
    this.renderLayout();

    // 3. Listen to route changes
    window.addEventListener('hashchange', () => this.handleRouting());

    // 4. Listen to auth changes
    window.addEventListener('authChange', async () => {
      await this.checkUserSession();
      this.renderLayout();
      await this.handleRouting();
    });
    
    // 5. Handle initial load route
    await this.handleRouting();

    // 6. Run AdBlocker Detector Check
    this.checkAdBlocker();
  }

  async checkUserSession() {
    const token = authService.getToken();
    if (!token) {
      window.isUserPremium = false;
      return;
    }
    const isSessionOnly = sessionStorage.getItem('zenith_tv_token') !== null;
    const storageObj = isSessionOnly ? sessionStorage : localStorage;
    try {
      const data = await authService.getProfile();
      storageObj.setItem('zenith_tv_user', JSON.stringify(data));
      window.isUserPremium = data.is_premium;

      // Sync progress list from backend database to local storage
      const mode = await authService.detectMode();
      if (mode === 'server') {
        const historyRes = await fetch('/api/progress/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (historyRes.ok) {
          const history = await historyRes.json();
          history.forEach(item => {
            storage.saveProgress(item.media_id, item.media_type, {
              title: item.title,
              poster_path: item.poster_path,
              season: item.season,
              episode: item.episode,
              time: item.current_time,
              duration: item.duration,
              percentage: item.percentage
            });
          });
        }
      }
    } catch (e) {
      const cached = localStorage.getItem('zenith_tv_user') || sessionStorage.getItem('zenith_tv_user');
      if (cached) {
        const user = JSON.parse(cached);
        window.isUserPremium = user.is_premium;
      } else {
        window.isUserPremium = false;
      }
    }
  }

  renderLayout() {
    if (this.navbarContainer) {
      this.navbarContainer.innerHTML = Navbar.render();
      Navbar.setupListeners();
    }
    
    if (this.footerContainer) {
      this.footerContainer.innerHTML = Footer.render();
    }
  }

  async handleRouting() {
    // Scroll to top on every navigation
    window.scrollTo({ top: 0, behavior: 'instant' });

    const hash = window.location.hash || '#/';
    
    // Extract clean path (ignoring query parameters)
    // format: #/details?id=550 -> /details
    let cleanPath = hash;
    if (cleanPath.includes('?')) {
      cleanPath = cleanPath.split('?')[0];
    }
    cleanPath = cleanPath.replace('#', '');
    if (!cleanPath) cleanPath = '/';

    // Admin Page Route Guard (Server-verified)
    if (cleanPath === '/admin') {
      const isAdmin = await authService.verifyAdmin();
      if (!isAdmin) {
        window.location.hash = '#/';
        return;
      }
    }

    // Find matching route page, default to Home '/'
    const page = routes[cleanPath] || Home;

    // Rerender Navbar to keep active link highlight in sync
    if (this.navbarContainer) {
      this.navbarContainer.innerHTML = Navbar.render();
      Navbar.setupListeners();
    }

    // Inject skeleton loader
    if (this.mainContainer) {
      this.mainContainer.innerHTML = `
        <div class="container" style="margin-top: 150px; text-align: center;">
          <div class="shimmer" style="width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 20px auto;"></div>
          <h3 style="color: var(--text-secondary);">جاري تحميل SEFIANE Movies...</h3>
        </div>
      `;
      
      try {
        // Render target page content
        const pageHtml = await page.render();
        this.mainContainer.innerHTML = pageHtml;
        this.syncMobileBottomNav();
      } catch (err) {
        console.error('Routing render error:', err);
        this.mainContainer.innerHTML = `
          <div class="container" style="margin-top: 150px; text-align: center; color: var(--primary);">
            <h2>⚠️ حدث خطأ في تحميل الصفحة.</h2>
            <p style="margin-top: 10px; color: var(--text-secondary);">يرجى التأكد من اتصالك بالإنترنت وصلاحية مفتاح TMDB API.</p>
            <a href="#/" class="btn btn-primary" style="margin-top: 20px;">العودة للرئيسية</a>
          </div>
        `;
      }
    }
  }

  syncMobileBottomNav() {
    const hash = window.location.hash || '#/';
    const items = document.querySelectorAll('.mobile-nav-item');
    items.forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      let cleanHref = href;
      if (cleanHref.includes('?')) cleanHref = cleanHref.split('?')[0];
      let cleanHash = hash;
      if (cleanHash.includes('?')) cleanHash = cleanHash.split('?')[0];
      
      if (cleanHref === cleanHash) {
        item.classList.add('active');
      }
    });
  }

  async checkAdBlocker() {
    // Delay check slightly for smoother page initialization
    setTimeout(async () => {
      if (window.isUserPremium) return;
      const isBlocked = await adBlockDetector.check();
      if (isBlocked) {
        adBlockDetector.showModal();
      }
    }, 1500);
  }
}

// Instantiate and initialize App once DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
