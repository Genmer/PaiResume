# -*- coding: utf-8 -*-
"""生成 4 种典型排版的中文简历 PDF，用于验证 PDF 抽取链路。"""
from fpdf import FPDF
from PIL import Image, ImageDraw, ImageFont
import os

FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
OUT = os.path.dirname(os.path.abspath(__file__))

# ============ 1. 单栏经典排版 ============
class SingleCol(FPDF):
    def hd(self, size, text):
        self.set_font("u", "", size)
        self.cell(0, size + 4, text, new_x="LMARGIN", new_y="NEXT")
    def tline(self, text, size=10.5):
        self.set_font("u", "", size)
        self.cell(0, size + 3, text, new_x="LMARGIN", new_y="NEXT")

pdf = SingleCol()
pdf.add_font("u", "", FONT)
pdf.add_page()
pdf.hd(20, "张伟明")
pdf.tline("求职意向：后端开发工程师 | 手机：138-0013-8000 | 邮箱：zhangweiming@example.com", 10)
pdf.tline("意向城市：上海 | 籍贯：浙江杭州", 10)
pdf.ln(3)
pdf.hd(13, "教育经历")
pdf.tline("浙江大学 · 计算机科学与技术 · 本科 · 2018-09 至 2022-06")
pdf.tline("GPA 3.7/4.0，专业排名前 10%，连续三年校一等奖学金")
pdf.ln(3)
pdf.hd(13, "实习经历")
pdf.tline("阿里巴巴 · 淘宝事业部 · 后端开发实习生 · 2021-06 至 2021-09")
pdf.tline("1、负责订单查询接口的性能优化，通过引入多级缓存将 P99 延迟从 320ms 降至 45ms")
pdf.tline("2、编写单元测试与压测脚本，覆盖核心链路 85% 的分支")
pdf.ln(2)
pdf.tline("字节跳动 · 抖音电商 · 服务端开发实习生 · 2020-12 至 2021-03")
pdf.tline("1、参与商品搜索服务重构，使用 Go 重写热点路径，QPS 承载提升 2.3 倍")
pdf.ln(3)
pdf.hd(13, "项目经历")
pdf.tline("高并发秒杀系统 · 2021-10 至 2022-03 · 独立开发")
pdf.tline("技术栈：Spring Boot / Redis / RocketMQ / MySQL")
pdf.tline("1、设计库存预扣 + 异步落库方案，峰值 1.2 万 QPS 下零超卖")
pdf.tline("2、实现令牌桶限流与熔断降级，保障大促期间服务可用性 99.99%")
pdf.ln(3)
pdf.hd(13, "获奖与证书")
pdf.tline("全国大学生数学建模竞赛 一等奖 · 2020-11")
pdf.tline("ACM 区域赛 银牌 · 2019-10")
pdf.tline("软件设计师（软考中级） · 2020-05")
pdf.ln(3)
pdf.hd(13, "专业技能")
pdf.tline("编程语言：Java / Go / Python / SQL")
pdf.tline("框架与中间件：Spring Boot / MyBatis / Redis / Kafka / RocketMQ")
pdf.tline("数据库：MySQL 索引优化与分库分表 / MongoDB")
pdf.output(f"{OUT}/resume-single-column.pdf")

# ============ 2. 双栏排版（左侧边栏窄栏 + 右侧主栏） ============
class TwoCol(FPDF):
    LX, RX = 14, 68          # 左栏 x、右栏 x（A4 宽 210，右栏到 ~200）
    def __init__(self):
        super().__init__()
        self.add_font("u", "", FONT)
        self._bold = self.font_style
    def name_title(self):
        self.set_font("u", "", 19)
        self.set_xy(self.RX, 12)
        self.cell(0, 22, "李思远")
        self.set_font("u", "", 10)
        self.set_xy(self.RX, 34)
        self.cell(0, 6, "求职意向：数据分析师")
    def side_h(self, text):
        self.set_font("u", "", 11.5)
        self.set_x(self.LX)
        self.cell(48, 8, text, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(120, 120, 120)
        self.line(self.LX, self.get_y(), self.LX + 46, self.get_y())
        self.ln(2)
    def side_line(self, text, size=9):
        self.set_font("u", "", size)
        self.set_x(self.LX)
        self.cell(48, size + 2.5, text, new_x="LMARGIN", new_y="NEXT")
    def main_h(self, text):
        self.set_font("u", "", 12.5)
        self.set_x(self.RX)
        self.cell(0, 9, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)
    def main_line(self, text, size=9.5):
        self.set_font("u", "", size)
        self.set_x(self.RX)
        self.cell(0, size + 3, text, new_x="LMARGIN", new_y="NEXT")

pdf = TwoCol()
pdf.add_page()
pdf.name_title()
# 左侧边栏
pdf.set_y(44)
pdf.side_h("基本信息")
pdf.side_line("电话：139-1122-3344")
pdf.side_line("邮箱：lisiyuan@ex.com")
pdf.side_line("城市：北京")
pdf.side_h("教育背景")
pdf.side_line("中国人民大学")
pdf.side_line("统计学 · 本科")
pdf.side_line("2019-09 至 2023-06")
pdf.side_h("技能")
pdf.side_line("SQL / Python")
pdf.side_line("Pandas / NumPy")
pdf.side_line("Tableau / PowerBI")
pdf.side_line("Hive / Spark")
pdf.side_h("证书")
pdf.side_line("CET-6 · 2020-12")
pdf.side_line("FRM 一级 · 2022-08")
# 右侧主栏
pdf.set_y(44)
pdf.main_h("实习经历")
pdf.main_line("美团 · 到店事业群 · 数据分析实习生 · 2022-05 至 2022-09")
pdf.main_line("1、搭建商家经营日报体系，覆盖 30+ 核心指标，报表产出时间从 2h 缩至 10min")
pdf.main_line("2、通过漏斗分析定位转化流失点，推动首页改版后转化率提升 1.8%")
pdf.ln(2)
pdf.main_line("京东 · 零售数据中台 · 数据实习生 · 2021-07 至 2021-10")
pdf.main_line("1、清洗 2 亿+ 行用户行为数据，建立 RFM 分层模型支撑精准营销")
pdf.ln(3)
pdf.main_h("项目经历")
pdf.main_line("城市交通流量预测系统 · 2022-11 至 2023-04")
pdf.main_line("1、基于 LSTM + 注意力机制建模，MAPE 较基线下降 12%")
pdf.main_line("2、用 Spark 完成特征工程流水线，训练数据准备耗时降低 60%")
pdf.ln(3)
pdf.main_h("校园经历")
pdf.main_line("校学生会 数据部部长 · 2020-09 至 2021-09")
pdf.main_line("组织 3 届数据分析训练营，累计培训 200+ 人")
pdf.output(f"{OUT}/resume-two-column.pdf")

# ============ 3. 表格型排版 ============
class TablePdf(FPDF):
    def hd(self, text):
        self.set_font("u", "", 13)
        self.cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(60, 60, 60)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)
    def tline(self, text, size=10):
        self.set_font("u", "", size)
        self.cell(0, size + 3, text, new_x="LMARGIN", new_y="NEXT")

pdf = TablePdf()
pdf.add_font("u", "", FONT)
pdf.add_page()
pdf.set_font("u", "", 18)
pdf.cell(0, 14, "王建国", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("u", "", 10)
pdf.cell(0, 8, "目标岗位：前端开发工程师（React 方向）　电话：136-6688-9999　邮箱：wangjg@example.cn", new_x="LMARGIN", new_y="NEXT")
pdf.ln(4)
pdf.hd("教育经历")
cols = [("时间", 34), ("学校", 48), ("专业", 48), ("学历", 30), ("院系", 30)]
rows = [
    ("2016-09 至 2020-06", "武汉大学", "软件工程", "本科", "计算机学院"),
    ("2020-09 至 2023-06", "复旦大学", "软件工程", "硕士", "计算机科学技术学院"),
]
for title, w in cols:
    pdf.set_font("u", "", 10)
    pdf.cell(w, 8, title, border=1)
pdf.ln()
for row in rows:
    for (title, w), val in zip(cols, row):
        pdf.cell(w, 8, val, border=1)
    pdf.ln()
pdf.ln(4)
pdf.hd("工作经历")
w2 = [(34, "时间"), (40, "公司"), (40, "职位"), (76, "职责")]
for w, t in w2:
    pdf.set_font("u", "", 10)
    pdf.cell(w, 8, t, border=1)
pdf.ln()
for val, w in [("2023-07 至今", 34), ("拼多多", 40), ("前端开发工程师", 40), ("负责商家后台营销模块", 76)]:
    pdf.set_font("u", "", 10)
    pdf.cell(w, 8, val, border=1)
pdf.ln()
for val, w in [("2022-03 至 2022-09", 34), ("小红书", 40), ("前端开发实习生", 40), ("参与社区feed性能优化", 76)]:
    pdf.set_font("u", "", 10)
    pdf.cell(w, 8, val, border=1)
pdf.ln(4)
pdf.hd("技能清单")
pdf.tline("前端：TypeScript / React / Vue3 / Webpack / Vite")
pdf.tline("后端：Node.js / Express / Java 基础")
pdf.output(f"{OUT}/resume-table.pdf")

# ============ 4. 扫描件风格（整页图片，无文字层） ============
img_path = f"{OUT}/scan-page.png"
im = Image.new("RGB", (1240, 1754), "white")
d = ImageDraw.Draw(im)
f28 = ImageFont.truetype(FONT, 44)
f22 = ImageFont.truetype(FONT, 32)
f18 = ImageFont.truetype(FONT, 26)
d.text((80, 90), "陈扫描", font=f28, fill="black")
d.text((80, 160), "电话：137-0000-1111  邮箱：chensm@example.com", font=f18, fill="black")
d.text((80, 240), "工作经历", font=f22, fill="black")
d.line((80, 285, 1160, 285), fill="black", width=2)
y = 310
for t in ["某科技公司 · 高级工程师 · 2018-2023", "负责核心系统的设计与开发", "带领 5 人团队完成平台重构"]:
    d.text((80, y), t, font=f18, fill="black")
    y += 46
im.save(img_path)
pdf = FPDF()
pdf.add_page()
pdf.image(img_path, x=0, y=0, w=210, h=297)
pdf.output(f"{OUT}/resume-scanned.pdf")
os.remove(img_path)

print("generated:", [f for f in os.listdir(OUT) if f.endswith(".pdf")])

# ---- 5) 多页简历：每页重复页眉 + 页码页脚（验证 dropRepeatedHeaderFooterLines / dropPageNumberLines） ----
pdf = FPDF(orientation="P", unit="mm", format="A4")
pdf.add_font("u", "", FONT)
pdf.set_auto_page_break(auto=True, margin=15)

HEADER = "陈晓的简历 - 应聘后端开发工程师"
BODY_P1 = [
    ("教育经历", True),
    ("2016.09 - 2020.06 华中科技大学 计算机科学与技术 本科", False),
    ("主修课程：数据结构、操作系统、计算机网络、数据库原理", False),
    ("实习经历", True),
    ("2022.06 - 2022.12 美团 后端开发实习生", False),
    ("负责订单履约链路的数据对账工具，覆盖 3 条业务线", False),
    ("使用 Java + Spring Boot 重写核心校验模块，性能提升 40%", False),
]
BODY_P2 = [
    ("项目经历", True),
    ("智能简历解析系统", False),
    ("技术栈：Python / FastAPI / GLM", False),
    ("实现 PDF 版式分析、双栏重排与结构化抽取", False),
    ("校园经历", False and True),
    ("计算机学院学生会 技术部部长，组织 3 场技术沙龙", False),
]

for body in (BODY_P1, BODY_P2):
    pdf.add_page()
    pdf.set_font("u", "", 9)
    pdf.cell(0, 6, HEADER, align="C")  # 页眉（每页重复）
    pdf.ln(10)
    for text, bold in body:
        pdf.set_font("u", "", 12 if bold else 10)
        pdf.cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("u", "", 9)
    pdf.cell(0, 6, f"第 {pdf.page_no()} 页 共 2 页", align="C")  # 页码页脚

pdf.output("tmp-verify/resume-multipage-header.pdf")
print("resume-multipage-header.pdf generated")

# ---- 6) 三栏设计风简历（对抗：不应误判双栏，应退单栏自然行序） ----
pdf = FPDF(orientation="P", unit="mm", format="A4")
pdf.add_font("u", "", FONT)
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()
pdf.set_font("u", "", 16)
pdf.cell(0, 10, "周雨桐 - 全栈工程师", align="C")
pdf.ln(14)

COL_W = 55
COL_XS = [12, 12 + COL_W + 6, 12 + (COL_W + 6) * 2]
COLUMNS = [
    [("联系方式", True), ("电话：13911112222", False), ("邮箱：zhou@example.com", False), ("城市：深圳", False)],
    [("技能", True), ("前端：React / Vue", False), ("后端：Node / Java", False), ("运维：Docker / K8s", False)],
    [("作品", True), ("简历生成器 PaaS", False), ("开源博客引擎", False), ("AI 聚合搜索", False)],
]
from fpdf.enums import XPos, YPos
y = 40
for row_idx in range(4):
    for col_idx, col in enumerate(COLUMNS):
        text, bold = col[row_idx]
        pdf.set_font("u", "", 11 if bold else 9)
        pdf.set_xy(COL_XS[col_idx], y)
        pdf.cell(COL_W, 6, text)
    y += 8
pdf.output("tmp-verify/resume-three-column.pdf")
print("resume-three-column.pdf generated")

# ---- 7) 右侧边栏双栏（对抗：缝在 ~75% 位置，验证列缝窗口右界） ----
pdf = FPDF(orientation="P", unit="mm", format="A4")
pdf.add_font("u", "", FONT)
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()
pdf.set_font("u", "", 18)
pdf.cell(0, 10, "吴天 - 数据分析师", align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(4)

# 主栏（左，宽）：实习+项目
MAIN_X, SIDE_X, SIDE_W = 12, 148, 50
MAIN = [
    ("实习经历", True), ("2023.03 - 2023.09 字节跳动 数据分析实习生", False),
    ("搭建实验指标看板，服务 5 条业务线", False),
    ("SQL 取数自动化，日均节省 2h 人力", False),
    ("项目经历", True), ("电商用户流失预警模型", False),
    ("特征 200+，XGBoost AUC 0.87", False),
]
SIDE = [
    ("基本信息", True), ("电话：13666667777", False), ("邮箱：wu@example.com", False),
    ("教育：武大统计 2020-2024", False), ("技能", True), ("SQL / Python / Tableau", False),
]
y = 32
for text, bold in MAIN:
    pdf.set_font("u", "", 12 if bold else 10)
    pdf.set_xy(MAIN_X, y)
    pdf.cell(120, 7, text)
    y += 9
y = 32
for text, bold in SIDE:
    pdf.set_font("u", "", 11 if bold else 9)
    pdf.set_xy(SIDE_X, y)
    pdf.cell(SIDE_W, 6, text)
    y += 8
pdf.output("tmp-verify/resume-right-sidebar.pdf")
print("resume-right-sidebar.pdf generated")
