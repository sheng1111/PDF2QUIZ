#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自動掃描 data/questions 資料夾並產生 banks.json 索引檔
每次新增或修改題庫後執行此腳本
"""

import json
from pathlib import Path

def main():
    # 取得專案根目錄
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    questions_dir = project_root / 'docs' / 'questions'
    output_file = questions_dir / 'banks.json'

    # 掃描所有 .jsonl 檔案
    banks = []
    for jsonl_file in sorted(questions_dir.glob('*.jsonl')):
        banks.append(jsonl_file.name)
        print(f'  找到: {jsonl_file.name}')

    # 寫入 banks.json
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(banks, f, ensure_ascii=False, indent=2)

    print(f'\n已更新 {output_file}')
    print(f'共 {len(banks)} 個題庫')

if __name__ == '__main__':
    main()
