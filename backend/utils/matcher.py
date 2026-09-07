import re
import unicodedata
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd

try:
    from rapidfuzz import fuzz, process
    HAS_RAPIDFUZZ = True
except ImportError:
    import difflib
    HAS_RAPIDFUZZ = False


def normalize_text(text: Any) -> str:
    """
    Normalize text for comparison:
    - Lowercase
    - Trim leading/trailing spaces
    - Remove diacritics/accents (e.g., 'å' -> 'a', 'æ' -> 'ae', 'ø' -> 'o', 'é' -> 'e')
    - Replace hyphens, underscores, dots, commas with space
    - Collapse multiple spaces to single space
    """
    if text is None or pd.isna(text):
        return ""
    s = str(text).strip().lower()
    if not s:
        return ""

    # Replace specific Scandinavian / special characters cleanly
    s = s.replace("æ", "ae").replace("ø", "o").replace("å", "a").replace("ß", "ss")

    # Unicode NFD decomposition to remove remaining accents
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode("utf-8")
    # Replace punctuation / delimiters with space
    s = re.sub(r"[\-_._,]+", " ", s)
    # Collapse multiple spaces
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_email(email: Any) -> str:
    """
    Normalize email address:
    - Lowercase
    - Trim whitespace
    """
    if email is None or pd.isna(email):
        return ""
    return str(email).strip().lower()


def compute_name_similarity_score(name1: str, name2: str, **kwargs) -> int:
    """
    Compute similarity percentage score (0 to 100) between two names.
    - If normalized names are equal -> 100
    - Checks initial + last name matching (e.g. 'Randi Nilsen' vs 'r nilsen' -> 92)
    - Uses max of ratio, token_set_ratio, token_sort_ratio, WRatio, partial_ratio
    """
    norm1 = normalize_text(name1)
    norm2 = normalize_text(name2)

    if not norm1 or not norm2:
        return 0

    if norm1 == norm2:
        return 100

    # Initial + Last name check (e.g. "Randi Nilsen" vs "r nilsen")
    t1 = norm1.split()
    t2 = norm2.split()
    init_score = 0
    if len(t1) >= 2 and len(t2) >= 2:
        if (t1[0][0] == t2[0][0] and t1[-1] == t2[-1]) or (t2[0][0] == t1[0][0] and t2[-1] == t1[-1]):
            init_score = 92

    if HAS_RAPIDFUZZ:
        r1 = fuzz.ratio(norm1, norm2)
        r2 = fuzz.token_set_ratio(norm1, norm2)
        r3 = fuzz.token_sort_ratio(norm1, norm2)
        r4 = fuzz.WRatio(norm1, norm2)
        r5 = fuzz.partial_ratio(norm1, norm2) if len(min(norm1, norm2, key=len)) >= 4 else 0
        return int(round(max(r1, r2, r3, r4, r5, init_score)))
    else:
        import difflib
        ratio = difflib.SequenceMatcher(None, norm1, norm2).ratio()
        return int(round(max(ratio * 100, init_score)))


def calculate_match_score(
    raw_name: str,
    raw_email: str,
    target_name_in_email_df: Optional[str] = None,
    target_email_in_names_df: Optional[str] = None,
) -> int:
    """Backward-compatible score calculator wrapper."""
    if target_name_in_email_df:
        score = compute_name_similarity_score(raw_name, target_name_in_email_df)
        if score > 0:
            return score
    email_user = raw_email.split("@")[0] if "@" in raw_email else raw_email
    return compute_name_similarity_score(raw_name, email_user)


def perform_matching(
    email_df: pd.DataFrame,
    names_df: pd.DataFrame,
    email_col: str,
    name_col: str,
    from_percentage: float = 100.0,
    to_percentage: float = 50.0,
    excel_name_col: Optional[str] = None,
    names_email_col: Optional[str] = None,
    country_col: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Performs fast, accurate duplicate-prevented matching between names_df (Names File)
    and email_df (Email/Excel File) for ANY user-selected matching range [to_percentage, from_percentage].

    Optimized for high-performance execution on large datasets (up to 1,000,000+ rows):
    - Fast vectorized/list extractions instead of iterrows
    - Inverted index maps for exact O(1) matching
    - 3-character prefix and token-based candidate bucketing (avoiding single-character bucket bloat)
    - Fast dictionary record access instead of slow DataFrame.loc
    - Strict 1-to-1 row locking and dynamic column preservation
    """
    # 1. Validate required columns in respective DataFrames
    if name_col not in names_df.columns:
        raise ValueError(f"Name column '{name_col}' not found in Names DataFrame.")
    if email_col not in email_df.columns:
        raise ValueError(f"Email column '{email_col}' not found in Email DataFrame.")

    # Detect or use provided Excel Name column
    if not excel_name_col or excel_name_col not in email_df.columns:
        excel_name_col = next(
            (c for c in email_df.columns if normalize_text(c) in ["name", "user name", "username", "full name", "person name"]),
            None,
        )
        if not excel_name_col:
            excel_name_col = next((c for c in email_df.columns if "name" in c.lower() or "user" in c.lower()), None)

    # Detect or use provided Names Email column
    if not names_email_col or names_email_col not in names_df.columns:
        names_email_col = next(
            (c for c in names_df.columns if "email" in c.lower() or "mail" in c.lower()),
            None,
        )

    is_case_a = names_email_col is not None and bool(names_df[names_email_col].astype(str).str.strip().any())

    # Extract raw series into native Python lists for 100x iteration speed
    email_raw_list = email_df[email_col].fillna("").astype(str).tolist()
    excel_name_raw_list = email_df[excel_name_col].fillna("").astype(str).tolist() if excel_name_col else None

    # Pre-extract Excel normalized values and build inverted indexes
    exact_excel_text_map: Dict[str, List[int]] = {}
    exact_excel_email_map: Dict[str, List[int]] = {}

    for e_idx, raw_email in enumerate(email_raw_list):
        norm_e_mail = normalize_email(raw_email)
        raw_name = excel_name_raw_list[e_idx] if excel_name_raw_list else ""
        norm_e_name = normalize_text(raw_name)

        email_user_raw = norm_e_mail.split("@")[0] if "@" in norm_e_mail else norm_e_mail
        norm_e_user = normalize_text(email_user_raw)

        if norm_e_name:
            exact_excel_text_map.setdefault(norm_e_name, []).append(e_idx)
        if norm_e_user and norm_e_user != norm_e_name:
            exact_excel_text_map.setdefault(norm_e_user, []).append(e_idx)
        if norm_e_mail:
            exact_excel_email_map.setdefault(norm_e_mail, []).append(e_idx)

    unique_excel_text_keys = list(exact_excel_text_map.keys())

    # Build token and 3-char prefix bucket index (fast set-based deduplication)
    candidate_buckets: Dict[str, List[str]] = {}
    for key in unique_excel_text_keys:
        tokens = key.split()
        for tok in tokens:
            if len(tok) >= 2:
                candidate_buckets.setdefault(tok, []).append(key)
        # Use 3-character prefix for tight bucketing (avoids 50k item buckets of 1-char)
        if len(key) >= 3:
            candidate_buckets.setdefault(f"p:{key[:3]}", []).append(key)
        elif len(key) == 2:
            candidate_buckets.setdefault(f"p:{key}", []).append(key)

    candidates = []
    seen_pairs = set()

    # Extract names_df series into native Python lists
    raw_csv_names = names_df[name_col].fillna("").astype(str).tolist()
    raw_csv_emails = names_df[names_email_col].fillna("").astype(str).tolist() if is_case_a else None

    # 2. Broad Candidate Generation for the selected range [to_percentage, from_percentage]
    for n_idx, raw_csv_name in enumerate(raw_csv_names):
        norm_csv_name = normalize_text(raw_csv_name)
        if not norm_csv_name:
            continue

        norm_csv_email = normalize_email(raw_csv_emails[n_idx]) if is_case_a and raw_csv_emails else ""

        has_exact_100_match = False

        # 2a. Check Exact Normalized Name or Username Match (100%)
        if norm_csv_name in exact_excel_text_map:
            if to_percentage <= 100 <= from_percentage:
                for e_idx in exact_excel_text_map[norm_csv_name]:
                    pair_key = (n_idx, e_idx)
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        candidates.append({
                            "score": 100,
                            "names_idx": n_idx,
                            "email_idx": e_idx,
                        })
                        has_exact_100_match = True

        # 2b. Check Exact Email Match (if Case A, 100%)
        if is_case_a and norm_csv_email and norm_csv_email in exact_excel_email_map:
            if to_percentage <= 100 <= from_percentage:
                for e_idx in exact_excel_email_map[norm_csv_email]:
                    pair_key = (n_idx, e_idx)
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        candidates.append({
                            "score": 100,
                            "names_idx": n_idx,
                            "email_idx": e_idx,
                        })
                        has_exact_100_match = True

        # If user only wanted 100% exact matches or we already have exact 100% and to_percentage is high, skip fuzzy
        if to_percentage >= 100:
            continue

        # 2c. Broad Fuzzy Candidate Search using candidate buckets
        search_choices_set = set()
        tokens = norm_csv_name.split()
        for tok in tokens:
            if len(tok) >= 2 and tok in candidate_buckets:
                bucket_items = candidate_buckets[tok]
                # If bucket is reasonably sized, add all; otherwise slice
                search_choices_set.update(bucket_items[:50])

        if len(norm_csv_name) >= 3 and f"p:{norm_csv_name[:3]}" in candidate_buckets:
            search_choices_set.update(candidate_buckets[f"p:{norm_csv_name[:3]}"][:50])

        search_choices = list(search_choices_set)

        if search_choices:
            if HAS_RAPIDFUZZ:
                matches = process.extract(
                    query=norm_csv_name,
                    choices=search_choices,
                    scorer=fuzz.WRatio,
                    score_cutoff=float(to_percentage),
                    limit=10,
                )
                for choice_name, score_val, _ in matches:
                    score = int(round(score_val))
                    if to_percentage <= score <= from_percentage:
                        for e_idx in exact_excel_text_map[choice_name]:
                            pair_key = (n_idx, e_idx)
                            if pair_key not in seen_pairs:
                                seen_pairs.add(pair_key)
                                candidates.append({
                                    "score": score,
                                    "names_idx": n_idx,
                                    "email_idx": e_idx,
                                })
            else:
                for norm_key in search_choices:
                    score = compute_name_similarity_score(norm_csv_name, norm_key)
                    if to_percentage <= score <= from_percentage:
                        for e_idx in exact_excel_text_map[norm_key]:
                            pair_key = (n_idx, e_idx)
                            if pair_key not in seen_pairs:
                                seen_pairs.add(pair_key)
                                candidates.append({
                                    "score": score,
                                    "names_idx": n_idx,
                                    "email_idx": e_idx,
                                })

    # 3. Sort Candidates Descending by Match % (Highest Confidence First)
    candidates.sort(key=lambda c: (c["score"], -c["names_idx"], -c["email_idx"]), reverse=True)

    # 4. Mandatory One-to-One Duplicate Prevention (Row Index Locking)
    matched_results: List[Dict[str, Any]] = []
    used_names_indices = set()
    used_email_indices = set()

    # Convert DataFrames to record dictionaries once for O(1) fast lookup
    names_records = names_df.to_dict(orient="records")
    email_records = email_df.to_dict(orient="records")

    for cand in candidates:
        n_idx = cand["names_idx"]
        e_idx = cand["email_idx"]

        # Skip if either CSV or Excel record was already matched at a higher score
        if n_idx in used_names_indices or e_idx in used_email_indices:
            continue

        used_names_indices.add(n_idx)
        used_email_indices.add(e_idx)

        n_row = names_records[n_idx]
        e_row = email_records[e_idx]

        record: Dict[str, Any] = {
            "name": str(n_row.get(name_col, "")),
            "email": str(e_row.get(email_col, "")),
            "match_percentage": int(cand["score"]),
        }

        # Preserve all original columns from names_df
        for col, val in n_row.items():
            record[col] = val

        # Preserve additional non-duplicate original columns from email_df
        for col, val in e_row.items():
            if col not in record:
                record[col] = val

        matched_results.append(record)

    stats = {
        "total_records_processed": len(names_df),
        "total_matched_records": len(matched_results),
        "total_candidates_found": len(candidates),
        "matching_range": {
            "from": int(from_percentage),
            "to": int(to_percentage),
        },
    }

    return matched_results, stats
