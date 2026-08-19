import { storage } from '../services/storage.js';

export const adBlockDetector = {
  async check() {
    const settings = storage.getSettings();
    if (!settings.adBlockWarningActive) return false;

    // Method 1: Try to fetch a known ad script URL
    let fetchBlocked = false;
    try {
      const url = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      const response = await fetch(new Request(url, { method: 'HEAD', mode: 'no-cors' }));
    } catch (e) {
      fetchBlocked = true;
    }

    // Method 2: Create a decoy DOM element commonly blocked
    let domBlocked = false;
    const decoy = document.createElement('div');
    decoy.className = 'adsbox ads-box ad-placeholder doubleclick-ad';
    decoy.style.position = 'absolute';
    decoy.style.left = '-9999px';
    decoy.style.top = '-9999px';
    decoy.style.width = '1px';
    decoy.style.height = '1px';
    decoy.innerHTML = '&nbsp;';
    
    document.body.appendChild(decoy);
    
    // Allow a tiny layout tick
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const computedStyle = window.getComputedStyle(decoy);
    if (
      decoy.offsetParent === null ||
      computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden'
    ) {
      domBlocked = true;
    }
    
    document.body.removeChild(decoy);

    return fetchBlocked || domBlocked;
  },

  showModal() {
    // Check if the modal already exists in DOM
    if (document.getElementById('adblock-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'adblock-modal-overlay';
    overlay.className = 'adblock-overlay';
    
    overlay.innerHTML = `
      <div class="adblock-modal">
        <div class="adblock-icon">⚠️</div>
        <h2 class="adblock-title">مرحباً بصديق <span class="rgb-text-animated">SEFIANE Movies</span>!</h2>
        <p class="adblock-text">
          يساعدنا عرض عدد محدود جداً من الإعلانات غير المزعجة على تغطية تكاليف تشغيل الخوادم وتطوير المنصة باستمرار. 
          <br><br>
          إذا كنت ترغب في دعمنا والاستمرار في الاستفادة من الخدمة مجاناً وبأعلى جودة، يُرجى التكرم بتعطيل مانع الإعلانات لهذا الموقع. شكرًا لتفهمك ودعمك!
        </p>
        <button id="adblock-close-btn" class="btn btn-primary" style="margin-top: 10px; width: 100%;">
          لقد قمت بالتعطيل، استمر للمشاهدة
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation frame for transition
    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });

    document.getElementById('adblock-close-btn').addEventListener('click', () => {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    });
  }
};
