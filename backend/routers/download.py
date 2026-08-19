import io
import re
from typing import List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Response
import pandas as pd

router = APIRouter()

# In-memory session store for current session's latest matched results
_latest_matched_results: List[Dict[str, Any]] = []


def set_latest_matched_results(results: List[Dict[str, Any]]) -> None:
    """Store latest matching results in session store."""
    global _latest_matched_results
    _latest_matched_results = results


def clear_latest_matched_results() -> None:
    """Clear session store results (e.g. for session reset)."""
    global _latest_matched_results
    _latest_matched_results = []


def get_latest_matched_results() -> List[Dict[str, Any]]:
    """Retrieve latest matching results from session store."""
    return _latest_matched_results


@router.get("/download")
async def download_results(format: str = Query("csv", description="Format: csv or xlsx")):
    format_clean = str(format).lower().strip()
    if format_clean not in ["csv", "xlsx"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported download format. Supported formats are 'csv' and 'xlsx'."
        )

    results = get_latest_matched_results()
    if not results or len(results) == 0:
        raise HTTPException(
            status_code=400,
            detail="No matched results available to download. Please perform matching first."
        )

    # Convert results list to DataFrame
    df = pd.DataFrame(results)

    # Format columns for export:
    # 1. Add 1-based index '#'
    export_records = []
    for idx, row in enumerate(results):
        record = {"#": idx + 1}

        # Include standard primary fields with clean display titles
        record["User Name (FB)"] = row.get("name") or row.get("User Name (FB)") or row.get("User Name") or row.get("Name") or ""
        record["Matched Email"] = row.get("email") or row.get("Matched Email") or row.get("Email") or ""
        record["Match %"] = f"{row.get('match_percentage')}%" if "match_percentage" in row else f"{row.get('Match %')}"

        # Preserve all other original columns
        for k, v in row.items():
            if k not in ["name", "email", "match_percentage", "id", "#", "User Name (FB)", "Matched Email", "Match %"]:
                record[k] = v

        export_records.append(record)

    export_df = pd.DataFrame(export_records)

    # Generate CSV (UTF-8 BOM utf-8-sig for Excel Unicode compatibility)
    if format_clean == "csv":
        csv_buffer = export_df.to_csv(index=False, encoding="utf-8-sig")
        return Response(
            content=csv_buffer,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="matched_results.csv"'},
        )

    # Generate XLSX (OpenPyXL)
    elif format_clean == "xlsx":
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            export_df.to_excel(writer, sheet_name="Matched Results", index=False)
        xlsx_bytes = buffer.getvalue()

        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="matched_results.xlsx"'},
        )
