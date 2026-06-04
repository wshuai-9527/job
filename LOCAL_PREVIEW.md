# 本地预览

在这个文件夹打开终端，运行：

```bash
python3 -m http.server 8000
```

然后浏览器打开：

```text
http://localhost:8000
```

不要直接双击 index.html；因为浏览器会限制 fetch 读取 data/*.json。
