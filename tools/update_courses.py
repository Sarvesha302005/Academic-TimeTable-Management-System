"""
Utility to add/update/delete courses in config.json
"""
import json
import os

CONFIG_FILE = "config.json"

def load_config():
    """Load configuration from JSON file"""
    if not os.path.exists(CONFIG_FILE):
        print(f"Error: {CONFIG_FILE} not found")
        return None
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

def save_config(config):
    """Save configuration to JSON file"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"[OK] Configuration saved to {CONFIG_FILE}")

def list_courses(config):
    """List all courses"""
    print("\n" + "="*80)
    print("COURSES")
    print("="*80)
    for code, course in config['courses'].items():
        print(f"{code:10} | {course['name']:30} | Y{course['year']}S{course['sem']} | L:{course['L']} T:{course['T']} P:{course['P']} | Lab:{course.get('lab', False)}")

def add_course(config):
    """Add a new course"""
    code = input("\nEnter course code (e.g., CS101): ").strip()
    if code in config['courses']:
        print(f"Error: Course {code} already exists")
        return
    
    name = input("Enter course name: ").strip()
    year = int(input("Enter year (1-5): "))
    sem = int(input("Enter semester (1-2): "))
    L = int(input("Enter number of lectures: "))
    T = int(input("Enter number of tutorials: "))
    P = int(input("Enter number of practicals: "))
    lab = input("Is this a lab course? (y/n): ").lower() == 'y'
    
    config['courses'][code] = {
        "name": name,
        "year": year,
        "sem": sem,
        "L": L,
        "T": T,
        "P": P,
        "lab": lab
    }
    print(f"[OK] Course {code} added")

def delete_course(config):
    """Delete a course"""
    code = input("\nEnter course code to delete: ").strip()
    if code not in config['courses']:
        print(f"Error: Course {code} not found")
        return
    
    confirm = input(f"Delete {code}? (y/n): ").lower() == 'y'
    if confirm:
        del config['courses'][code]
        print(f"[OK] Course {code} deleted")

def main():
    """Main menu"""
    config = load_config()
    if not config:
        return
    
    while True:
        print("\n" + "="*80)
        print("COURSE MANAGEMENT")
        print("="*80)
        print("1. List courses")
        print("2. Add course")
        print("3. Delete course")
        print("4. Save & Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == '1':
            list_courses(config)
        elif choice == '2':
            add_course(config)
        elif choice == '3':
            delete_course(config)
        elif choice == '4':
            save_config(config)
            break
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
