import requests

BASE_URL = "http://localhost:8000/api"

def test_toggle_featured():
    # 1. Get all users to find a doctor or pharmacy
    users = requests.get(f"{BASE_URL}/admin/users").json()
    target_user = None
    for u in users:
        if u['role'] in ['doctor', 'pharmacy']:
            target_user = u
            break
    
    if not target_user:
        print("No doctor or pharmacy found in the database.")
        return

    user_id = target_user['id']
    initial_featured = target_user.get('is_featured', False)
    print(f"Testing for user: {target_user['name']} ({user_id}) - Initial featured: {initial_featured}")

    # 2. Toggle featured
    res = requests.put(f"{BASE_URL}/admin/users/{user_id}/toggle-featured")
    if res.status_code == 200:
        updated_user = res.json()
        print(f"Toggle 1 Success - New featured state: {updated_user['is_featured']}")
        
        # 3. Toggle back
        res2 = requests.put(f"{BASE_URL}/admin/users/{user_id}/toggle-featured")
        if res2.status_code == 200:
            final_user = res2.json()
            print(f"Toggle 2 Success - Final featured state: {final_user['is_featured']}")
        else:
            print("Toggle 2 Failed")
    else:
        print(f"Toggle 1 Failed: {res.status_code} - {res.text}")

if __name__ == "__main__":
    test_toggle_featured()
