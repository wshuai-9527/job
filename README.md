# 秋招雷达 Offer Radar

一个手机端优先的 2027届校招/实习/秋招监控网站。

## 你要怎么用

1. 在 GitHub 新建一个仓库，比如 `offer-radar`。
2. 把这个压缩包里的所有文件上传到仓库根目录。
3. 打开仓库的 `Settings -> Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，Folder 选择 `/root`，保存。
6. 等 1-3 分钟，GitHub 会给你一个网址，格式通常是：

```text
https://你的用户名.github.io/offer-radar/
```

## 自动更新怎么开

这个项目已经带了 GitHub Actions 文件：

```text
.github/workflows/update-jobs.yml
```

默认每天跑 3 次，自动执行：

```bash
python crawler/crawler.py
```

然后更新：

```text
data/jobs.json
data/history.json
```

如果 Actions 没有自动提交，请检查：

```text
Settings -> Actions -> General -> Workflow permissions
```

选择：

```text
Read and write permissions
```

## 文件结构

```text
offer-radar/
├── index.html
├── style.css
├── app.js
├── data/
│   ├── companies.json
│   ├── jobs.json
│   └── history.json
├── crawler/
│   ├── crawler.py
│   ├── parsers.py
│   ├── utils.py
│   └── config.py
├── requirements.txt
└── .github/
    └── workflows/
        └── update-jobs.yml
```

## 重要说明

- 本项目只抓公开招聘页面。
- 不登录、不绕过验证码、不破解反爬。
- 央国企、电网、烟草、石油石化等岗位，以官网公告为准。
- 很多招聘网站是 JS 动态加载，第一版 crawler 只能做公开页面关键词监控；后续可以对重点公司单独写 API parser。
