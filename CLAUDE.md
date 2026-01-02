# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDF2QUIZ is a quiz practice system that converts PDF exam question banks into an interactive web-based quiz application. The project consists of:
- Python scripts for PDF parsing and question processing
- A static web frontend for quiz practice

## Commands

### Run the Web Application
```bash
# Serve from project root (requires a local HTTP server)
python3 -m http.server 8000
# Then open http://localhost:8000/src/
```

### Parse PDF to JSONL
```bash
python3 scripts/parse_pdf.py data/pdf/YOUR_FILE.pdf -o data/questions/output.jsonl -v
```

### Add Chinese Explanations to Questions
```bash
python3 scripts/fix_explanations.py data/questions/YOUR_FILE.jsonl
```

### Update Question Bank Index (Required after adding/renaming JSONL files)
```bash
python3 scripts/update_banks.py
```

## Architecture

### Data Flow
1. PDF files in `data/pdf/` are parsed by `scripts/parse_pdf.py` using PyMuPDF
2. Output is JSONL format in `data/questions/` with structure: `{id, topic, question, options, answer, explanation}`
3. Run `scripts/update_banks.py` to generate `data/questions/banks.json` index file
4. Web app loads `banks.json` then fetches each JSONL file listed in it

### Directory Structure
- `scripts/` - Python processing scripts
- `src/` - Static web frontend (HTML/CSS/JS, no build step)
- `data/pdf/` - Source PDF question banks
- `data/questions/` - Parsed JSONL question files

### Key Patterns
- Question format uses JSONL (one JSON object per line)
- Options are stored as `{"A": "text", "B": "text", ...}`
- Answers are arrays of correct option letters (supports multi-select)
- Web app uses vanilla JS with state management in a global `state` object
- UI is Traditional Chinese (zh-TW)

## Dependencies
- Python: PyMuPDF (`fitz`) for PDF text extraction
- Frontend: No dependencies, vanilla HTML/CSS/JS
