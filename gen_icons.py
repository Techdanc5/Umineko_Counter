#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import math, os

def make_icon(size, path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = size * 0.06
    r = size * 0.22

    # 背景（角丸正方形）
    d.rounded_rectangle([pad, pad, size-pad, size-pad], radius=size*0.2,
                         fill='#0f1220')
    # 外枠
    d.rounded_rectangle([pad, pad, size-pad, size-pad], radius=size*0.2,
                         outline='#e8a83a', width=max(2, size//64))

    # 3つの円（リール）
    cx = [size*0.28, size*0.50, size*0.72]
    cy = size * 0.42
    for x in cx:
        d.ellipse([x-r, cy-r, x+r, cy+r], fill='#1c2138', outline='#e8a83a',
                  width=max(1, size//96))

    # 七 の字（中央リール）を簡易的な点で表現
    dot = max(3, size//40)
    gold = '#ffc85a'
    # 左円：3点
    d.ellipse([cx[0]-dot, cy-dot, cx[0]+dot, cy+dot], fill=gold)
    # 中央円：BAR的な横線3本
    for i, dy in enumerate([-size*0.07, 0, size*0.07]):
        lw = max(2, size//48)
        d.line([cx[1]-r*0.55, cy+dy, cx[1]+r*0.55, cy+dy], fill=gold, width=lw)
    # 右円：7の字
    d.ellipse([cx[2]-dot, cy-dot, cx[2]+dot, cy+dot], fill='#e04545')

    # 下部：「小役」テキスト風の横線2本
    ly = size * 0.73
    lw2 = max(2, size//80)
    col = '#586080'
    for dy in [0, size*0.07]:
        d.line([size*0.20, ly+dy, size*0.80, ly+dy], fill=col, width=lw2)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'PNG')
    print(f'Created: {path} ({size}x{size})')

make_icon(192, 'icons/icon-192.png')
make_icon(512, 'icons/icon-512.png')
