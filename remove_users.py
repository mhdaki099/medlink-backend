import sqlite3
import os

DB_PATH = os.path.join(os.getcwd(), 'backend', 'medlink.db')

def remove_users(user_ids):
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        for uid in user_ids:
            # Delete from users
            cursor.execute("DELETE FROM users WHERE id = ?", (uid,))
            # Also delete related data if any
            cursor.execute("DELETE FROM appointments WHERE patient_id = ? OR doctor_id = ?", (uid, uid))
            cursor.execute("DELETE FROM notifications WHERE user_id = ?", (uid,))
            cursor.execute("DELETE FROM medical_history_requests WHERE patient_id = ? OR doctor_id = ?", (uid, uid))
            cursor.execute("DELETE FROM prescriptions WHERE patient_id = ? OR doctor_id = ?", (uid, uid))
            cursor.execute("DELETE FROM favorites WHERE user_id = ? OR target_id = ?", (uid, uid))
            
            print(f"Removed user {uid} and related data.")
        
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    users_to_remove = ["new_f4e81a5f", "new_e2a86834", "new_0e1bdc9d", "sec_amal"]
    remove_users(users_to_remove)
