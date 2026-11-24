const canvas = document.getElementById('vector-canvas');
const ctx = canvas.getContext('2d');

// State vektor u, v, dan bobot w
const state = {
  u: { x: 4, y: 3, z: 0 },
  v: { x: 5, y: 0, z: 0 },
  w: { x: 1, y: 1, z: 1 },
  showProj: true,
  showGrid: true,
  dragging: null, // 'u' | 'v' | null
};

const SCALE = 32; // piksel per 1 satuan koordinat

function getOrigin() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
  };
}

function toCanvasCoords(vx, vy) {
  const origin = getOrigin();
  return {
    x: origin.x + vx * SCALE,
    y: origin.y - vy * SCALE,
  };
}

function toWorldCoords(cx, cy) {
  const origin = getOrigin();
  return {
    x: Math.round(((cx - origin.x) / SCALE) * 10) / 10,
    y: Math.round(((origin.y - cy) / SCALE) * 10) / 10,
  };
}

// Perhitungan matematika Inner Product
function computeMetrics() {
  const { u, v, w } = state;

  // Inner product (terbobot jika w != 1)
  const termX = w.x * u.x * v.x;
  const termY = w.y * u.y * v.y;
  const termZ = w.z * u.z * v.z;
  const innerProduct = termX + termY + termZ;

  // Norma terinduksi: ||u||_W = sqrt(<u, u>_W)
  const normUSq = w.x * u.x * u.x + w.y * u.y * u.y + w.z * u.z * u.z;
  const normVSq = w.x * v.x * v.x + w.y * v.y * v.y + w.z * v.z * v.z;
  const normU = Math.sqrt(normUSq);
  const normV = Math.sqrt(normVSq);

  let cosTheta = 0;
  let angleDeg = 0;
  if (normU > 1e-9 && normV > 1e-9) {
    cosTheta = Math.max(-1, Math.min(1, innerProduct / (normU * normV)));
    angleDeg = (Math.acos(cosTheta) * 180) / Math.PI;
  }

  // Proyeksi skalar & vektor u pada v
  let scalarProj = 0;
  let projFactor = 0;
  if (normV > 1e-9) {
    scalarProj = innerProduct / normV;
    projFactor = innerProduct / normVSq;
  }

  const projVec = {
    x: projFactor * v.x,
    y: projFactor * v.y,
    z: projFactor * v.z,
  };

  return {
    termX,
    termY,
    termZ,
    innerProduct,
    normU,
    normV,
    normVSq,
    cosTheta,
    angleDeg,
    scalarProj,
    projFactor,
    projVec,
  };
}

// Menggambar panah vektor
function drawArrow(fromX, fromY, toX, toY, color, width = 3, label = '') {
  const headLen = 11;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;

  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Kepala panah
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  // Titik handle di ujung vektor
  if (label) {
    ctx.beginPath();
    ctx.arc(toX, toY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 13px Segoe UI, sans-serif';
    const offsetX = 12 * Math.cos(angle);
    const offsetY = 12 * Math.sin(angle);
    ctx.fillText(label, toX + offsetX - 6, toY + offsetY + 4);
  }

  ctx.restore();
}

function renderCanvas(metrics) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const origin = getOrigin();

  // 1. Gambar Grid
  if (state.showGrid) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';

    for (let i = -10; i <= 10; i++) {
      const p = toCanvasCoords(i, i);
      // Garis vertikal
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, canvas.height);
      ctx.stroke();
      // Garis horizontal
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(canvas.width, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Sumbu X dan Y
  ctx.save();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(canvas.width, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, canvas.height);
  ctx.stroke();

  // Label angka sumbu
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Consolas, monospace';
  for (let i = -9; i <= 9; i += 2) {
    if (i === 0) continue;
    const p = toCanvasCoords(i, i);
    ctx.fillText(i.toString(), p.x - 6, origin.y + 15);
    ctx.fillText(i.toString(), origin.x + 6, p.y + 4);
  }
  ctx.restore();

  const uPos = toCanvasCoords(state.u.x, state.u.y);
  const vPos = toCanvasCoords(state.v.x, state.v.y);
  const projPos = toCanvasCoords(metrics.projVec.x, metrics.projVec.y);

  // 3. Busur Sudut theta (2D projection)
  const lenU2D = Math.hypot(state.u.x, state.u.y);
  const lenV2D = Math.hypot(state.v.x, state.v.y);
  if (lenU2D > 0.3 && lenV2D > 0.3) {
    const angU = Math.atan2(-state.u.y, state.u.x);
    const angV = Math.atan2(-state.v.y, state.v.x);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    let diff = angU - angV;
    while (diff <= -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    ctx.arc(origin.x, origin.y, 38, angV, angV + diff, diff < 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Garis & Vektor Proyeksi u pada v
  if (state.showProj && lenV2D > 0.1) {
    // Garis putus-putus perpanjangan v jika proyeksi di luar segmen v
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(projPos.x, projPos.y);
    ctx.stroke();

    // Garis tegak lurus dari ujung u ke titik proyeksi
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(uPos.x, uPos.y);
    ctx.lineTo(projPos.x, projPos.y);
    ctx.stroke();
    ctx.restore();

    // Vektor proyeksi ungu
    drawArrow(origin.x, origin.y, projPos.x, projPos.y, '#a855f7', 4, 'proj');
  }

  // 5. Gambar Vektor v dan u
  drawArrow(origin.x, origin.y, vPos.x, vPos.y, '#fb923c', 3.5, `v (${state.v.x}, ${state.v.y})`);
  drawArrow(origin.x, origin.y, uPos.x, uPos.y, '#38bdf8', 3.5, `u (${state.u.x}, ${state.u.y})`);
}

function updateUI() {
  const m = computeMetrics();
  const { u, v, w } = state;

  // Sinkronisasi input slider & number
  ['x', 'y', 'z'].forEach((axis) => {
    document.getElementById(`u${axis}`).value = u[axis];
    document.getElementById(`u${axis}-num`).value = u[axis];
    document.getElementById(`v${axis}`).value = v[axis];
    document.getElementById(`v${axis}-num`).value = v[axis];
  });

  document.getElementById('u-norm-label').textContent = `||u|| = ${m.normU.toFixed(2)}`;
  document.getElementById('v-norm-label').textContent = `||v|| = ${m.normV.toFixed(2)}`;

  document.getElementById('val-inner').textContent = m.innerProduct.toFixed(2);
  document.getElementById('val-angle').textContent = `${m.angleDeg.toFixed(2)}°`;
  document.getElementById('val-cos').textContent = m.cosTheta.toFixed(3);
  document.getElementById('val-scalar-proj').textContent = m.scalarProj.toFixed(2);

  // Status Badge & Deskripsi
  const badge = document.getElementById('angle-badge');
  const desc = document.getElementById('status-description');
  if (Math.abs(m.innerProduct) < 1e-2) {
    badge.textContent = 'Ortogonal (⟨u, v⟩ = 0)';
    badge.className = 'status-badge badge-Zero';
    desc.textContent = 'Kedua vektor saling tegak lurus (90°). Proyeksi vektor u pada v bernilai nol.';
  } else if (m.innerProduct > 0) {
    badge.textContent = 'Sudut Lancip (⟨u, v⟩ > 0)';
    badge.className = 'status-badge badge-positive';
    desc.textContent = 'Inner product positif: kedua vektor memiliki arah yang cenderung searah (θ < 90°).';
  } else {
    badge.textContent = 'Sudut Tumpul (⟨u, v⟩ < 0)';
    badge.className = 'status-badge badge-negative';
    desc.textContent = 'Inner product negatif: kedua vektor mengarah berlawanan (θ > 90°).';
  }

  // Penjelasan rumus langkah demi langkah
  const isWeighted = w.x !== 1 || w.y !== 1 || w.z !== 1;
  const algFormula = isWeighted
    ? `⟨u, v⟩_W = (${w.x})(${u.x})(${v.x}) + (${w.y})(${u.y})(${v.y}) + (${w.z})(${u.z})(${v.z})\n        = ${m.termX.toFixed(2)} + ${m.termY.toFixed(2)} + ${m.termZ.toFixed(2)} = ${m.innerProduct.toFixed(2)}`
    : `⟨u, v⟩ = (${u.x})(${v.x}) + (${u.y})(${v.y}) + (${u.z})(${v.z})\n      = ${m.termX.toFixed(2)} + ${m.termY.toFixed(2)} + ${m.termZ.toFixed(2)} = ${m.innerProduct.toFixed(2)}`;

  document.getElementById('math-algebraic').textContent = algFormula;

  document.getElementById('math-geometric').textContent =
    `⟨u, v⟩ = ||u|| · ||v|| · cos(θ)\n` +
    `      = ${m.normU.toFixed(2)} × ${m.normV.toFixed(2)} × cos(${m.angleDeg.toFixed(2)}°)\n` +
    `      = ${m.normU.toFixed(2)} × ${m.normV.toFixed(2)} × ${m.cosTheta.toFixed(4)} = ${m.innerProduct.toFixed(2)}`;

  document.getElementById('math-projection').textContent =
    `proj_v(u) = (⟨u, v⟩ / ||v||²) · v\n` +
    `          = (${m.innerProduct.toFixed(2)} / ${m.normVSq.toFixed(2)}) · (${v.x}, ${v.y}, ${v.z})\n` +
    `          = (${m.projVec.x.toFixed(2)}, ${m.projVec.y.toFixed(2)}, ${m.projVec.z.toFixed(2)})`;

  renderCanvas(m);
}

// Event Listener Input Slider & Number
['u', 'v'].forEach((vec) => {
  ['x', 'y', 'z'].forEach((axis) => {
    const slider = document.getElementById(`${vec}${axis}`);
    const num = document.getElementById(`${vec}${axis}-num`);

    slider.addEventListener('input', (e) => {
      state[vec][axis] = parseFloat(e.target.value) || 0;
      updateUI();
    });

    num.addEventListener('input', (e) => {
      const val = Math.max(-8, Math.min(8, parseFloat(e.target.value) || 0));
      state[vec][axis] = val;
      updateUI();
    });
  });
});

// Event Listener Bobot W
['x', 'y', 'z'].forEach((axis) => {
  document.getElementById(`w${axis}`).addEventListener('input', (e) => {
    const val = Math.max(0.1, parseFloat(e.target.value) || 1);
    state.w[axis] = val;
    updateUI();
  });
});

document.getElementById('reset-weights').addEventListener('click', () => {
  state.w = { x: 1, y: 1, z: 1 };
  ['x', 'y', 'z'].forEach((axis) => {
    document.getElementById(`w${axis}`).value = 1;
  });
  updateUI();
});

// Toggle Proyeksi & Grid
document.getElementById('toggle-proj').addEventListener('change', (e) => {
  state.showProj = e.target.checked;
  updateUI();
});

document.getElementById('toggle-grid').addEventListener('change', (e) => {
  state.showGrid = e.target.checked;
  updateUI();
});

// Preset Tombol
document.querySelectorAll('.btn-preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    if (preset === 'acute') {
      state.u = { x: 4, y: 3, z: 0 };
      state.v = { x: 5, y: 0, z: 0 };
    } else if (preset === 'orthogonal') {
      state.u = { x: 0, y: 4, z: 0 };
      state.v = { x: 5, y: 0, z: 0 };
    } else if (preset === 'obtuse') {
      state.u = { x: -4, y: 3, z: 0 };
      state.v = { x: 5, y: 0, z: 0 };
    } else if (preset === 'parallel') {
      state.u = { x: 3, y: 2, z: 0 };
      state.v = { x: 6, y: 4, z: 0 };
    } else if (preset === 'random') {
      const rand = () => Math.round((Math.random() * 12 - 6) * 2) / 2;
      state.u = { x: rand(), y: rand(), z: 0 };
      state.v = { x: rand(), y: rand(), z: 0 };
    }
    updateUI();
  });
});

// Interaksi Drag & Drop langsung di Kanvas
function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function handlePointerDown(evt) {
  const pos = getMousePos(evt);
  const uPos = toCanvasCoords(state.u.x, state.u.y);
  const vPos = toCanvasCoords(state.v.x, state.v.y);

  const distU = Math.hypot(pos.x - uPos.x, pos.y - uPos.y);
  const distV = Math.hypot(pos.x - vPos.x, pos.y - vPos.y);

  if (distU < 18 && distU <= distV) {
    state.dragging = 'u';
  } else if (distV < 18) {
    state.dragging = 'v';
  }
}

function handlePointerMove(evt) {
  if (!state.dragging) return;
  evt.preventDefault();
  const pos = getMousePos(evt);
  const world = toWorldCoords(pos.x, pos.y);
  state[state.dragging].x = Math.max(-8, Math.min(8, world.x));
  state[state.dragging].y = Math.max(-8, Math.min(8, world.y));
  updateUI();
}

function handlePointerUp() {
  state.dragging = null;
}

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);

canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
window.addEventListener('touchend', handlePointerUp);

// Inisialisasi awal
updateUI();
