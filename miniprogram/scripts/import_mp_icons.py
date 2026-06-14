"""从 icon_0mppr932jkj 生成 tabBar 图标并整理到 images/icons/"""
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("请先安装: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "icon_0mppr932jkj" / "icon_0mppr932jkj"
ICONS_OUT = ROOT / "images" / "icons"
TAB_OUT = ROOT / "images" / "tab"

TAB_MAP = [
    ("icon-grid.png", "home"),
    ("icon-edit.png", "practice"),
    ("icon-calendar.png", "plan"),
    ("icon-redo.png", "wrong"),
    ("icon-user-center.png", "user"),
]

GRAY = (139, 157, 201, 255)
BLUE = (21, 101, 192, 255)


def tint(im: Image.Image, color):
    im = im.convert("RGBA")
    r, g, b, a = im.split()
    gray = Image.merge("RGBA", (r, g, b, a))
    overlay = Image.new("RGBA", im.size, color)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    px = im.load()
    ov = overlay.load()
    op = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            _, _, _, alpha = px[x, y]
            if alpha < 16:
                continue
            op[x, y] = (*color[:3], alpha)
    return out


def resize81(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    return im.resize((81, 81), Image.Resampling.LANCZOS)


def main():
    ICONS_OUT.mkdir(parents=True, exist_ok=True)
    TAB_OUT.mkdir(parents=True, exist_ok=True)

    for name in SRC.glob("*.png"):
        target = ICONS_OUT / name.name
        if not target.exists():
            im = Image.open(name).convert("RGBA")
            im.save(target, "PNG")

    for src_name, key in TAB_MAP:
        src = SRC / src_name
        if not src.exists():
            raise FileNotFoundError(src)
        base = resize81(src)
        normal = tint(base, GRAY)
        active = tint(base, BLUE)
        normal.save(TAB_OUT / f"{key}.png", "PNG")
        active.save(TAB_OUT / f"{key}-active.png", "PNG")
        print("tab", key, "<-", src_name)

    print("done", len(list(ICONS_OUT.glob('*.png'))), "icons")


if __name__ == "__main__":
    main()
