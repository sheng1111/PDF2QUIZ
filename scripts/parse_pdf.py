#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用 PDF 題庫解析腳本
支援多種題庫格式，自動偵測並解析題目
"""

import fitz  # PyMuPDF
import re
import json
import argparse
from pathlib import Path


def extract_text(pdf_path):
    """從 PDF 提取所有文字"""
    doc = fitz.open(pdf_path)
    full_text = ''
    for page in doc:
        full_text += page.get_text() + '\n'
    doc.close()
    return full_text


def clean_text(text):
    """清理文字內容"""
    # 移除頁首
    text = re.sub(r'ECCouncil\s*-\s*312-50v13\s*', '', text)
    # 移除頁碼
    text = re.sub(r'\d+\s+of\s+\d+\s*', '', text)
    # 移除獨立的選項標記行
    text = re.sub(r'\n[A-E]\.\s*\n', '\n', text)
    text = re.sub(r'^[A-E]\.\s*\n', '', text, flags=re.MULTILINE)
    return text


def parse_examsvce(full_text):
    """解析 ExamsVCE 格式題庫"""
    questions = []

    # 清理文字
    full_text = clean_text(full_text)

    # 分割題目
    pattern = r'Question #:(\d+)\s*-\s*\(Exam Topic (\d+)\)'
    parts = re.split(pattern, full_text)

    # parts: [前文, 題號, topic, 內容, 題號, topic, 內容, ...]
    i = 1
    while i + 2 < len(parts):
        q_num = int(parts[i])
        topic = int(parts[i + 1])
        content = parts[i + 2]
        i += 3

        q = parse_question_block(q_num, topic, content)
        if q:
            questions.append(q)

    return questions


def parse_question_block(q_num, topic, content):
    """解析單一題目區塊"""
    # 找答案 (支援 A-G)
    ans_match = re.search(r'Answer:\s*([A-G](?:,?\s*[A-G])*)', content, re.IGNORECASE)
    if not ans_match:
        return None

    ans_str = ans_match.group(1).upper().replace(' ', '').replace(',', '')
    answers = list(ans_str)

    before = content[:ans_match.start()].strip()
    after = content[ans_match.end():].strip()

    # 解析題目與選項
    question_text, options = extract_question_options(before)

    if not options or len(options) < 2:
        return None

    # 驗證答案存在於選項中
    valid = [a for a in answers if a in options]
    if not valid:
        return None

    # 解釋
    explanation = parse_explanation(after)

    return {
        'id': q_num,
        'topic': topic,
        'question': question_text.strip(),
        'options': options,
        'answer': valid,
        'explanation': explanation
    }


def extract_question_options(text):
    """提取題目文字和選項"""
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # 找問題結束點 (問號或冒號)
    q_end = find_question_end(lines)

    # 題目部分
    q_lines = lines[:q_end]
    question = ' '.join(q_lines)
    question = re.sub(r'\s+', ' ', question).strip()

    # 選項部分
    opt_lines = lines[q_end:]
    options = build_options(opt_lines)

    return question, options


def find_question_end(lines):
    """找題目結束位置"""
    # 往回找最後一個問號或冒號
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i].rstrip()
        if line.endswith('?') or line.endswith(':'):
            return i + 1

    # 預設最後 4-7 行是選項
    opt_count = min(7, len(lines) - 1)
    return max(1, len(lines) - opt_count)


def build_options(lines):
    """從行列表建立選項字典"""
    options = {}
    letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

    # 過濾空行 (允許單字元選項如數字)
    valid_lines = [l for l in lines if l.strip()]

    for i, line in enumerate(valid_lines):
        if i >= len(letters):
            break
        # 移除可能的選項前綴
        clean = re.sub(r'^[A-G][\.\)]\s*', '', line).strip()
        if clean:
            options[letters[i]] = clean

    return options


def parse_explanation(text):
    """解析解釋內容"""
    if not text:
        return None

    # 移除 Explanation 前綴
    text = re.sub(r'^[Ee]?xplanation:?\s*', '', text)
    text = re.sub(r'\s+', ' ', text).strip()

    if len(text) < 20:
        return None

    if len(text) > 3000:
        text = text[:3000] + '...'

    return text


def save_jsonl(questions, output_path):
    """儲存為 JSONL 格式"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for q in questions:
            f.write(json.dumps(q, ensure_ascii=False) + '\n')
    print(f'已儲存 {len(questions)} 題至 {output_path}')


def show_stats(questions):
    """顯示統計資訊"""
    topics = {}
    with_exp = 0
    opt_counts = {}

    for q in questions:
        t = q.get('topic', 0)
        topics[t] = topics.get(t, 0) + 1

        if q.get('explanation'):
            with_exp += 1

        oc = len(q['options'])
        opt_counts[oc] = opt_counts.get(oc, 0) + 1

    print('\n統計資訊:')
    print(f'  總題數: {len(questions)}')
    for t in sorted(topics.keys()):
        print(f'  Topic {t}: {topics[t]} 題')
    print(f'  有解釋: {with_exp} 題')
    print(f'  選項數分布: {opt_counts}')


def main():
    parser = argparse.ArgumentParser(description='PDF 題庫解析工具')
    parser.add_argument('pdf_path', help='PDF 檔案路徑')
    parser.add_argument('-o', '--output', help='輸出 JSONL 路徑')
    parser.add_argument('-v', '--verbose', action='store_true', help='詳細模式')
    args = parser.parse_args()

    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f'錯誤: 找不到 {pdf_path}')
        return 1

    output_path = Path(args.output) if args.output else pdf_path.with_suffix('.jsonl')

    print(f'讀取: {pdf_path}')
    text = extract_text(pdf_path)
    print(f'文字長度: {len(text)} 字元')

    questions = parse_examsvce(text)
    print(f'解析結果: {len(questions)} 題')

    if args.verbose:
        show_stats(questions)

    if questions:
        save_jsonl(questions, output_path)

    return 0


if __name__ == '__main__':
    exit(main())
