/* 
Idea — zspotter (IG @zzz_desu, TW @zspotter, EX play.ertdfgcvb.xyz/#/src/contributed/slime_dish)
Editor — Qwen 3.6-Plus
Direction — Vadim Andryukgin (IG & TG @vad8and, EM vad8and@gmail.com)
*/

(function() {
'use strict';
if (window.__slimeBgInitialized) return;
window.__slimeBgInitialized = true;

const canvas = document.createElement('canvas');
canvas.id = 'slime-bg';
canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;background:transparent;';
document.body.prepend(canvas);
const ctx = canvas.getContext('2d', { alpha: true });

const W = 500, H = 500;
const NUM = 1200;
const R = W / 2;
const SPD = 0.28;
const TURN = 0.22;
const DECAY = 0.965;
const DEP = 0.35;
const SENS_D = 14;
const MIN_CHEM = 0.002;

let chem = new Float32Array(W * H);
let wip = new Float32Array(W * H);
let smoothAlpha = new Float32Array(W * H);

const ax = new Float32Array(NUM), ay = new Float32Array(NUM);
const adx = new Float32Array(NUM), ady = new Float32Array(NUM);

for (let i = 0; i < NUM; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * R * 0.7;
  ax[i] = R + radius * Math.cos(angle);
  ay[i] = R + radius * Math.sin(angle);
  adx[i] = Math.cos(angle);
  ady[i] = Math.sin(angle);
}

const CR = 255, CG = 74, CB = 0;
const STEP = 7;
const MAX_DOTS = 5000;
const THRESHOLD = 0.02;

let view = { scale: 1, fx: 0.5, fy: 0.5 };
let target = { scale: 1, fx: 0.5, fy: 0.5 };
const EASE = 0.04;
let isDown = false, mx = 0.5, my = 0.5;
let zoomTimeout = null;
let canZoom = false;

function update() {
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx = y * W + x;
      const sum = chem[idx - W - 1] + chem[idx - W] + chem[idx - W + 1] + chem[idx - 1] + chem[idx] + chem[idx + 1] + chem[idx + W - 1] + chem[idx + W] + chem[idx + W + 1];
      const v = DECAY * (sum / 9);
      wip[idx] = v < MIN_CHEM ? 0 : v;
    }
  }
  const temp = chem; chem = wip; wip = temp;

  const cycleTime = performance.now() * 0.00007;
  const scatter = Math.sin(cycleTime) > 0.7 ? 1 : 0;

  for (let i = 0; i < NUM; i++) {
    const cx = ax[i], cy = ay[i];
    const dx = adx[i], dy = ady[i];

    const fVal = sample(cx + dx * SENS_D, cy + dy * SENS_D, scatter);
    const lVal = sample(cx + (dx * 0.7071 - dy * 0.7071) * SENS_D, cy + (dx * 0.7071 + dy * 0.7071) * SENS_D, scatter);
    const rVal = sample(cx + (dx * 0.7071 + dy * 0.7071) * SENS_D, cy + (-dx * 0.7071 + dy * 0.7071) * SENS_D, scatter);

    let rot = 0;
    if (fVal > lVal && fVal > rVal) rot = 0;
    else if (fVal < lVal && fVal < rVal) rot = Math.random() < 0.5 ? -TURN : TURN;
    else if (lVal > rVal) rot = TURN;
    else if (rVal > lVal) rot = -TURN;
    else if (fVal < 0) rot = Math.PI / 2;

    const ct = Math.cos(rot), st = Math.sin(rot);
    const ndx = dx * ct - dy * st;
    const ndy = dx * st + dy * ct;
    adx[i] = ndx; ady[i] = ndy;

    ax[i] += adx[i] * SPD;
    ay[i] += ady[i] * SPD;


    const bx = ax[i] - R, by = ay[i] - R;
    if (bx * bx + by * by > R * R - 2) {
      const dist = Math.hypot(bx, by) || 1;
      adx[i] = -bx / dist;
      ady[i] = -by / dist;
      ax[i] = R + bx * 0.98;
      ay[i] = R + by * 0.98;
    }

    const ix = ax[i] | 0, iy = ay[i] | 0;
    if (ix > 0 && ix < W - 1 && iy > 0 && iy < H - 1) {
      const idx = iy * W + ix;
      if (chem[idx] < 1) chem[idx] += DEP;
    }
  }

  const cw = canvas.width, ch = canvas.height;
  const baseScale = Math.min(cw, ch) / W * 0.9;

  if (canZoom) {
    target.scale = baseScale * 2.2;
    target.fx = mx; target.fy = my;
  } else {
    target.scale = baseScale;
    target.fx = 0.5; target.fy = 0.5;
  }

  view.scale += (target.scale - view.scale) * EASE;
  view.fx += (target.fx - view.fx) * EASE;
  view.fy += (target.fy - view.fy) * EASE;
}

function sample(x, y, mode) {
  const ix = x | 0, iy = y | 0;
  if (ix < 0 || ix >= W || iy < 0 || iy >= H) return -1;
  const v = chem[iy * W + ix];
  return mode === 1 ? 1 - v : v;
}

function draw() {
  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);
  const dw = W * view.scale, dh = H * view.scale;
  const ox = (cw - dw) * 0.5 + (0.5 - view.fx) * dw;
  const oy = (ch - dh) * 0.5 + (0.5 - view.fy) * dh;

  const t = performance.now() * 0.00015;
  ctx.fillStyle = `rgb(${CR}, ${CG}, ${CB})`;

  let count = 0;
  for (let y = 0; y < H; y += STEP) {
    for (let x = 0; x < W; x += STEP) {
      if (count >= MAX_DOTS) break;
      const idx = y * W + x;
      const val = chem[idx];

      const wave = 0.85 + 0.15 * Math.sin(t + x * 0.004 + y * 0.004);
      const targetAlpha = val > THRESHOLD ? Math.pow(val, 0.45) * wave : 0;

      smoothAlpha[idx] += (targetAlpha - smoothAlpha[idx]) * 0.14;
      const alpha = smoothAlpha[idx];

      const radius = alpha * STEP * 0.45 * view.scale;

      const phaseX = Math.sin(t * 0.6 + x * 0.01 + y * 0.01) * STEP * 0.06 * view.scale;
      const phaseY = Math.cos(t * 0.6 + x * 0.01 + y * 0.01) * STEP * 0.06 * view.scale;

      const px = ox + x * view.scale + view.scale * 0.5 + phaseX;
      const py = oy + y * view.scale + view.scale * 0.5 + phaseY;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      count++;
    }
    if (count >= MAX_DOTS) break;
  }
  ctx.globalAlpha = 1;
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  target.scale = Math.min(canvas.width, canvas.height) / W * 0.9;
}
window.addEventListener('resize', resize);
resize();

function startHold(e) {
  isDown = true;
  canZoom = false;
  if (zoomTimeout) clearTimeout(zoomTimeout);
  
  zoomTimeout = setTimeout(() => {
    if (isDown) {
      canZoom = true;
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';

      if (e.touches) {
        mx = e.touches[0].clientX / window.innerWidth;
        my = e.touches[0].clientY / window.innerHeight;
      }
    }
  }, 1000); 
}

function endHold() {
  isDown = false;
  canZoom = false;
  
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';
  document.body.style.mozUserSelect = '';
  document.body.style.msUserSelect = '';
  
  if (zoomTimeout) {
    clearTimeout(zoomTimeout);
    zoomTimeout = null;
  }
}

window.addEventListener('mousemove', e => {
  if (isDown) {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
  }
});
window.addEventListener('mousedown', startHold);
window.addEventListener('mouseup', endHold);

window.addEventListener('touchstart', startHold, { passive: true });
window.addEventListener('touchend', endHold);
window.addEventListener('touchmove', e => {
  if (isDown) {
    mx = e.touches[0].clientX / window.innerWidth;
    my = e.touches[0].clientY / window.innerHeight;
  }
}, { passive: true });

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();