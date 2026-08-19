from typing import Optional, List, Dict, Any
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

from utils.file_parser import parse_uploaded_file
from utils.column_detector import detect_email_column, detect_name_column
from utils.matcher import perform_matching

router = APIRouter()


class MatchingRangeModel(BaseModel):
    from_percent: int
    to_percent: int


class MatchResponse(BaseModel):
    success: bool
    total_records_processed: int
    total_matched_records: int
    matching_range: Dict[str, int]
    results: List[Dict[str, Any]]


@router.post("/match", response_model=MatchResponse)
async def match_files(
    email_file: Optional[UploadFile] = File(None),
    names_file: Optional[UploadFile] = File(None),
    from_percentage: float = Form(100.0),
    to_percentage: float = Form(50.0),
):
    # 1. Validate both files are provided
    if not email_file or not email_file.filename:
        raise HTTPException(
            status_code=400,
            detail="Missing email file. Please upload an Email file (.csv, .xlsx, .xls)."
        )

    if not names_file or not names_file.filename:
        raise HTTPException(
            status_code=400,
            detail="Missing names file. Please upload a Names file (.csv, .xlsx, .xls)."
        )

    # 2. Validate range bounds and logic
    if not (0 <= to_percentage <= 100) or not (0 <= from_percentage <= 100):
        raise HTTPException(
            status_code=400,
            detail="Matching range percentages must be between 0% and 100%."
        )

    if from_percentage < to_percentage:
        raise HTTPException(
            status_code=400,
            detail="Invalid matching range: 'From' (maximum %) must be greater than or equal to 'To' (minimum %)."
        )

    # 3. Parse files into DataFrames
    email_filename, email_df, email_cols, email_rows = await parse_uploaded_file(email_file, "email_file")
    names_filename, names_df, names_cols, names_rows = await parse_uploaded_file(names_file, "names_file")

    # 4. Column Detection & Auto-Swap if files were uploaded in reversed order
    detected_email_col = detect_email_column(email_cols)
    detected_name_col = detect_name_column(names_cols)

    # Check if files were uploaded in reversed order
    if not detected_email_col or not detected_name_col:
        swapped_email_col = detect_email_column(names_cols)
        swapped_name_col = detect_name_column(email_cols)
        if swapped_email_col and swapped_name_col:
            # Swap DataFrames and columns
            email_df, names_df = names_df, email_df
            email_cols, names_cols = names_cols, email_cols
            detected_email_col = swapped_email_col
            detected_name_col = swapped_name_col

    if not detected_email_col:
        raise HTTPException(
            status_code=400,
            detail="Email column could not be identified in the Email file. Expected column names like 'E-mail', 'email', 'email address'."
        )

    if not detected_name_col:
        raise HTTPException(
            status_code=400,
            detail="Name column could not be identified in the Names file. Expected column names like 'user_name', 'Name', 'username'."
        )

    # 5. Perform Matching Logic
    try:
        results, stats = perform_matching(
            email_df=email_df,
            names_df=names_df,
            email_col=detected_email_col,
            name_col=detected_name_col,
            from_percentage=from_percentage,
            to_percentage=to_percentage,
        )
        # Store in-memory session results for download endpoint
        from routers.download import set_latest_matched_results
        set_latest_matched_results(results)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during matching computation: {str(e)}"
        )

    return MatchResponse(
        success=True,
        total_records_processed=stats["total_records_processed"],
        total_matched_records=stats["total_matched_records"],
        matching_range=stats["matching_range"],
        results=results,
    )

