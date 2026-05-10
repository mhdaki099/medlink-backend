import sqlite3

def dump_db():
    conn = sqlite3.connect('backend/medlink.db')
    c = conn.cursor()
    
    with open('db_diagnostics.txt', 'w', encoding='utf-8') as f:
        f.write("--- DOCTORS ---\n")
        c.execute("SELECT id, name, email FROM users WHERE role='doctor'")
        for d in c.fetchall():
            f.write(f"ID: {d[0]}, Name: {d[1]}, Email: {d[2]}\n")
            
        f.write("\n--- ALL APPOINTMENTS ---\n")
        c.execute("SELECT id, doctor_id, patient_id, status, date FROM appointments")
        for a in c.fetchall():
            f.write(f"ID: {a[0]}, Doc: {a[1]}, Patient: {a[2]}, Status: {a[3]}, Date: {a[4]}\n")
            
        f.write("\n--- PATIENTS ---\n")
        c.execute("SELECT id, name, email FROM users WHERE role='patient'")
        for p in c.fetchall():
            f.write(f"ID: {p[0]}, Name: {p[1]}, Email: {p[2]}\n")
            
    conn.close()
    print("Dump complete -> db_diagnostics.txt")

if __name__ == "__main__":
    dump_db()
