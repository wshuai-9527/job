from bs4 import BeautifulSoup
from urllib.parse import urlparse
from config import KEYWORDS_27, CS_KEYWORDS, MAX_LINKS_PER_COMPANY
from utils import normalize_space, keyword_hits, abs_url, stable_id, calc_match_score, infer_status

def parse_company_page(company: dict, html: str, final_url: str, today: str, old_history: dict) -> list[dict]:
    """Parse a public careers page and return normalized monitor records."""
    soup = BeautifulSoup(html or "", "lxml")
    title = normalize_space(soup.title.get_text(" ")) if soup.title else ""
    body_text = normalize_space(soup.get_text(" "))
    hits_27 = keyword_hits(body_text[:200000], KEYWORDS_27)
    hits_cs = keyword_hits(body_text[:200000], CS_KEYWORDS)

    records = []
    seen_urls = set()

    # Prefer links containing recruitment keywords.
    for a in soup.find_all("a", href=True):
        anchor = normalize_space(a.get_text(" "))
        href = abs_url(final_url, a.get("href"))
        combined = f"{anchor} {href}"
        link_hits_27 = keyword_hits(combined, KEYWORDS_27)
        link_hits_cs = keyword_hits(combined, CS_KEYWORDS)
        if not link_hits_27 and not link_hits_cs:
            continue
        if href in seen_urls:
            continue
        seen_urls.add(href)

        job_id = stable_id(company["id"], href, anchor)
        first_seen = old_history.get(job_id, {}).get("first_seen", today)
        records.append({
            "id": job_id,
            "company_id": company["id"],
            "company": company["name"],
            "category": company["category"],
            "title": anchor[:80] or "官网招聘相关入口",
            "recruit_type": "2027届校招/实习监控",
            "city": company.get("target_cities", []),
            "roles": company.get("target_roles", []),
            "status": infer_status(link_hits_27 or hits_27, link_hits_cs or hits_cs),
            "deadline": "",
            "url": href,
            "source_type": company.get("source_type", "official"),
            "matched_keywords": sorted(set(link_hits_27 + link_hits_cs)),
            "match_score": calc_match_score(company.get("priority", 60), link_hits_27, link_hits_cs),
            "first_seen": first_seen,
            "last_seen": today,
            "is_demo": False,
            "note": "从官网公开页面链接中匹配到校招/实习相关关键词。"
        })
        if len(records) >= MAX_LINKS_PER_COMPANY:
            break

    # If no keyword links, still create one monitor record based on page text.
    if not records:
        job_id = stable_id(company["id"], final_url, title)
        first_seen = old_history.get(job_id, {}).get("first_seen", today)
        if hits_27 or hits_cs:
            status = infer_status(hits_27, hits_cs)
            note = "官网公开页面正文匹配到校招/实习相关关键词。"
            keywords = sorted(set(hits_27 + hits_cs))
        else:
            status = "待官网确认"
            note = "未在公开页面正文中匹配到明显27届/校招关键词；保留官方入口供人工核对。"
            keywords = []

        records.append({
            "id": job_id,
            "company_id": company["id"],
            "company": company["name"],
            "category": company["category"],
            "title": title[:80] or "官网招聘入口监控",
            "recruit_type": "2027届校招/实习监控",
            "city": company.get("target_cities", []),
            "roles": company.get("target_roles", []),
            "status": status,
            "deadline": "",
            "url": final_url,
            "source_type": company.get("source_type", "official"),
            "matched_keywords": keywords,
            "match_score": calc_match_score(company.get("priority", 60), hits_27, hits_cs),
            "first_seen": first_seen,
            "last_seen": today,
            "is_demo": False,
            "note": note
        })

    return records
