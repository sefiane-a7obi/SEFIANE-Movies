// Authentication & Subscription Hybrid Service
// Integrates server-side logic with automatic client-side LocalStorage fallback.
// This allows the SPA to run 100% on Netlify alone (with simulated auth/subscriptions),
// or connect dynamically to the Flask backend on Render if deployed.

class AuthService {
  constructor() {
    this.mode = 'undetected'; // 'server' or 'local'
  }

  getToken() {
    return localStorage.getItem('zenith_tv_token') || sessionStorage.getItem('zenith_tv_token');
  }

  async safeJson(res) {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    throw new Error(text || 'حدث خطأ في استجابة الخادم.');
  }
  async request(url, options = {}) {
    const mode = await this.detectMode();
    if (mode === 'local') {
      return fetch(url, options);
    }
    
    let token = this.getToken();
    options.headers = options.headers || {};
    if (token && !options.headers['Authorization']) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    let res = await fetch(url, options);
    
    if (res.status === 401) {
      const isSessionOnly = sessionStorage.getItem('zenith_tv_token') !== null;
      const storageObj = isSessionOnly ? sessionStorage : localStorage;
      const refreshToken = storageObj.getItem('zenith_tv_refresh_token');
      
      if (refreshToken) {
        try {
          console.log('[AUTH] Access token expired, rotating refresh token...');
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
          });
          
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            storageObj.setItem('zenith_tv_token', data.token);
            if (data.refresh_token) {
              storageObj.setItem('zenith_tv_refresh_token', data.refresh_token);
            }
            options.headers['Authorization'] = `Bearer ${data.token}`;
            res = await fetch(url, options);
          } else {
            this.clearSession();
          }
        } catch (e) {
          console.error('[AUTH] Failed to refresh session:', e);
          this.clearSession();
        }
      } else {
        this.clearSession();
      }
    }
    return res;
  }

  clearSession() {
    localStorage.removeItem('zenith_tv_token');
    localStorage.removeItem('zenith_tv_user');
    localStorage.removeItem('zenith_tv_refresh_token');
    sessionStorage.removeItem('zenith_tv_token');
    sessionStorage.removeItem('zenith_tv_user');
    sessionStorage.removeItem('zenith_tv_refresh_token');
    window.dispatchEvent(new Event('authChange'));
    window.location.hash = '#/auth';
  }
  async detectMode() {
    if (this.mode !== 'undetected') return this.mode;
    try {
      // Short-timeout check to see if the server API responds
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/auth/me', {
        signal: controller.signal
      });
      clearTimeout(id);
      
      const contentType = res.headers.get('content-type');
      if (res.status !== 404 && contentType && contentType.includes('application/json')) {
        this.mode = 'server';
      } else {
        this.mode = 'local';
      }
    } catch (e) {
      console.warn("Zenith Auth Service: Flask backend API is unreachable. Falling back to Local Simulation Mode.");
      this.mode = 'local';
    }
    return this.mode;
  }

  // Local Emulation DB Helper
  getLocalUsers() {
    return JSON.parse(localStorage.getItem('zenith_tv_local_users') || '[]');
  }

  saveLocalUsers(users) {
    localStorage.setItem('zenith_tv_local_users', JSON.stringify(users));
  }

  getLocalCurrentUser() {
    const token = this.getToken();
    if (!token || !token.startsWith('local_token_')) return null;
    const email = token.replace('local_token_', '');
    const users = this.getLocalUsers();
    return users.find(u => u.email === email) || null;
  }

  async register(email, password) {
    const mode = await this.detectMode();
    if (mode === 'server') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء التسجيل.');
      return data;
    } else {
      // Local Mode
      const users = this.getLocalUsers();
      if (users.find(u => u.email === email)) {
        throw new Error('البريد الإلكتروني مسجل بالفعل.');
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const newUser = {
        email,
        password,
        created_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_verified: false,
        verification_code: code,
        subscription_status: 'trial',
        subscription_ends_at: null
      };
      users.push(newUser);
      this.saveLocalUsers(users);
      return { test_mode_code: code, message: 'Local mode signup' };
    }
  }

  async verify(email, code) {
    const mode = await this.detectMode();
    if (mode === 'server') {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || 'رمز التحقق غير صحيح.');
      return data;
    } else {
      // Local Mode
      const users = this.getLocalUsers();
      const user = users.find(u => u.email === email);
      if (!user) throw new Error('المستخدم غير موجود.');
      if (user.verification_code !== code) throw new Error('رمز التحقق غير صحيح.');
      user.is_verified = true;
      this.saveLocalUsers(users);
      return { success: true };
    }
  }

  async login(email, password) {
    const mode = await this.detectMode();
    if (mode === 'server') {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await this.safeJson(res);
      if (!res.ok) {
        const err = new Error(data.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        if (data.requires_verification) err.requires_verification = true;
        throw err;
      }
      return data;
    } else {
      // Local Mode
      const users = this.getLocalUsers();
      const user = users.find(u => u.email === email);
      if (!user || user.password !== password) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      }
      if (!user.is_verified) {
        const err = new Error('البريد الإلكتروني غير مفعل.');
        err.requires_verification = true;
        throw err;
      }

      // Check dates
      const now = new Date();
      const trialEnds = new Date(user.trial_ends_at);
      const subEnds = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
      
      let status = 'free';
      let isPremium = false;
      if (subEnds && subEnds > now) {
        status = 'premium';
        isPremium = true;
      } else if (trialEnds > now) {
        status = 'trial';
        isPremium = true;
      }

      user.subscription_status = status;
      this.saveLocalUsers(users);

      const payload = {
        token: 'local_token_' + user.email,
        user: {
          email: user.email,
          created_at: user.created_at,
          trial_ends_at: user.trial_ends_at,
          subscription_status: status,
          subscription_ends_at: user.subscription_ends_at,
          is_premium: isPremium
        }
      };
      return payload;
    }
  }

  async getProfile() {
    const mode = await this.detectMode();
    const token = this.getToken();
    if (!token) throw new Error('Unauthorized');

    if (mode === 'server' && !token.startsWith('local_token_')) {
      const res = await this.request('/api/auth/me');
      if (!res.ok) throw new Error('Unauthorized');
      return await this.safeJson(res);
    } else {
      // Local Mode or Local Session
      const user = this.getLocalCurrentUser();
      if (!user) throw new Error('Unauthorized');

      const now = new Date();
      const trialEnds = new Date(user.trial_ends_at);
      const subEnds = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
      
      let status = 'free';
      let isPremium = false;
      let remainingDays = 0;

      if (subEnds && subEnds > now) {
        status = 'premium';
        isPremium = true;
      } else if (trialEnds > now) {
        status = 'trial';
        isPremium = true;
        remainingDays = Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24));
      }

      user.subscription_status = status;
      this.saveLocalUsers(this.getLocalUsers());

      return {
        email: user.email,
        created_at: user.created_at,
        trial_ends_at: user.trial_ends_at,
        subscription_status: status,
        subscription_ends_at: user.subscription_ends_at,
        is_premium: isPremium,
        remaining_trial_days: remainingDays
      };
    }
  }

  async subscribe() {
    const mode = await this.detectMode();
    const token = this.getToken();
    if (!token) throw new Error('Unauthorized');

    if (mode === 'server' && !token.startsWith('local_token_')) {
      const res = await this.request('/api/subscribe', { method: 'POST' });
      if (!res.ok) throw new Error('Upgrade failed');
      return await this.safeJson(res);
    } else {
      // Local Mode
      const user = this.getLocalCurrentUser();
      if (!user) throw new Error('Unauthorized');

      const users = this.getLocalUsers();
      const userInDb = users.find(u => u.email === user.email);
      if (userInDb) {
        userInDb.subscription_status = 'premium';
        userInDb.subscription_ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        this.saveLocalUsers(users);
      }
      return { success: true };
    }
  }

  async verifyAdmin() {
    const mode = await this.detectMode();
    const token = this.getToken();
    if (!token) return false;

    if (mode === 'server' && !token.startsWith('local_token_')) {
      try {
        const res = await this.request('/api/admin/verify');
        return res.ok;
      } catch (e) {
        return false;
      }
    } else {
      // Local Mode
      const user = this.getLocalCurrentUser();
      return user && user.email === 'test_dev@zenith.tv';
    }
  }

  async logoutAllDevices() {
    const mode = await this.detectMode();
    const token = this.getToken();
    if (!token) return;

    if (mode === 'server' && !token.startsWith('local_token_')) {
      try {
        await this.request('/api/auth/logout-all', { method: 'POST' });
      } catch (e) {
        console.error('Logout all devices error:', e);
      }
    }
    this.clearSession();
  }

  async requestPasswordReset(email) {
    const mode = await this.detectMode();
    if (mode === 'server') {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await this.safeJson(res);
    } else {
      // Local Mode Emulation
      const users = this.getLocalUsers();
      const user = users.find(u => u.email === email);
      if (!user) {
        return { message: 'إذا كان البريد الإلكتروني مسجلاً، فقد تم إرسال رمز إعادة التعيين.' };
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.reset_code = code;
      this.saveLocalUsers(users);
      return { message: 'تم إرسال رمز إعادة التعيين.', test_mode_code: code };
    }
  }

  async confirmPasswordReset(email, code, password) {
    const mode = await this.detectMode();
    if (mode === 'server') {
      const res = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password })
      });
      return await this.safeJson(res);
    } else {
      // Local Mode Emulation
      const users = this.getLocalUsers();
      const user = users.find(u => u.email === email);
      if (!user || user.reset_code !== code) {
        throw new Error('رمز إعادة التعيين غير صحيح أو منتهي الصلاحية.');
      }
      user.password = password;
      user.reset_code = null;
      this.saveLocalUsers(users);
      return { success: true };
    }
  }
}

export const authService = new AuthService();
