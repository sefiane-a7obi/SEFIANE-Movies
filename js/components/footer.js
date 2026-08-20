export const Footer = {
  render() {
    return `
      <footer class="footer">
        <div class="container">
          <div class="footer-logo" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            <img src="LOGO.png" alt="SEFIANE Movies Logo" style="height: 28px; width: 28px; object-fit: contain; border-radius: 4px;">
            <span class="rgb-text-animated">SEFIANE Movies</span>
          </div>
          <p class="footer-credits">
            جميع حقوق البث محفوظة للمصادر المدمجة تلقائياً. 
            <br>
            الموقع مصمم للترفيه والمشاهدة المجانية بجودة عالية.
          </p>
          <div class="footer-developer">
            DEV BY <span style="color: var(--primary); text-shadow: 0 0 10px var(--primary-glow);">SEFIANE</span>
          </div>
          <div class="footer-socials">
            <a href="https://www.instagram.com/sefiane.20/" target="_blank" class="discord-badge" style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);">
              <span>تابعنا على إنستغرام</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    `;
  }
};
