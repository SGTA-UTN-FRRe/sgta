import fs from "node:fs";
import zlib from "node:zlib";

export function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let idat = [];
  let width = 0;
  let height = 0;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    if (type === "IHDR") {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === "IDAT") {
      idat.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4 + 1;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    decompressed.copy(rgba, y * width * 4, y * stride + 1, y * stride + 1 + width * 4);
  }
  return { width, height, rgba };
}

export function traceContours(width, height, binaryGrid) {
  const pw = width + 2;
  const ph = height + 2;
  const pgrid = new Uint8Array(pw * ph);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pgrid[(y + 1) * pw + (x + 1)] = binaryGrid[y * width + x];
    }
  }

  const edges = new Map();
  for (let y = 0; y < ph - 1; y++) {
    for (let x = 0; x < pw - 1; x++) {
      const top = pgrid[y * pw + x];
      const bot = pgrid[(y + 1) * pw + x];
      if (top !== bot) {
        const startX = top === 0 ? x : x + 1;
        const endX = top === 0 ? x + 1 : x;
        const edgeY = y + 1;
        const key = `${startX},${edgeY}`;
        if (!edges.has(key)) edges.set(key, []);
        edges.get(key).push([endX, edgeY]);
      }
      const left = pgrid[y * pw + x];
      const right = pgrid[y * pw + (x + 1)];
      if (left !== right) {
        const startY = left === 0 ? y + 1 : y;
        const endY = left === 0 ? y : y + 1;
        const edgeX = x + 1;
        const key = `${edgeX},${startY}`;
        if (!edges.has(key)) edges.set(key, []);
        edges.get(key).push([edgeX, endY]);
      }
    }
  }

  const loops = [];
  while (edges.size > 0) {
    const startKey = edges.keys().next().value;
    const [sx, sy] = startKey.split(",").map(Number);
    let curX = sx;
    let curY = sy;
    const loop = [[curX - 1, curY - 1]];
    while (true) {
      const key = `${curX},${curY}`;
      const nextList = edges.get(key);
      if (!nextList || nextList.length === 0) {
        edges.delete(key);
        break;
      }
      const [nx, ny] = nextList.pop();
      if (nextList.length === 0) edges.delete(key);
      if (nx === sx && ny === sy) break;
      loop.push([nx - 1, ny - 1]);
      curX = nx;
      curY = ny;
    }
    if (loop.length > 3) loops.push(loop);
  }
  return loops;
}

function perpendicularDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy);
}

export function douglasPeucker(pts, epsilon) {
  if (pts.length <= 2) return pts;
  let dmax = 0;
  let index = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicularDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > dmax) {
      dmax = d;
      index = i;
    }
  }
  if (dmax > epsilon) {
    return douglasPeucker(pts.slice(0, index + 1), epsilon)
      .slice(0, -1)
      .concat(douglasPeucker(pts.slice(index), epsilon));
  }
  return [pts[0], pts[pts.length - 1]];
}

