import { storage } from '../services/storage.js';
import { security } from '../utils/security.js';
import { authService } from '../services/auth.js';

export const Admin = {
  render() {
    setTimeout(() => {
      this.loadSettings();
      this.setupListeners();
    }, 50);

    return `
      <div class="container admin-grid">
        <!-- Sidebar Navigation -->
        <div class="admin-sidebar">
          <div class="admin-nav-item active" data-tab="tab-general">⚙️ الإعدادات العامة</div>
          <div class="admin-nav-item" data-tab="tab-servers">🖥️ خوادم البث (Embeds)</div>
          <div class="admin-nav-item" data-tab="tab-direct">🔗 الروابط المباشرة (Fallback)</div>
          <div class="admin-nav-item" data-tab="tab-security">🛡️ سجل الأمان (Audit Logs)</div>
        </div>

        <!-- Content Area -->
        <div class="admin-content">
          <!-- General Settings Tab -->
          <div class="admin-tab-pane active" id="tab-general">
            <h2 style="font-size:20px; font-weight:700; margin-bottom:20px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">الإعدادات العامة لموقع SEFIANE Movies</h2>
            
            <form id="form-general-settings">
              <div class="form-group">
                <label class="form-label">مفتاح TMDB API Key</label>
                <input type="text" class="form-input" id="input-tmdb-key" placeholder="أدخل مفتاح TMDB API الخاص بك..." required>
                <p style="font-size:11px; color:var(--text-muted); margin-top:5px;">هذا المفتاح يُسخدم لجلب بيانات الأفلام والمسلسلات وصور البوسترات تلقائياً.</p>
              </div>

              <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-top:30px;">
                <input type="checkbox" id="check-adblock" style="width:20px; height:20px; cursor:pointer;">
                <label for="check-adblock" class="form-label" style="margin-bottom:0; cursor:pointer; user-select:none;">تفعيل كاشف مانع الإعلانات الودي</label>
              </div>
              <p style="font-size:11px; color:var(--text-muted); margin-right:30px; margin-top:2px;">سيقوم النظام بإظهار نافذة منبثقة زجاجية ودية إذا تم كشف مانع إعلانات نشط لدى المستخدم.</p>

              <button type="submit" class="btn btn-primary" style="margin-top:30px;">💾 حفظ الإعدادات</button>
            </form>
          </div>

          <!-- Servers Tab -->
          <div class="admin-tab-pane" id="tab-servers" style="display:none;">
            <h2 style="font-size:20px; font-weight:700; margin-bottom:20px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">إدارة خوادم البث التلقائي</h2>
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px;">
              يمكنك هنا تحديد السيرفرات المستخدمة لحل الروابط تلقائياً بناءً على معرفات TMDB/IMDB. 
              استخدم المتغيرات <code style="color:var(--primary); font-weight:700;">{id}</code> لمعرف الميديا، و <code style="color:var(--primary); font-weight:700;">{type}</code> للنوع (movie/tv).
            </p>

            <div id="servers-list-container" style="display:flex; flex-direction:column; gap:15px; margin-bottom:25px;">
              <!-- Populated dynamically -->
            </div>

            <div style="display:flex; gap:15px;">
              <button class="btn btn-primary" id="btn-save-servers">💾 حفظ السيرفرات</button>
              <button class="btn btn-secondary" id="btn-restore-servers">🔄 استعادة الافتراضي</button>
            </div>
          </div>

          <!-- Direct Links Tab -->
          <div class="admin-tab-pane" id="tab-direct" style="display:none;">
            <h2 style="font-size:20px; font-weight:700; margin-bottom:20px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">ربط روابط البث المباشر (Direct Fallback)</h2>
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px;">
              اربط رابط بث مباشر أو ملف M3U8/HLS/MP4 بمعرف عمل TMDB لتشغيله مباشرة عند اختيار مشغل البث الاحتياطي.
            </p>

            <form id="form-direct-stream" style="background:rgba(255,255,255,0.02); padding:20px; border-radius:var(--radius-md); border:1px solid var(--border-glass); margin-bottom:30px;">
              <div style="display:grid; grid-template-columns:150px 180px 1fr; gap:15px;">
                <div class="form-group">
                  <label class="form-label">النوع</label>
                  <select class="form-input" id="direct-media-type" style="height:48px;">
                    <option value="movie">فيلم (Movie)</option>
                    <option value="tv">مسلسل (TV Show)</option>
                    <option value="anime">أنمي (Anime)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">معرف TMDB / MAL ID</label>
                  <input type="text" class="form-input" id="direct-media-id" placeholder="مثال: 550" required>
                </div>
                <div class="form-group">
                  <label class="form-label">رابط البث المباشر (MP4 / M3U8)</label>
                  <input type="url" class="form-input" id="direct-stream-url" placeholder="https://domain.com/movie.m3u8" required>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="margin-top:20px; width:100%;">🔗 ربط وحفظ رابط البث المباشر</button>
            </form>

            <div style="margin-top:40px;">
              <h3 style="font-size:16px; font-weight:700; margin-bottom:10px;">الروابط المسجلة حالياً</h3>
              <div id="direct-links-list" style="display:flex; flex-direction:column; gap:10px;">
                <!-- populated dynamically -->
              </div>
            </div>
          </div>

          <!-- Security Logs Tab -->
          <div class="admin-tab-pane" id="tab-security" style="display:none;">
            <h2 style="font-size:20px; font-weight:700; margin-bottom:20px; border-bottom:1px solid var(--border-glass); padding-bottom:10px;">سجل الأحداث الأمنية (Audit Logs)</h2>
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px;">
              تتبع أحداث الأمان، محاولات حظر مفاتيح API، الأحداث التشغيلية، ومحاولات تجاوز حدود الطلبات (Rate Limiting).
            </p>

            <div id="security-logs-container" style="display:flex; flex-direction:column; gap:10px; max-height:400px; overflow-y:auto; padding-right:5px;">
              <!-- populated dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async loadSettings() {
    try {
      const res = await authService.request('/api/admin/settings');
      if (res.ok) {
        const settings = await res.json();
        
        // General
        const inputKey = document.getElementById('input-tmdb-key');
        const checkAdBlock = document.getElementById('check-adblock');
        if (inputKey) inputKey.value = settings.tmdbApiKey;
        if (checkAdBlock) checkAdBlock.checked = settings.adBlockWarningActive;

        // Servers
        const serversContainer = document.getElementById('servers-list-container');
        if (serversContainer && settings.customServers) {
          serversContainer.innerHTML = settings.customServers.map((server, index) => `
            <div style="display:flex; gap:10px; margin-bottom:12px; align-items:center;">
              <input type="text" class="form-input server-name-input" style="width:180px;" value="${server.name}" placeholder="اسم السيرفر" required>
              <input type="text" class="form-input server-url-input" style="flex-grow:1;" value="${server.url}" placeholder="رابط الـ Embed" required>
            </div>
          `).join('');
        }

        // Cache in local storage for public widgets
        storage.saveSettings({
          tmdbApiKey: settings.tmdbApiKey,
          adBlockWarningActive: settings.adBlockWarningActive,
          customServers: settings.customServers,
          directStreams: settings.directStreams || []
        });
      }
    } catch (e) {
      console.error('Failed to load settings from server:', e);
    }

    this.loadDirectLinks();
    this.loadSecurityLogs();
  },

  loadDirectLinks() {
    const listContainer = document.getElementById('direct-links-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const settings = storage.getSettings();
    const directStreams = settings.directStreams || [];

    if (directStreams.length > 0) {
      directStreams.forEach((stream, index) => {
        const card = document.createElement('div');
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.padding = '12px 16px';
        card.style.borderRadius = 'var(--radius-sm)';
        card.style.border = '1px solid var(--border-glass)';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';

        let badge = stream.type === 'movie' ? 'فيلم' : (stream.type === 'anime' ? 'أنمي' : 'مسلسل');
        
        card.innerHTML = `
          <div>
            <span class="movie-card-badge" style="position:static; margin-left:10px;">${badge}</span>
            <span style="font-weight:600; font-size:14px;">معرف TMDB: ${stream.id}</span>
            <div style="font-size:12px; color:var(--text-muted); word-break:break-all; margin-top:4px;">${stream.url}</div>
          </div>
          <button class="btn btn-secondary btn-delete-stream" data-index="${index}" style="padding:6px 12px; font-size:12px; border-color:rgba(255,0,85,0.3); color:var(--primary);">حذف</button>
        `;

        listContainer.appendChild(card);
      });

      document.querySelectorAll('.btn-delete-stream').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const index = parseInt(e.target.dataset.index);
          const settings = storage.getSettings();
          const directStreams = settings.directStreams || [];
          directStreams.splice(index, 1);
          settings.directStreams = directStreams;
          
          try {
            await authService.request('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings)
            });
            storage.saveSettings(settings);
            this.loadDirectLinks();
          } catch (err) {
            alert('فشل حذف الرابط المباشر من قاعدة البيانات.');
          }
        });
      });
    } else {
      listContainer.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">لا توجد روابط بث مباشر مسجلة. سيتم تشغيل البث المرجعي الافتراضي عند النقر على المشغل الاحتياطي.</div>`;
    }
  },

  async loadSecurityLogs() {
    const logsContainer = document.getElementById('security-logs-container');
    if (!logsContainer) return;

    logsContainer.innerHTML = '<div style="color:var(--text-secondary); font-size:13px;">جاري تحميل السجلات من قاعدة البيانات...</div>';
    
    try {
      const res = await authService.request('/api/admin/audit-logs');
      if (res.ok) {
        const logs = await res.json();
        logsContainer.innerHTML = '';
        if (logs.length > 0) {
          logs.forEach(log => {
            const item = document.createElement('div');
            item.style.background = 'rgba(255, 255, 255, 0.02)';
            item.style.padding = '12px 16px';
            item.style.borderRadius = 'var(--radius-sm)';
            item.style.border = '1px solid var(--border-glass)';
            item.style.fontSize = '12px';

            let typeColor = 'var(--accent)';
            if (log.event.includes('invalid') || log.event.includes('exceeded') || log.event.includes('block')) {
              typeColor = 'var(--primary)';
            }

            const date = new Date(log.timestamp).toLocaleString('ar-SA');

            item.innerHTML = `
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span style="font-weight:700; color:${typeColor}; text-transform:uppercase;">${log.event}</span>
                <span style="color:var(--text-muted);">${date}</span>
              </div>
              <div style="color:var(--text-secondary); word-break:break-all; margin-bottom:4px;">
                تفاصيل: ${log.details}
              </div>
              <div style="color:var(--text-muted); font-size:10px;">
                IP: ${log.ip}
              </div>
            `;
            logsContainer.appendChild(item);
          });
        } else {
          logsContainer.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">سجل الأحداث فارغ حالياً. لا توجد تنبيهات أمنية.</div>`;
        }
      }
    } catch (err) {
      console.error(err);
      logsContainer.innerHTML = `<div style="color:var(--primary); font-size:13px;">فشل تحميل سجل الأمن.</div>`;
    }
  },

  setupListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.admin-nav-item');
    const panes = document.querySelectorAll('.admin-tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.style.display = 'none');

        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        document.getElementById(targetId).style.display = 'block';
      });
    });

    // Save General Settings
    const formGeneral = document.getElementById('form-general-settings');
    if (formGeneral) {
      formGeneral.addEventListener('submit', async (e) => {
        e.preventDefault();
        const apiKey = document.getElementById('input-tmdb-key').value.trim();
        const adBlockActive = document.getElementById('check-adblock').checked;

        const keyPattern = /^[a-zA-Z0-9]{15,50}$/;
        if (!keyPattern.test(apiKey)) {
          alert('خطأ: مفتاح TMDB API غير صالح. يجب أن يحتوي على أحرف وأرقام فقط وطوله بين 15 و 50 حرفاً.');
          security.logEvent('admin_invalid_key_blocked', { attemptedKey: apiKey });
          return;
        }

        const settings = storage.getSettings();
        settings.tmdbApiKey = apiKey;
        settings.adBlockWarningActive = adBlockActive;
        
        try {
          await authService.request('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          });
          storage.saveSettings(settings);
          security.logEvent('admin_save_settings', { adBlockActive });
          alert('تم حفظ الإعدادات العامة في قاعدة البيانات السحابية بنجاح!');
          window.location.reload();
        } catch (err) {
          alert('فشل حفظ الإعدادات في الخادم.');
        }
      });
    }

    // Save custom servers
    const btnSaveServers = document.getElementById('btn-save-servers');
    if (btnSaveServers) {
      btnSaveServers.addEventListener('click', async () => {
        const nameInputs = document.querySelectorAll('.server-name-input');
        const urlInputs = document.querySelectorAll('.server-url-input');
        
        const newServers = [];
        for (let i = 0; i < nameInputs.length; i++) {
          const name = security.sanitize(nameInputs[i].value.trim());
          const url = urlInputs[i].value.trim();
          
          if (name && url) {
            const testUrl = url.replace('{type}', 'movie').replace('{id}', '550');
            if (!security.isValidURL(testUrl)) {
              alert(`خطأ: عنوان السيرفر "${name}" غير صالح. يجب أن يبدأ بـ http:// أو https://`);
              security.logEvent('admin_invalid_server_url_blocked', { name, url });
              return;
            }
            newServers.push({ name, url });
          }
        }

        const settings = storage.getSettings();
        settings.customServers = newServers;

        try {
          await authService.request('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          });
          storage.saveSettings(settings);
          security.logEvent('admin_save_servers', { serverCount: newServers.length });
          alert('تم حفظ سيرفرات البث في قاعدة البيانات بنجاح!');
        } catch (err) {
          alert('فشل حفظ السيرفرات في الخادم.');
        }
      });
    }

    // Restore Default Servers
    const btnRestoreServers = document.getElementById('btn-restore-servers');
    if (btnRestoreServers) {
      btnRestoreServers.addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من رغبتك في استعادة سيرفرات البث الافتراضية؟')) {
          const settings = storage.getSettings();
          settings.customServers = [
            { name: 'Server 1 (VidSrc.xyz)', url: 'https://vidsrc.xyz/embed/{type}/{id}' },
            { name: 'Server 2 (VidSrc.to)', url: 'https://vidsrc.to/embed/{type}/{id}' },
            { name: 'Server 3 (Embed.su)', url: 'https://embed.su/embed/{type}/{id}' },
            { name: 'Server 4 (VidSrc.cc)', url: 'https://vidsrc.cc/vidsrc/{type}/{id}' }
          ];

          try {
            await authService.request('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings)
            });
            storage.saveSettings(settings);
            this.loadSettings();
            alert('تمت استعادة السيرفرات الافتراضية في قاعدة البيانات.');
          } catch (err) {
            alert('فشل حفظ التغييرات في الخادم.');
          }
        }
      });
    }

    // Save Direct Stream Fallback URL
    const formDirect = document.getElementById('form-direct-stream');
    if (formDirect) {
      formDirect.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('direct-media-type').value;
        const id = document.getElementById('direct-media-id').value;
        const url = document.getElementById('direct-stream-url').value.trim();

        if (id && url) {
          if (!security.isValidURL(url)) {
            alert('خطأ: رابط البث المباشر غير صالح. يجب أن يبدأ بـ http:// أو https://');
            security.logEvent('admin_invalid_fallback_url_blocked', { id, url });
            return;
          }

          const settings = storage.getSettings();
          settings.directStreams = settings.directStreams || [];
          const existingIdx = settings.directStreams.findIndex(s => s.type === type && s.id === id);
          if (existingIdx > -1) {
            settings.directStreams[existingIdx].url = url;
          } else {
            settings.directStreams.push({ type, id, url });
          }

          try {
            await authService.request('/api/admin/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings)
            });
            storage.saveSettings(settings);
            security.logEvent('admin_save_fallback_stream', { type, id });
            document.getElementById('direct-media-id').value = '';
            document.getElementById('direct-stream-url').value = '';
            this.loadDirectLinks();
            alert('تم ربط وحفظ رابط البث المباشر بنجاح في قاعدة البيانات!');
          } catch (err) {
            alert('فشل حفظ الرابط في الخادم.');
          }
        }
      });
    }
  }
};
