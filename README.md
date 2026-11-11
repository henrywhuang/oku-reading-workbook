# Оқу · 阅读技能训练册

哈萨克语四年级阅读册的静态 H5 阅读器。包含 96 个内页与封面、封底，40 篇阅读材料及分类题目索引。

- HTML 文字、Noto Sans 字体、独立插图和答题线重建版面。
- 易读版、原始扫描对照、题目高亮和可分享的页面深链接。
- 篇目与主题导航、题目类型筛选、全文搜索、键盘翻页。
- 本地保存阅读位置，无登录、分析追踪或外部 API。
- JSON、Markdown、TXT 数据导出。

直接运行：

```sh
python3 -m http.server 8000
```

访问 `http://localhost:8000/`。不需要 Node.js 构建或服务端。

## 数据来源与准确性

来源为《阅读技能训练册2023（4）_Өлке.pdf》，由本机 PP-OCRv5_mobile_det、cyrillic_PP-OCRv5_mobile_rec 和 PP-DocLayout_plus-L 处理。
原 PDF 为扫描件，没有可提取的字体。使用 Noto Sans 作近似重建，字体版权和 SIL Open Font License 保存在 `assets/fonts/OFL.txt`。
扫描图片、书籍内容及插图保留各自原有权利。题目与主题分类用于导航，并非教材的标准答案或官方分类。
OCR 可能误认特殊字母。两处漏识别题目首行经原稿核对后补录，在数据中明确标注为 `transcribed_and_verified_against_scan`。

## 页面链接

- `#p=p18`：第 18 书页。
- `#p=p19&q=a18-q1`：《Боран》的第 1 题。
- `data/ocr.json`：原始 OCR 的整理数据，保留坐标和置信度。
- `data/book.json`：H5 页面、篇目、分类和题目锚点数据。

GitHub Pages 直接从 `main` 分支根目录发布，`.nojekyll` 禁用 Jekyll。
