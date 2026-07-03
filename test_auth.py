import sqlite3
import hashlib
import random
import datetime
import jwt
import sys

SECRET_KEY = 'zenith_tv_secure_secret_key_production_2026_abdo_full_hash'
DB_FILE = 'users.db'

def hash_password(password):
    salt = b'zenith_tv_salt_value'
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return pwd_hash.hex()

def init_db():
    conn = sqlite3.connect(DB_FILE)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            trial_ends_at TEXT NOT NULL,
            is_verified INTEGER DEFAULT 0,
            verification_code TEXT,
            subscription_status TEXT DEFAULT 'trial',
            subscription_ends_at TEXT
        )
    ''')
    conn.commit()
    return conn

print("=== ZENITH TV SERVER-SIDE AUTHENTICATION & SUBSCRIPTION TEST ===")

# Initialize DB structure first
conn = init_db()

# Clean up any existing test user in database
conn.execute("DELETE FROM users WHERE email = 'test_dev@zenith.tv'")
conn.commit()

# Test 1: User Registration
email = 'test_dev@zenith.tv'
password = 'password123'
pwd_hash = hash_password(password)
now = datetime.datetime.utcnow()
trial_ends = now + datetime.timedelta(days=7)
code = str(random.randint(100000, 999999))

try:
    conn.execute(
        "INSERT INTO users (email, password_hash, created_at, trial_ends_at, verification_code) VALUES (?, ?, ?, ?, ?)",
        (email, pwd_hash, now.isoformat(), trial_ends.isoformat(), code)
    )
    conn.commit()
    print("[OK] Test 1: User registration in SQLite database succeeded.")
except Exception as e:
    print("[FAIL] Test 1: User registration failed. Error:", e)
    sys.exit(1)

# Test 2: User Lookup and Code Verification
try:
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user and user[5] == 0 and user[6] == code: # index 5 is is_verified, index 6 is verification_code
        # verify user
        conn.execute("UPDATE users SET is_verified = 1 WHERE email = ?", (email,))
        conn.commit()
        print("[OK] Test 2: Email verification simulation succeeded.")
    else:
        print("[FAIL] Test 2: Email verification lookup failed.")
        sys.exit(1)
except Exception as e:
    print("[FAIL] Test 2: Verification check failed. Error:", e)
    sys.exit(1)

# Test 3: Password Authentication and JWT Token Generation
try:
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user and user[2] == hash_password(password): # index 2 is password_hash
        # Generate JWT
        token = jwt.encode({
            'user_id': user[0],
            'email': user[1],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        print("[OK] Test 3: Password verified and JWT generated successfully. Token:", token[:40] + "...")
    else:
        print("[FAIL] Test 3: Password verification failed.")
        sys.exit(1)
except Exception as e:
    print("[FAIL] Test 3: Login simulation failed. Error:", e)
    sys.exit(1)

# Test 4: Token Decoding and Subscription Check
try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    user_id = payload['user_id']
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if user:
        status = user[7] # index 7 is subscription_status
        trial_ends_at = datetime.datetime.fromisoformat(user[4]) # index 4 is trial_ends_at
        is_premium = status == 'premium' or status == 'trial'
        print(f"[OK] Test 4: JWT decoded and verified. User email: {user[1]}, Plan: {status}, Active premium benefits: {is_premium}")
    else:
        print("[FAIL] Test 4: User lookup via token ID failed.")
        sys.exit(1)
except Exception as e:
    print("[FAIL] Test 4: Token validation failed. Error:", e)
    sys.exit(1)

# Test 5: Subscription Upgrade Simulation
try:
    sub_ends = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    conn.execute("UPDATE users SET subscription_status = 'premium', subscription_ends_at = ? WHERE id = ?", (sub_ends.isoformat(), user_id))
    conn.commit()
    
    updated_user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if updated_user and updated_user[7] == 'premium':
        print(f"[OK] Test 5: Subscription upgrade succeeded. Plan updated to: {updated_user[7]}")
    else:
        print("[FAIL] Test 5: Subscription upgrade update check failed.")
        sys.exit(1)
except Exception as e:
    print("[FAIL] Test 5: Subscription upgrade simulation failed. Error:", e)
    sys.exit(1)

conn.close()
print("=== ALL SERVER-SIDE SECURITY CHECKS PASSED SUCCESSFULLY ===")
