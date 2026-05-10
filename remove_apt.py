import sqlite3
import os

DB_PATH = os.path.join(os.getcwd(), 'backend', 'medlink.db')

def remove_appointment(apt_id):
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM appointments WHERE id = ?", (apt_id,))
        if cursor.rowcount > 0:
            print(f"Successfully removed appointment with ID: {apt_id}")
        else:
            print(f"Appointment with ID: {apt_id} not found.")
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    remove_appointment("apt_793ebe19")
