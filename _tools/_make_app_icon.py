# -*- coding: utf-8 -*-
"""生成 PWA 图标（纯标准库手写 PNG，无第三方依赖）。
输出 base64 到 _tools/_icon_b64.txt，供 HTML 内联 apple-touch-icon / manifest icons。
设计：深蓝灰底(#33506b) + 白色清单卡片图形，朴素无装饰。
"""
import zlib, struct, io, base64

BG = (0x33, 0x50, 0x6b)
FG = (0xff, 0xff, 0xff)


def rounded_rect_sdf(px, py, x0, y0, x1, y1, r):
    cx = min(max(px, x0 + r), x1 - r)
    cy = min(max(py, y0 + r), y1 - r)
    dx = px - cx
    dy = py - cy
    return (dx * dx + dy * dy) ** 0.5 - r


def make(size):
    ss = 3  # 超采样
    n = size * ss
    buf = bytearray(size * size * 4)
    # 归一化坐标 0..1
    W = float(n)
    # 外框：居中 74%
    card_l, card_t, card_r, card_b = 0.13 * W, 0.13 * W, 0.87 * W, 0.87 * W
    card_rad = 0.17 * W
    stroke = 0.048 * W
    # 三行清单：y 中心
    rows = [0.365, 0.50, 0.635]
    ROW_H = 0.046 * W       # 横线厚
    BOX = 0.058 * W         # 左侧复选框边长
    BOX_X = 0.245 * W       # 复选框左边
    LINE_X0 = 0.345 * W     # 横线起点
    LINE_X1 = 0.755 * W     # 横线终点
    for y in range(size):
        for x in range(size):
            # 采样
            cov = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    px = x * ss + sx + 0.5
                    py = y * ss + sy + 0.5
                    inside = False
                    # 卡片主体（描边环：外框减去内框）
                    d_out = rounded_rect_sdf(px, py, card_l, card_t, card_r, card_b, card_rad)
                    if d_out <= 0:
                        inside = True
                    if inside:
                        d_in = rounded_rect_sdf(px, py, card_l + stroke, card_t + stroke,
                                                card_r - stroke, card_b - stroke, card_rad - stroke)
                        if d_in < 0:
                            inside = False
                    # 内部行：左侧复选框 + 横线
                    if not inside:
                        for ry in rows:
                            cy = ry * W
                            if cy - BOX / 2 <= py <= cy + BOX / 2 and BOX_X <= px <= BOX_X + BOX:
                                inside = True
                                break
                            if cy - ROW_H / 2 <= py <= cy + ROW_H / 2 and LINE_X0 <= px <= LINE_X1:
                                inside = True
                                break
                    cov += 1.0 if inside else 0.0
            a = cov / (ss * ss)
            r = int(BG[0] + (FG[0] - BG[0]) * a)
            g = int(BG[1] + (FG[1] - BG[1]) * a)
            b = int(BG[2] + (FG[2] - BG[2]) * a)
            i = (y * size + x) * 4
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b
            buf[i + 3] = 255
    return bytes(buf)


def png(size):
    raw = make(size)
    lines = bytearray()
    stride = size * 4
    for y in range(size):
        lines.append(0)
        lines.extend(raw[y * stride:(y + 1) * stride])

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    out = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + \
        chunk(b'IDAT', zlib.compress(bytes(lines), 9)) + chunk(b'IEND', b'')
    return out


if __name__ == '__main__':
    res = {}
    for s in (180, 192, 512):
        data = png(s)
        res[s] = base64.b64encode(data).decode('ascii')
        print(s, len(data), 'bytes ->', len(res[s]), 'b64 chars')
    with io.open('_icon_b64.txt', 'w', encoding='utf-8') as f:
        for s in (180, 192, 512):
            f.write('%d\n%s\n' % (s, res[s]))
    print('written _tools/_icon_b64.txt')
