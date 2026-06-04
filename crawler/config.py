"""Crawler configuration for Offer Radar.

This crawler only checks public pages. It does not log in, bypass CAPTCHA,
or scrape private user data.
"""

KEYWORDS_27 = [
    "2027", "2027届", "27届", "2027校园招聘", "2027校招",
    "校园招聘", "校招", "秋招", "提前批", "实习", "实习生",
    "应届生", "毕业生", "Graduate Program", "campus", "intern"
]

CS_KEYWORDS = [
    "软件", "算法", "机器学习", "人工智能", "AI", "数据", "开发",
    "后端", "前端", "云计算", "安全", "信息技术", "计算机",
    "Data", "Software", "Engineer", "Developer", "Machine Learning"
]

HEADERS = {
    "User-Agent": "OfferRadarBot/1.0 (+public campus recruitment monitor; respectful; contact: your-email@example.com)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

TIMEOUT_SECONDS = 12
REQUEST_SLEEP_SECONDS = 0.35
MAX_LINKS_PER_COMPANY = 5
