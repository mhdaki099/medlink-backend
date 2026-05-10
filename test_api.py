import requests
import json

def test_api():
    url = "http://localhost:8000/api/appointments?doctor_id=new_e2a86834"
    try:
        res = requests.get(url)
        print(f"Status: {res.status_code}")
        data = res.json()
        print(f"Count: {len(data)}")
        with open('api_test_output.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Output saved to api_test_output.json")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
