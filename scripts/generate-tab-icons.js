const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 81;
const OUT_DIR = path.join(__dirname, "..", "assets", "tab");
const COLORS = {
  normal: "#9B8475",
  active: "#B65F2A"
};

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function createCanvas() {
  return Buffer.alloc(SIZE * SIZE * 4);
}

function setPixel(buffer, x, y, color, alpha = 255) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) return;

  const index = (py * SIZE + px) * 4;
  const nextAlpha = alpha / 255;
  const prevAlpha = buffer[index + 3] / 255;
  const outAlpha = nextAlpha + prevAlpha * (1 - nextAlpha);
  if (outAlpha <= 0) return;

  buffer[index] = Math.round((color.r * nextAlpha + buffer[index] * prevAlpha * (1 - nextAlpha)) / outAlpha);
  buffer[index + 1] = Math.round((color.g * nextAlpha + buffer[index + 1] * prevAlpha * (1 - nextAlpha)) / outAlpha);
  buffer[index + 2] = Math.round((color.b * nextAlpha + buffer[index + 2] * prevAlpha * (1 - nextAlpha)) / outAlpha);
  buffer[index + 3] = Math.round(outAlpha * 255);
}

function circle(buffer, cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
        setPixel(buffer, x, y, color);
      }
    }
  }
}

function ellipse(buffer, cx, cy, rx, ry, color) {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) {
        setPixel(buffer, x, y, color);
      }
    }
  }
}

function line(buffer, x1, y1, x2, y2, width, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
  for (let i = 0; i <= steps; i += 1) {
    const t = steps ? i / steps : 0;
    circle(buffer, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
  }
}

function rect(buffer, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setPixel(buffer, xx, yy, color);
  }
}

function strokeRoundRect(buffer, x, y, w, h, r, width, color) {
  line(buffer, x + r, y, x + w - r, y, width, color);
  line(buffer, x + r, y + h, x + w - r, y + h, width, color);
  line(buffer, x, y + r, x, y + h - r, width, color);
  line(buffer, x + w, y + r, x + w, y + h - r, width, color);
  for (let a = 0; a <= 90; a += 2) {
    const rad = (a * Math.PI) / 180;
    circle(buffer, x + r - Math.cos(rad) * r, y + r - Math.sin(rad) * r, width / 2, color);
    circle(buffer, x + w - r + Math.cos(rad) * r, y + r - Math.sin(rad) * r, width / 2, color);
    circle(buffer, x + r - Math.cos(rad) * r, y + h - r + Math.sin(rad) * r, width / 2, color);
    circle(buffer, x + w - r + Math.cos(rad) * r, y + h - r + Math.sin(rad) * r, width / 2, color);
  }
}

function triangle(buffer, points, color) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  const area = (points[1][1] - points[2][1]) * (points[0][0] - points[2][0])
    + (points[2][0] - points[1][0]) * (points[0][1] - points[2][1]);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const a = ((points[1][1] - points[2][1]) * (x - points[2][0])
        + (points[2][0] - points[1][0]) * (y - points[2][1])) / area;
      const b = ((points[2][1] - points[0][1]) * (x - points[2][0])
        + (points[0][0] - points[2][0]) * (y - points[2][1])) / area;
      const c = 1 - a - b;
      if (a >= 0 && b >= 0 && c >= 0) setPixel(buffer, x, y, color);
    }
  }
}

function drawDesk(buffer, color) {
  strokeRoundRect(buffer, 18, 18, 45, 32, 7, 6, color);
  line(buffer, 40, 51, 40, 61, 6, color);
  line(buffer, 28, 64, 52, 64, 6, color);
  circle(buffer, 55, 26, 3, color);
}

function drawFish(buffer, color) {
  ellipse(buffer, 36, 41, 20, 14, color);
  triangle(buffer, [[55, 41], [70, 28], [70, 54]], color);
  triangle(buffer, [[30, 31], [39, 19], [44, 33]], color);
  circle(buffer, 25, 38, 3, { r: 255, g: 255, b: 255 });
}

function drawMeetup(buffer, color) {
  strokeRoundRect(buffer, 19, 18, 43, 46, 7, 5, color);
  line(buffer, 28, 14, 28, 24, 5, color);
  line(buffer, 53, 14, 53, 24, 5, color);
  line(buffer, 24, 31, 57, 31, 4, color);
  circle(buffer, 41, 47, 9, color);
  triangle(buffer, [[32, 50], [50, 50], [41, 65]], color);
  circle(buffer, 41, 47, 3, { r: 255, g: 255, b: 255 });
}

function drawUser(buffer, color) {
  circle(buffer, 40, 28, 13, color);
  ellipse(buffer, 40, 58, 24, 16, color);
  rect(buffer, 19, 58, 43, 10, color);
}

function crcTable() {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(file, rgba) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (SIZE * 4 + 1)] = 0;
    rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
  fs.writeFileSync(path.join(OUT_DIR, file), png);
}

const icons = [
  ["work", drawDesk],
  ["fish", drawFish],
  ["meetup", drawMeetup],
  ["profile", drawUser]
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [name, draw] of icons) {
  for (const [state, hex] of Object.entries(COLORS)) {
    const buffer = createCanvas();
    draw(buffer, hexToRgb(hex));
    writePng(`${name}-${state}.png`, buffer);
  }
}

console.log(`Generated ${icons.length * 2} tab icons in ${OUT_DIR}`);
