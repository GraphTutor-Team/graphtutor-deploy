#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成UML图图片工具
将PlantUML文件转换为PNG图片
"""

import os
import subprocess
import sys
from pathlib import Path

def check_plantuml():
    """检查PlantUML是否安装"""
    try:
        result = subprocess.run(['plantuml', '-version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            return True
    except FileNotFoundError:
        pass
    return False

def install_plantuml_jar():
    """下载PlantUML JAR文件"""
    import urllib.request
    
    jar_url = "https://github.com/plantuml/plantuml/releases/download/v1.2023.13/plantuml-1.2023.13.jar"
    jar_path = Path(__file__).parent.parent / "tools" / "plantuml.jar"
    
    if not jar_path.exists():
        print("正在下载PlantUML JAR文件...")
        urllib.request.urlretrieve(jar_url, jar_path)
        print(f"下载完成: {jar_path}")
    
    return jar_path

def convert_puml_to_png(puml_file, output_dir):
    """将PlantUML文件转换为PNG图片"""
    puml_path = Path(puml_file)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 检查PlantUML是否可用
    plantuml_cmd = None
    if check_plantuml():
        plantuml_cmd = ['plantuml']
    else:
        jar_path = install_plantuml_jar()
        if jar_path.exists():
            plantuml_cmd = ['java', '-jar', str(jar_path)]
        else:
            print("错误: 无法找到PlantUML，请手动安装")
            print("安装方法:")
            print("1. 安装Java: https://www.java.com/")
            print("2. 下载PlantUML: http://plantuml.com/download")
            print("3. 或使用在线工具: http://www.plantuml.com/plantuml/uml/")
            return False
    
    # 生成输出文件名
    output_file = output_path / f"{puml_path.stem}.png"
    
    # 执行转换
    cmd = plantuml_cmd + ['-tpng', '-o', str(output_path), str(puml_path)]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ 转换成功: {puml_path.name} -> {output_file.name}")
            return True
        else:
            print(f"✗ 转换失败: {puml_path.name}")
            print(f"  错误: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ 转换异常: {puml_path.name}")
        print(f"  错误: {str(e)}")
        return False

def main():
    """主函数"""
    project_root = Path(__file__).parent.parent
    uml_dir = project_root / 'UML图集'
    output_dir = project_root / 'UML图集' / '图片'
    
    # 查找所有.puml文件
    puml_files = list(uml_dir.glob('*.puml'))
    
    if not puml_files:
        print("未找到PlantUML文件")
        return
    
    print("=" * 60)
    print("PlantUML转PNG图片工具")
    print("=" * 60)
    print(f"找到 {len(puml_files)} 个PlantUML文件")
    print(f"输出目录: {output_dir}")
    print()
    
    success_count = 0
    error_count = 0
    
    for puml_file in puml_files:
        if convert_puml_to_png(puml_file, output_dir):
            success_count += 1
        else:
            error_count += 1
    
    print()
    print("=" * 60)
    print(f"转换完成: 成功 {success_count} 个, 失败 {error_count} 个")
    print(f"图片保存在: {output_dir}")
    print("=" * 60)
    
    if error_count > 0:
        print()
        print("提示: 如果转换失败，可以使用以下方法:")
        print("1. 在线工具: http://www.plantuml.com/plantuml/uml/")
        print("2. VS Code插件: PlantUML")
        print("3. 安装PlantUML: http://plantuml.com/download")

if __name__ == '__main__':
    main()

