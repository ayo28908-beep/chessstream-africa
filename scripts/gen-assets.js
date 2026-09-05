// Generates og-image.png, icon.png, apple-icon.png, logo.png with a pure-Node PNG encoder.
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- tiny 5x7 font (A-Z, 0-9, space, dot, hyphen) ----------
const FONT = {
  A: [".###.","#...#","#...#","#####","#...#","#...#","#...#"],
  B: ["####.","#...#","#...#","####.","#...#","#...#","####."],
  C: [".####","#....","#....","#....","#....","#....",".####"],
  D: ["####.","#...#","#...#","#...#","#...#","#...#","####."],
  E: ["#####","#....","#....","####.","#....","#....","#####"],
  F: ["#####","#....","#....","####.","#....","#....","#...."],
  G: [".####","#....","#....","#.###","#...#","#...#",".####"],
  H: ["#...#","#...#","#...#","#####","#...#","#...#","#...#"],
  I: ["#####","..#..","..#..","..#..","..#..","..#..","#####"],
  J: ["..###","...#.","...#.","...#.","...#.","#..#.",".##.."],
  K: ["#...#","#..#.","#.#..","##...","#.#..","#..#.","#...#"],
  L: ["#....","#....","#....","#....","#....","#....","#####"],
  M: ["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"],
  N: ["#...#","##..#","#.#.#","#..##","#...#","#...#","#...#"],
  O: [".###.","#...#","#...#","#...#","#...#","#...#",".###."],
  P: ["####.","#...#","#...#","####.","#....","#....","#...."],
  Q: [".###.","#...#","#...#","#...#","#.#.#","#..#.",".##.#"],
  R: ["####.","#...#","#...#","####.","#.#..","#..#.","#...#"],
  S: [".####","#....","#....",".###.","....#","....#","####."],
  T: ["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
  U: ["#...#","#...#","#...#","#...#","#...#","#...#",".###."],
  V: ["#...#","#...#","#...#","#...#","#...#",".#.#.","..#.."],
  W: ["#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"],
  X: ["#...#","#...#",".#.#.","..#..",".#.#.","#...#","#...#"],
  Y: ["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."],
  Z: ["#####","....#","...#.","..#..",".#...","#....","#####"],
  "0": [".###.","#...#","#..##","#.#.#","##..#","#...#",".###."],
  "1": ["..#..",".##..","..#..","..#..","..#..","..#..",".###."],
  "2": [".###.","#...#","....#","...#.", "..#..",".#...","#####"],
  "3": [".###.","#...#","....#",".###.","....#","#...#",".###."],
  "4": ["...#.",".##..",".#.#.","#..#.","#####","...#.","...#."],
  "5": ["#####","#....","####.","....#","....#","#...#",".###."],
  "6": [".###.","#....","#....","####.","#...#","#...#",".###."],
  "7": ["#####","....#","...#.","..#..",".#...",".#...",".#..."],
  "8": [".###.","#...#","#...#",".###.","#...#","#...#",".###."],
  "9": [".###.","#...#","#...#",".####","....#","....#",".###."],
  " ": [".....",".....",".....",".....",".....",".....","....."],
  ".": [".....",".....",".....",".....",".....","..#..","..#.."],
  "-": [".....",".....",".....","#####",".....",".....","....."],
};
// ---------- canvas helpers (direct pixel buffer) ----------
function makeCanvas(w, h, bg) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = bg[0]; buf[i * 4 + 1] = bg[1]; buf[i * 4 + 2] = bg[2]; buf[i * 4 + 3] = bg[3];
  }
  return { w, h, buf };
}

function setPixel(c, x, y, color) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.buf[i] = color[0]; c.buf[i + 1] = color[1]; c.buf[i + 2] = color[2]; c.buf[i + 3] = color[3];
}

function fillRect(c, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPixel(c, xx, yy, color);
}

function drawText(c, text, x, y, scale, color) {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const glyph = FONT[ch] || FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[r][col] === "#") {
          fillRect(c, cx + col * scale, y + r * scale, scale, scale, color);
        }
      }
    }
    cx += 6 * scale;
  }
  return cx;
}

function drawBoard(c, x, y, boardSize, squarePx, light, dark) {
  for (let r = 0; r < 8; r++) {
    for (let col = 0; col < 8; col++) {
      const color = (r + col) % 2 === 0 ? light : dark;
      fillRect(c, x + col * squarePx, y + r * squarePx, squarePx, squarePx, color);
    }
  }
}

// Brand colors
const BG = [13, 17, 23, 255];
const BG_RAISED = [22, 27, 34, 255];
const GREEN = [46, 160, 67, 255];
const GOLD = [240, 180, 41, 255];
const LIGHT_SQ = [238, 238, 210, 255];
const DARK_SQ = [118, 150, 86, 255];
const TEXT = [230, 237, 243, 255];
const MUTED = [139, 148, 158, 255];

// ---------- OG image 1200x630 ----------
const og = makeCanvas(1200, 630, BG);
// subtle top band
fillRect(og, 0, 0, 1200, 6, GREEN);
// chessboard on the right
drawBoard(og, 780, 115, 400, 50, LIGHT_SQ, DARK_SQ);
// gold frame around the board
fillRect(og, 770, 105, 420, 8, GOLD);
fillRect(og, 770, 105, 8, 420, GOLD);
fillRect(og, 1182, 105, 8, 420, GOLD);
fillRect(og, 770, 517, 420, 8, GOLD);
// headline
drawText(og, "CHESSSTREAM", 70, 190, 14, GOLD);
drawText(og, "AFRICA", 70, 310, 14, TEXT);
// rule
fillRect(og, 70, 400, 320, 4, GREEN);
// subtitle
drawText(og, "LIVE CHESS BROADCASTING", 70, 440, 5, TEXT);
drawText(og, "FOR AFRICAN TOURNAMENTS", 70, 480, 5, MUTED);
fs.writeFileSync(path.join("public", "og-image.png"), encodePNG(og.w, og.h, og.buf));
console.log("og-image.png", og.w + "x" + og.h);

// ---------- icon 256x256 (chessboard mark) ----------
function makeIcon(size) {
  const c = makeCanvas(size, size, BG);
  const sq = Math.floor(size / 8);
  const offset = Math.floor((size - sq * 8) / 2);
  drawBoard(c, offset, offset, size, sq, LIGHT_SQ, DARK_SQ);
  // gold border ring
  fillRect(c, offset - Math.floor(size * 0.03), offset - Math.floor(size * 0.03), size, Math.floor(size * 0.03), GOLD);
  fillRect(c, offset - Math.floor(size * 0.03), offset + sq * 8, size, Math.floor(size * 0.03), GOLD);
  fillRect(c, offset - Math.floor(size * 0.03), offset, Math.floor(size * 0.03), sq * 8, GOLD);
  fillRect(c, offset + sq * 8, offset, Math.floor(size * 0.03), sq * 8, GOLD);
  return c;
}

const icon = makeIcon(256);
fs.writeFileSync(path.join("public", "icon.png"), encodePNG(icon.w, icon.h, icon.buf));
console.log("icon.png", icon.w + "x" + icon.h);

const apple = makeIcon(180);
fs.writeFileSync(path.join("public", "apple-icon.png"), encodePNG(apple.w, apple.h, apple.buf));
console.log("apple-icon.png", apple.w + "x" + apple.h);

// ---------- logo 512x512 (board + CS mark) ----------
const logo = makeCanvas(512, 512, BG);
const sq = 48;
drawBoard(logo, 40, 40, 8 * sq, sq, LIGHT_SQ, DARK_SQ);
fillRect(logo, 40 - 14, 40 - 14, 8 * sq + 28, 14, GOLD);
fillRect(logo, 40 - 14, 40 + 8 * sq, 8 * sq + 28, 14, GOLD);
fillRect(logo, 40 - 14, 40, 14, 8 * sq, GOLD);
fillRect(logo, 40 + 8 * sq, 40, 14, 8 * sq, GOLD);
drawText(logo, "CS", 76, 120, 8, GOLD);
fs.writeFileSync(path.join("public", "logo.png"), encodePNG(logo.w, logo.h, logo.buf));
console.log("logo.png", logo.w + "x" + logo.h);
