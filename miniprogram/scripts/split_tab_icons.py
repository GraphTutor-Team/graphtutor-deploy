"""从 Gemini 导出的 2x4 图集中裁剪出 8 个 tab 图标（81x81 PNG）。"""
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("请先安装 Pillow: pip install pillow")

SRC = Path(
    r"C:\Users\16119\.cursor\projects\e-4-GraphTutor\assets\c__Users_16119_AppData_Roaming_Cursor_User_workspaceStorage_ef3e4b98ccd2fefc13f42b304fee9b0a_images_Gemini_Generated_Image_d50q5ed50q5ed50q-05a958b7-5ccf-4106-8e3f-322d27271b33.png"
)
OUT = Path(__file__).resolve().parent.parent / "images"

NAMES = [
    ["tab-home.png", "tab-home-active.png", "tab-practice.png", "tab-practice-active.png"],
    ["tab-plan.png", "tab-plan-active.png", "tab-user.png", "tab-user-active.png"],
]


def main():
    im = Image.open(SRC).convert("RGBA")
    W, H = im.size
    cols, rows = 4, 2
    cw, ch = W // cols, H // rows
    icon_h = int(ch * 0.62)
    OUT.mkdir(parents=True, exist_ok=True)
    for r in range(rows):
        for c in range(cols):
            x0 = c * cw
            y0 = r * ch
            box = (x0, y0, x0 + cw, y0 + icon_h)
            tile = im.crop(box).resize((81, 81), Image.Resampling.LANCZOS)
            path = OUT / NAMES[r][c]
            tile.save(path, "PNG")
            print("saved", path)


if __name__ == "__main__":
    main()
