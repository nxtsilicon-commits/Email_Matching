import pytest
import pandas as pd
from utils.matcher import perform_matching

def test_real_file_ranges():
    """
    Test all 5 required ranges on dataset spanning 100%, 90-99%, 70-89%, 50-69%, and 30-49%:
    1. 100 -> 90
    2. 90 -> 70
    3. 70 -> 50
    4. 50 -> 30
    5. 100 -> 30
    """
    KNOWN_NAMES = [
        "Randi Nilsen",
        "Kjersti Engebretsen",
        "Wenche Nilssen",
        "Nina Bråten",
        "Morten Rygg",
        "Linda Hansen",
        "Lena Pettersen",
        "Inger Lise Holøs",
        "Louise Nilsen",
        "Erik Solberg",
        "Camilla Lind",
        "Torstein Holm",
    ]

    excel_records = [
        # Exact 100% target matches
        ("Randi Nilsen", "randi.nilsen@example.no"),
        ("Kjersti Engebretsen", "kjersti.e@example.no"),
        ("Wenche Nilssen", "wenche.nilssen@example.no"),
        ("Nina Bråten", "nina.braten@example.no"),
        ("Morten Rygg", "morten.rygg@example.no"),
        ("Linda Hansen", "linda.hansen@example.no"),
        ("Lena Pettersen", "lena.pettersen@example.no"),
        ("Inger Lise Holøs", "inger.holos@example.no"),
        ("Louise Nilsen", "louise.nilsen@example.no"),
        
        # High confidence fuzzy (90 - 99%)
        ("Kjersti Engebretson", "kjersti.engebretson@example.no"),
        ("Nina Braaten", "nina.braaten@example.no"),
        ("Wenche Nilsen", "wenche.nilsen@example.no"),
        ("Inger Lise Holos", "inger.lise.holos@example.no"),
        ("Lena Petersen", "lena.petersen@example.no"),

        # Medium-high fuzzy (70 - 89%)
        ("Eric Solberg", "eric.solberg@example.no"),
        ("Kamilla Lind", "kamilla.lind@example.no"),
        ("Kjersti Eng", "kjersti.eng@example.no"),

        # Medium-low fuzzy (50 - 69%)
        ("Martin Rygg", "martin.rygg@example.no"),
        ("Erik S", "erik.s@example.no"),
        ("Linda H", "linda.h@example.no"),

        # Low fuzzy (30 - 49%)
        ("Randy Nelson", "randy.nelson@example.no"),
        ("Louise N", "louise.n@example.no"),
        ("Lena P", "lena.p@example.no"),
        ("Tor Holm", "tor.holm@example.no"),
        ("C Lind", "c.lind@example.no"),
    ]

    # Add filler rows to simulate large spreadsheet (5,000 rows)
    filler_rows = [
        (f"User_{i}", f"user_{i}@example.no") for i in range(5000)
    ]
    all_excel = excel_records + filler_rows

    excel_df = pd.DataFrame({
        "Name": [r[0] for r in all_excel],
        "E-mail": [r[1] for r in all_excel],
    })
    csv_df = pd.DataFrame({
        "user_name": KNOWN_NAMES,
        "country": ["Norway"] * len(KNOWN_NAMES),
    })

    test_ranges = [
        (100, 90),
        (90, 70),
        (70, 50),
        (50, 30),
        (100, 30),
    ]

    print("\n" + "=" * 75)
    print(f"{'Range (From -> To)':<20} | {'Candidates Found':<18} | {'Final Matches':<15} | {'Range Condition Passed'}")
    print("=" * 75)

    for from_pct, to_pct in test_ranges:
        matched_results, stats = perform_matching(
            email_df=excel_df,
            names_df=csv_df,
            email_col="E-mail",
            name_col="user_name",
            from_percentage=from_pct,
            to_percentage=to_pct,
        )

        candidates_found = stats["total_candidates_found"]
        final_matches = stats["total_matched_records"]

        scores = [r["match_percentage"] for r in matched_results]
        score_dist = {}
        for s in scores:
            score_dist[s] = score_dist.get(s, 0) + 1
        sorted_dist = dict(sorted(score_dist.items(), reverse=True))

        all_in_range = all(to_pct <= s <= from_pct for s in scores)

        print(f"{f'From {from_pct}% -> To {to_pct}%':<20} | {candidates_found:<18} | {final_matches:<15} | {all_in_range}")
        print(f"   └─ Score Distribution: {sorted_dist}")
        print("-" * 75)
