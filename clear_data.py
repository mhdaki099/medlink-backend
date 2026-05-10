import sqlite3
import os

# Get the database path
DB_PATH = os.path.join(os.getcwd(), 'backend', 'medlink.db')

def clear_appointments():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Clear appointments
        cursor.execute("DELETE FROM appointments")
        print("Cleared appointments table.")
        
        # Optionally clear related history/notifications to make it fully clean
        cursor.execute("DELETE FROM medical_history_requests")
        cursor.execute("DELETE FROM prescriptions")
        cursor.execute("DELETE FROM notifications")
        print("Cleared related clinical data (history, prescriptions, notifications).")
        
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    clear_appointments()
