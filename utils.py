import hashlib
import re
from urllib.parse import urljoin

def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()

def stable_id(*parts: str) -> str:
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]

def keyword_hits(text: str, keywords: list[str]) -> list[str]:
    lower = (text or "").lower()
    hits = []
    for kw in keywords:
        if kw.lower() in lower:
            hits.append(kw)
    return sorted(set(hits), key=lambda x: len(x), reverse=True)

def abs_url(base_url: str, maybe_url: str) -> str:
    if not maybe_url:
        return base_url
    return urljoin(base_url, maybe_url)

def calc_match_score(company_priority: int, hits_27: list[str], hits_cs: list[str]) -> int:
    score = int(company_priority or 60)
    score += min(18, len(hits_27) * 4)
    score += min(16, len(hits_cs) * 4)
    return max(0, min(99, score))

def infer_status(hits_27: list[str], hits_cs: list[str]) -> str:
    joined = " ".join(hits_27)
    if "2027届" in joined or "27届" in joined or "2027" in joined:
        return "27届校招开放中"
    if "实习" in joined or "intern" in joined.lower():
        return "27届实习转正"
    if "提前批" in joined:
        return "27届提前批预热"
    if "校招" in joined or "校园招聘" in joined or "秋招" in joined or "campus" in joined.lower():
        return "27届秋招预热"
    return "待官网确认"
