from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUT = Path(__file__).resolve().parent / "report-assets"
OUT.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"

INK = "#17232d"
MUTED = "#5f7180"
LINE = "#b8c7d2"
BLUE = "#e7f3fb"
CYAN = "#dff7f6"
GREEN = "#e7f7ef"
AMBER = "#fff5da"
RED = "#d94c4c"
RED_SOFT = "#fff1f1"
NAVY = "#17313f"
WHITE = "#ffffff"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def canvas(width=1800, height=1100, title=None):
    image = Image.new("RGB", (width, height), WHITE)
    draw = ImageDraw.Draw(image)
    if title:
        draw.text((width // 2, 46), title, font=font(42, True), fill=INK, anchor="ma")
        draw.line((100, 100, width - 100, 100), fill="#cbd8e1", width=2)
    return image, draw


def rounded_box(draw, xy, text, fill=BLUE, outline=LINE, width=3, radius=18, text_fill=INK, size=28, bold=False):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    x1, y1, x2, y2 = xy
    draw.multiline_text(((x1 + x2) // 2, (y1 + y2) // 2), text, font=font(size, bold), fill=text_fill, anchor="mm", align="center", spacing=8)


def arrow(draw, start, end, fill="#6d8492", width=4, head=14):
    draw.line((start, end), fill=fill, width=width)
    x1, y1 = start
    x2, y2 = end
    if abs(x2 - x1) >= abs(y2 - y1):
        direction = 1 if x2 > x1 else -1
        points = [(x2, y2), (x2 - direction * head, y2 - head // 2), (x2 - direction * head, y2 + head // 2)]
    else:
        direction = 1 if y2 > y1 else -1
        points = [(x2, y2), (x2 - head // 2, y2 - direction * head), (x2 + head // 2, y2 - direction * head)]
    draw.polygon(points, fill=fill)


def label(draw, xy, text, size=24, fill=MUTED, bold=False, anchor="la"):
    draw.text(xy, text, font=font(size, bold), fill=fill, anchor=anchor)


def save(image, name):
    image.save(OUT / name, quality=95)


def business_flow():
    image, draw = canvas(title="智慧产业园区数字孪生平台总体业务流程")
    boxes = [
        (90, 300, 300, 440, "设备状态\n安防事件\n环境数据"),
        (360, 300, 570, 440, "统一告警中心"),
        (630, 300, 870, 440, "三维定位\n视频联动"),
        (930, 300, 1140, 440, "值班人员\n确认告警"),
        (1200, 300, 1410, 440, "生成物业工单"),
        (1470, 300, 1710, 440, "派单、处理\n验收、关闭"),
    ]
    owner_labels = {"统一告警中心", "三维定位\n视频联动", "值班人员\n确认告警", "生成物业工单", "派单、处理\n验收、关闭"}
    for x1, y1, x2, y2, text in boxes:
        owner = text in owner_labels
        rounded_box(draw, (x1, y1, x2, y2), text, fill=RED_SOFT if owner else CYAN, outline=RED if owner else "#65b8c4", width=5 if owner else 3, size=28, bold=owner)
    for left, right in zip(boxes, boxes[1:]):
        arrow(draw, (left[2] + 10, 370), (right[0] - 10, 370))

    rounded_box(draw, (360, 600, 620, 740), "告警规则配置", fill=RED_SOFT, outline=RED, width=5, size=28, bold=True)
    rounded_box(draw, (770, 600, 1030, 740), "RBAC 权限控制", fill=RED_SOFT, outline=RED, width=5, size=28, bold=True)
    rounded_box(draw, (1180, 600, 1440, 740), "审计日志与报表", fill=RED_SOFT, outline=RED, width=5, size=28, bold=True)
    arrow(draw, (490, 600), (490, 460))
    arrow(draw, (900, 600), (900, 460))
    arrow(draw, (1310, 600), (1310, 460))

    label(draw, (900, 860), "红色边框为组长负责的核心闭环模块", size=28, fill=RED, bold=True, anchor="ma")
    save(image, "diagram-1-business-flow.png")


def module_map():
    image, draw = canvas(title="系统功能模块图")
    rounded_box(draw, (650, 135, 1150, 265), "智慧产业园区数字孪生\n可视化管控平台", fill=NAVY, outline=NAVY, text_fill=WHITE, size=26, bold=True)
    modules = [
        ("首页驾驶舱", False), ("数字孪生一张图", False), ("设备运维", False), ("能耗管理", False),
        ("安防管控", True), ("环境监测", False), ("物业工单", True), ("企业服务", True),
        ("空间资产", False), ("告警中心", True), ("报表中心", False), ("系统管理", True),
    ]
    start_x, start_y = 120, 390
    box_w, box_h, gap_x, gap_y = 330, 120, 80, 100
    positions = []
    for index, (text, owner) in enumerate(modules):
        row, col = divmod(index, 4)
        x1 = start_x + col * (box_w + gap_x)
        y1 = start_y + row * (box_h + gap_y)
        x2, y2 = x1 + box_w, y1 + box_h
        positions.append((x1, y1, x2, y2, text, owner))
        arrow(draw, (900, 265), ((x1 + x2) // 2, y1 - 12), fill="#9bb0bd", width=3, head=10)
    for x1, y1, x2, y2, text, owner in positions:
        rounded_box(draw, (x1, y1, x2, y2), text, fill=RED_SOFT if owner else BLUE, outline=RED if owner else "#7ba9c7", width=5 if owner else 3, size=29, bold=owner)
    rounded_box(draw, (420, 950, 1380, 1045), "公共能力: 登录鉴权、全局搜索、虚拟仿真、实时通道", fill=RED_SOFT, outline=RED, width=5, size=24, bold=True)
    save(image, "diagram-2-module-map.png")


def use_case():
    image, draw = canvas(title="组长负责模块用例图")
    draw.rounded_rectangle((330, 150, 1470, 1000), radius=26, outline="#8da8b8", width=4, fill="#fbfdfe")
    label(draw, (900, 190), "TwinParkOS 业务系统", size=30, fill=INK, bold=True, anchor="ma")

    actors = [
        (150, 330, "系统管理员"),
        (150, 760, "安防值班人员"),
        (1650, 330, "物业运维人员"),
        (1650, 760, "企业服务人员"),
    ]
    for x, y, text in actors:
        draw.ellipse((x - 24, y - 70, x + 24, y - 22), outline=INK, width=4)
        draw.line((x, y - 22, x, y + 45), fill=INK, width=4)
        draw.line((x - 38, y + 5, x + 38, y + 5), fill=INK, width=4)
        draw.line((x, y + 45, x - 35, y + 95), fill=INK, width=4)
        draw.line((x, y + 45, x + 35, y + 95), fill=INK, width=4)
        label(draw, (x, y + 135), text, size=25, fill=INK, bold=True, anchor="ma")

    cases = [
        (470, 270, 750, 350, "登录与角色授权"),
        (1020, 270, 1300, 350, "用户、角色与日志管理"),
        (470, 470, 750, 550, "视频监控与安防事件"),
        (1020, 470, 1300, 550, "确认告警与联动处置"),
        (470, 670, 750, 750, "生成、派发物业工单"),
        (1020, 670, 1300, 750, "处理、验收与关闭工单"),
        (745, 850, 1055, 930, "企业档案与服务申请"),
    ]
    connections = [
        ((205, 330), (470, 310)), ((205, 330), (1020, 310)),
        ((205, 760), (470, 510)), ((205, 760), (1020, 510)), ((205, 760), (470, 710)),
        ((1595, 330), (470, 710)), ((1595, 330), (1020, 710)),
        ((1595, 760), (745, 890)), ((1595, 760), (1020, 710)),
    ]
    for start, end in connections:
        draw.line((start, end), fill="#8ba0ad", width=3)
    for x1, y1, x2, y2, text in cases:
        rounded_box(draw, (x1, y1, x2, y2), text, fill=RED_SOFT, outline=RED, width=4, radius=40, size=25, bold=True)
    save(image, "diagram-3-use-case.png")


def architecture():
    image, draw = canvas(title="系统技术架构图")
    layers = [
        ("展示层", ["PC 管理后台", "三维数字孪生", "大屏驾驶舱", "移动端适配"], BLUE, False),
        ("业务应用层", ["安防管控", "告警中心", "物业工单", "企业服务", "系统管理"], RED_SOFT, True),
        ("服务层", ["Express REST API", "JWT / RBAC", "WebSocket 实时推送", "审计与报表服务"], RED_SOFT, True),
        ("数据与仿真层", ["JSON 持久化", "虚拟设备仿真", "告警规则", "演示数据种子"], GREEN, False),
    ]
    y = 180
    for title, items, fill, owner in layers:
        draw.rounded_rectangle((160, y, 1640, y + 170), radius=24, fill=fill, outline=RED if owner else "#7ba9c7", width=5 if owner else 3)
        rounded_box(draw, (190, y + 35, 390, y + 135), title, fill=NAVY, outline=NAVY, text_fill=WHITE, size=27, bold=True)
        available = 1160
        gap = 24
        item_width = (available - gap * (len(items) - 1)) // len(items)
        item_x = 440
        for item in items:
            rounded_box(draw, (item_x, y + 42, item_x + item_width, y + 128), item, fill=WHITE, outline="#b7c8d3", width=2, size=21, bold=False)
            item_x += item_width + gap
        y += 215
    for arrow_y in (350, 565, 780):
        arrow(draw, (900, arrow_y), (900, arrow_y + 42), fill="#5f8194", width=5, head=16)
    save(image, "diagram-4-architecture.png")


def sequence():
    image, draw = canvas(title="告警生成工单闭环时序图")
    actors = [
        (150, "虚拟设备"),
        (410, "告警服务"),
        (690, "告警中心页面"),
        (970, "安防值班员"),
        (1250, "工单服务"),
        (1530, "物业工程人员"),
    ]
    top, bottom = 180, 990
    for x, text in actors:
        rounded_box(draw, (x - 105, top, x + 105, top + 75), text, fill=BLUE, outline="#6d9fbd", width=3, size=24, bold=True)
        draw.line((x, top + 75, x, bottom), fill="#9fb1bd", width=3)

    messages = [
        (150, 410, 310, "1. 上报异常数据"),
        (410, 410, 390, "2. 匹配规则并生成告警"),
        (410, 690, 470, "3. WebSocket 推送告警"),
        (690, 970, 550, "4. 展示告警并请求确认"),
        (970, 690, 630, "5. 确认告警"),
        (690, 1250, 710, "6. 生成关联工单"),
        (1250, 1530, 790, "7. 派发处理任务"),
        (1530, 1250, 870, "8. 提交处理结果"),
        (1250, 690, 950, "9. 更新工单与告警状态"),
    ]
    for x1, x2, y, text in messages:
        arrow(draw, (x1, y), (x2, y), fill=RED if x1 in (690, 970, 1250, 1530) or x2 in (690, 970, 1250, 1530) else "#638799", width=4, head=12)
        label(draw, ((x1 + x2) // 2, y - 14), text, size=21, fill=INK, bold=False, anchor="ms")
    save(image, "diagram-5-sequence.png")


if __name__ == "__main__":
    business_flow()
    module_map()
    use_case()
    architecture()
    sequence()
    print(f"Created report assets in {OUT}")
