from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

from utils.file_parser import parse_uploaded_file
from utils.column_detector import detect_email_column, detect_name_column

router = APIRouter()


class FileSummary(BaseModel):
    filename: str
    columns: list[str]
    row_count: int
    detected_column: str


class UploadResponse(BaseModel):
    success: bool
    email_file: FileSummary
    names_file: FileSummary


@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    email_file: Optional[UploadFile] = File(None),
    names_file: Optional[UploadFile] = File(None),
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

    # 2. Parse Email File
    email_filename, email_df, email_cols, email_rows = await parse_uploaded_file(email_file, "email_file")

    # 3. Parse Names File
    names_filename, names_df, names_cols, names_rows = await parse_uploaded_file(names_file, "names_file")

    # 4. Column Detection & Auto-Swap if files were uploaded in reversed order
    detected_email_col = detect_email_column(email_cols)
    detected_name_col = detect_name_column(names_cols)

    if not detected_email_col or not detected_name_col:
        swapped_email_col = detect_email_column(names_cols)
        swapped_name_col = detect_name_column(email_cols)
        if swapped_email_col and swapped_name_col:
            # Swap metadata for response
            email_filename, names_filename = names_filename, email_filename
            email_cols, names_cols = names_cols, email_cols
            email_rows, names_rows = names_rows, email_rows
            detected_email_col = swapped_email_col
            detected_name_col = swapped_name_col

    if not detected_email_col:
        raise HTTPException(
            status_code=400,
            detail="Email column could not be identified in the Email file. Supported names: 'E-mail', 'email', 'email address'."
        )

    if not detected_name_col:
        raise HTTPException(
            status_code=400,
            detail="Name column could not be identified in the Names file. Supported names: 'user_name', 'Name', 'username'."
        )

    # 6. Return response summary
    return UploadResponse(
        success=True,
        email_file=FileSummary(
            filename=email_filename,
            columns=email_cols,
            row_count=email_rows,
            detected_column=detected_email_col,
        ),
        names_file=FileSummary(
            filename=names_filename,
            columns=names_cols,
            row_count=names_rows,
            detected_column=detected_name_col,
        ),
    )

