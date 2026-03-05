/**
 * 中文颜色名称库
 * 包含中国传统色 + 常用现代色，共约 120 个命名颜色
 * 通过 Lab 最近色距离自动匹配任意 RGB 颜色
 */

interface NamedColor {
  name: string;
  r: number;
  g: number;
  b: number;
}

// ─── 命名颜色表 ──────────────────────────────────────────
const NAMED_COLORS: NamedColor[] = [
  // 白 / 灰 / 黑
  { name: "纯白", r: 255, g: 255, b: 255 },
  { name: "雪白", r: 245, g: 245, b: 250 },
  { name: "象牙白", r: 255, g: 255, b: 240 },
  { name: "乳白", r: 253, g: 245, b: 230 },
  { name: "浅灰", r: 211, g: 211, b: 211 },
  { name: "银灰", r: 192, g: 192, b: 192 },
  { name: "烟灰", r: 160, g: 160, b: 160 },
  { name: "灰色", r: 128, g: 128, b: 128 },
  { name: "暗灰", r: 96, g: 96, b: 96 },
  { name: "深灰", r: 64, g: 64, b: 64 },
  { name: "铁黑", r: 32, g: 32, b: 32 },
  { name: "纯黑", r: 10, g: 10, b: 10 },

  // 红色系
  { name: "粉红", r: 255, g: 182, b: 193 },
  { name: "浅粉", r: 255, g: 210, b: 220 },
  { name: "桃红", r: 255, g: 130, b: 171 },
  { name: "玫红", r: 255, g: 60, b: 130 },
  { name: "品红", r: 255, g: 20, b: 147 },
  { name: "朱红", r: 255, g: 69, b: 0 },
  { name: "大红", r: 220, g: 20, b: 20 },
  { name: "中红", r: 200, g: 30, b: 30 },
  { name: "深红", r: 139, g: 0, b: 0 },
  { name: "暗红", r: 100, g: 0, b: 0 },
  { name: "枣红", r: 160, g: 32, b: 64 },
  { name: "酒红", r: 128, g: 0, b: 32 },
  { name: "栗红", r: 120, g: 40, b: 20 },
  { name: "砖红", r: 196, g: 77, b: 86 },
  { name: "茜红", r: 200, g: 80, b: 80 },
  { name: "胭脂", r: 190, g: 30, b: 45 },
  { name: "樱桃红", r: 220, g: 80, b: 90 },
  { name: "西瓜红", r: 252, g: 96, b: 120 },
  { name: "珊瑚红", r: 255, g: 127, b: 114 },
  { name: "橙红", r: 255, g: 90, b: 30 },

  // 橙色系
  { name: "橙色", r: 255, g: 165, b: 0 },
  { name: "深橙", r: 255, g: 140, b: 0 },
  { name: "橘黄", r: 255, g: 160, b: 70 },
  { name: "南瓜橙", r: 255, g: 117, b: 24 },
  { name: "杏橙", r: 255, g: 189, b: 130 },
  { name: "蜜橙", r: 250, g: 180, b: 100 },

  // 黄色系
  { name: "浅黄", r: 255, g: 250, b: 205 },
  { name: "奶黄", r: 252, g: 240, b: 180 },
  { name: "鹅黄", r: 250, g: 230, b: 140 },
  { name: "柠檬黄", r: 255, g: 244, b: 79 },
  { name: "向日葵黄", r: 255, g: 213, b: 0 },
  { name: "金黄", r: 255, g: 200, b: 0 },
  { name: "姜黄", r: 218, g: 170, b: 90 },
  { name: "土黄", r: 200, g: 155, b: 70 },
  { name: "卡其", r: 189, g: 183, b: 107 },
  { name: "秋黄", r: 210, g: 180, b: 100 },
  { name: "芥末黄", r: 188, g: 180, b: 40 },
  { name: "橄榄黄", r: 154, g: 148, b: 30 },

  // 绿色系
  { name: "嫩绿", r: 154, g: 230, b: 80 },
  { name: "草绿", r: 100, g: 200, b: 50 },
  { name: "黄绿", r: 154, g: 205, b: 50 },
  { name: "苹果绿", r: 100, g: 180, b: 60 },
  { name: "翠绿", r: 50, g: 180, b: 80 },
  { name: "青绿", r: 0, g: 168, b: 120 },
  { name: "绿色", r: 0, g: 150, b: 0 },
  { name: "叶绿", r: 34, g: 139, b: 34 },
  { name: "深绿", r: 0, g: 100, b: 0 },
  { name: "墨绿", r: 0, g: 70, b: 40 },
  { name: "橄榄绿", r: 107, g: 142, b: 35 },
  { name: "苔绿", r: 90, g: 110, b: 30 },
  { name: "竹绿", r: 120, g: 160, b: 90 },
  { name: "薄荷绿", r: 152, g: 255, b: 200 },
  { name: "海沫绿", r: 100, g: 230, b: 170 },
  { name: "孔雀绿", r: 0, g: 130, b: 100 },

  // 青色系
  { name: "浅青", r: 190, g: 240, b: 250 },
  { name: "天青", r: 150, g: 225, b: 240 },
  { name: "青色", r: 0, g: 210, b: 220 },
  { name: "水蓝", r: 100, g: 220, b: 240 },
  { name: "湖蓝", r: 70, g: 190, b: 220 },
  { name: "蔚蓝", r: 70, g: 160, b: 220 },
  { name: "水鸭绿", r: 0, g: 128, b: 128 },
  { name: "深青", r: 0, g: 90, b: 100 },

  // 蓝色系
  { name: "天蓝", r: 135, g: 206, b: 235 },
  { name: "浅蓝", r: 173, g: 216, b: 230 },
  { name: "矢车菊蓝", r: 100, g: 149, b: 237 },
  { name: "蓝色", r: 0, g: 100, b: 220 },
  { name: "宝蓝", r: 65, g: 105, b: 225 },
  { name: "品蓝", r: 0, g: 71, b: 171 },
  { name: "钴蓝", r: 30, g: 60, b: 190 },
  { name: "深蓝", r: 0, g: 0, b: 160 },
  { name: "海军蓝", r: 0, g: 31, b: 91 },
  { name: "午夜蓝", r: 25, g: 25, b: 112 },
  { name: "靛蓝", r: 75, g: 0, b: 130 },

  // 紫色系
  { name: "丁香紫", r: 200, g: 160, b: 210 },
  { name: "浅紫", r: 215, g: 191, b: 255 },
  { name: "薰衣草", r: 180, g: 140, b: 220 },
  { name: "紫罗兰", r: 148, g: 70, b: 220 },
  { name: "紫色", r: 128, g: 0, b: 180 },
  { name: "深紫", r: 90, g: 0, b: 130 },
  { name: "暗紫", r: 60, g: 0, b: 80 },
  { name: "李子紫", r: 102, g: 51, b: 153 },
  { name: "茄紫", r: 80, g: 40, b: 90 },

  // 粉紫 / 洋红
  { name: "玫瑰红", r: 220, g: 80, b: 150 },
  { name: "洋红", r: 210, g: 0, b: 140 },
  { name: "紫红", r: 200, g: 0, b: 100 },
  { name: "深洋红", r: 150, g: 0, b: 90 },

  // 棕 / 褐
  { name: "浅棕", r: 222, g: 184, b: 135 },
  { name: "小麦色", r: 245, g: 222, b: 179 },
  { name: "沙色", r: 244, g: 224, b: 160 },
  { name: "蜂蜜色", r: 210, g: 170, b: 100 },
  { name: "棕黄", r: 210, g: 180, b: 140 },
  { name: "驼色", r: 190, g: 160, b: 120 },
  { name: "卡其棕", r: 168, g: 140, b: 90 },
  { name: "棕色", r: 160, g: 100, b: 50 },
  { name: "中棕", r: 139, g: 69, b: 19 },
  { name: "红棕", r: 165, g: 42, b: 42 },
  { name: "焦糖", r: 193, g: 120, b: 60 },
  { name: "深棕", r: 100, g: 50, b: 20 },
  { name: "可可棕", r: 80, g: 40, b: 10 },
  { name: "咖啡色", r: 111, g: 78, b: 55 },
  { name: "肤色", r: 253, g: 205, b: 175 },
  { name: "浅肤", r: 255, g: 225, b: 205 },
  { name: "深肤", r: 195, g: 140, b: 105 },
];

// ─── Lab 色差匹配 ─────────────────────────────────────────

function linearize(c: number): number {
  const v = c / 255;
  return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = linearize(r),
    gl = linearize(g),
    bl = linearize(b);
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) / 1.0;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787037 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

// 预计算所有命名颜色的 Lab 值
const CACHED_LAB = NAMED_COLORS.map((c) => rgbToLab(c.r, c.g, c.b));

/**
 * 给任意 RGB 颜色找最接近的中文名称
 */
export function getChineseColorName(r: number, g: number, b: number): string {
  const lab = rgbToLab(r, g, b);
  let minD = Infinity,
    bestIdx = 0;
  for (let i = 0; i < CACHED_LAB.length; i++) {
    const [L, a, bv] = CACHED_LAB[i];
    const d = (lab[0] - L) ** 2 + (lab[1] - a) ** 2 + (lab[2] - bv) ** 2;
    if (d < minD) {
      minD = d;
      bestIdx = i;
    }
  }
  return NAMED_COLORS[bestIdx].name;
}
