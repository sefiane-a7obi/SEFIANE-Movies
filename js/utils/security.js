// Security Utilities for Zenith TV
const LOG_LIMIT = 50;

export const security = {
  // 1. HTML Sanitization to prevent XSS (Cross-Site Scripting)
  sanitize(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // 2. Validate URL to prevent open redirects and script execution (javascript: protocols)
  isValidURL(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      // Relative paths are acceptable
      return url.startsWith('/') && !url.startsWith('//') && !url.includes('javascript:');
    }
  },

  // 3. Client-Side Rate Limiter (Abuse protection)
  rateLimit: {
    history: {},

    isAllowed(actionKey, limitCount = 5, timeWindowMs = 60000) {
      const now = Date.now();
      if (!this.history[actionKey]) {
        this.history[actionKey] = [];
      }

      // Filter out stamps outside of window
      this.history[actionKey] = this.history[actionKey].filter(
        timestamp => now - timestamp < timeWindowMs
      );

      if (this.history[actionKey].length >= limitCount) {
        security.logEvent('rate_limit_exceeded', { action: actionKey });
        return false; // Denied
      }

      this.history[actionKey].push(now);
      return true; // Allowed
    }
  },

  // 4. Security Audit Logger (Incident logging)
  logEvent(type, details = {}) {
    try {
      const logs = JSON.parse(localStorage.getItem('zenith_tv_security_logs') || '[]');
      const newLog = {
        timestamp: new Date().toISOString(),
        type,
        details,
        userAgent: navigator.userAgent
      };

      logs.unshift(newLog);
      
      if (logs.length > LOG_LIMIT) {
        logs.pop();
      }

      localStorage.setItem('zenith_tv_security_logs', JSON.stringify(logs));

      // Asynchronously post to backend database if admin token is active
      const token = localStorage.getItem('zenith_tv_token') || sessionStorage.getItem('zenith_tv_token');
      if (token) {
        fetch('/api/admin/audit-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            event: type,
            details: JSON.stringify(details)
          })
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to write security audit log', e);
    }
  },

  getLogs() {
    try {
      return JSON.parse(localStorage.getItem('zenith_tv_security_logs') || '[]');
    } catch (_) {
      return [];
    }
  },

  clearLogs() {
    localStorage.removeItem('zenith_tv_security_logs');
    this.logEvent('logs_cleared');
  }
};
