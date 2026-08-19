import pytest
import pandas as pd
from utils.matcher import perform_matching, calculate_match_score, normalize_text, normalize_email


def test_1_exact_match():
    names_df = pd.DataFrame([{"Name": "John Smith"}])
    email_df = pd.DataFrame([{"Email": "john.smith@gmail.com"}])
    
    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 50)
    assert len(results) == 1
    assert results[0]["name"] == "John Smith"
    assert results[0]["email"] == "john.smith@gmail.com"
    assert results[0]["match_percentage"] == 100


def test_2_case_differences():
    names_df = pd.DataFrame([{"Name": "JOHN SMITH"}])
    email_df = pd.DataFrame([{"Email": "john smith@example.com"}])
    
    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 50)
    assert len(results) == 1
    assert results[0]["match_percentage"] == 100


def test_3_exact_email_normalization():
    norm1 = normalize_email("JOHN.SMITH@GMAIL.COM")
    norm2 = normalize_email("john.smith@gmail.com")
    assert norm1 == norm2 == "john.smith@gmail.com"


def test_4_fuzzy_name():
    names_df = pd.DataFrame([{"Name": "Jon Smith"}])
    email_df = pd.DataFrame([{"Email": "john.smith@gmail.com"}])
    
    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 50)
    assert len(results) == 1
    assert 50 <= results[0]["match_percentage"] < 100


def test_5_matching_range():
    # Record A: exact match (100%), Record B: fuzzy match (~92%), Record C: low similarity (~40%)
    names_df = pd.DataFrame([
        {"Name": "Randi Nilsen"},  # ~92% with r.nilsen
        {"Name": "XYZ Unmatched"}   # low score
    ])
    email_df = pd.DataFrame([
        {"Email": "r.nilsen@example.com"},
        {"Email": "completely_unrelated@example.com"}
    ])

    # Test range 100 to 90: should include Randi Nilsen (~92%) but exclude XYZ Unmatched
    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 90)
    assert len(results) == 1
    assert results[0]["name"] == "Randi Nilsen"
    assert results[0]["match_percentage"] >= 90


def test_6_duplicate_prevention():
    # Source name "John Smith" has multiple candidates in Email file:
    # 1. john.smith@example.com -> 100%
    # 2. jon.smith@example.com -> ~95%
    # 3. john.smyth@example.com -> ~90%
    names_df = pd.DataFrame([{"Name": "John Smith"}])
    email_df = pd.DataFrame([
        {"Email": "john.smith@example.com"},
        {"Email": "jon.smith@example.com"},
        {"Email": "john.smyth@example.com"},
    ])

    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 50)
    # MUST only result in 1 match (John Smith -> john.smith@example.com at 100%)
    assert len(results) == 1
    assert results[0]["email"] == "john.smith@example.com"
    assert results[0]["match_percentage"] == 100


def test_7_highest_confidence_first():
    names_df = pd.DataFrame([
        {"Name": "Alice Johnson"},  # 100% with alice.johnson
        {"Name": "Bob Smith"},      # ~92% with b.smith
    ])
    email_df = pd.DataFrame([
        {"Email": "b.smith@example.com"},
        {"Email": "alice.johnson@example.com"},
    ])

    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 50)
    assert len(results) == 2
    # Verify ordering is strictly descending by match_percentage
    assert results[0]["match_percentage"] >= results[1]["match_percentage"]
    assert results[0]["name"] == "Alice Johnson"
    assert results[0]["match_percentage"] == 100


def test_8_no_matches():
    names_df = pd.DataFrame([{"Name": "Alpha"}])
    email_df = pd.DataFrame([{"Email": "zebra@example.com"}])

    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 90)
    assert len(results) == 0
    assert stats["total_matched_records"] == 0


def test_9_preserve_columns():
    names_df = pd.DataFrame([{"Name": "John Smith", "Country": "Norway", "Age": "34"}])
    email_df = pd.DataFrame([{"Email": "john.smith@gmail.com", "Department": "Engineering"}])

    results, stats = perform_matching(email_df, names_df, "Email", "Name", 100, 50)
    assert len(results) == 1
    rec = results[0]
    assert rec["Name"] == "John Smith"
    assert rec["Country"] == "Norway"
    assert rec["Age"] == "34"
    assert rec["Department"] == "Engineering"
