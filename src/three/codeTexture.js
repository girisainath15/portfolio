import * as THREE from 'three';

// Canvas painters for the corridor: code windows, decorative "ghost" panels and the 0/1 glyph atlas.

const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';

const C = {
  body: 'rgba(4, 17, 22, 1)',
  sheen: 'rgba(94, 242, 227, 0.07)',
  border: 'rgba(140, 246, 236, 0.92)',
  bar: '#9feaf2',
  barInk: '#04252b',
  barBg: 'rgba(159, 234, 242, 0.1)',
  gutter: 'rgba(130, 205, 210, 0.42)',
  text: '#c9eef3',
  comment: '#5f9199',
  string: '#9df5c2',
  keyword: '#5ef2e3',
  fn: '#8fd3ff',
  key: '#7fe9ff',
  number: '#ffc66b',
  punct: '#7da9b0',
  ok: '#6dfa9f',
};

const KEYWORDS = new Set(['from', 'import', 'for', 'in', 'def', 'return', 'True', 'False', 'None', 'with', 'as', 'if', 'else', 'and', 'or', 'not', 'class', 'lambda']);

export async function whenFontsReady(timeout = 2500) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const load = Promise.all([document.fonts.load(`500 24px ${MONO}`), document.fonts.load(`600 26px ${MONO}`)]).catch(() => {});
  await Promise.race([load, new Promise((r) => setTimeout(r, timeout))]);
}

function commentStart(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '#') return i;
  }
  return -1;
}

export function tokenizeLine(line, lang) {
  const out = [];
  const cut = commentStart(line);
  const code = cut >= 0 ? line.slice(0, cut) : line;
  const re = /("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|(@?[A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(code))) {
    const [tok, str, num, ident] = m;
    if (str) out.push([tok, 'string']);
    else if (num) out.push([tok, 'number']);
    else if (ident) {
      const rest = code.slice(re.lastIndex);
      if (KEYWORDS.has(ident)) out.push([tok, 'keyword']);
      else if (lang === 'yaml' && /^\s*:/.test(rest)) out.push([tok, 'key']);
      else if (/^\s*=(?!=)/.test(rest)) out.push([tok, 'key']);
      else if (/^\s*\(/.test(rest) || ident.startsWith('@') || /^[A-Z][A-Za-z]+$/.test(ident) || /^[A-Z_]{3,}$/.test(ident)) out.push([tok, 'fn']);
      else out.push([tok, 'text']);
    } else if (/^\s+$/.test(tok)) out.push([tok, 'text']);
    else out.push([tok, 'punct']);
  }
  if (cut >= 0) out.push([line.slice(cut), 'comment']);
  return out;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function toTexture(canvas, gl) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, gl?.capabilities.getMaxAnisotropy?.() || 1);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export function codeWindowTexture({ file, source, lang = 'python', status = 'shipped' }, gl) {
  const W = 1280;
  const H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');

  roundRect(g, 4, 4, W - 8, H - 8, 26);
  g.fillStyle = C.body;
  g.fill();
  const sheen = g.createLinearGradient(0, 0, 0, H);
  sheen.addColorStop(0, C.sheen);
  sheen.addColorStop(0.6, 'rgba(94, 242, 227, 0)');
  g.fillStyle = sheen;
  g.fill();

  g.save();
  roundRect(g, 4, 4, W - 8, H - 8, 26);
  g.clip();
  // title bar: pale tab with the file name, like the reference panels
  const barH = 66;
  g.fillStyle = C.barBg;
  g.fillRect(0, 0, W, barH);
  g.font = `600 26px ${MONO}`;
  const tabW = g.measureText(file).width + 74;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(tabW, 0);
  g.lineTo(tabW + 30, barH);
  g.lineTo(0, barH);
  g.closePath();
  g.fillStyle = C.bar;
  g.fill();
  g.fillStyle = C.barInk;
  g.fillText(file, 32, barH / 2 + 9);
  // window controls
  g.strokeStyle = 'rgba(159, 234, 242, 0.65)';
  g.lineWidth = 2.5;
  [0, 1, 2].forEach((i) => g.strokeRect(W - 150 + i * 42, barH / 2 - 10, 20, 20));
  g.fillStyle = 'rgba(159, 234, 242, 0.35)';
  g.fillRect(0, barH, W, 2);

  // code
  const lines = source.split('\n');
  const lh = 38;
  const top = barH + 50;
  const gx = 84;
  g.font = `500 24px ${MONO}`;
  g.textBaseline = 'alphabetic';
  lines.forEach((line, i) => {
    const y = top + i * lh;
    if (y > H - 76) return;
    g.fillStyle = C.gutter;
    g.textAlign = 'right';
    g.fillText(String(i + 1), gx - 26, y);
    g.textAlign = 'left';
    let x = gx;
    for (const [tok, kind] of tokenizeLine(line, lang)) {
      g.fillStyle = C[kind] || C.text;
      g.fillText(tok, x, y);
      x += g.measureText(tok).width;
    }
  });
  // cursor on the last line
  g.fillStyle = 'rgba(94, 242, 227, 0.75)';
  g.fillRect(gx, top + (lines.length - 1) * lh + 10, 13, 4);

  // status bar
  const sy = H - 56;
  g.fillStyle = C.barBg;
  g.fillRect(0, sy, W, 56);
  g.font = `500 20px ${MONO}`;
  g.fillStyle = C.gutter;
  g.fillText(`main   UTF-8   ${lang === 'yaml' ? 'YAML' : 'Python'}   ${lines.length} lines`, 32, sy + 35);
  g.fillStyle = C.ok;
  g.textAlign = 'right';
  g.fillText(`● ${status}`, W - 34, sy + 35);
  g.restore();

  // border
  roundRect(g, 4, 4, W - 8, H - 8, 26);
  g.lineWidth = 4;
  g.strokeStyle = C.border;
  g.stroke();

  return toTexture(canvas, gl);
}

// Abstract code: coloured bars on a panel, read as "code" at a glance without being legible.
export function ghostPanelTexture(seed, gl) {
  const W = 512;
  const H = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  roundRect(g, 3, 3, W - 6, H - 6, 12);
  g.fillStyle = 'rgba(6, 26, 32, 0.7)';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(120, 230, 225, 0.75)';
  g.stroke();
  g.fillStyle = 'rgba(159, 234, 242, 0.55)';
  g.fillRect(3, 3, 150 + rand() * 80, 26);
  const palette = ['#5ef2e3', '#8fd3ff', '#9df5c2', '#c9eef3', '#5f9199', '#ffc66b'];
  for (let row = 0; row < 11; row++) {
    let x = 26 + (rand() < 0.4 ? 26 * Math.floor(rand() * 3) : 0);
    const y = 50 + row * 23;
    const pieces = 1 + Math.floor(rand() * 4);
    for (let p = 0; p < pieces && x < W - 40; p++) {
      const w = 24 + rand() * 110;
      g.fillStyle = palette[Math.floor(rand() * palette.length)];
      g.globalAlpha = 0.5 + rand() * 0.4;
      g.fillRect(x, y, Math.min(w, W - 30 - x), 9);
      x += w + 12;
    }
  }
  g.globalAlpha = 1;
  return toTexture(canvas, gl);
}

export function digitAtlasTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff';
  g.font = `700 52px ${MONO}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('0', 32, 34);
  g.fillText('1', 96, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
