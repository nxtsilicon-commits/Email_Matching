import re
from typing import List, Optional

EMAIL_CANDIDATES = [
    "email",
    "email address",
    "email_address",
    "e-mail",
    "e_mail",
    "mail",
    "matched email",
]

NAME_CANDIDATES = [
    "name",
    "user_name",
    "username",
    "user name",
    "full name",
    "fullname",
    "user name (fb)",
    "first name",
    "person name",
    "name_col",
]


def normalize_column_name(col: str) -> str:
    """
    Normalize column names for comparison:
    - Lowercase
    - Strip whitespace
    - Remove extra spaces, underscores, and hyphens for matching
    """
    if not col:
        return ""
    col_str = str(col).lower().strip()
    # Replace hyphens and underscores with space
    col_str = re.sub(r"[\-_]+", " ", col_str)
    # Collapse multiple spaces into a single space
    col_str = re.sub(r"\s+", " ", col_str).strip()
    return col_str


def detect_email_column(columns: List[str]) -> Optional[str]:
    """
    Detect the column representing email addresses from a list of columns.
    Returns the exact original column name if found, else None.
    """
    normalized_candidates = [normalize_column_name(c) for c in EMAIL_CANDIDATES]

    # 1. Exact normalized match check first
    for orig_col in columns:
        norm_col = normalize_column_name(orig_col)
        if norm_col in normalized_candidates:
            return orig_col

    # 2. Partial / substring match check if exact match not found
    for orig_col in columns:
        norm_col = normalize_column_name(orig_col)
        if any(cand in norm_col for cand in ["email", "mail"]):
            return orig_col

    return None


def detect_name_column(columns: List[str]) -> Optional[str]:
    """
    Detect the column representing names from a list of columns.
    Returns the exact original column name if found, else None.
    """
    normalized_candidates = [normalize_column_name(c) for c in NAME_CANDIDATES]

    # 1. Exact normalized match check first
    for orig_col in columns:
        norm_col = normalize_column_name(orig_col)
        if norm_col in normalized_candidates:
            return orig_col

    # 2. Substring match check for name or user
    for orig_col in columns:
        norm_col = normalize_column_name(orig_col)
        if any(cand in norm_col for cand in ["name", "user"]):
            return orig_col

    return None

