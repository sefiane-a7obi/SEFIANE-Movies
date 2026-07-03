import subprocess
import time
import urllib.request
import json
import os
import signal
import random

print("=== ZENITH TV FLASK SERVER INTEGRATION & ROUTING TEST ===")

# Start the Flask server in a subprocess
process = subprocess.Popen(
    ["python", "server.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
)

# Wait 3 seconds for the server to spin up
time.sleep(3)

url_base = "http://127.0.0.1:8000"
success = True

def test_route(name, path, is_json=False, post_data=None):
    global success
    url = f"{url_base}{path}"
    try:
        if post_data:
            req = urllib.request.Request(
                url,
                data=json.dumps(post_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
        else:
            req = urllib.request.Request(url)
            
        with urllib.request.urlopen(req) as response:
            code = response.getcode()
            content = response.read()
            if is_json:
                data = json.loads(content.decode('utf-8'))
                print(f"[OK] Endpoint {name}: Success (Code {code}). Returned JSON.")
            else:
                print(f"[OK] Static Route {name}: Success (Code {code}). Loaded {len(content)} bytes.")
    except Exception as e:
        print(f"[FAIL] Route {name}: Failed. Error: {e}")
        success = False

# 1. Test home page static load
test_route("Index HTML", "/")

# 2. Test style.css static load
test_route("Styles CSS", "/style.css")

# 3. Test API Registration endpoint with dynamic random email
rand_email = f"test_dev_{random.randint(10000, 99999)}@zenith.tv"
test_route("Register API", "/api/auth/register", is_json=True, post_data={
    "email": rand_email,
    "password": "password123!"
})

# 4. Test API Login with invalid credentials
try:
    req = urllib.request.Request(
        f"{url_base}/api/auth/login",
        data=json.dumps({"email": rand_email, "password": "wrongpassword"}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    urllib.request.urlopen(req)
    print("[FAIL] Login API did not fail on invalid password.")
    success = False
except urllib.error.HTTPError as e:
    if e.code == 400 or e.code == 403: # 403 because email is unverified, 400 if bad credentials
        print(f"[OK] Login API: Correctly returned code {e.code} on invalid credentials or unverified email.")
    else:
        print(f"[FAIL] Login API: Expected 400/403 but got {e.code}.")
        success = False
except Exception as e:
    print(f"[FAIL] Login API: Unexpected error: {e}")
    success = False

# Terminate the server process
if os.name == 'nt':
    process.send_signal(signal.CTRL_BREAK_EVENT)
else:
    process.terminate()

process.wait()
print("=== SERVER INTEGRATION TESTING COMPLETE ===")
if success:
    print("[SUCCESS] All routes, static files, and APIs served stably and correctly!")
else:
    print("[FAILURE] Some tests failed. Please review server.py configuration.")
