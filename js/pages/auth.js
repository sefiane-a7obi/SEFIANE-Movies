import { authService } from '../services/auth.js';

export const Auth = {
  state: {
    view: 'login', // 'login', 'register', 'verify'
    email: '',
    error: '',
    message: '',
    testModeCode: ''
  },

  async render() {
    // Determine view to show based on hash query params if any
    const hash = window.location.hash;
    if (hash.includes('view=register')) {
      this.state.view = 'register';
    } else if (hash.includes('view=verify')) {
      this.state.view = 'verify';
      const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      this.state.email = urlParams.get('email') || '';
    } else if (hash.includes('view=forgot_password')) {
      this.state.view = 'forgot_password';
    } else if (hash.includes('view=reset_password')) {
      this.state.view = 'reset_password';
      const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      this.state.email = urlParams.get('email') || '';
    } else {
      this.state.view = 'login';
    }

    // Wait for DOM to be fully inserted before initializing
    setTimeout(() => this.init(), 200);

    return `
      <div class="auth-page-wrapper">
        <div class="auth-bg-glow"></div>
        <div class="auth-card">

          <!-- Logo -->
          <div class="auth-logo-block">
            <div class="auth-logo-icon">⚡</div>
            <h1 class="auth-logo-text"><span class="rgb-text-animated">SEFIANE Movies</span></h1>
            <p class="auth-logo-sub" id="auth-subtitle">${this.getSubtitle()}</p>
          </div>

          <div id="auth-alert-container"></div>

          <form id="auth-form">
            ${this.renderFormFields()}
          </form>

          <div class="auth-footer-divider">
            <a href="javascript:void(0)" id="auth-toggle-link" class="auth-toggle-link">
              ${this.getToggleLinkText()}
            </a>
          </div>
        </div>
      </div>
    `;
  },

  getSubtitle() {
    if (this.state.view === 'login') return 'قم بتسجيل الدخول لمتابعة أفلامك المفضلة بدون إعلانات';
    if (this.state.view === 'register') return 'أنشئ حساباً جديداً للحصول على تجربة مجانية 7 أيام بدون إعلانات';
    if (this.state.view === 'forgot_password') return 'أدخل بريدك الإلكتروني لإرسال رمز إعادة تعيين كلمة المرور';
    if (this.state.view === 'reset_password') return 'أدخل رمز إعادة التعيين المكون من 6 أرقام وكلمة المرور الجديدة';
    return 'أدخل الرمز المكون من 6 أرقام للتحقق من بريدك الإلكتروني';
  },

  getToggleLinkText() {
    if (this.state.view === 'login') return 'ليس لديك حساب؟ سجل الآن (تجربة مجانية 7 أيام)';
    if (this.state.view === 'register') return 'لديك حساب بالفعل؟ سجل دخولك';
    return 'العودة لتسجيل الدخول';
  },

  renderFormFields() {
    if (this.state.view === 'login') {
      return `
        <div class="auth-field-group">
          <label class="auth-label">البريد الإلكتروني</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">✉️</span>
            <input type="email" id="auth-email" required autocomplete="email" placeholder="name@example.com" class="auth-input">
          </div>
        </div>

        <div class="auth-field-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <label class="auth-label" style="margin:0;">كلمة المرور</label>
            <a href="#/auth?view=forgot_password" class="auth-forgot-link">نسيت كلمة المرور؟</a>
          </div>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">🔒</span>
            <input type="password" id="auth-password" required autocomplete="current-password" placeholder="••••••••" class="auth-input">
            <button type="button" class="auth-eye-btn" onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'; this.textContent = this.previousElementSibling.type === 'password' ? '👁️' : '🙈';">👁️</button>
          </div>
        </div>
        
        <label class="auth-remember-label">
          <input type="checkbox" id="auth-remember" checked style="accent-color: var(--primary); width:16px; height:16px;"> تذكرني لمدة 30 يوماً
        </label>
        
        <button type="submit" class="auth-submit-btn">تسجيل الدخول ←</button>

        <div class="auth-divider"><span>أو تابع بواسطة</span></div>

        <div style="display: flex; justify-content: center; margin-bottom: 8px;">
          <!-- Rendered by Google Identity Services SDK -->
          <div id="google-signin-btn-container" style="display: flex; justify-content: center; width: 100%;"></div>
        </div>

        <div id="google-onetap-container"></div>
      `;
    }

    if (this.state.view === 'register') {
      return `
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">البريد الإلكتروني</label>
          <input type="email" id="auth-email" required placeholder="name@example.com" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); outline: none;">
        </div>
        <div class="form-group" style="margin-bottom: 25px;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">كلمة المرور (8 أحرف + رقم ورمز خاص)</label>
          <input type="password" id="auth-password" required placeholder="••••••••" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); outline: none;">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; font-size: 15px; border-radius: var(--radius-md);">بدء الفترة التجريبية (7 أيام)</button>
      `;
    }

    if (this.state.view === 'forgot_password') {
      return `
        <div class="form-group" style="margin-bottom: 25px;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">البريد الإلكتروني</label>
          <input type="email" id="auth-email" required placeholder="name@example.com" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); outline: none;">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; font-size: 15px; border-radius: var(--radius-md);">إرسال رمز إعادة التعيين</button>
      `;
    }

    if (this.state.view === 'reset_password') {
      return `
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">البريد الإلكتروني</label>
          <input type="email" id="auth-email" disabled value="${this.state.email}" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-muted); cursor: not-allowed; outline: none;">
        </div>
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">رمز إعادة التعيين (6 أرقام)</label>
          <input type="text" id="auth-code" required placeholder="123456" maxlength="6" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); text-align: center; font-size: 18px; font-weight: 700; outline: none;">
        </div>
        <div class="form-group" style="margin-bottom: 25px;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">كلمة المرور الجديدة</label>
          <input type="password" id="auth-password" required placeholder="••••••••" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); outline: none;">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; font-size: 15px; border-radius: var(--radius-md);">تغيير كلمة المرور وتأكيد الحساب</button>
        ${this.state.testModeCode ? `
          <div style="margin-top:15px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); text-align:center;">
            🔧 وضع التطوير/المحاكاة: رمز التنشيط هو <strong>${this.state.testModeCode}</strong>
          </div>
        ` : ''}
      `;
    }

    // Verification View
    return `
      <div class="form-group" style="margin-bottom: 20px;">
        <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">البريد الإلكتروني</label>
        <input type="email" id="auth-email" disabled value="${this.state.email}" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-muted); cursor: not-allowed; outline: none;">
      </div>
      <div class="form-group" style="margin-bottom: 25px;">
        <label style="display: block; color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">رمز التحقق (تم إرساله للبريد)</label>
        <input type="text" id="auth-code" required placeholder="123456" maxlength="6" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); text-align: center; font-size: 20px; font-weight: 700; letter-spacing: 5px; outline: none;">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; font-size: 15px; border-radius: var(--radius-md);">التحقق وتأكيد البريد</button>
      
      <div style="text-align: center; margin-top: 15px;">
        <a href="javascript:void(0)" id="btn-auth-resend-code" style="color: var(--text-secondary); font-size: 13px; text-decoration: none;">📧 لم يصلك الرمز؟ إعادة إرسال رمز التحقق</a>
      </div>

      ${this.state.testModeCode ? `
        <div style="margin-top:15px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); text-align:center;">
          🔧 وضع التطوير/المحاكاة: رمز التفعيل هو <strong>${this.state.testModeCode}</strong>
        </div>
      ` : ''}
    `;
  },

  showAlert(text, type = 'danger') {
    const alertContainer = document.getElementById('auth-alert-container');
    if (alertContainer) {
      const bgColor = type === 'danger' ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 230, 115, 0.15)';
      const borderColor = type === 'danger' ? 'var(--primary)' : '#00e673';
      const textColor = type === 'danger' ? 'var(--text-primary)' : '#00e673';

      alertContainer.innerHTML = `
        <div style="padding: 12px; border-radius: var(--radius-md); background: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor}; font-size: 14px; margin-bottom: 20px; text-align: center;">
          ${text}
        </div>
      `;
    }
  },

  init() {
    const form = document.getElementById('auth-form');
    const toggleLink = document.getElementById('auth-toggle-link');

    if (toggleLink) {
      toggleLink.addEventListener('click', () => {
        if (this.state.view === 'login') {
          window.location.hash = '#/auth?view=register';
        } else if (this.state.view === 'register') {
          window.location.hash = '#/auth?view=login';
        } else {
          window.location.hash = '#/auth?view=login';
        }
      });
    }



    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const codeInput = document.getElementById('auth-code');

        const email = emailInput ? emailInput.value.trim() : this.state.email;
        const password = passwordInput ? passwordInput.value : '';
        const code = codeInput ? codeInput.value.trim() : '';

        this.showAlert('جاري معالجة الطلب...', 'success');

        try {
          if (this.state.view === 'register') {
            const data = await authService.register(email, password);
            this.state.email = email;
            this.state.testModeCode = data.test_mode_code || '';
            window.location.hash = `#/auth?view=verify&email=${encodeURIComponent(email)}`;
            setTimeout(() => {
              this.showAlert('تم تسجيل الحساب بنجاح! يرجى إدخال رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني لتنشيط الحساب.', 'success');
              if (this.state.testModeCode) {
                // Force a fast re-render of form fields to draw the developer notice
                const fieldsContainer = document.getElementById('auth-fields-container');
                if (fieldsContainer) fieldsContainer.innerHTML = this.renderFormFields();
              }
            }, 100);
          } else if (this.state.view === 'verify') {
            await authService.verify(this.state.email, code);
            window.location.hash = '#/auth?view=login';
            setTimeout(() => {
              this.showAlert('تم التحقق بنجاح! يمكنك الآن تسجيل الدخول للحصول على 7 أيام تجريبية.', 'success');
            }, 100);
          } else if (this.state.view === 'login') {
            const data = await authService.login(email, password);
            const rememberInput = document.getElementById('auth-remember');
            const remember = rememberInput ? rememberInput.checked : true;
            
            const storageObj = remember ? localStorage : sessionStorage;
            if (remember) {
              sessionStorage.removeItem('zenith_tv_token');
              sessionStorage.removeItem('zenith_tv_user');
            } else {
              localStorage.removeItem('zenith_tv_token');
              localStorage.removeItem('zenith_tv_user');
            }
            
            storageObj.setItem('zenith_tv_token', data.token);
            if (data.refresh_token) {
              storageObj.setItem('zenith_tv_refresh_token', data.refresh_token);
            }
            storageObj.setItem('zenith_tv_user', JSON.stringify(data.user));
            window.dispatchEvent(new Event('authChange'));
            window.location.hash = '#/profile';
          } else if (this.state.view === 'forgot_password') {
            const data = await authService.requestPasswordReset(email);
            this.state.testModeCode = data.test_mode_code || '';
            window.location.hash = `#/auth?view=reset_password&email=${encodeURIComponent(email)}`;
            setTimeout(() => {
              this.showAlert('تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.', 'success');
              if (this.state.testModeCode) {
                const fieldsContainer = document.getElementById('auth-fields-container');
                if (fieldsContainer) fieldsContainer.innerHTML = this.renderFormFields();
              }
            }, 100);
          } else if (this.state.view === 'reset_password') {
            await authService.confirmPasswordReset(this.state.email, code, password);
            window.location.hash = '#/auth?view=login';
            setTimeout(() => {
              this.showAlert('تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.', 'success');
            }, 100);
          }
        } catch (err) {
          console.error('Auth request error:', err);
          if (err.requires_verification) {
            window.location.hash = `#/auth?view=verify&email=${encodeURIComponent(email)}`;
            setTimeout(() => {
              this.showAlert('يرجى إدخال رمز التحقق لتأكيد الحساب أولاً.');
            }, 100);
          } else {
            this.showAlert(err.message || 'حدث خطأ غير متوقع. يرجى إعادة المحاولة.');
          }
        }
      });
    }

    // Set up Google Real Sign-In & Resend Code Listeners
    const setupExtraListeners = () => {
      const resendBtn = document.getElementById('btn-auth-resend-code');

      // ── Initialize Real Google Identity Services ──
      if (this.state.view === 'login') {
        const initGoogleSignIn = () => {
          if (window.google && window.google.accounts) {
            const clientId = window.ZENITH_GOOGLE_CLIENT_ID;

            // Set global callback bridge
            window._zenithGoogleCallback = (response) => {
              this.handleGoogleCredentialResponse(response);
            };

            // Initialize the library
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: window._zenithGoogleCallback,
              auto_select: false,
              cancel_on_tap_outside: true
            });

            // Render the official Google button in our container
            const btnContainer = document.getElementById('google-signin-btn-container');
            if (btnContainer) {
              window.google.accounts.id.renderButton(btnContainer, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                shape: 'rectangular',
                width: 380,
                locale: 'ar'
              });
            }
          } else {
            // GSI SDK not loaded yet, retry after 500ms
            setTimeout(initGoogleSignIn, 500);
          }
        };
        setTimeout(initGoogleSignIn, 150);
      }

      if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
          resendBtn.innerText = 'جاري إعادة الإرسال...';
          resendBtn.style.pointerEvents = 'none';
          try {
            const res = await fetch('/api/auth/resend-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: this.state.email })
            });
            const data = await authService.safeJson(res);
            if (res.ok) {
              this.showAlert('تم إعادة إرسال رمز التحقق بنجاح إلى بريدك الإلكتروني.', 'success');
            } else {
              this.showAlert(data.error || 'فشل إعادة إرسال الرمز.');
            }
          } catch (err) {
            console.error(err);
            this.showAlert('حدث خطأ في الاتصال بالخادم.');
          } finally {
            resendBtn.innerText = '📧 لم يصلك الرمز؟ إعادة إرسال رمز التحقق';
            resendBtn.style.pointerEvents = 'auto';
          }
        });
      }
    };

    // Run setup on load
    setTimeout(setupExtraListeners, 100);
  },

  async handleGoogleCredentialResponse(response) {
    const alertBox = document.getElementById('auth-alert-container');
    if (alertBox) {
      alertBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; background:rgba(66,133,244,0.12); border:1px solid rgba(66,133,244,0.3); border-radius:10px; padding:12px 16px; margin-bottom:16px; color:#93c5fd; font-size:14px;">
          <div class="spinner" style="width:18px;height:18px;border:2px solid rgba(66,133,244,0.2);border-top:2px solid #4285F4;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;"></div>
          جاري التحقق من حسابك بواسطة Google...
        </div>`;
    }
    try {
      // Decode JWT payload to extract email & name (client-side only, no verification here)
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const googleUser = JSON.parse(atob(padded));
      const email = googleUser.email;
      const name = googleUser.name || email.split('@')[0];
      const picture = googleUser.picture || '';

      if (!email) throw new Error('لم نتمكن من قراءة بريدك من حساب Google.');

      // Try server first, fall back to local session
      const mode = await authService.detectMode();
      let token, userData;

      if (mode === 'server') {
        // Send real credential to backend
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential })
        });

        let authData;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          authData = await res.json();
        } else {
          const txt = await res.text();
          throw new Error('Server error: ' + txt.substring(0, 100));
        }

        if (!res.ok) throw new Error(authData.error || 'فشل التحقق من حساب Google.');

        token = authData.token;
        userData = authData.user;
        if (authData.refresh_token) {
          localStorage.setItem('zenith_tv_refresh_token', authData.refresh_token);
        }
      } else {
        // Local mode - create/retrieve local user from Google OAuth
        const users = authService.getLocalUsers();
        let user = users.find(u => u.email === email);
        if (!user) {
          user = {
            email, name, picture,
            password: 'google_oauth',
            created_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            is_verified: true,
            subscription_status: 'trial',
            subscription_ends_at: null
          };
          users.push(user);
          authService.saveLocalUsers(users);
        }
        token = 'local_token_' + email;
        userData = {
          email, name, picture,
          subscription_status: user.subscription_status,
          trial_ends_at: user.trial_ends_at,
          subscription_ends_at: user.subscription_ends_at,
          is_premium: true
        };
      }

      // ✅ Store session
      localStorage.setItem('zenith_tv_token', token);
      localStorage.setItem('zenith_tv_user', JSON.stringify(userData));

      window.dispatchEvent(new Event('authChange'));

      if (alertBox) {
        alertBox.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px; background:rgba(52,168,83,0.12); border:1px solid rgba(52,168,83,0.4); border-radius:10px; padding:12px 16px; margin-bottom:16px; color:#86efac; font-size:14px;">
            ✅ مرحباً ${name}! تم تسجيل الدخول بنجاح.
          </div>`;
      }

      setTimeout(() => { window.location.hash = '#/'; }, 900);

    } catch (err) {
      console.error('Google Sign In error:', err);
      if (alertBox) alertBox.innerHTML = '';
      this.showAlert(err.message || 'فشل تسجيل الدخول بواسطة Google. يرجى المحاولة مجدداً.');
    }
  },



  showSimulatedSocialPopup(provider) {
    const overlay = document.createElement('div');
    overlay.className = 'social-oauth-overlay';
    overlay.style = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 10005;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      animation: fadeIn var(--transition-normal);
    `;

    let contentHtml = '';
    
    if (provider === 'google') {
      contentHtml = `
        <div class="social-oauth-modal" style="background:#ffffff; color:#3c4043; border-radius:12px; width:90%; max-width:400px; padding:30px; box-shadow:0 12px 30px rgba(0,0,0,0.5); font-family: 'Roboto', sans-serif; direction:ltr; text-align:left;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <span style="font-size:24px; font-weight:bold;"><span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC05;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span></span>
            <button id="close-oauth-popup" style="background:none; border:none; font-size:20px; cursor:pointer; color:#5f6368;">✕</button>
          </div>
          <h3 style="font-size:18px; font-weight:500; margin-bottom:8px; color:#202124;">Choose an account</h3>
          <p style="font-size:14px; color:#5f6368; margin-bottom:20px;">to continue to <strong>Zenith TV</strong></p>
          
          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
            <button class="oauth-account-btn" data-email="test_dev@zenith.tv" style="display:flex; align-items:center; gap:12px; width:100%; padding:10px; border:1px solid #dadce0; border-radius:8px; background:none; cursor:pointer; text-align:left; width:100%;">
              <div style="width:36px; height:36px; border-radius:50%; background:#4285F4; color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">T</div>
              <div style="text-align:left;">
                <div style="font-size:14px; font-weight:500; color:#3c4043;">Test Admin</div>
                <div style="font-size:12px; color:#5f6368;">test_dev@zenith.tv</div>
              </div>
            </button>
            <button class="oauth-account-btn" data-email="vip_visitor@zenith.tv" style="display:flex; align-items:center; gap:12px; width:100%; padding:10px; border:1px solid #dadce0; border-radius:8px; background:none; cursor:pointer; text-align:left; width:100%;">
              <div style="width:36px; height:36px; border-radius:50%; background:#34A853; color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:16px;">V</div>
              <div style="text-align:left;">
                <div style="font-size:14px; font-weight:500; color:#3c4043;">VIP Member</div>
                <div style="font-size:12px; color:#5f6368;">vip_visitor@zenith.tv</div>
              </div>
            </button>
          </div>
          
          <div style="border-top:1px solid #dadce0; padding-top:15px; display:flex; flex-direction:column; gap:10px;">
            <label style="font-size:12px; color:#5f6368; text-align:left;">Or enter custom email:</label>
            <div style="display:flex; gap:8px;">
              <input type="email" id="custom-oauth-email" placeholder="email@gmail.com" style="flex-grow:1; padding:8px 12px; border:1px solid #dadce0; border-radius:4px; font-size:14px; outline:none;">
              <button id="btn-oauth-custom-submit" style="background:#1a73e8; color:#ffffff; border:none; padding:8px 16px; border-radius:4px; font-weight:500; cursor:pointer;">Next</button>
            </div>
          </div>
        </div>
      `;
    } else if (provider === 'facebook') {
      contentHtml = `
        <div class="social-oauth-modal" style="background:#1877F2; color:#ffffff; border-radius:12px; width:90%; max-width:400px; padding:30px; box-shadow:0 12px 30px rgba(0,0,0,0.5); font-family: Helvetica, Arial, sans-serif; direction:ltr; text-align:left;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <span style="font-size:24px; font-weight:bold;">facebook</span>
            <button id="close-oauth-popup" style="background:none; border:none; font-size:20px; cursor:pointer; color:#ffffff;">✕</button>
          </div>
          <h3 style="font-size:18px; font-weight:bold; margin-bottom:20px;">Log in to Zenith TV</h3>
          
          <div style="display:flex; flex-direction:column; gap:15px; margin-bottom:20px;">
            <input type="text" id="fb-email" placeholder="Mobile number or email address" style="width:100%; padding:12px; border:1px solid #1d69d4; border-radius:6px; background:#ffffff; color:#000000; font-size:14px; outline:none;">
            <input type="password" id="fb-pass" placeholder="Password" style="width:100%; padding:12px; border:1px solid #1d69d4; border-radius:6px; background:#ffffff; color:#000000; font-size:14px; outline:none;">
            <button id="btn-fb-login" style="width:100%; padding:12px; background:#ffffff; color:#1877F2; border:none; border-radius:6px; font-weight:bold; font-size:16px; cursor:pointer;">Log In</button>
          </div>
        </div>
      `;
    } else if (provider === 'apple') {
      contentHtml = `
        <div class="social-oauth-modal" style="background:#000000; color:#ffffff; border-radius:12px; width:90%; max-width:400px; padding:30px; border:1px solid #333333; box-shadow:0 12px 30px rgba(0,0,0,0.7); font-family: -apple-system, BlinkMacSystemFont, sans-serif; direction:ltr; text-align:left;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
            <span style="font-size:24px; font-weight:bold;">🍎 Sign in with Apple</span>
            <button id="close-oauth-popup" style="background:none; border:none; font-size:20px; cursor:pointer; color:#888888;">✕</button>
          </div>
          <h3 style="font-size:18px; font-weight:400; margin-bottom:20px; color:#ffffff;">Use your Apple ID to sign in.</h3>
          
          <div style="display:flex; flex-direction:column; gap:15px; margin-bottom:20px;">
            <input type="email" id="apple-email" placeholder="Apple ID" style="width:100%; padding:12px; border:1px solid #333333; border-radius:6px; background:#1c1c1e; color:#ffffff; font-size:14px; outline:none;">
            <button id="btn-apple-login" style="width:100%; padding:12px; background:#ffffff; color:#000000; border:none; border-radius:6px; font-weight:600; font-size:16px; cursor:pointer;">Continue</button>
          </div>
        </div>
      `;
    }

    overlay.innerHTML = contentHtml;
    document.body.appendChild(overlay);

    // Setup close
    const closeBtn = overlay.querySelector('#close-oauth-popup');
    if (closeBtn) closeBtn.addEventListener('click', () => overlay.remove());

    const submitCredentials = (email) => {
      overlay.remove();
      this.showAlert(`جاري إتمام تسجيل الدخول بواسطة ${provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'Apple'}...`, 'success');
      
      authService.detectMode().then(mode => {
        if (mode === 'server') {
          fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: 'mock_oauth_token_' + email })
          })
          .then(res => res.json())
          .then(data => {
            if (data.token) {
              this.completeSocialLogin(data);
            } else {
              this.showAlert(data.error || 'فشل تسجيل الدخول الاجتماعي.');
            }
          })
          .catch(() => this.showAlert('فشل الاتصال بالخادم لمصادقة الحساب.'));
        } else {
          const users = authService.getLocalUsers();
          let user = users.find(u => u.email === email);
          if (!user) {
            user = {
              email,
              password: 'social_oauth_user_no_password',
              created_at: new Date().toISOString(),
              trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              is_verified: true,
              verification_code: 'social',
              subscription_status: 'trial',
              subscription_ends_at: null
            };
            users.push(user);
            authService.saveLocalUsers(users);
          }
          
          const authData = {
            token: 'local_token_' + user.email,
            user: {
              email: user.email,
              created_at: user.created_at,
              trial_ends_at: user.trial_ends_at,
              subscription_status: user.subscription_status,
              is_premium: true
            }
          };
          this.completeSocialLogin(authData);
        }
      });
    };

    // Google actions
    const acctBtns = overlay.querySelectorAll('.oauth-account-btn');
    acctBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.currentTarget.dataset.email;
        submitCredentials(email);
      });
    });

    const customSubmit = overlay.querySelector('#btn-oauth-custom-submit');
    if (customSubmit) {
      customSubmit.addEventListener('click', () => {
        const input = overlay.querySelector('#custom-oauth-email');
        const email = input ? input.value.trim() : '';
        if (email && email.includes('@')) {
          submitCredentials(email);
        } else {
          alert('Please enter a valid email address.');
        }
      });
    }

    // Facebook action
    const fbLogin = overlay.querySelector('#btn-fb-login');
    if (fbLogin) {
      fbLogin.addEventListener('click', () => {
        const input = overlay.querySelector('#fb-email');
        const email = input ? input.value.trim() : 'facebook_user';
        const finalEmail = email.includes('@') ? email : email + '@facebook.com';
        submitCredentials(finalEmail);
      });
    }

    // Apple action
    const appleLogin = overlay.querySelector('#btn-apple-login');
    if (appleLogin) {
      appleLogin.addEventListener('click', () => {
        const input = overlay.querySelector('#apple-email');
        const email = input ? input.value.trim() : 'apple_user';
        const finalEmail = email.includes('@') ? email : email + '@apple.com';
        submitCredentials(finalEmail);
      });
    }
  },

  completeSocialLogin(data) {
    localStorage.setItem('zenith_tv_token', data.token);
    localStorage.setItem('zenith_tv_user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('authChange'));
    window.location.hash = '#/profile';
    this.showAlert('تم تسجيل الدخول بنجاح!', 'success');
  }
};
