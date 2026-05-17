"""Test the live Render API endpoints"""
import urllib.request
import urllib.error
import json

BASE = "https://medlink-backend-2e7a.onrender.com"

def post(path, data):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.getcode(), json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body

def get(path, token=None):
    req = urllib.request.Request(f"{BASE}{path}")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return r.getcode(), json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]

print("=== Live API Tests ===")
print()

# 1. Root
code, data = get("/")
print(f"1. GET /           -> {code}: {data}")

# 2. Health
code, data = get("/health")
print(f"2. GET /health     -> {code}: {data}")

# 3. Login with seed user
code, data = post("/api/auth/login", {"email": "ahmed@medlink.sy", "password": "123456"})
print(f"3. POST /login     -> {code}: has_token={bool(data.get('access_token') if isinstance(data,dict) else False)}")

token = data.get("access_token") if isinstance(data, dict) else None

# 4. Test /me with token
if token:
    code, data = get("/api/auth/me", token)
    name = data.get("name") if isinstance(data, dict) else "?"
    print(f"4. GET /auth/me    -> {code}: name={name}")

# 5. Admin without token (should 401)
code, data = get("/api/admin/dashboard")
print(f"5. Admin no-auth   -> {code} (expected 401)")

# 6. Doctors list (public)
code, data = get("/api/doctors")
count = len(data) if isinstance(data, list) else "?"
print(f"6. GET /doctors    -> {code}: {count} doctors")

# 7. Pharmacies list (public)
code, data = get("/api/pharmacies")
count = len(data) if isinstance(data, list) else "?"
print(f"7. GET /pharmacies -> {code}: {count} pharmacies")

print()
print("=== Done ===")
