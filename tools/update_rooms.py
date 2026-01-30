"""
Utility to add/update/delete rooms in config.json
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

def list_rooms(config):
    """List all rooms"""
    print("\n" + "="*120)
    print("ROOMS")
    print("="*120)
    
    print("\nTHEORY ROOMS:")
    print("-"*50)
    for room in config['rooms']['theory']:
        cap = config.get('room_capacities', {}).get(room, 'Not set')
        print(f"  {room:<15} Capacity: {cap}")
    
    print("\nLAB ROOMS:")
    print("-"*50)
    for room in config['rooms']['lab']:
        cap = config.get('room_capacities', {}).get(room, 'Not set')
        print(f"  {room:<15} Capacity: {cap}")

def add_room(config):
    """Add a new room"""
    print("\nRoom type:")
    print("1. Theory")
    print("2. Lab")
    room_type = input("Enter choice (1-2): ").strip()
    room_type = 'theory' if room_type == '1' else 'lab'
    
    room_id = input(f"Enter {room_type} room ID (e.g., TR1): ").strip()
    room_list = config['rooms'][room_type]
    if room_id in room_list:
        print(f"Error: Room {room_id} already exists")
        return
    
    config['rooms'][room_type].append(room_id)
    
    # Set capacity if configured
    if 'room_capacities' in config:
        capacity = int(input(f"Enter capacity for {room_id}: "))
        config['room_capacities'][room_id] = capacity
    
    print(f"[OK] Room {room_id} ({room_type}) added")

def delete_room(config):
    """Delete a room"""
    room_id = input("\nEnter room ID to delete: ").strip()
    
    found = False
    for room_type in ['theory', 'lab']:
        if room_id in config['rooms'][room_type]:
            confirm = input(f"Delete {room_id} ({room_type})? (y/n): ").lower() == 'y'
            if confirm:
                config['rooms'][room_type].remove(room_id)
                if 'room_capacities' in config and room_id in config['room_capacities']:
                    del config['room_capacities'][room_id]
                print(f"[OK] Room {room_id} deleted")
            found = True
            break
    
    if not found:
        print(f"Error: Room {room_id} not found")

def main():
    """Main menu"""
    config = load_config()
    if not config:
        return
    
    while True:
        print("\n" + "="*80)
        print("ROOM MANAGEMENT")
        print("="*80)
        print("1. List rooms")
        print("2. Add room")
        print("3. Delete room")
        print("4. Save & Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == '1':
            list_rooms(config)
        elif choice == '2':
            add_room(config)
        elif choice == '3':
            delete_room(config)
        elif choice == '4':
            save_config(config)
            break
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
