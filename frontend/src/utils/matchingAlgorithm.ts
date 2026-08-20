import { MatchRecord, MatchingRange } from '../types';

// Normalize names and email parts
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

// Extract username part from email address
export function extractEmailUser(email: string): string {
  if (!email) return '';
  const parts = email.split('@');
  return parts[0] || '';
}

// Levenshtein distance computation
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity ratio (0 to 1)
function similarityRatio(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  
  const dist = levenshteinDistance(longer, shorter);
  return (longer.length - dist) / longer.length;
}

// Token-based matching between a full name and email username
export function calculateNameEmailMatchScore(fullName: string, email: string): number {
  if (!fullName || !email) return 0;

  const emailUserRaw = extractEmailUser(email);
  const emailUserClean = normalizeString(emailUserRaw);
  
  // Clean tokens from name
  const rawTokens = fullName.toLowerCase().split(/[\s,._-]+/).filter(Boolean);
  const cleanTokens = rawTokens.map(normalizeString).filter(Boolean);

  if (cleanTokens.length === 0 || !emailUserClean) return 0;

  const combinedName = cleanTokens.join('');
  const firstName = cleanTokens[0];
  const lastName = cleanTokens[cleanTokens.length - 1];

  // 1. Direct exact concatenated match (e.g. "randinilsen" == "randinilsen")
  if (emailUserClean === combinedName) {
    return 100;
  }

  // 2. Email user without trailing numbers equals combined name (e.g. "lindahansen88" -> "lindahansen")
  const emailUserNoDigits = emailUserClean.replace(/[0-9]/g, '');
  if (emailUserNoDigits === combinedName) {
    return 98;
  }

  // 3. Check for specific common substitutions (e.g. å -> aa, ø -> oe)
  const expandedNameWithDoubles = fullName
    .toLowerCase()
    .replace(/å/g, 'aa')
    .replace(/ø/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]/g, '');
  
  if (emailUserNoDigits === expandedNameWithDoubles || emailUserClean === expandedNameWithDoubles) {
    return 98;
  }

  // 4. Token containment: all tokens in name appear in email
  const allTokensFound = cleanTokens.every(token => emailUserClean.includes(token));
  if (allTokensFound) {
    const ratio = combinedName.length / emailUserClean.length;
    return Math.round(Math.min(99, Math.max(90, ratio * 100)));
  }

  // 5. First name + Last name present in email
  if (cleanTokens.length >= 2 && emailUserClean.includes(firstName) && emailUserClean.includes(lastName)) {
    return 95;
  }

  // 6. First initial + Last name (e.g. "rnilsen" or "r.nilsen")
  const initialLastName = firstName.charAt(0) + lastName;
  if (emailUserNoDigits === initialLastName || emailUserClean.startsWith(initialLastName)) {
    return 92;
  }

  // 7. Full string similarity
  const directSim = similarityRatio(combinedName, emailUserNoDigits);
  const rawSim = similarityRatio(combinedName, emailUserClean);
  const bestSim = Math.max(directSim, rawSim);

  // 8. Token substring similarity
  let tokenSimSum = 0;
  for (const token of cleanTokens) {
    if (emailUserClean.includes(token)) {
      tokenSimSum += 1;
    } else {
      let bestSub = 0;
      for (let i = 0; i <= emailUserClean.length - token.length; i++) {
        const sub = emailUserClean.substring(i, i + token.length);
        bestSub = Math.max(bestSub, similarityRatio(token, sub));
      }
      tokenSimSum += bestSub;
    }
  }
  const tokenAvgSim = tokenSimSum / cleanTokens.length;

  const finalScore = Math.max(bestSim, tokenAvgSim);
  const percent = Math.round(finalScore * 100);

  return Math.min(100, Math.max(0, percent));
}

// Match all names against emails within percentage bounds using high-speed bucket indexing
export function performMatching(
  namesRecords: Record<string, any>[],
  emailRecords: Record<string, any>[],
  range: MatchingRange,
  nameColumn?: string,
  emailColumn?: string
): MatchRecord[] {
  const results: MatchRecord[] = [];

  const findCol = (row: Record<string, any>, candidates: string[]): string => {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const found = keys.find(k => k.toLowerCase().includes(cand.toLowerCase()));
      if (found) return found;
    }
    return keys[0] || '';
  };

  const sampleNameRow = namesRecords[0] || {};
  const sampleEmailRow = emailRecords[0] || {};

  const resolvedNameCol = nameColumn || findCol(sampleNameRow, ['user name (fb)', 'user name', 'name', 'fb_name', 'fullname']);
  const resolvedCountryCol = findCol(sampleNameRow, ['country', 'nation', 'location', 'region']);
  const resolvedEmailCol = emailColumn || findCol(sampleEmailRow, ['email address', 'email', 'mail', 'e-mail']);
  const resolvedExcelNameCol = findCol(sampleEmailRow, ['name', 'user name', 'username', 'fullname']);

  // 1. Build Inverted Index & Fast Candidate Buckets (by First-Character & Tokens)
  const exactMap = new Map<string, { email: string; row: Record<string, any> }[]>();
  const bucketMap = new Map<string, string[]>();

  for (const emailRow of emailRecords) {
    const rawEmail = String(emailRow[resolvedEmailCol] || '').trim();
    if (!rawEmail) continue;

    const excelName = resolvedExcelNameCol && emailRow[resolvedExcelNameCol] ? String(emailRow[resolvedExcelNameCol]) : '';
    const normEmailUser = normalizeString(extractEmailUser(rawEmail));
    const normExcelName = normalizeString(excelName);

    const recordObj = { email: rawEmail, row: emailRow };
    const keysToIndex = [normExcelName, normEmailUser].filter(Boolean);

    for (const key of keysToIndex) {
      if (!exactMap.has(key)) exactMap.set(key, []);
      exactMap.get(key)!.push(recordObj);

      // Index key into first-character bucket
      const firstChar = key.charAt(0);
      if (firstChar) {
        if (!bucketMap.has(firstChar)) bucketMap.set(firstChar, []);
        if (!bucketMap.get(firstChar)!.includes(key)) {
          bucketMap.get(firstChar)!.push(key);
        }
      }

      // Index key into token buckets
      const tokens = key.split(/[\s._-]+/).filter(t => t.length >= 2);
      for (const tok of tokens) {
        const bucketKey = `t:${tok}`;
        if (!bucketMap.has(bucketKey)) bucketMap.set(bucketKey, []);
        if (!bucketMap.get(bucketKey)!.includes(key)) {
          bucketMap.get(bucketKey)!.push(key);
        }
      }
    }
  }

  const candidates: { score: number; rawName: string; country: string; email: string }[] = [];
  const seenPairs = new Set<string>();

  // 2. Broad Candidate Search for Range [range.minPercent, range.maxPercent]
  for (const nameRow of namesRecords) {
    const rawName = String(nameRow[resolvedNameCol] || '').trim();
    if (!rawName) continue;

    const normCsvName = normalizeString(rawName);
    const country = resolvedCountryCol && nameRow[resolvedCountryCol] ? String(nameRow[resolvedCountryCol]) : 'Norway';

    // 2a. Check Exact Normalized Match (100%)
    if (exactMap.has(normCsvName)) {
      if (range.minPercent <= 100 && 100 <= range.maxPercent) {
        const candList = exactMap.get(normCsvName)!;
        for (const cand of candList) {
          const pairKey = `${rawName}:::${cand.email}`;
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            candidates.push({
              score: 100,
              rawName,
              country,
              email: cand.email,
            });
          }
        }
      }
    }

    // 2b. Gather Candidate Keys using Buckets instead of full 50k table loop!
    const searchKeys = new Set<string>();
    const firstChar = normCsvName.charAt(0);
    if (firstChar && bucketMap.has(firstChar)) {
      bucketMap.get(firstChar)!.forEach(k => searchKeys.add(k));
    }
    const nameTokens = normCsvName.split(/[\s._-]+/).filter(t => t.length >= 2);
    for (const tok of nameTokens) {
      if (bucketMap.has(`t:${tok}`)) {
        bucketMap.get(`t:${tok}`)!.forEach(k => searchKeys.add(k));
      }
    }

    // Evaluate scores ONLY for candidates in searchKeys
    for (const key of searchKeys) {
      const score = calculateNameEmailMatchScore(rawName, key + '@domain.com');
      if (score >= range.minPercent && score <= range.maxPercent) {
        const candList = exactMap.get(key) || [];
        for (const cand of candList) {
          const pairKey = `${rawName}:::${cand.email}`;
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            candidates.push({
              score,
              rawName,
              country,
              email: cand.email,
            });
          }
        }
      }
    }
  }

  // 3. Sort candidates descending by match percentage
  candidates.sort((a, b) => b.score - a.score);

  // 4. One-to-one duplicate locking
  const usedEmails = new Set<string>();
  const usedNames = new Set<string>();
  let idCounter = 1;

  for (const cand of candidates) {
    if (usedNames.has(cand.rawName) || usedEmails.has(cand.email)) continue;
    usedNames.add(cand.rawName);
    usedEmails.add(cand.email);

    results.push({
      id: idCounter++,
      userName: cand.rawName,
      country: cand.country,
      matchedEmail: cand.email,
      matchPercentage: cand.score,
      originalName: cand.rawName,
    });
  }

  return results.sort((a, b) => b.matchPercentage - a.matchPercentage || a.userName.localeCompare(b.userName));
}
