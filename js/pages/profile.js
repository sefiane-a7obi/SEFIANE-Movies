import { authService } from '../services/auth.js';

export const Profile = {
  state: {
    loading: true,
    user: null,
    error: ''
  },

  async render() {
    setTimeout(() => this.loadProfile(), 50);

    return `
      <div class="container" style="margin-top: 120px; max-width: 600px;">
        <div id="profile-container">
          <!-- Spinner Loader -->
          <div style="text-align: center; padding: 60px;">
            <div class="shimmer" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px auto;"></div>
            <h3 style="color: var(--text-secondary);">جاري جلب بيانات الحساب...</h3>
          </div>
        </div>
      </div>
    `;
  },

  async loadProfile() {
    const container = document.getElementById('profile-container');
    if (!container) return;

    const token = authService.getToken();
    if (!token) {
      window.location.hash = '#/auth';
      return;
    }

    try {
      const data = await authService.getProfile();
      this.state.user = data;
      this.state.loading = false;
      
      // Update local storage user status
      localStorage.setItem('zenith_tv_user', JSON.stringify({
        email: data.email,
        subscription_status: data.subscription_status,
        trial_ends_at: data.trial_ends_at
      }));

      // Render profile layout
      this.renderProfileLayout(container);
    } catch (err) {
      console.error(err);
      localStorage.removeItem('zenith_tv_token');
      localStorage.removeItem('zenith_tv_user');
      window.location.hash = '#/auth';
    }
  },

  renderProfileLayout(container) {
    const user = this.state.user;
    const isPremium = user.subscription_status === 'premium';
    const isTrial = user.subscription_status === 'trial';
    
    let badgeColor = 'var(--primary)';
    let badgeText = 'الباقة المجانية';
    let subDetailHtml = '';

    if (isPremium) {
      badgeColor = '#00e673';
      badgeText = 'العضوية المميزة (Premium)';
      const endDate = new Date(user.subscription_ends_at).toLocaleDateString('ar-SA');
      subDetailHtml = `
        <div style="margin-top: 15px; padding: 15px; background: rgba(0, 230, 115, 0.08); border: 1px solid #00e673; border-radius: var(--radius-md); text-align: right;">
          <h4 style="color: #00e673;">✨ مزايا الاشتراك نشطة:</h4>
          <ul style="margin-top: 8px; color: var(--text-secondary); padding-right: 20px; font-size: 14px;">
            <li>مشاهدة جميع الأفلام والمسلسلات والأنمي مجاناً.</li>
            <li>إزالة الإعلانات بالكامل (No Ads).</li>
            <li>دعم الجودة الفائقة وسيرفرات البث المتعددة.</li>
          </ul>
          <p style="margin-top: 12px; font-size: 13px; color: var(--text-muted);">تاريخ انتهاء الاشتراك: <strong>${endDate}</strong></p>
        </div>
      `;
    } else if (isTrial) {
      badgeColor = 'var(--secondary)';
      badgeText = 'الفترة التجريبية مجانية (7 أيام)';
      subDetailHtml = `
        <div style="margin-top: 15px; padding: 15px; background: rgba(255, 0, 85, 0.08); border: 1px solid var(--primary); border-radius: var(--radius-md); text-align: right;">
          <h4 style="color: var(--primary);">🎁 فترة التجربة نشطة حالياً:</h4>
          <ul style="margin-top: 8px; color: var(--text-secondary); padding-right: 20px; font-size: 14px;">
            <li>باقي من فترتك التجريبية: <strong>${user.remaining_trial_days} أيام</strong>.</li>
            <li>جميع المزايا المميزة مفتوحة لك بالكامل وبدون إعلانات.</li>
          </ul>
          <p style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">بعد انتهاء الـ 7 أيام، سيتم نقلك تلقائياً للباقة المجانية (مع ظهور الإعلانات).</p>
        </div>
      `;
    } else {
      subDetailHtml = `
        <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); text-align: right;">
          <h4 style="color: var(--text-primary);">⚠️ حسابك على الباقة المجانية:</h4>
          <p style="margin-top: 8px; color: var(--text-secondary); font-size: 14px; line-height: 1.5;">
            Your trial has ended. You can continue watching for free with ads, or get a Premium Subscription to remove them entirely and get higher streaming speeds. Contact me to activate your package.
          </p>
          <a href="https://www.instagram.com/sefiane.20/" target="_blank" class="btn btn-primary" style="display: block; text-decoration: none; text-align: center; margin-top: 15px; width: 100%; font-weight: 700; padding: 12px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border: none;">Contact me on Instagram to upgrade ✨</a>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="glass-card" style="padding: 40px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); background: rgba(15, 17, 21, 0.6); backdrop-filter: blur(12px);">
        <div style="display: flex; align-items: center; gap: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 25px; margin-bottom: 25px;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: #fff;">
            ${user.email.charAt(0).toUpperCase()}
          </div>
          <div style="text-align: right;">
            <h2 style="color: var(--text-primary); font-size: 22px; font-weight: 700;">حسابي</h2>
            <p style="color: var(--text-muted); font-size: 14px; margin-top: 5px;">${user.email}</p>
          </div>
        </div>

        <div style="margin-bottom: 25px; text-align: right;">
          <h3 style="color: var(--text-secondary); font-size: 16px;">حالة الاشتراك الحالية:</h3>
          <span style="display: inline-block; margin-top: 10px; padding: 6px 12px; border-radius: 20px; background: ${badgeColor}; color: #000; font-size: 13px; font-weight: 700;">
            ${badgeText}
          </span>
          ${subDetailHtml}
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 25px; border-top: 1px solid var(--border-color); padding-top: 20px;">
          <div style="display: flex; gap: 15px;">
            <button id="btn-logout" class="btn btn-secondary" style="flex: 1; padding: 12px; font-weight: 700; border-radius: var(--radius-md);">تسجيل الخروج</button>
            <button id="btn-logout-all" class="btn btn-danger" style="flex: 1; padding: 12px; font-weight: 700; border-radius: var(--radius-md); background: transparent; border: 1px solid var(--primary); color: var(--primary);">خروج من كافة الأجهزة</button>
          </div>
        </div>
      </div>
    `;

    // Bind Upgrade button event if present
    const upgradeBtn = document.getElementById('btn-upgrade-premium');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => this.upgradeToPremium());
    }

    // Bind Logout event
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Bind Logout All event
    const logoutAllBtn = document.getElementById('btn-logout-all');
    if (logoutAllBtn) {
      logoutAllBtn.addEventListener('click', () => this.logoutAll());
    }
  },

  async upgradeToPremium() {
    const token = authService.getToken();
    if (!token) return;

    const btn = document.getElementById('btn-upgrade-premium');
    if (btn) {
      btn.innerText = 'جاري الترقية...';
      btn.disabled = true;
    }

    try {
      await authService.subscribe();
      this.loadProfile();
      window.dispatchEvent(new Event('authChange'));
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة الترقية. يرجى المحاولة لاحقاً.');
      if (btn) {
        btn.innerText = 'ترقية الحساب للعضوية المميزة ✨';
        btn.disabled = false;
      }
    }
  },

  logout() {
    localStorage.removeItem('zenith_tv_token');
    localStorage.removeItem('zenith_tv_user');
    sessionStorage.removeItem('zenith_tv_token');
    sessionStorage.removeItem('zenith_tv_user');
    
    window.dispatchEvent(new Event('authChange'));
    window.location.hash = '#/auth';
  },

  async logoutAll() {
    const confirmLogout = confirm('هل أنت متأكد من رغبتك في تسجيل الخروج من جميع الأجهزة وإلغاء كافة الجلسات الحالية؟');
    if (!confirmLogout) return;
    
    const btn = document.getElementById('btn-logout-all');
    if (btn) {
      btn.innerText = 'جاري تسجيل الخروج...';
      btn.disabled = true;
    }
    
    try {
      await authService.logoutAllDevices();
      window.dispatchEvent(new Event('authChange'));
      window.location.hash = '#/auth';
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء محاولة تسجيل الخروج.');
      if (btn) {
        btn.innerText = 'خروج من كافة الأجهزة';
        btn.disabled = false;
      }
    }
  }
};
