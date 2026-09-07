import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from utils.matcher import perform_matching

client = TestClient(app)


def test_perform_matching_with_explicit_columns():
    """Verify that perform_matching works with custom column names."""
    email_df = pd.DataFrame({
        "contact_mail": [
            "randi.nilsen@norwaymail.no",
            "kari.nordmann@sample.com",
            "ola.hansen@sample.com",
        ],
        "full_contact_name": [
            "Randi Nilsen",
            "Kari Nordmann",
            "Ola Hansen",
        ],
    })

    names_df = pd.DataFrame({
        "target_person": [
            "Randi Nilsen",
            "Kari Nordmann",
            "Unknown Person",
        ],
        "country": ["Norway", "Norway", "Sweden"],
    })

    results, stats = perform_matching(
        email_df=email_df,
        names_df=names_df,
        email_col="contact_mail",
        name_col="target_person",
        from_percentage=100.0,
        to_percentage=50.0,
        excel_name_col="full_contact_name",
    )

    assert stats["total_matched_records"] == 2
    matched_names = [r["name"] for r in results]
    assert "Randi Nilsen" in matched_names
    assert "Kari Nordmann" in matched_names


def test_api_match_with_form_columns():
    """Verify that /api/match accepts custom column mappings."""
    email_csv = (
        "my_custom_email,extra_info\n"
        "randi.nilsen@norwaymail.no,info1\n"
        "ola.nordmann@norwaymail.no,info2\n"
    )
    names_csv = (
        "my_custom_name,location\n"
        "Randi Nilsen,Oslo\n"
        "Ola Nordmann,Bergen\n"
    )

    files = {
        "email_file": ("emails.csv", email_csv.encode("utf-8"), "text/csv"),
        "names_file": ("names.csv", names_csv.encode("utf-8"), "text/csv"),
    }
    data = {
        "from_percentage": "100",
        "to_percentage": "50",
        "email_col": "my_custom_email",
        "name_col": "my_custom_name",
    }

    response = client.post("/api/match", files=files, data=data)
    assert response.status_code == 200, response.text
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["total_matched_records"] == 2
    assert res_data["results"][0]["email"] == "randi.nilsen@norwaymail.no"
