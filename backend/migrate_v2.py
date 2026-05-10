import sqlite3

def migrate():
    conn = sqlite3.connect('medlink.db')
    cursor = conn.cursor()
    
    # Check current columns
    cursor.execute('PRAGMA table_info(users)')
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'services' not in columns:
        print("Adding 'services' column to 'users' table...")
        cursor.execute('ALTER TABLE users ADD COLUMN services JSON')
        
    if 'supervisor_id' not in columns:
        print("Adding 'supervisor_id' column to 'users' table...")
        cursor.execute('ALTER TABLE users ADD COLUMN supervisor_id TEXT REFERENCES users(id)')
        
    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
