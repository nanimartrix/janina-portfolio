/* ============================
Breathing Study (Canvas)
Startet per Hover oder Click (Click = Restart)
============================ */

(() => {
  console.log("[breathing] loaded");

  const card = document.getElementById("breathingCard");
  const canvas = document.getElementById("breathingCanvas");
  const wrap = document.querySelector(".breathing-canvas-wrap");

  console.log("[breathing] card/canvas/wrap:", !!card, !!canvas, !!wrap);

  if (!card || !canvas || !wrap) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  // Accent-Orange
  const RGB = "255,138,61";
  const DPR_CAP = 2;

  // --- Feel / Tuning (ruhig.. 3–5 Impulse gleichzeitig) ---
  const cfg = {
    spawnEveryMs: 1800,
    maxActive: 5,
    minActive: 3,
    growSpeed: 24,
    maxRadiusFrac: 0.32,

    ringWidth: 1.5,
    ringAlpha: 0.4,

    dotAlpha: 0.65,
    dotBase: 1.8,
    dotPulseAmp: 0.9,
    dotPulseSpeed: 0.004,

    glowAlpha: 0.3,
    glowBlurMin: 8,
    glowBlurMax: 18,

    spawnXMin: 0.28,
    spawnXMax: 0.72,
    spawnYMin: 0.28,
    spawnYMax: 0.72,

    driftPxPerSec: 8,
  };

  let w = 0,
    h = 0,
    dpr = 1;

  let raf = null;
  let running = false;
  let armed = false;

  // Ripple objects
  const ripples = [];
  let lastSpawn = 0;
  let t0 = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnRipple() {
    if (ripples.length >= cfg.maxActive) return;

    const maxR = Math.min(w, h) * cfg.maxRadiusFrac;
    const speed = cfg.growSpeed * rand(0.85, 1.12);

    const drift = cfg.driftPxPerSec * rand(0.6, 1.1);
    const driftA = rand(0, Math.PI * 2);

    ripples.push({
      x: rand(w * cfg.spawnXMin, w * cfg.spawnXMax),
      y: rand(h * cfg.spawnYMin, h * cfg.spawnYMax),
      r: 0,
      maxR,
      speed,
      phase: rand(0, Math.PI * 2),
      dx: Math.cos(driftA) * drift,
      dy: Math.sin(driftA) * drift,
    });
  }

  function ensureMinimum() {
    while (ripples.length < cfg.minActive) spawnRipple();
  }

  function draw(now) {
    // FIX 1: dt niemals negativ (Tab-Wechsel / Restart Race)
    const dt = Math.max(0, Math.min(0.05, (now - t0) / 1000));
    t0 = now;

    if (!running) return; // extra safety

    if (now - lastSpawn > cfg.spawnEveryMs) {
      spawnRipple();
      lastSpawn = now;
    }

    ensureMinimum();

    ctx.clearRect(0, 0, w, h);

    const pulse = 0.5 + 0.5 * Math.sin(now * 0.0016);
    const glowBlur =
      cfg.glowBlurMin + (cfg.glowBlurMax - cfg.glowBlurMin) * pulse;

    ctx.save();
    ctx.shadowColor = `rgba(${RGB}, ${cfg.glowAlpha})`;
    ctx.shadowBlur = glowBlur;

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];

      rp.x += rp.dx * dt;
      rp.y += rp.dy * dt;
      rp.r += rp.speed * dt;

      const life = rp.maxR > 0 ? rp.r / rp.maxR : 1;

      const ringA = (1 - life * 0.85) * cfg.ringAlpha;
      const dotA = (1 - life * 0.6) * cfg.dotAlpha;

      // FIX 3: Radius clamp (nie negativ -> keine arc errors)
      const ringR = Math.max(0, rp.r);
      if (ringR > 0.01) {
        ctx.lineWidth = cfg.ringWidth;
        ctx.strokeStyle = `rgba(${RGB}, ${ringA})`;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Core (sollte eh positiv sein.. aber clamp macht es bulletproof)
      const coreRaw =
        cfg.dotBase +
        cfg.dotPulseAmp * Math.sin(now * cfg.dotPulseSpeed + rp.phase);
      const core = Math.max(0, coreRaw);

      if (core > 0.01) {
        ctx.fillStyle = `rgba(${RGB}, ${dotA})`;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, core, 0, Math.PI * 2);
        ctx.fill();
      }

      if (rp.r >= rp.maxR) ripples.splice(i, 1);
    }

    ctx.restore();

    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    ctx.clearRect(0, 0, w, h);
  }

  function startOrRestart(restart = false) {
    if (!armed) return;

    if (!running || restart) {
      // FIX 2: sauber stoppen + raf canceln.. dann Zeiten resetten
      stop();
      resize();

      ripples.length = 0;
      const initial = Math.floor(rand(cfg.minActive, cfg.maxActive + 1));
      for (let i = 0; i < initial; i++) spawnRipple();

      lastSpawn = performance.now();
      t0 = lastSpawn;

      running = true;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }
  }

  // Card open / close
  card.addEventListener("toggle", () => {
    console.log("[breathing] toggle", card.open);

    if (card.open) {
      armed = true;
      resize();
      ctx.clearRect(0, 0, w, h);
    } else {
      armed = false;
      stop();
    }
  });

  // Falls reload und schon offen
  if (card.open) {
    armed = true;
    resize();
    ctx.clearRect(0, 0, w, h);
  }

  // Trigger (robuster als mouseenter/click.. funktioniert auch auf Touch)
  const triggerStart = () => startOrRestart(false);
  const triggerRestart = () => startOrRestart(true);

  wrap.addEventListener("pointerenter", triggerStart, { passive: true });
  wrap.addEventListener("pointerdown", triggerRestart, { passive: true });

  canvas.addEventListener("pointerenter", triggerStart, { passive: true });
  canvas.addEventListener("pointerdown", triggerRestart, { passive: true });

  // Resize: nur wenn Card offen; wenn läuft -> restart
  window.addEventListener(
    "resize",
    () => {
      if (!armed) return;
      if (running) startOrRestart(true);
      else {
        resize();
        ctx.clearRect(0, 0, w, h);
      }
    },
    { passive: true },
  );
})();
