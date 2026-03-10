import json
import os
from scheduler import load_config

def test_load_config_file_exists():
    # Ensure config.json exists in same folder
    cfg = load_config()
    assert isinstance(cfg, dict)
    assert 'courses' in cfg
