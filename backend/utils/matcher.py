import re
import unicodedata
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd

try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    HAS_RAPIDFUZZ = False


def normalize_text(text: Any) -> str:
    """
    Normalize text for comparison:
    - Uppercase/lowercase differences -> lowercase
    - Trim leading/trailing spaces
    - Remove diacritics/accents (e.g., 'å' -> 'a', 'é' -> 'e')
    - Normalize hyphens, underscores, dots to spaces
    - Collapse multiple spaces to single space
    """
    if text is None or pd.isna(text):
        return ""
    s = str(text).strip().lower()
    if not s:
        return ""
    # Unicode NFD decomposition to remove accents
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode("utf-8")
    # Replace punctuation / delimiters with space
    s = re.sub(r"[\-_._,]+", " ", s)
    # Collapse spaces
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_email(email: Any) -> str:
    """
    Normalize email address:
    - Convert to lowercase
    - Trim leading/trailing whitespace
    """
    if email is None or pd.isna(email):
        return ""
    return str(email).strip().lower()


def compute_similarity_ratio(s1: str, s2: str) -> float:
    """
    Compute standard similarity ratio (0.0 to 1.0) between two normalized strings.
    Uses rapidfuzz token_set_ratio and ratio if available, else difflib.
    """
    if not s1 or not s2:
        return 0.0
    if s1 == s2:
        return 1.0

    if HAS_RAPIDFUZZ:
        r1 = fuzz.ratio(s1, s2) / 100.0
        r2 = fuzz.token_set_ratio(s1, s2) / 100.0
        r3 = fuzz.token_sort_ratio(s1, s2) / 100.0
        return max(r1, r2, r3)
    else:
        # Fallback to difflib
        import difflib
        return difflib.SequenceMatcher(None, s1, s2).ratio()


def calculate_match_score(
    raw_name: str,
    raw_email: str,
    target_name_in_email_df: Optional[str] = None,
    target_email_in_names_df: Optional[str] = None,
) -> int:
    """
    Calculate confidence match percentage (0 to 100) for a candidate (Name, Email) pair.
    
    Formula strategy:
    1. Exact Email Match (if email is present in both files and normalized equal) -> 100%
    2. Exact Name Match (if target name in email file equals name in names file after normalization) -> 100%
    3. Exact Name-to-Email-Username Match -> 100%
    4. Substring & Token Containment (e.g. "John Smith" vs "john.smith@gmail.com") -> 95-99%
    5. First Initial + Last Name Match (e.g. "J Smith" vs "jsmith@gmail.com") -> 90-95%
    6. Standard Fuzzy String Ratio (Levenshtein / Token Set Ratio) -> scaled 0-100%
    """
    norm_name = normalize_text(raw_name)
    norm_email = normalize_email(raw_email)

    if not norm_name or not norm_email:
        return 0

    # Extract username part before '@'
    email_user_raw = norm_email.split("@")[0] if "@" in norm_email else norm_email
    norm_email_user = normalize_text(email_user_raw)

    # 1. Exact Email Match (if email was also present in names file)
    if target_email_in_names_df:
        norm_target_email = normalize_email(target_email_in_names_df)
        if norm_target_email and norm_target_email == norm_email:
            return 100

    # 2. Exact Name Match (if target name column exists in email file)
    if target_name_in_email_df:
        norm_target_name = normalize_text(target_name_in_email_df)
        if norm_target_name and norm_target_name == norm_name:
            return 100

    # 3. Exact Name-to-Email-Username Match
    if norm_name == norm_email_user:
        return 100

    # Concatenated name without spaces
    name_concat = norm_name.replace(" ", "")
    email_user_concat = norm_email_user.replace(" ", "")

    if name_concat == email_user_concat:
        return 100

    # Email username without trailing digits
    email_user_nodigits = re.sub(r"\d+", "", email_user_concat)
    if name_concat == email_user_nodigits:
        return 98

    # 4. Token-based analysis
    name_tokens = norm_name.split()
    if len(name_tokens) >= 2:
        first_name = name_tokens[0]
        last_name = name_tokens[-1]

        # First + Last name both present in email username
        if first_name in norm_email_user and last_name in norm_email_user:
            # Check length proportion
            ratio = len(first_name + last_name) / max(1, len(email_user_nodigits))
            return int(min(99, max(90, ratio * 100)))

        # First initial + Last name (e.g. "j" + "smith" -> "jsmith")
        initial_last = first_name[0] + last_name
        if initial_last == email_user_nodigits or norm_email_user.startswith(initial_last):
            return 92

    # 5. Fuzzy ratio
    sim_ratio = compute_similarity_ratio(norm_name, norm_email_user)
    fuzzy_percent = int(round(sim_ratio * 100))

    return min(100, max(0, fuzzy_percent))


def perform_matching(
    email_df: pd.DataFrame,
    names_df: pd.DataFrame,
    email_col: str,
    name_col: str,
    from_percentage: float = 100.0,
    to_percentage: float = 50.0,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Performs duplicate-prevented matching between names_df and email_df.
    
    Processing Rules:
    - Generates candidate scores for all pairs between to_percentage and from_percentage.
    - Sorts candidates descending by Match % (highest confidence first).
    - Locks row indices ('names_idx', 'email_idx') so once a record is matched at a higher score,
      it is NEVER matched again at a lower score.
    - Dynamically preserves original columns from input files.
    - Returns results sorted descending by Match %.
    """
    # Validate columns exist
    if name_col not in names_df.columns:
        raise ValueError(f"Name column '{name_col}' not found in Names DataFrame.")
    if email_col not in email_df.columns:
        raise ValueError(f"Email column '{email_col}' not found in Email DataFrame.")

    # Check optional cross-columns
    names_email_col = next((c for c in names_df.columns if "email" in c.lower() or "mail" in c.lower()), None)
    email_name_col = next((c for c in email_df.columns if "name" in c.lower() or "user" in c.lower()), None)

    candidates = []

    # 1. Candidate Generation
    for n_idx, n_row in names_df.iterrows():
        raw_name = n_row[name_col]
        target_email = n_row[names_email_col] if names_email_col else None

        for e_idx, e_row in email_df.iterrows():
            raw_email = e_row[email_col]
            target_name = e_row[email_name_col] if email_name_col else None

            score = calculate_match_score(
                raw_name=str(raw_name or ""),
                raw_email=str(raw_email or ""),
                target_name_in_email_df=str(target_name) if target_name else None,
                target_email_in_names_df=str(target_email) if target_email else None,
            )

            # Filter within [to_percentage, from_percentage] range
            if to_percentage <= score <= from_percentage:
                candidates.append({
                    "score": score,
                    "names_idx": n_idx,
                    "email_idx": e_idx,
                    "names_row": n_row,
                    "email_row": e_row,
                })

    # 2. Sort Candidates Descending by Match % (Highest Confidence First)
    # Tiers: score descending, then row indices for deterministic stability
    candidates.sort(key=lambda c: (c["score"], -c["names_idx"], -c["email_idx"]), reverse=True)

    # 3. Mandatory Duplicate Prevention (Locking matched row indices)
    matched_results: List[Dict[str, Any]] = []
    used_names_indices = set()
    used_email_indices = set()

    for cand in candidates:
        n_idx = cand["names_idx"]
        e_idx = cand["email_idx"]

        # Skip if either row has already been matched at a higher score
        if n_idx in used_names_indices or e_idx in used_email_indices:
            continue

        # Lock record indices
        used_names_indices.add(n_idx)
        used_email_indices.add(e_idx)

        # 4. Construct Result Record with preserved original columns
        n_row = cand["names_row"]
        e_row = cand["email_row"]

        record: Dict[str, Any] = {
            "name": str(n_row[name_col]),
            "email": str(e_row[email_col]),
            "match_percentage": int(cand["score"]),
        }

        # Preserve all original columns from names_df
        for col in names_df.columns:
            record[col] = n_row[col]

        # Preserve additional non-duplicate original columns from email_df
        for col in email_df.columns:
            if col not in record:
                record[col] = e_row[col]

        matched_results.append(record)

    stats = {
        "total_records_processed": len(names_df),
        "total_matched_records": len(matched_results),
        "matching_range": {
            "from": int(from_percentage),
            "to": int(to_percentage),
        },
    }

    return matched_results, stats
