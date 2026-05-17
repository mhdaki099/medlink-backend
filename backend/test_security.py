"""Quick verification of security fixes"""
import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def test(name, url, expect_code=200):
    try:
        r = urllib.request.urlopen(url)
        code = r.getcode()
        body = r.read().decode()[:100]
        status = "PASS" if code == expect_code else "FAIL"
        print(f"  [{status}] {name}: {code} -> {body}")
    except urllib.error.HTTPError as e:
        status = "PASS" if e.code == expect_code else "FAIL"
        print(f"  [{status}] {name}: {e.code} (expected {expect_code})")

print("=== Security Verification ===")
print()

# 1. Root works
test("Root endpoint", f"{BASE}/", 200)

# 2. Health works
test("Health check", f"{BASE}/health", 200)

# 3. /debug is GONE (should 404)
test("/debug removed", f"{BASE}/debug", 404)

# 4. Admin dashboard requires auth (should 403 or 401)
test("Admin needs auth", f"{BASE}/api/admin/dashboard", 403)

# 5. Public doctor list works without auth
test("Doctor list (public)", f"{BASE}/api/doctors", 200)

# 6. Public pharmacy list works
test("Pharmacy list (public)", f"{BASE}/api/pharmacies", 200)

print()
print("=== Done ===")
