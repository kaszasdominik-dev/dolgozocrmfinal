"""
Google Sheets Integration Helper
Nyilvános Google Sheets olvasása (nem kell OAuth)
"""
import re
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime


def extract_sheet_id(url: str) -> Optional[str]:
    """
    Extract Google Sheets ID from URL
    
    Supported formats:
    - https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit...
    - https://docs.google.com/spreadsheets/d/{SHEET_ID}
    """
    patterns = [
        r'/spreadsheets/d/([a-zA-Z0-9-_]+)',
        r'key=([a-zA-Z0-9-_]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def fetch_public_sheet_data(sheet_url: str, range_name: str = "A1:Z1000") -> Tuple[bool, List[List[str]], str]:
    """
    Fetch data from public Google Sheets using CSV export
    
    Returns:
        (success, data, error_message)
    """
    try:
        sheet_id = extract_sheet_id(sheet_url)
        if not sheet_id:
            return False, [], "Érvénytelen Google Sheets URL"
        
        # Use CSV export for public sheets
        csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
        
        response = requests.get(csv_url, timeout=10)
        
        if response.status_code == 404:
            return False, [], "Táblázat nem található. Ellenőrizd hogy nyilvános-e!"
        
        if response.status_code != 200:
            return False, [], f"HTTP hiba: {response.status_code}"
        
        # Parse CSV
        import csv
        import io
        
        csv_data = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(csv_data))
        data = list(reader)
        
        if not data:
            return False, [], "A táblázat üres"
        
        return True, data, ""
        
    except requests.Timeout:
        return False, [], "Kapcsolat timeout - próbáld újra"
    except Exception as e:
        return False, [], f"Hiba: {str(e)}"


def auto_detect_columns(data: List[List[str]]) -> Dict[str, Optional[str]]:
    """
    Automatically detect column mapping from headers
    
    Returns:
        {
            "name": "B",
            "phone": "C",
            "address": "D",
            "email": "E",
            "date": "A"
        }
    """
    if not data or len(data) < 1:
        return {}
    
    headers = data[0]
    mapping = {
        "name": None,
        "phone": None,
        "address": None,
        "email": None,
        "notes": None,
        "date": None
    }
    
    def index_to_letter(index: int) -> str:
        """Convert 0-based index to Excel column letter (0->A, 25->Z, 26->AA)"""
        result = ""
        while index >= 0:
            result = chr(65 + (index % 26)) + result
            index = index // 26 - 1
        return result
    
    for index, header in enumerate(headers):
        if not header:
            continue
            
        lower = header.lower().strip()
        col_letter = index_to_letter(index)
        
        # Név
        if any(keyword in lower for keyword in ['név', 'name', 'teljes név', 'full name']):
            if not mapping["name"]:
                mapping["name"] = col_letter
        
        # Telefon
        if any(keyword in lower for keyword in ['telefon', 'phone', 'mobil', 'tel', 'mobile']):
            if not mapping["phone"]:
                mapping["phone"] = col_letter
        
        # Lakcím / Lakóhely
        if any(keyword in lower for keyword in ['lak', 'cím', 'address', 'hely', 'város', 'city']):
            if not mapping["address"]:
                mapping["address"] = col_letter
        
        # Email
        if any(keyword in lower for keyword in ['email', 'e-mail', 'mail']):
            if not mapping["email"]:
                mapping["email"] = col_letter
        
        # Megjegyzés
        if any(keyword in lower for keyword in ['megjegyzés', 'notes', 'note', 'comment']):
            if not mapping["notes"]:
                mapping["notes"] = col_letter
        
        # Időbélyeg / Dátum
        if any(keyword in lower for keyword in ['idő', 'dátum', 'timestamp', 'date', 'time', 'submitted']):
            if not mapping["date"]:
                mapping["date"] = col_letter
    
    return mapping


def letter_to_index(letter: str) -> int:
    """Convert Excel column letter to 0-based index (A->0, Z->25, AA->26)"""
    result = 0
    for char in letter.upper():
        result = result * 26 + (ord(char) - ord('A') + 1)
    return result - 1


def extract_row_data(row: List[str], column_mapping: Dict[str, str]) -> Dict[str, Optional[str]]:
    """
    Extract data from a row based on column mapping
    
    Args:
        row: List of cell values
        column_mapping: {"name": "B", "phone": "C", ...}
    
    Returns:
        {"name": "Kiss Péter", "phone": "+36 30 123 4567", ...}
    """
    extracted = {}
    
    for field, col_letter in column_mapping.items():
        if not col_letter:
            extracted[field] = None
            continue
        
        try:
            col_index = letter_to_index(col_letter)
            if col_index < len(row):
                value = row[col_index].strip() if row[col_index] else None
                extracted[field] = value if value else None
            else:
                extracted[field] = None
        except:
            extracted[field] = None
    
    return extracted


def get_preview_data(data: List[List[str]], column_mapping: Dict[str, str], max_rows: int = 3) -> List[Dict]:
    """
    Get preview of mapped data
    
    Returns:
        [
            {"name": "Kiss Péter", "phone": "+36 30 123 4567", ...},
            ...
        ]
    """
    if not data or len(data) < 2:
        return []
    
    # Skip header row
    preview = []
    for row in data[1:max_rows + 1]:
        extracted = extract_row_data(row, column_mapping)
        if extracted.get("name") or extracted.get("phone"):  # Has at least name or phone
            preview.append(extracted)
    
    return preview


def validate_column_mapping(column_mapping: Dict[str, str]) -> Tuple[bool, str]:
    """
    Validate that required fields are mapped
    
    Returns:
        (is_valid, error_message)
    """
    required_fields = ["name", "phone"]
    
    for field in required_fields:
        if not column_mapping.get(field):
            field_names = {"name": "Név", "phone": "Telefonszám"}
            return False, f"{field_names.get(field, field)} oszlop megadása kötelező"
    
    return True, ""
