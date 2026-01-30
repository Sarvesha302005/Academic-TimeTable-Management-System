"""
Utility to add/update/delete teachers in config.json
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

def list_teachers(config):
    """List all teachers"""
    print("\n" + "="*120)
    print("TEACHERS")
    print("="*120)
    print(f"{'ID':<15} {'Name':<20} {'Min Hours':<12} {'Max Hours':<12} {'Preferences':<60}")
    print("-"*120)
    for teacher in config['teachers']:
        prefs = ", ".join(teacher['prefs'])
        print(f"{teacher['id']:<15} {teacher['name']:<20} {teacher.get('min', 0):<12} {teacher.get('max', 20):<12} {prefs:<60}")

def add_teacher(config):
    """Add a new teacher"""
    tid = input("\nEnter teacher ID (e.g., T001): ").strip()
    if any(t['id'] == tid for t in config['teachers']):
        print(f"Error: Teacher {tid} already exists")
        return
    
    name = input("Enter teacher name: ").strip()
    min_hours = int(input("Enter minimum hours per week: "))
    max_hours = int(input("Enter maximum hours per week: "))
    prefs_input = input("Enter preferred course codes (comma-separated): ").strip()
    prefs = [p.strip() for p in prefs_input.split(",")]
    
    config['teachers'].append({
        "id": tid,
        "name": name,
        "min": min_hours,
        "max": max_hours,
        "prefs": prefs
    })
    print(f"[OK] Teacher {name} added")

def delete_teacher(config):
    """Delete a teacher"""
    tid = input("\nEnter teacher ID to delete: ").strip()
    teacher = next((t for t in config['teachers'] if t['id'] == tid), None)
    if not teacher:
        print(f"Error: Teacher {tid} not found")
        return
    
    confirm = input(f"Delete {teacher['name']}? (y/n): ").lower() == 'y'
    if confirm:
        config['teachers'] = [t for t in config['teachers'] if t['id'] != tid]
        print(f"[OK] Teacher {tid} deleted")

def main():
    """Main menu"""
    config = load_config()
    if not config:
        return
    
    while True:
        print("\n" + "="*80)
        print("TEACHER MANAGEMENT")
        print("="*80)
        print("1. List teachers")
        print("2. Add teacher")
        print("3. Delete teacher")
        print("4. Save & Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == '1':
            list_teachers(config)
        elif choice == '2':
            add_teacher(config)
        elif choice == '3':
            delete_teacher(config)
        elif choice == '4':
            save_config(config)
            break
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
