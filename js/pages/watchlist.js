import { storage } from '../services/storage.js';
import { MovieCard } from '../components/moviecard.js';

export const Watchlist = {
  state: {
    activeTab: 'favorites' // 'favorites' or 'history'
  },

  render() {
    setTimeout(() => {
      this.setupListeners();
      this.loadList();
    }, 50);

    return `
      <div class="container" style="margin-top: 100px;">
        <div class="section-header" style="margin-bottom: 30px;">
          <h1 class="section-title" style="font-size: 28px;">مكتبتي الخاصة</h1>
          
          <!-- Tab Buttons -->
          <div style="display: flex; gap: 10px; background: var(--bg-surface); padding: 5px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
            <button class="server-btn ${this.state.activeTab === 'favorites' ? 'active' : ''}" id="tab-favorites" style="padding: 6px 16px;">المفضلة</button>
            <button class="server-btn ${this.state.activeTab === 'history' ? 'active' : ''}" id="tab-history" style="padding: 6px 16px;">سجل المشاهدة</button>
          </div>
        </div>

        <div style="margin-bottom: 20px; display: flex; justify-content: flex-end;" id="action-bar-container">
          <!-- clear history button (visible in history tab only) -->
        </div>

        <!-- Cards Grid -->
        <div class="movies-grid" id="watchlist-grid">
          <!-- populated dynamically -->
        </div>
      </div>
    `;
  },

  setupListeners() {
    const tabFav = document.getElementById('tab-favorites');
    const tabHist = document.getElementById('tab-history');

    if (tabFav && tabHist) {
      tabFav.addEventListener('click', () => {
        this.state.activeTab = 'favorites';
        tabFav.classList.add('active');
        tabHist.classList.remove('active');
        this.loadList();
      });

      tabHist.addEventListener('click', () => {
        this.state.activeTab = 'history';
        tabHist.classList.add('active');
        tabFav.classList.remove('active');
        this.loadList();
      });
    }
  },

  loadList() {
    const grid = document.getElementById('watchlist-grid');
    const actionBar = document.getElementById('action-bar-container');
    if (!grid) return;

    grid.innerHTML = '';
    
    if (this.state.activeTab === 'favorites') {
      if (actionBar) actionBar.innerHTML = '';
      const list = storage.getWatchlist();
      
      if (list.length > 0) {
        grid.innerHTML = list.map(item => MovieCard.render(item)).join('');
      } else {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; color: var(--text-secondary);">
            <div style="font-size: 50px; margin-bottom: 10px;">🤍</div>
            <h3>قائمة المفضلة فارغة حالياً.</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-top:5px;">تصفح الأفلام والأنمي واضغط على "أضف للمفضلة" لتظهر هنا.</p>
            <a href="#/browse" class="btn btn-primary" style="margin-top: 20px;">استكشف الأعمال</a>
          </div>
        `;
      }
    } else {
      // History Tab
      const historyList = storage.getAllProgress();

      if (historyList.length > 0) {
        if (actionBar) {
          actionBar.innerHTML = `
            <button class="btn btn-secondary" id="btn-clear-history" style="font-size: 12px; padding: 6px 16px;">
              🗑️ مسح السجل بالكامل
            </button>
          `;
          document.getElementById('btn-clear-history').addEventListener('click', () => {
            if (confirm('هل أنت متأكد من رغبتك في مسح سجل المشاهدة بالكامل؟')) {
              storage.set('watch_history', {});
              this.loadList();
            }
          });
        }
        
        grid.innerHTML = historyList.map(item => MovieCard.render(item)).join('');
      } else {
        if (actionBar) actionBar.innerHTML = '';
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; color: var(--text-secondary);">
            <div style="font-size: 50px; margin-bottom: 10px;">⏳</div>
            <h3>لا يوجد سجل مشاهدة حالياً.</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-top:5px;">عندما تبدأ بمشاهدة أي فيلم أو حلقة، سيتم حفظ تقدمك هنا تلقائياً.</p>
          </div>
        `;
      }
    }
  }
};
