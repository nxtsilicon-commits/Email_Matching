import pytest
import pandas as pd
from utils.matcher import perform_matching, compute_name_similarity_score

def build_test_datasets():
    """
    Build a diverse dataset with candidates spanning exact (100%), high (90-99%),
    medium-high (70-89%), medium-low (50-69%), and low (30-49%) similarity scores.
    """
    names = [
        "Randi Nilsen",         # exact 100% with Randi Nilsen, ~92% with R Nilsen, ~45% with Randy Nelson
        "Kjersti Engebretsen", # exact 100%, ~95% with Kjersti Engebretson, ~75% with Kjersti Eng
        "Wenche Nilssen",      # exact 100%, ~92% with Wenche Nilsen
        "Nina Bråten",         # exact 100%, ~95% with Nina Braaten, ~70% with Nina Braten
        "Morten Rygg",         # exact 100%, ~60% with Martin Rygg, ~40% with Morten R
        "Linda Hansen",        # exact 100%, ~92% with L Hansen, ~50% with Linda H
        "Lena Pettersen",      # exact 100%, ~90% with Lena Petersen, ~40% with Lena P
        "Inger Lise Holøs",    # exact 100%, ~95% with Inger Lise Holos, ~70% with Inger Holos
        "Louise Nilsen",       # exact 100%, ~92% with L Nilsen, ~45% with Louise N
        "Erik Solberg",        # no exact match, ~88% with Eric Solberg, ~55% with Erik S
        "Camilla Lind",        # no exact match, ~78% with Kamilla Lind, ~42% with C Lind
        "Torstein Holm",       # no exact match, ~45% with Tor Holm
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
        ("Nina Braten", "nina.braten.other@example.no"),
        ("Inger Holos", "inger.holos.short@example.no"),

        # Medium-low fuzzy (50 - 69%)
        ("Martin Rygg", "martin.rygg@example.no"),
        ("Erik S", "erik.s@example.no"),
        ("Linda H", "linda.h@example.no"),
        ("Dag Hansen", "dag.hansen@example.no"),

        # Low fuzzy (30 - 49%)
        ("Randy Nelson", "randy.nelson@example.no"),
        ("Louise N", "louise.n@example.no"),
        ("Lena P", "lena.p@example.no"),
        ("Tor Holm", "tor.holm@example.no"),
        ("C Lind", "c.lind@example.no"),
        ("Morten R", "morten.r@example.no"),
    ]

    names_df = pd.DataFrame({"user_name": names, "country": ["Norway"] * len(names)})
    email_df = pd.DataFrame({
        "Name": [r[0] for r in excel_records],
        "E-mail": [r[1] for r in excel_records],
    })

    return names_df, email_df


def test_matching_ranges():
    names_df, email_df = build_test_datasets()

    test_ranges = [
        (100, 90),
        (90, 70),
        (70, 50),
        (50, 30),
        (100, 30),
    ]

    print("\n" + "=" * 70)
    print(f"{'Range (From -> To)':<20} | {'Candidates Found':<18} | {'Final Matches':<15}")
    print("=" * 70)

    for from_pct, to_pct in test_ranges:
        matched_results, stats = perform_matching(
            email_df=email_df,
            names_df=names_df,
            email_col="E-mail",
            name_col="user_name",
            from_percentage=from_pct,
            to_percentage=to_pct,
        )

        candidates_found = stats["total_candidates_found"]
        final_matches = stats["total_matched_records"]

        print(f"{f'From {from_pct}% -> To {to_pct}%':<20} | {candidates_found:<18} | {final_matches:<15}")

        # Verify range bounds assertion
        for r in matched_results:
            score = r["match_percentage"]
            assert to_pct <= score <= from_pct, f"Score {score}% is outside range [{to_pct}, {from_pct}]!"

        # Print score distribution
        scores = [r["match_percentage"] for r in matched_results]
        score_dist = {}
        for s in scores:
            score_dist[s] = score_dist.get(s, 0) + 1
        sorted_dist = dict(sorted(score_dist.items(), reverse=True))
        print(f"   └─ Score Distribution: {sorted_dist}")
        print("-" * 70)
