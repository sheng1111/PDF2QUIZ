# PDF2QUIZ

PDF2QUIZ 是一套將 PDF 題庫轉換為互動式網頁測驗應用的系統。

## 功能特色

- 解析 PDF 格式的題庫檔案，轉換為 JSONL 格式
- 純靜態網頁前端，無需後端伺服器
- 支援單選與多選題型
- 隨機打亂題目與選項順序
- 即時答題回饋與詳解顯示
- 測驗結果統計與錯題回顧
- 支援上傳自訂題庫檔案

## 線上使用

直接訪問 GitHub Pages：[https://你的帳號.github.io/PDF2QUIZ/src/](https://你的帳號.github.io/PDF2QUIZ/src/)

## 專案結構

```
PDF2QUIZ/
├── src/                    # 靜態網頁前端
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/
│   ├── pdf/               # PDF 原始題庫（不納入版控）
│   └── questions/         # 轉換後的 JSONL 題庫
│       └── banks.json     # 題庫索引檔
├── scripts/               # Python 處理工具
│   ├── parse_pdf.py       # PDF 解析腳本
│   ├── fix_explanations.py # AI 解釋修正腳本
│   └── update_banks.py    # 題庫索引更新腳本
└── CLAUDE.md              # Claude AI 開發指引
```

## 本地開發

### 環境需求

- Python 3.8+
- PyMuPDF（用於 PDF 解析）

### 安裝依賴

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install PyMuPDF
```

### 啟動本地伺服器


```bash
python3 -m http.server 8000
```

在瀏覽器開啟 http://localhost:8000/src/

## 使用方法

### 解析 PDF 題庫

```bash
python3 scripts/parse_pdf.py data/pdf/YOUR_FILE.pdf -o data/questions/output.jsonl -v
```

### 新增 AI 中文解釋（選用）

```bash
python3 scripts/fix_explanations.py data/questions/YOUR_FILE.jsonl
```

### 更新題庫索引

每次新增或修改 JSONL 題庫檔案後，需要執行此指令：

```bash
python3 scripts/update_banks.py
```

## 題目格式（JSONL）

每行一筆 JSON 資料，格式如下：

```json
{
  "id": "Q001",
  "topic": "主題分類",
  "question": "題目內容",
  "options": {"A": "選項A", "B": "選項B", "C": "選項C", "D": "選項D"},
  "answer": ["A"],
  "explanation": "詳細解釋"
}
```

## 部署至 GitHub Pages

1. 將專案推送至 GitHub 儲存庫

2. 前往 Repository Settings > Pages

3. Source 選擇 `Deploy from a branch`

4. Branch 選擇 `main`（或 `master`），目錄選擇 `/ (root)`

5. 儲存後等待部署完成

6. 訪問網址：`https://你的帳號.github.io/儲存庫名稱/src/`

## 授權

本專案僅供學習與個人使用。題庫內容版權歸原作者所有。

