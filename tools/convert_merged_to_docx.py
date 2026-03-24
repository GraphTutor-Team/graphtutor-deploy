#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
合并文档转Word工具
将合并的Markdown文档转换为Word格式，用于大作业提交
"""

import os
import sys
import re
from pathlib import Path

try:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
except ImportError:
    print("正在安装 python-docx...")
    os.system("pip install python-docx")
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement


def parse_markdown_to_docx(md_file_path, docx_file_path):
    """将Markdown文件转换为Word文档"""
    print(f"[处理] 正在转换: {md_file_path} -> {docx_file_path}")
    
    # 读取Markdown文件
    with open(md_file_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # 创建Word文档
    doc = Document()
    
    # 设置中文字体
    doc.styles['Normal'].font.name = '宋体'
    doc.styles['Normal']._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')
    doc.styles['Normal'].font.size = Pt(12)
    doc.styles['Normal'].paragraph_format.line_spacing = 1.5
    
    # 设置标题样式
    heading1_style = doc.styles['Heading 1']
    heading1_style.font.name = '黑体'
    heading1_style._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
    heading1_style.font.size = Pt(18)
    heading1_style.font.bold = True
    
    heading2_style = doc.styles['Heading 2']
    heading2_style.font.name = '黑体'
    heading2_style._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
    heading2_style.font.size = Pt(16)
    heading2_style.font.bold = True
    
    heading3_style = doc.styles['Heading 3']
    heading3_style.font.name = '黑体'
    heading3_style._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
    heading3_style.font.size = Pt(14)
    heading3_style.font.bold = True
    
    heading4_style = doc.styles['Heading 4']
    heading4_style.font.name = '黑体'
    heading4_style._element.rPr.rFonts.set(qn('w:eastAsia'), '黑体')
    heading4_style.font.size = Pt(12)
    heading4_style.font.bold = True
    
    # 解析Markdown内容
    lines = md_content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].rstrip()
        
        # 空行
        if not line.strip():
            doc.add_paragraph()
            i += 1
            continue
        
        # 一级标题 (# 标题)
        if line.startswith('# '):
            doc.add_heading(line[2:].strip(), level=1)
            i += 1
            continue
        
        # 二级标题 (## 标题)
        if line.startswith('## '):
            doc.add_heading(line[3:].strip(), level=2)
            i += 1
            continue
        
        # 三级标题 (### 标题)
        if line.startswith('### '):
            doc.add_heading(line[4:].strip(), level=3)
            i += 1
            continue
        
        # 四级标题 (#### 标题)
        if line.startswith('#### '):
            doc.add_heading(line[5:].strip(), level=4)
            i += 1
            continue
        
        # 分隔线 (---)
        if line.strip() == '---':
            p = doc.add_paragraph('─' * 50)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            i += 1
            continue
        
        # 代码块 (```)
        if line.strip().startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            if i < len(lines):
                i += 1
            
            if code_lines:
                code_text = '\n'.join(code_lines)
                p = doc.add_paragraph()
                p.style = 'No Spacing'
                run = p.add_run(code_text)
                run.font.name = 'Consolas'
                run.font.size = Pt(10)
                # 设置代码块背景色（灰色）
                p.paragraph_format.left_indent = Inches(0.5)
                p.paragraph_format.space_before = Pt(6)
                p.paragraph_format.space_after = Pt(6)
            continue
        
        # 列表项 (- 或 * 或 1.)
        if re.match(r'^[-*]\s+', line) or re.match(r'^\d+\.\s+', line):
            p = doc.add_paragraph()
            p.style = 'List Bullet' if re.match(r'^[-*]\s+', line) else 'List Number'
            # 移除列表标记
            text = re.sub(r'^[-*]\s+', '', line)
            text = re.sub(r'^\d+\.\s+', '', text)
            # 处理粗体和斜体
            text = process_inline_formatting(text)
            p.add_run(text)
            i += 1
            continue
        
        # 普通段落
        if line.strip():
            p = doc.add_paragraph()
            # 处理内联格式（粗体、斜体、代码）
            text = process_inline_formatting(line)
            p.add_run(text)
        
        i += 1
    
    # 保存文档
    doc.save(docx_file_path)
    print(f"[成功] 转换完成: {docx_file_path}")


def process_inline_formatting(text):
    """处理Markdown内联格式（粗体、斜体、代码）"""
    # 处理粗体 **text** 或 __text__
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    
    # 处理斜体 *text* 或 _text_
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'_(.*?)_', r'\1', text)
    
    # 处理行内代码 `code`
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # 处理链接 [text](url)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    return text


def main():
    """主函数"""
    # 获取项目根目录
    project_root = Path(__file__).parent.parent
    md_file = project_root / '项目文档' / '合并文档_学号-姓名-题目（A）.md'
    output_file = project_root / '项目文档' / '学号-姓名-题目（A）.docx'
    
    if not md_file.exists():
        print(f"[错误] 文件不存在: {md_file}")
        print("请先创建合并文档")
        return
    
    print("=" * 60)
    print("合并文档转Word工具")
    print("=" * 60)
    
    try:
        parse_markdown_to_docx(md_file, output_file)
        print("=" * 60)
        print(f"✅ 转换成功！")
        print(f"📄 输出文件: {output_file}")
        print("=" * 60)
        print("\n⚠️  注意：请将文件重命名为：学号-姓名-题目（A）.docx")
        print("   并填写文档中的学号和姓名信息")
    except Exception as e:
        print(f"[错误] 转换失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
