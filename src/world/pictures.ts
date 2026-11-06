import Phaser from 'phaser';

/** Coloring-book pictures, drawn in a 400×400 box. Each region can be colored. */
export type Region =
  | { t: 'rect'; x: number; y: number; w: number; h: number }
  | { t: 'circle'; x: number; y: number; r: number }
  | { t: 'ellipse'; x: number; y: number; w: number; h: number }
  | { t: 'poly'; pts: number[] };

export type Picture = { name: string; regions: Region[] };

export const PICTURES: Picture[] = [
  {
    name: 'Domek',
    regions: [
      { t: 'rect', x: 0, y: 0, w: 400, h: 260 },
      { t: 'rect', x: 0, y: 260, w: 400, h: 140 },
      { t: 'circle', x: 330, y: 70, r: 45 },
      { t: 'rect', x: 90, y: 170, w: 180, h: 150 },
      { t: 'poly', pts: [70, 170, 290, 170, 180, 70] },
      { t: 'rect', x: 155, y: 240, w: 50, h: 80 },
      { t: 'rect', x: 210, y: 195, w: 40, h: 40 },
    ],
  },
  {
    name: 'Kwiatek',
    regions: [
      { t: 'rect', x: 0, y: 0, w: 400, h: 400 },
      { t: 'rect', x: 190, y: 190, w: 20, h: 140 },
      { t: 'ellipse', x: 150, y: 270, w: 80, h: 34 },
      { t: 'circle', x: 200, y: 95, r: 42 },
      { t: 'circle', x: 262, y: 140, r: 42 },
      { t: 'circle', x: 238, y: 212, r: 42 },
      { t: 'circle', x: 162, y: 212, r: 42 },
      { t: 'circle', x: 138, y: 140, r: 42 },
      { t: 'circle', x: 200, y: 160, r: 36 },
      { t: 'poly', pts: [130, 320, 270, 320, 250, 395, 150, 395] },
    ],
  },
  {
    name: 'Rybka',
    regions: [
      { t: 'rect', x: 0, y: 0, w: 400, h: 330 },
      { t: 'rect', x: 0, y: 330, w: 400, h: 70 },
      { t: 'ellipse', x: 190, y: 180, w: 220, h: 140 },
      { t: 'poly', pts: [290, 180, 370, 110, 370, 250] },
      { t: 'poly', pts: [160, 115, 220, 70, 230, 120] },
      { t: 'circle', x: 130, y: 165, r: 16 },
      { t: 'circle', x: 70, y: 80, r: 14 },
      { t: 'circle', x: 90, y: 40, r: 10 },
    ],
  },
  {
    name: 'Autko',
    regions: [
      { t: 'rect', x: 0, y: 0, w: 400, h: 300 },
      { t: 'rect', x: 0, y: 300, w: 400, h: 100 },
      { t: 'rect', x: 60, y: 180, w: 280, h: 90 },
      { t: 'poly', pts: [120, 180, 150, 110, 260, 110, 290, 180] },
      { t: 'rect', x: 165, y: 125, w: 45, h: 45 },
      { t: 'rect', x: 220, y: 125, w: 45, h: 45 },
      { t: 'circle', x: 125, y: 275, r: 34 },
      { t: 'circle', x: 280, y: 275, r: 34 },
    ],
  },
];

export const PALETTE = [0xff5d5d, 0xff9f43, 0xffd45c, 0x6bd66b, 0x4fa8ff, 0x9b6bff, 0xff7ac8, 0x8b5a2b, 0xffffff];

/** Draw one region onto a Graphics object. */
export function fillRegion(g: Phaser.GameObjects.Graphics, r: Region, color: number, s = 1, outline = true) {
  g.fillStyle(color, 1);
  if (outline) g.lineStyle(Math.max(1, 5 * s), 0x4a3a5c, 1);
  switch (r.t) {
    case 'rect':
      g.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
      if (outline) g.strokeRect(r.x * s, r.y * s, r.w * s, r.h * s);
      break;
    case 'circle':
      g.fillCircle(r.x * s, r.y * s, r.r * s);
      if (outline) g.strokeCircle(r.x * s, r.y * s, r.r * s);
      break;
    case 'ellipse':
      g.fillEllipse(r.x * s, r.y * s, r.w * s, r.h * s);
      if (outline) g.strokeEllipse(r.x * s, r.y * s, r.w * s, r.h * s);
      break;
    case 'poly': {
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < r.pts.length; i += 2) pts.push(new Phaser.Math.Vector2(r.pts[i] * s, r.pts[i + 1] * s));
      g.fillPoints(pts, true);
      if (outline) g.strokePoints(pts, true);
      break;
    }
  }
}

export function regionContains(r: Region, x: number, y: number) {
  switch (r.t) {
    case 'rect': return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    case 'circle': return Math.hypot(x - r.x, y - r.y) <= r.r;
    case 'ellipse': return ((x - r.x) / (r.w / 2)) ** 2 + ((y - r.y) / (r.h / 2)) ** 2 <= 1;
    case 'poly': {
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i < r.pts.length; i += 2) pts.push(new Phaser.Geom.Point(r.pts[i], r.pts[i + 1]));
      return Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(pts), x, y);
    }
  }
}

/** A saved drawing is "pictureIndex:color,color,...". */
export function encodeDrawing(idx: number, colors: number[]) {
  return `${idx}:${colors.map((c) => c.toString(16)).join(',')}`;
}

export function drawPicture(g: Phaser.GameObjects.Graphics, code: string, s: number) {
  const [i, cols] = code.split(':');
  const pic = PICTURES[Number(i)] ?? PICTURES[0];
  const colors = (cols ?? '').split(',').map((c) => parseInt(c, 16));
  pic.regions.forEach((r, k) => fillRegion(g, r, Number.isFinite(colors[k]) ? colors[k] : 0xffffff, s));
}
