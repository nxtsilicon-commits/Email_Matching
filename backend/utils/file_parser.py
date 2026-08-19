import io
import os
from typing import Dict, List, Any, Tuple
from fastapi import UploadFile, HTTPException
import pandas as pd

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


def get_file_extension(filename: str) -> str:
    _, ext = os.path.splitext(filename or "")
    return ext.lower()


async def parse_uploaded_file(file: UploadFile, param_name: str) -> Tuple[str, pd.DataFrame, List[str], int]:
    """
    Parse an UploadFile into a pandas DataFrame and extract column headers and row count.
    
    Raises HTTPException 400 for:
    - Missing/empty file
    - Unsupported file extensions
    - Corrupted or unparseable files
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail=f"Missing file for parameter '{param_name}'."
        )

    filename = file.filename
    ext = get_file_extension(filename)

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}' for file '{filename}'. Supported formats are: .csv, .xlsx, .xls"
        )

    # Read bytes from file
    content = await file.read()

    if not content or len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file '{filename}' is empty."
        )

    buffer = io.BytesIO(content)

    try:
        if ext == ".csv":
            df = pd.read_csv(buffer, dtype=str)
        elif ext in [".xlsx", ".xls"]:
            engine = "openpyxl" if ext == ".xlsx" else "xlrd"
            df = pd.read_excel(buffer, engine=engine, dtype=str)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse file '{filename}'. Please ensure it is a valid {ext.upper()} spreadsheet. Error details: {str(e)}"
        )

    # Strip whitespace from column names if string
    df.columns = [str(col).strip() for col in df.columns]
    
    # Fill NaN values with empty string
    df = df.fillna("")

    columns = list(df.columns)
    row_count = len(df)

    if row_count == 0:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file '{filename}' contains no data rows."
        )

    return filename, df, columns, row_count
