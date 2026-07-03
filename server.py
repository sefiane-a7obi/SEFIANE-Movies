import os
import sqlite3
import hashlib
import random
import datetime
import re
import jwt
import requests as http_requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
SECRET_KEY = os.environ.get('SECRET_KEY', 'zenith_tv_secure_secret_key_production_2026_abdo_full_hash')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '650111236030-ok0c84i857f4oircme8p67g2slq06o5d.apps.googleusercontent.com')

# PostgreSQL & SQLite driver abstraction wrapper
class ProductionDB:
    def __init__(self):
        self.db_url = os.environ.get('DATABASE_URL')
        self.use_postgres = bool(self.db_url)
        
    def get_conn(self):
        if self.use_postgres:
            try:
                import psycopg2
                from psycopg2.extras import RealDictCursor
                conn = psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)
                return conn
            except Exception as e:
                print(f"[DB ERROR] Failed to connect to PostgreSQL: {e}. Falling back to SQLite.", flush=True)
                self.use_postgres = False
        
        # SQLite Fallback
        conn = sqlite3.connect('users.db')
        conn.row_factory = sqlite3.Row
        return conn

    def execute_query(self, query, params=None):
        if params is None:
            params = ()
        conn = self.get_conn()
        cursor = conn.cursor()
        
        # Convert ? placeholders to %s for PostgreSQL query syntax
        if self.use_postgres:
            query = query.replace('?', '%s')
            # Table creation primary key conversion
            if "AUTOINCREMENT" in query:
                query = query.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            
        try:
            cursor.execute(query, params)
            if self.use_postgres:
                # Retrieve rows for select queries in postgres
                if query.strip().upper().startswith("SELECT"):
                    raw = cursor.fetchall()
                    result = [dict(row) for row in raw]
                else:
                    conn.commit()
                    result = None
            else:
                conn.commit()
                if query.strip().upper().startswith("SELECT"):
                    raw = cursor.fetchall()
                    result = [dict(row) for row in raw]
                else:
                    result = None
            return result
        except Exception as e:
            if self.use_postgres:
                conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def execute_one(self, query, params=None):
        res = self.execute_query(query, params)
        return res[0] if res else None

db_helper = ProductionDB()

# Database Schema initialization
def init_db():
    # 1. Users Table
    db_helper.execute_query('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at VARCHAR(100) NOT NULL,
            trial_ends_at VARCHAR(100) NOT NULL,
            is_verified INTEGER DEFAULT 0,
            verification_code VARCHAR(10),
            subscription_status VARCHAR(50) DEFAULT 'trial',
            subscription_ends_at VARCHAR(100),
            token_version INTEGER DEFAULT 1,
            reset_code VARCHAR(10),
            code_generated_at VARCHAR(100)
        )
    ''')

    # 2. Refresh Tokens Table (Rotation & Revocation)
    db_helper.execute_query('''
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token VARCHAR(500) UNIQUE NOT NULL,
            expires_at VARCHAR(100) NOT NULL,
            created_at VARCHAR(100) NOT NULL
        )
    ''')

    # 3. Watch History Table (Cloud-backed progress tracking)
    db_helper.execute_query('''
        CREATE TABLE IF NOT EXISTS watch_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            media_id VARCHAR(50) NOT NULL,
            media_type VARCHAR(20) NOT NULL,
            title VARCHAR(255),
            poster_path VARCHAR(255),
            season INTEGER DEFAULT 1,
            episode INTEGER DEFAULT 1,
            current_time DOUBLE PRECISION DEFAULT 0,
            duration DOUBLE PRECISION DEFAULT 100,
            percentage DOUBLE PRECISION DEFAULT 0,
            updated_at VARCHAR(100) NOT NULL
        )
    ''')

    # 4. Admin Settings Table
    db_helper.execute_query('''
        CREATE TABLE IF NOT EXISTS admin_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')

    # 5. Audit Logs Table
    db_helper.execute_query('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp VARCHAR(100) NOT NULL,
            event VARCHAR(255) NOT NULL,
            details TEXT,
            ip VARCHAR(50)
        )
    ''')

    # Run retro migrations on SQLite if needed
    if not db_helper.use_postgres:
        try:
            db_helper.execute_query('ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1')
        except Exception:
            pass
        try:
            db_helper.execute_query('ALTER TABLE users ADD COLUMN reset_code VARCHAR(10)')
        except Exception:
            pass
        try:
            db_helper.execute_query('ALTER TABLE users ADD COLUMN code_generated_at VARCHAR(100)')
        except Exception:
            pass

init_db()

# Password hashing with PBKDF2
def hash_password(password):
    salt = b'zenith_tv_salt_value'
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return pwd_hash.hex()

# JWT Token decoder with database checks
def get_current_user(auth_header):
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user = db_helper.execute_one('SELECT token_version FROM users WHERE id = ?', (payload['user_id'],))
        if not user or user['token_version'] != payload.get('token_version', 1):
            return None
        return payload
    except Exception:
        return None

# Rate limiter cache
rate_limit_cache = {}

def rate_limit(endpoint, limit=5, period=60):
    ip = request.remote_addr
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        ip = forwarded.split(',')[0].strip()
        
    key = f"{endpoint}:{ip}"
    now = datetime.datetime.utcnow().timestamp()
    
    requests = rate_limit_cache.get(key, [])
    requests = [r for r in requests if now - r < period]
    
    if len(requests) >= limit:
        return False
        
    requests.append(now)
    rate_limit_cache[key] = requests
    return True

# SMTP Verification Mail Sender
def send_verification_email(email, code):
    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    if not smtp_server or not smtp_user or not smtp_password:
        print(f"[MAIL FALLBACK] Verification code for {email}: {code}", flush=True)
        return False, code
        
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = email
        msg['Subject'] = "رمز التحقق لمنصة ZENITH TV"
        
        body = f"""
        <html>
        <body style="direction: rtl; font-family: sans-serif; text-align: right; background-color: #0f1115; color: #ffffff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #ff0055;">مرحباً بك في ZENITH TV!</h2>
            <p>شكراً لتسجيلك في منصتنا. رمز التحقق الخاص بك لتفعيل حسابك وبدء الفترة التجريبية هو:</p>
            <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 6px; text-align: center; font-size: 24px; font-weight: bold; border: 1px solid #ff0055; color: #ffffff; margin: 20px 0; letter-spacing: 5px;">
                {code}
            </div>
            <p>إذا لم تكن أنت من طلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
            <p style="color: #888888; font-size: 12px; margin-top: 30px; border-top: 1px solid #333333; padding-top: 10px;">فريق عمل ZENITH TV</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html', 'utf-8'))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, email, msg.as_string())
        server.quit()
        print(f"[MAIL SENT] Successfully sent verification email to {email}", flush=True)
        return True, None
    except Exception as e:
        print(f"[MAIL ERROR] Failed to send email to {email}: {str(e)}", flush=True)
        return False, code

def generate_refresh_token(user_id):
    import secrets
    token = secrets.token_hex(32)
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat()
    now = datetime.datetime.utcnow().isoformat()
    
    db_helper.execute_query('''
        INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?)
    ''', (user_id, token, expires_at, now))
    return token

# Serve Frontend Root
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Register Endpoint
@app.route('/api/auth/register', methods=['POST'])
def register():
    if not rate_limit('auth_actions', limit=5, period=60):
        return jsonify({'error': 'تم تجاوز حد الطلبات المسموح به. يرجى المحاولة بعد دقيقة.'}), 429

    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'}), 400

    # Password strength check: min 8 chars, 1 digit, 1 special char
    if len(password) < 8 or not re.search(r"[0-9]", password) or not re.search(r"[^a-zA-Z0-9]", password):
        return jsonify({'error': 'يجب أن تكون كلمة المرور 8 خانات على الأقل، وتحتوي على رقم ورمز خاص واحد على الأقل.'}), 400

    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE email = ?', (email,))
        if user:
            return jsonify({'error': 'البريد الإلكتروني مسجل بالفعل.'}), 400

        pwd_hash = hash_password(password)
        now = datetime.datetime.utcnow()
        trial_ends = now + datetime.timedelta(days=7)
        code = str(random.randint(100000, 999999))

        db_helper.execute_query(
            '''INSERT INTO users (email, password_hash, created_at, trial_ends_at, verification_code, code_generated_at) 
               VALUES (?, ?, ?, ?, ?, ?)''',
            (email, pwd_hash, now.isoformat(), trial_ends.isoformat(), code, now.isoformat())
        )

        success, test_code = send_verification_email(email, code)

        return jsonify({
            'message': 'تم تسجيل الحساب بنجاح. يرجى إدخال رمز التحقق المكون من 6 أرقام المرسل لبريدك.',
            'email': email,
            'test_mode_code': test_code # None if mail sent successfully
        }), 201
    except Exception as e:
        return jsonify({'error': f'حدث خطأ في التسجيل: {str(e)}'}), 500

# Verify Email Endpoint
@app.route('/api/auth/verify', methods=['POST'])
def verify():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()

    if not email or not code:
        return jsonify({'error': 'البيانات غير مكتملة.'}), 400

    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE email = ?', (email,))
        if not user:
            return jsonify({'error': 'المستخدم غير موجود.'}), 404

        if user['verification_code'] != code:
            return jsonify({'error': 'رمز التحقق غير صحيح.'}), 400

        if user['code_generated_at']:
            gen_time = datetime.datetime.fromisoformat(user['code_generated_at'])
            if (datetime.datetime.utcnow() - gen_time).total_seconds() > 600:
                return jsonify({'error': 'انتهت صلاحية رمز التحقق (أقصى مدة 10 دقائق). يرجى طلب رمز جديد.'}), 400

        db_helper.execute_query('UPDATE users SET is_verified = 1 WHERE email = ?', (email,))
        return jsonify({'message': 'تم التحقق من البريد الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Resend Verification Code Endpoint
@app.route('/api/auth/resend-code', methods=['POST'])
def resend_code():
    if not rate_limit('auth_actions', limit=5, period=60):
        return jsonify({'error': 'تم تجاوز حد الطلبات المسموح به. يرجى المحاولة بعد دقيقة.'}), 429
        
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'error': 'البريد الإلكتروني مطلوب.'}), 400
        
    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE email = ?', (email,))
        if not user:
            return jsonify({'error': 'المستخدم غير موجود.'}), 404
            
        if user['is_verified']:
            return jsonify({'error': 'الحساب مفعل بالفعل.'}), 400
            
        code = str(random.randint(100000, 999999))
        now = datetime.datetime.utcnow()
        
        db_helper.execute_query(
            'UPDATE users SET verification_code = ?, code_generated_at = ? WHERE id = ?',
            (code, now.isoformat(), user['id'])
        )
        
        success, test_code = send_verification_email(email, code)
        return jsonify({
            'message': 'تم إعادة إرسال رمز التحقق بنجاح.',
            'test_mode_code': test_code
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Login Endpoint
@app.route('/api/auth/login', methods=['POST'])
def login():
    if not rate_limit('auth_actions', limit=5, period=60):
        return jsonify({'error': 'تم تجاوز حد الطلبات المسموح به. يرجى المحاولة بعد دقيقة.'}), 429

    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'}), 400

    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE email = ?', (email,))
        if not user or user['password_hash'] != hash_password(password):
            return jsonify({'error': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'}), 400

        if not user['is_verified']:
            return jsonify({
                'error': 'البريد الإلكتروني غير متحقق منه.',
                'requires_verification': True,
                'email': email
            }), 403

        # Check trial status and update if expired
        status = user['subscription_status']
        trial_ends_at = datetime.datetime.fromisoformat(user['trial_ends_at'])
        now = datetime.datetime.utcnow()

        if status == 'trial' and now > trial_ends_at:
            status = 'free'
            db_helper.execute_query("UPDATE users SET subscription_status = 'free' WHERE id = ?", (user['id'],))

        # Generate JWT Token (Access Token - 1 Hour expiry)
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'token_version': user['token_version'] or 1,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }, SECRET_KEY, algorithm='HS256')

        # Generate refresh token (30 days expiry)
        refresh_token = generate_refresh_token(user['id'])

        return jsonify({
            'token': token,
            'refresh_token': refresh_token,
            'user': {
                'email': user['email'],
                'subscription_status': status,
                'trial_ends_at': user['trial_ends_at']
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# JWT Session Refresh Endpoint (Refresh Token Rotation)
@app.route('/api/auth/refresh', methods=['POST'])
def refresh_token():
    data = request.json or {}
    token = data.get('refresh_token', '').strip()
    if not token:
        return jsonify({'error': 'رمز التحديث مفقود.'}), 400
        
    db_token = db_helper.execute_one('SELECT * FROM refresh_tokens WHERE token = ?', (token,))
    if not db_token:
        return jsonify({'error': 'رمز التحديث غير صالح أو منتهي الصلاحية.'}), 401
        
    expires_at = datetime.datetime.fromisoformat(db_token['expires_at'])
    if datetime.datetime.utcnow() > expires_at:
        db_helper.execute_query('DELETE FROM refresh_tokens WHERE token = ?', (token,))
        return jsonify({'error': 'رمز التحديث انتهت صلاحيته.'}), 401
        
    user_id = db_token['user_id']
    user = db_helper.execute_one('SELECT * FROM users WHERE id = ?', (user_id,))
    if not user:
        return jsonify({'error': 'المستخدم غير موجود.'}), 404
        
    # Rotate refresh token
    db_helper.execute_query('DELETE FROM refresh_tokens WHERE token = ?', (token,))
    new_refresh_token = generate_refresh_token(user_id)
    
    # Generate new Access Token
    new_access_token = jwt.encode({
        'user_id': user_id,
        'email': user['email'],
        'token_version': user['token_version'] or 1,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }, SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        'token': new_access_token,
        'refresh_token': new_refresh_token
    })

# Google Authentication Endpoint (Real OAuth)
@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    data = request.get_json() or {}
    credential = data.get('credential')
    if not credential:
        return jsonify({'error': 'رمز مصادقة Google مفقود.'}), 400
    try:
        email = None
        name = None
        picture = None

        # --- Real Google ID Token Verification ---
        if not credential.startswith('mock_oauth_token_'):
            # Verify token with Google's tokeninfo endpoint (no extra lib needed)
            verify_url = f'https://oauth2.googleapis.com/tokeninfo?id_token={credential}'
            try:
                resp = http_requests.get(verify_url, timeout=8)
                if resp.status_code == 200:
                    token_data = resp.json()
                    # Verify audience matches our client ID
                    aud = token_data.get('aud', '')
                    if GOOGLE_CLIENT_ID not in aud and aud != GOOGLE_CLIENT_ID:
                        return jsonify({'error': 'رمز Google لا ينتمي لهذا التطبيق.'}), 401
                    email = token_data.get('email')
                    name = token_data.get('name', '')
                    picture = token_data.get('picture', '')
                else:
                    # Fallback: Try to decode JWT without signature verification
                    import base64, json as _json
                    parts = credential.split('.')
                    if len(parts) >= 2:
                        padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
                        decoded = base64.urlsafe_b64decode(padded)
                        payload = _json.loads(decoded)
                        email = payload.get('email')
                        name = payload.get('name', '')
            except Exception as verify_err:
                print(f'[Google Token Verify Warning] {verify_err}', flush=True)
                # Fallback JWT decode
                import base64, json as _json
                try:
                    parts = credential.split('.')
                    padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
                    decoded = base64.urlsafe_b64decode(padded)
                    payload = _json.loads(decoded)
                    email = payload.get('email')
                    name = payload.get('name', '')
                except:
                    pass
        else:
            # Developer/test mock token
            email = credential.replace('mock_oauth_token_', '')
            name = email.split('@')[0]

        if not email:
            return jsonify({'error': 'البريد الإلكتروني مفقود من رمز Google. تأكد من الصلاحيات.'}), 400

        user = db_helper.execute_one("SELECT * FROM users WHERE email = ?", (email,))
        now = datetime.datetime.utcnow()
        token_version = 1

        if not user:
            trial_ends = now + datetime.timedelta(days=7)
            db_helper.execute_query(
                "INSERT INTO users (email, password_hash, created_at, trial_ends_at, is_verified, subscription_status) VALUES (?, ?, ?, ?, ?, ?)",
                (email, 'google_oauth_no_password', now.isoformat(), trial_ends.isoformat(), 1, 'trial')
            )
            user = db_helper.execute_one("SELECT * FROM users WHERE email = ?", (email,))
            user_id = user['id']
            subscription_status = 'trial'
            trial_ends_at = trial_ends.isoformat()
            subscription_ends_at = None
        else:
            user_id = user['id']
            subscription_status = user['subscription_status']
            trial_ends_at = user['trial_ends_at']
            subscription_ends_at = user['subscription_ends_at']
            token_version = user['token_version'] or 1

        trial_ends_dt = datetime.datetime.fromisoformat(trial_ends_at)
        sub_ends_dt = datetime.datetime.fromisoformat(subscription_ends_at) if subscription_ends_at else None

        is_premium = False
        if sub_ends_dt and sub_ends_dt > now:
            is_premium = True
        elif trial_ends_dt > now:
            is_premium = True

        token = jwt.encode({
            'user_id': user_id,
            'email': email,
            'token_version': token_version,
            'exp': now + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')

        refresh_tok = generate_refresh_token(user_id)

        print(f'[Google OAuth] User {email} logged in successfully (premium={is_premium})', flush=True)

        return jsonify({
            'token': token,
            'refresh_token': refresh_tok,
            'user': {
                'id': user_id,
                'email': email,
                'name': name or email.split('@')[0],
                'picture': picture or '',
                'subscription_status': subscription_status,
                'subscription_ends_at': subscription_ends_at,
                'is_premium': is_premium
            }
        }), 200

    except Exception as e:
        print(f'[Google Auth Error] {e}', flush=True)
        return jsonify({'error': str(e)}), 500

# Get User Profile Endpoint (Protected)
@app.route('/api/auth/me', methods=['GET'])
def me():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401

    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE id = ?', (payload['user_id'],))
        if not user:
            return jsonify({'error': 'المستخدم غير موجود.'}), 404

        status = user['subscription_status']
        trial_ends_at = datetime.datetime.fromisoformat(user['trial_ends_at'])
        now = datetime.datetime.utcnow()

        if status == 'premium' and user['subscription_ends_at']:
            sub_ends_at = datetime.datetime.fromisoformat(user['subscription_ends_at'])
            if now > sub_ends_at:
                status = 'free'
                db_helper.execute_query("UPDATE users SET subscription_status = 'free', subscription_ends_at = NULL WHERE id = ?", (user['id'],))
        elif status == 'trial' and now > trial_ends_at:
            status = 'free'
            db_helper.execute_query("UPDATE users SET subscription_status = 'free' WHERE id = ?", (user['id'],))

        remaining_days = max(0, (trial_ends_at - now).days + 1) if status == 'trial' else 0

        return jsonify({
            'email': user['email'],
            'subscription_status': status,
            'trial_ends_at': user['trial_ends_at'],
            'subscription_ends_at': user['subscription_ends_at'],
            'remaining_trial_days': remaining_days,
            'is_premium': status == 'premium' or status == 'trial'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Upgrade Subscription Endpoint
@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401

    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE id = ?', (payload['user_id'],))
        if not user:
            return jsonify({'error': 'المستخدم غير موجود.'}), 404

        now = datetime.datetime.utcnow()
        sub_ends = now + datetime.timedelta(days=30)

        db_helper.execute_query(
            "UPDATE users SET subscription_status = 'premium', subscription_ends_at = ? WHERE id = ?",
            (sub_ends.isoformat(), user['id'])
        )

        return jsonify({
            'message': 'تم ترقية الاشتراك إلى الباقة المميزة بنجاح لمدة 30 يوماً!',
            'subscription_status': 'premium',
            'subscription_ends_at': sub_ends.isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Logout from all devices
@app.route('/api/auth/logout-all', methods=['POST'])
def logout_all():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
        
    try:
        db_helper.execute_query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', (payload['user_id'],))
        db_helper.execute_query('DELETE FROM refresh_tokens WHERE user_id = ?', (payload['user_id'],))
        return jsonify({'message': 'تم تسجيل الخروج من جميع الأجهزة بنجاح!'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Password Reset Request
@app.route('/api/auth/reset-request', methods=['POST'])
def reset_request():
    if not rate_limit('auth_actions', limit=5, period=60):
        return jsonify({'error': 'تم تجاوز حد الطلبات المسموح به. يرجى المحاولة بعد دقيقة.'}), 429

    data = request.json or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'يرجى إدخال البريد الإلكتروني.'}), 400
        
    try:
        user = db_helper.execute_one('SELECT id FROM users WHERE email = ?', (email,))
        if not user:
            return jsonify({'message': 'إذا كان البريد الإلكتروني مسجلاً، فقد تم إرسال رمز إعادة التعيين.'}), 200
            
        code = str(random.randint(100000, 999900))
        now = datetime.datetime.utcnow()
        db_helper.execute_query('UPDATE users SET reset_code = ?, code_generated_at = ? WHERE id = ?', (code, now.isoformat(), user['id']))
        
        success, test_code = send_verification_email(email, code)
        
        return jsonify({
            'message': 'تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني.',
            'test_mode_code': test_code
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Password Reset Confirm
@app.route('/api/auth/reset-confirm', methods=['POST'])
def reset_confirm():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    code = data.get('code', '').strip()
    new_password = data.get('password', '')
    
    if not email or not code or not new_password:
        return jsonify({'error': 'يرجى إدخال جميع الحقول المطلوبة.'}), 400
        
    if len(new_password) < 8 or not re.search(r"[0-9]", new_password) or not re.search(r"[^a-zA-Z0-9]", new_password):
        return jsonify({'error': 'يجب أن تتكون كلمة المرور الجديدة من 8 خانات على الأقل، وتحتوي على رقم ورمز خاص.'}), 400
        
    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE email = ?', (email,))
        if not user or not user['reset_code'] or user['reset_code'] != code:
            return jsonify({'error': 'رمز إعادة التعيين غير صحيح أو منتهي الصلاحية.'}), 400

        if user['code_generated_at']:
            gen_time = datetime.datetime.fromisoformat(user['code_generated_at'])
            if (datetime.datetime.utcnow() - gen_time).total_seconds() > 600:
                return jsonify({'error': 'انتهت صلاحية رمز إعادة التعيين (أقصى مدة 10 دقائق). يرجى طلب رمز جديد.'}), 400
            
        hashed = hash_password(new_password)
        db_helper.execute_query('UPDATE users SET password_hash = ?, reset_code = NULL, token_version = token_version + 1 WHERE id = ?', (hashed, user['id']))
        db_helper.execute_query('DELETE FROM refresh_tokens WHERE user_id = ?', (user['id'],))
        return jsonify({'message': 'تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Verify Admin Endpoint
@app.route('/api/admin/verify', methods=['GET'])
def verify_admin():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
    
    try:
        user = db_helper.execute_one('SELECT * FROM users WHERE id = ?', (payload['user_id'],))
        if not user or user['email'] != 'test_dev@zenith.tv':
            return jsonify({'error': 'غير مصرح بالوصول إلى لوحة التحكم.'}), 403
        return jsonify({'is_admin': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Save Watch Progress Endpoint
@app.route('/api/progress/save', methods=['POST'])
def save_progress():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
        
    data = request.json or {}
    media_id = str(data.get('media_id', '')).strip()
    media_type = str(data.get('media_type', 'movie')).strip()
    title = data.get('title', '')
    poster_path = data.get('poster_path', '')
    season = int(data.get('season', 1))
    episode = int(data.get('episode', 1))
    current_time = float(data.get('current_time', 0))
    duration = float(data.get('duration', 100))
    percentage = float(data.get('percentage', 0))
    now = datetime.datetime.utcnow().isoformat()
    
    if not media_id:
        return jsonify({'error': 'معرف العمل مطلوب.'}), 400
        
    user_id = payload['user_id']
    
    try:
        existing = db_helper.execute_one(
            "SELECT id FROM watch_history WHERE user_id = ? AND media_id = ? AND media_type = ?",
            (user_id, media_id, media_type)
        )
        
        if existing:
            db_helper.execute_query('''
                UPDATE watch_history 
                SET season = ?, episode = ?, current_time = ?, duration = ?, percentage = ?, updated_at = ?, title = ?, poster_path = ?
                WHERE id = ?
            ''', (season, episode, current_time, duration, percentage, now, title, poster_path, existing['id']))
        else:
            db_helper.execute_query('''
                INSERT INTO watch_history (user_id, media_id, media_type, title, poster_path, season, episode, current_time, duration, percentage, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, media_id, media_type, title, poster_path, season, episode, current_time, duration, percentage, now))
            
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Watch Progress List Endpoint
@app.route('/api/progress/list', methods=['GET'])
def get_progress_list():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
        
    try:
        user_id = payload['user_id']
        history = db_helper.execute_query(
            "SELECT * FROM watch_history WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,)
        )
        return jsonify(history or []), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Stripe & PayPal Payments Subscription Webhook
@app.route('/api/payments/webhook', methods=['POST'])
def payments_webhook():
    data = request.json or {}
    print(f"[PAYMENT WEBHOOK] Received event: {data}", flush=True)
    
    event_type = data.get('type') or data.get('event')
    email = None
    
    if event_type == 'checkout.session.completed' or event_type == 'payment_intent.succeeded':
        metadata = data.get('data', {}).get('object', {}).get('metadata', {})
        email = metadata.get('email')
    elif event_type == 'PAYMENT.SALE.COMPLETED': # PayPal webhook format
        email = data.get('resource', {}).get('custom_id') or data.get('resource', {}).get('custom')
        
    if email:
        email = email.strip().lower()
        try:
            db_helper.execute_query(
                "UPDATE users SET subscription_status = 'premium', subscription_ends_at = ? WHERE email = ?",
                ((datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat(), email)
            )
            print(f"[PAYMENT SUCCESS] Upgraded {email} to PREMIUM via Webhook.", flush=True)
            return jsonify({'status': 'success', 'message': f'Upgraded {email} to premium.'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    return jsonify({'status': 'ignored', 'message': 'Webhook processed without updates.'}), 200

# Save/Load Admin Settings helpers
def get_setting_value(key, default_val):
    row = db_helper.execute_one("SELECT value FROM admin_settings WHERE key = ?", (key,))
    return row['value'] if row else default_val

# Public Config Endpoint (Accessible by guest visitors)
@app.route('/api/config/public', methods=['GET'])
def get_public_config():
    try:
        tmdb_key = get_setting_value('tmdb_api_key', 'c9e7c891bf8bbb53ee3d259c8312a093')
        if not tmdb_key or tmdb_key in ['8b78809e530fb1c86e06dd876378e918', '8a129035db4db516b25ea3c78d4db1c7', '']:
            tmdb_key = 'c9e7c891bf8bbb53ee3d259c8312a093'
            try:
                db_helper.execute_query("INSERT INTO admin_settings (key, value) VALUES ('tmdb_api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (tmdb_key,))
            except Exception as db_err:
                print(f"[DB AUTO-CORRECT ERROR] {db_err}", flush=True)
                
        adblock_toggle = get_setting_value('adblock_warning_active', '1')
        
        # Load servers list
        servers_val = get_setting_value('custom_servers', '')
        if not servers_val:
            import json
            default_servers = [
                {"name": "🔴 VidLink (ترجمة تلقائية)", "template": "https://vidlink.pro/embed/{type}/{id}"},
                {"name": "🟢 VidSrc Pro", "template": "https://vidsrc.xyz/embed/{type}/{id}"},
                {"name": "🔵 VidSrc.to", "template": "https://vidsrc.to/embed/{type}/{id}"},
                {"name": "🟣 Embed.su", "template": "https://embed.su/embed/{type}/{id}"},
                {"name": "🟠 SuperEmbed", "template": "https://multiembed.mov/?video_id={id}&tmdb=1"},
                {"name": "⚡ SmashyStream", "template": "https://player.smashy.stream/{type}/{id}"},
                {"name": "🌐 VidSrc.cc", "template": "https://vidsrc.cc/v2/embed/{type}/{id}"},
                {"name": "🎬 MoviesAPI.club", "template": "https://moviesapi.club/{type}/{id}"}
            ]
            servers = default_servers
        else:
            import json
            servers = json.loads(servers_val)
            
        return jsonify({
            'tmdbApiKey': tmdb_key,
            'adBlockWarningActive': adblock_toggle == '1',
            'customServers': servers
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Private Admin Settings Read (Protected)
@app.route('/api/admin/settings', methods=['GET'])
def get_admin_settings():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
    try:
        user = db_helper.execute_one('SELECT email FROM users WHERE id = ?', (payload['user_id'],))
        if not user or user['email'] != 'test_dev@zenith.tv':
            return jsonify({'error': 'غير مصرح بالوصول للوحة التحكم.'}), 403
            
        tmdb_key = get_setting_value('tmdb_api_key', '')
        adblock_toggle = get_setting_value('adblock_warning_active', '1')
        servers_val = get_setting_value('custom_servers', '[]')
        direct_streams_val = get_setting_value('direct_streams', '[]')
        
        import json
        return jsonify({
            'tmdbApiKey': tmdb_key,
            'adBlockWarningActive': adblock_toggle == '1',
            'customServers': json.loads(servers_val) if servers_val else [],
            'directStreams': json.loads(direct_streams_val) if direct_streams_val else []
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Private Admin Settings Save (Protected)
@app.route('/api/admin/settings', methods=['POST'])
def save_admin_settings():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
    try:
        user = db_helper.execute_one('SELECT email FROM users WHERE id = ?', (payload['user_id'],))
        if not user or user['email'] != 'test_dev@zenith.tv':
            return jsonify({'error': 'غير مصرح بالوصول للوحة التحكم.'}), 403
            
        data = request.json or {}
        import json
        
        db_helper.execute_query("INSERT INTO admin_settings (key, value) VALUES ('tmdb_api_key', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (data.get('tmdbApiKey', ''),))
        db_helper.execute_query("INSERT INTO admin_settings (key, value) VALUES ('adblock_warning_active', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ('1' if data.get('adBlockWarningActive') else '0',))
        
        if 'customServers' in data:
            db_helper.execute_query("INSERT INTO admin_settings (key, value) VALUES ('custom_servers', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (json.dumps(data['customServers']),))
            
        if 'directStreams' in data:
            db_helper.execute_query("INSERT INTO admin_settings (key, value) VALUES ('direct_streams', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (json.dumps(data['directStreams']),))
            
        return jsonify({'status': 'success', 'message': 'تم حفظ الإعدادات بنجاح في قاعدة البيانات السحابية.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Private Admin Audit Logs Read (Protected)
@app.route('/api/admin/audit-logs', methods=['GET'])
def get_audit_logs():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
    try:
        user = db_helper.execute_one('SELECT email FROM users WHERE id = ?', (payload['user_id'],))
        if not user or user['email'] != 'test_dev@zenith.tv':
            return jsonify({'error': 'غير مصرح بالوصول للوحة التحكم.'}), 403
            
        logs = db_helper.execute_query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100")
        return jsonify(logs or []), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Audit log insertion endpoint (Protected)
@app.route('/api/admin/audit-logs', methods=['POST'])
def add_audit_log():
    payload = get_current_user(request.headers.get('Authorization'))
    if not payload:
        return jsonify({'error': 'غير مصرح للوصول.'}), 401
    try:
        user = db_helper.execute_one('SELECT email FROM users WHERE id = ?', (payload['user_id'],))
        if not user or user['email'] != 'test_dev@zenith.tv':
            return jsonify({'error': 'غير مصرح بالوصول للوحة التحكم.'}), 403
            
        data = request.json or {}
        event = data.get('event', '').strip()
        details = data.get('details', '').strip()
        ip = request.remote_addr
        now = datetime.datetime.utcnow().isoformat()
        
        db_helper.execute_query(
            "INSERT INTO audit_logs (timestamp, event, details, ip) VALUES (?, ?, ?, ?)",
            (now, event, details, ip)
        )
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Security Headers Middleware
@app.after_request
def add_security_headers(response):
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://api.themoviedb.org https://api.jikan.moe; "
        "img-src 'self' data: blob: https://image.tmdb.org https://placehold.co https://cdn.myanimelist.net https://m.media-amazon.com; "
        "frame-src * blob: data:; "
        "connect-src 'self' https://api.themoviedb.org https://api.jikan.moe https://api.themoviedb.org/3/ https://accounts.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "media-src * blob: data:;"
    )
    return response

# Log Error Endpoint
@app.route('/log_error')
def log_error():
    msg = request.args.get('msg', '')
    print(f'=== BROWSER LOG ===\n{msg}\n===================', flush=True)
    return 'ok'

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)
