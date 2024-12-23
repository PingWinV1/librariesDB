import psycopg2
from psycopg2 import OperationalError

def test_postgres_connection():
    """Test local PostgreSQL connection"""
    
    # Database connection parameters
    db_params = {
        'dbname': 'libraries',
        'user': 'postgres',
        'password': 'student',
        'host': 'localhost',
        'port': '5432'
    }
    
    try:
        print("Attempting to connect to PostgreSQL database...")
        
        # Connect to database
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Test the connection
        cursor.execute('SELECT version();')
        version = cursor.fetchone()
        print("Successfully connected to PostgreSQL!")
        print(f"Server version: {version[0]}")
        
        # List all tables in database
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cursor.fetchall()
        
        print("\nExisting tables in database:")
        if tables:
            for table in tables:
                print(f"- {table[0]}")
        else:
            print("No tables found in database")
        
        cursor.close()
        conn.close()
        print("\nConnection closed successfully")
        
    except OperationalError as e:
        print("\nError connecting to database!")
        print(f"Error details: {str(e)}")
        
    except Exception as e:
        print("\nAn error occurred!")
        print(f"Error details: {str(e)}")

if __name__ == "__main__":
    test_postgres_connection() 