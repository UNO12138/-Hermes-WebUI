import sqlite3
conn = sqlite3.connect(r'C:\Users\Asus\AppData\Roaming\TRAE SOLO CN\User\globalStorage\state.vscdb')
c = conn.cursor()
# List all tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Tables:", tables)

# Search all tables for figma-related content
for table_name, in tables:
    try:
        c.execute(f"SELECT * FROM {table_name}")
        rows = c.fetchall()
        for row in rows:
            row_str = str(row)
            if 'figma' in row_str.lower() or 'figd_' in row_str.lower():
                print(f"Found in {table_name}: {row_str[:500]}")
    except Exception as e:
        print(f"Error reading {table_name}: {e}")
conn.close()
