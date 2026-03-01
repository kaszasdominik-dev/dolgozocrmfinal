#!/usr/bin/env python3
"""
Test script for AI-based gender detection
"""
import os
import sys
sys.path.append('/app/backend')

from server import detect_gender_from_name

def test_gender_detection():
    """Test the AI-based gender detection function"""
    
    # Test cases - Hungarian names
    test_names = [
        ("Nagy Anna", "nő"),
        ("Kiss János", "férfi"), 
        ("Kovács Mária", "nő"),
        ("Szabó Péter", "férfi"),
        ("Tóth Katalin", "nő"),
        ("Horváth László", "férfi"),
        ("Kiss Jánosné", "nő"),  # Married name
        ("Varga Zoltán", "férfi"),
        ("Molnár Éva", "nő"),
        ("Farkas Gábor", "férfi")
    ]
    
    print("🤖 AI-ALAPÚ GENDER DETECTION TESZT")
    print("=" * 50)
    
    correct = 0
    total = len(test_names)
    
    for name, expected in test_names:
        try:
            result = detect_gender_from_name(name)
            status = "✅" if result == expected else "❌"
            print(f"{status} {name:15} -> {result:10} (várt: {expected})")
            if result == expected:
                correct += 1
        except Exception as e:
            print(f"❌ {name:15} -> HIBA: {e}")
    
    print("=" * 50)
    accuracy = (correct / total) * 100
    print(f"📊 Pontosság: {correct}/{total} ({accuracy:.1f}%)")
    
    if accuracy >= 80:
        print("🎉 SIKERES! Az AI-alapú gender detection működik!")
    else:
        print("⚠️  Alacsony pontosság - ellenőrizd az API kulcsot")

if __name__ == "__main__":
    test_gender_detection()