import json
import os
import time
import datetime
from pathlib import Path

import requests

from config import HEADERS, TIMEOUT_SECONDS, REQUEST_SLEEP_SECONDS
from parsers import parse_company_page
from utils import stable_id

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
COMPANIES_PATH = DATA / "companies.json"
JOBS_PATH = DATA / "jobs.json"
HISTORY_PATH = DATA / "history.json"

def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def save_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def fetch_page(url: str) -> tuple[str, str]:
    resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS, allow_redirects=True)
    resp.raise_for_status()
    content_type = resp.headers.get("content-type", "")
    if "text" not in content_type and "html" not in content_type and "xml" not in content_type:
        return "", str(resp.url)
    resp.encoding = resp.apparent_encoding or resp.encoding
    return resp.text, str(resp.url)

def failed_record(company: dict, today: str, reason: str, old_history: dict) -> dict:
    job_id = stable_id(company["id"], company.get("career_url", ""), "fetch_failed")
    first_seen = old_history.get(job_id, {}).get("first_seen", today)
    return {
        "id": job_id,
        "company_id": company["id"],
        "company": company["name"],
        "category": company["category"],
        "title": "官网入口暂时无法自动抓取",
        "recruit_type": "2027届校招/实习监控",
        "city": company.get("target_cities", []),
        "roles": company.get("target_roles", []),
        "status": "抓取失败",
        "deadline": "",
        "url": company.get("career_url") or ("https://" + company.get("domain", "")),
        "source_type": company.get("source_type", "official"),
        "matched_keywords": [],
        "match_score": company.get("priority", 60),
        "first_seen": first_seen,
        "last_seen": today,
        "is_demo": False,
        "note": f"自动抓取失败：{reason[:120]}。可能是JS动态加载、证书、访问限制或临时网络问题，请人工打开官网确认。"
    }

def main():
    companies = load_json(COMPANIES_PATH, [])
    old_payload = load_json(JOBS_PATH, {})
    old_jobs = old_payload.get("jobs", []) if isinstance(old_payload, dict) else []
    old_history = load_json(HISTORY_PATH, {})
    for j in old_jobs:
        old_history.setdefault(j.get("id", ""), {"first_seen": j.get("first_seen")})

    today = datetime.date.today().isoformat()
    now = datetime.datetime.now().isoformat(timespec="seconds")

    max_companies = int(os.getenv("MAX_COMPANIES", "550"))
    companies_to_crawl = companies[:max_companies]

    all_records = []
    failures = 0

    for idx, company in enumerate(companies_to_crawl, start=1):
        url = company.get("career_url") or ("https://" + company.get("domain", ""))
        if not url:
            all_records.append(failed_record(company, today, "missing career_url", old_history))
            continue

        print(f"[{idx}/{len(companies_to_crawl)}] {company['name']} -> {url}")
        try:
            html, final_url = fetch_page(url)
            if not html:
                raise RuntimeError("non-html response")
            records = parse_company_page(company, html, final_url, today, old_history)
            all_records.extend(records)
        except Exception as e:
            failures += 1
            all_records.append(failed_record(company, today, str(e), old_history))

        time.sleep(REQUEST_SLEEP_SECONDS)

    # Include non-crawled companies as static monitor records when MAX_COMPANIES is reduced.
    for company in companies[max_companies:]:
        job_id = stable_id(company["id"], company.get("career_url", ""), "not_crawled")
        first_seen = old_history.get(job_id, {}).get("first_seen", today)
        all_records.append({
            "id": job_id,
            "company_id": company["id"],
            "company": company["name"],
            "category": company["category"],
            "title": "本次未抓取，保留监控入口",
            "recruit_type": "2027届校招/实习监控",
            "city": company.get("target_cities", []),
            "roles": company.get("target_roles", []),
            "status": "待官网确认",
            "deadline": "",
            "url": company.get("career_url") or ("https://" + company.get("domain", "")),
            "source_type": company.get("source_type", "official"),
            "matched_keywords": [],
            "match_score": company.get("priority", 60),
            "first_seen": first_seen,
            "last_seen": today,
            "is_demo": False,
            "note": "本次未进入抓取批次。可在 workflow 中调大 MAX_COMPANIES。"
        })

    payload = {
        "generated_at": now,
        "mode": "public_page_keyword_monitor",
        "company_count": len(companies),
        "crawled_count": len(companies_to_crawl),
        "record_count": len(all_records),
        "failures": failures,
        "jobs": all_records
    }
    save_json(JOBS_PATH, payload)

    new_history = {r["id"]: {"first_seen": r.get("first_seen", today), "last_seen": today, "company": r.get("company"), "title": r.get("title")} for r in all_records}
    save_json(HISTORY_PATH, new_history)

    print(f"Done. records={len(all_records)} failures={failures}")

if __name__ == "__main__":
    main()
