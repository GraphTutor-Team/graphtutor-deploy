"""
从 iconfont 下载的 PNG 包导入 tabBar 图标（81x81）。
默认使用：首页 shouye、练习 guanxitu、计划 rili、我的 wode。
未选中/选中暂用同一套 PNG（tabBar 文字仍会变色；如需双色可再导出两套）。
"""
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("请先安装: pip install pillow")

# 任选其一目录（ebd / owr 内容相同为 PNG）
SRC_DIR = Path(r"c:\Users\16119\Downloads\_ebd\icon_ebd74bn8zis")
OUT_DIR = Path(__file__).resolve().parent.parent / "images"

MAP = [
    ("shouye.png", "tab-home.png", "tab-home-active.png"),
    ("guanxitu.png", "tab-practice.png", "tab-practice-active.png"),
    ("rili.png", "tab-plan.png", "tab-plan-active.png"),
    ("wode.png", "tab-user.png", "tab-user-active.png"),
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for src_name, out1, out2 in MAP:
        p = SRC_DIR / src_name
        if not p.exists():
            raise FileNotFoundError(p)
        im = Image.open(p).convert("RGBA")
        im = im.resize((81, 81), Image.Resampling.LANCZOS)
        im.save(OUT_DIR / out1, "PNG")
        im.save(OUT_DIR / out2, "PNG")
        print("ok", out1, out2, "<-", src_name)


if __name__ == "__main__":
    main()
