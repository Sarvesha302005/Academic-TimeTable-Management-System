"""
Utility to update schedule timeslots (days and hours) in config.json
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

def list_schedule(config):
    """List current schedule"""
    print("\n" + "="*80)
    print("CURRENT SCHEDULE")
    print("="*80)
    print(f"\nDays: {', '.join(config['schedule']['days'])}")
    print(f"Hours: {', '.join(config['schedule']['hours'])}")
    print(f"Total timeslots: {len(config['schedule']['days']) * len(config['schedule']['hours'])}")
    
    if 'break_times' in config:
        print(f"\nBreak times:")
        for brk in config['break_times']:
            print(f"  {brk['start']} - {brk['end']}")

def update_days(config):
    """Update days of the week"""
    print("\nCurrent days:", ", ".join(config['schedule']['days']))
    days_input = input("Enter days (comma-separated, e.g., Mon,Tue,Wed,Thu,Fri,Sat,Sun): ").strip()
    config['schedule']['days'] = [d.strip() for d in days_input.split(",")]
    print(f"[OK] Days updated: {', '.join(config['schedule']['days'])}")

def update_hours(config):
    """Update hours of the day"""
    print("\nCurrent hours:", ", ".join(config['schedule']['hours']))
    hours_input = input("Enter hours (comma-separated, e.g., 09:00,10:00,11:00): ").strip()
    config['schedule']['hours'] = [h.strip() for h in hours_input.split(",")]
    print(f"[OK] Hours updated: {', '.join(config['schedule']['hours'])}")

def update_breaks(config):
    """Update break times"""
    if 'break_times' not in config:
        config['break_times'] = []
    
    print("\nCurrent break times:")
    for i, brk in enumerate(config['break_times']):
        print(f"  {i+1}. {brk['start']} - {brk['end']}")
    
    print("\nOptions:")
    print("1. Add break")
    print("2. Delete break")
    print("3. Clear all breaks")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == '1':
        start = input("Enter break start time (e.g., 13:00): ").strip()
        end = input("Enter break end time (e.g., 14:00): ").strip()
        config['break_times'].append({"start": start, "end": end})
        print(f"[OK] Break {start}-{end} added")
    elif choice == '2':
        idx = int(input("Enter break number to delete: ")) - 1
        if 0 <= idx < len(config['break_times']):
            config['break_times'].pop(idx)
            print("[OK] Break deleted")
    elif choice == '3':
        config['break_times'] = []
        print("[OK] All breaks removed")

def main():
    """Main menu"""
    config = load_config()
    if not config:
        return
    
    while True:
        print("\n" + "="*80)
        print("SCHEDULE MANAGEMENT")
        print("="*80)
        print("1. View schedule")
        print("2. Update days")
        print("3. Update hours")
        print("4. Manage break times")
        print("5. Save & Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == '1':
            list_schedule(config)
        elif choice == '2':
            update_days(config)
        elif choice == '3':
            update_hours(config)
        elif choice == '4':
            update_breaks(config)
        elif choice == '5':
            save_config(config)
            break
        else:
            print("Invalid choice")

if __name__ == "__main__":
    main()
