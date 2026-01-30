"""
Utility to add/update/delete classes in config.json
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

def list_classes(config):
    """List all classes"""
    print("\n" + "="*100)
    print("CLASSES")
    print("="*100)
    print(f"{'ID':<15} {'Year':<8} {'Semesters':<15} {'Strength':<12} {'Theory Room':<15}")
    print("-"*100)
    for cls in config['classes']:
        sems = ", ".join(str(s) for s in cls['sems'])
        theory_room = config.get('fixed_rooms', {}).get(cls['id'], 'Not assigned')
        print(f"{cls['id']:<15} {cls['year']:<8} {sems:<15} {cls.get('strength', 60):<12} {theory_room:<15}")

def add_class(config):
    """Add a new class"""
    cls_id = input("\nEnter class ID (e.g., Y1S1): ").strip()
    if any(c['id'] == cls_id for c in config['classes']):
        print(f"Error: Class {cls_id} already exists")
        return
    
    year = int(input("Enter year (1-5): "))
    sems_input = input("Enter semesters (comma-separated, e.g., 1,2): ").strip()
    sems = [int(s.strip()) for s in sems_input.split(",")]
    strength = int(input("Enter class strength: "))
    
    config['classes'].append({
        "id": cls_id,
        "year": year,
        "sems": sems,
        "strength": strength
    })
    print(f"[OK] Class {cls_id} added")

def delete_class(config):
    """Delete a class"""
    cls_id = input("\nEnter class ID to delete: ").strip()
    cls = next((c for c in config['classes'] if c['id'] == cls_id), None)
    if not cls:
        print(f"Error: Class {cls_id} not found")
        return
    
    confirm = input(f"Delete {cls_id}? (y/n): ").lower() == 'y'
    if confirm:
        config['classes'] = [c for c in config['classes'] if c['id'] != cls_id]
        # Also remove from fixed_rooms if exists
        if 'fixed_rooms' in config and cls_id in config['fixed_rooms']:
            del config['fixed_rooms'][cls_id]
        print(f"[OK] Class {cls_id} deleted")

def main():
    """Main menu"""
    config = load_config()
    if not config:
        return
    
    while True:
        print("\n" + "="*80)
        print("CLASS MANAGEMENT")
        print("="*80)
        print("1. List classes")
        print("2. Add class")
        print("3. Delete class")
        print("4. Save & Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == '1':
            list_classes(config)
        elif choice == '2':
            add_class(config)
        elif choice == '3':
            delete_class(config)
        elif choice == '4':
            save_config(config)
            break
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
