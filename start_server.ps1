# =============================================
#   SEFIANE Movies - Server Startup Script
# =============================================
# ضع بياناتك هنا مرة واحدة فقط:

$env:SMTP_SERVER   = "smtp.gmail.com"
$env:SMTP_PORT     = "587"
$env:SMTP_USER     = "YOUR_GMAIL@gmail.com"      # <-- ضع جيميلك هنا
$env:SMTP_PASSWORD = "YOUR_APP_PASSWORD_16CHARS"  # <-- ضع App Password هنا

# =============================================
# لا تغير شيئاً أدناه
# =============================================
$env:FLASK_APP = "server.py"
$env:SECRET_KEY = "sefiane-movies-secret-key-2026"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SEFIANE Movies - Server Starting...  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SMTP User: $env:SMTP_USER" -ForegroundColor Yellow
Write-Host "Server: http://127.0.0.1:5000" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

flask run --port 5000
