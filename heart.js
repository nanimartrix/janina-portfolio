/* ============================
3) Heart Study (Canvas)
Startet per Hover oder Click (auch restart)
============================ */

(() => {
  const card = document.getElementById("heartCard");
  const canvas = document.getElementById("heartCanvas");
  const wrap = document.querySelector(".heart-canvas-wrap");
  if (!card || !canvas || !wrap) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  // ===== Tuning =====
  const COUNT = 520;
  const DOT_RGB = "255,138,61"; // orange glow
  const SETTLE = 0.06; // wie schnell Partikel zum Ziel ziehen
  const DRIFT = 0.08; // leichtes "Einschweben"
  const PULSE_SPEED = 0.025; // minimaler Glow-Puls
  const DPR_CAP = 2;

  let w = 0;
  let h = 0;
  let dpr = 1;

  let raf = null;
  let running = false;
  let armed = false; // Card offen? dann darf gestartet werden

  const rand = (min, max) => Math.random() * (max - min) + min;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Klassische parametric heart
  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);

    return { x, y };
  }

  function buildTargets() {
    const targets = [];

    const scale = Math.min(w, h) * 0.028;
    const cx = w * 0.5;
    const cy = h * 0.47;

    for (let i = 0; i < COUNT; i++) {
      const t = (i / COUNT) * Math.PI * 2;
      const p = heartPoint(t);

      targets.push({
        x: cx + p.x * scale,
        y: cy - p.y * scale,
      });
    }

    return targets;
  }

  let targets = [];
  const particles = [];

  function seed() {
    targets = buildTargets();
    particles.length = 0;

    const startRadius = Math.min(w, h) * 0.6;

    for (let i = 0; i < COUNT; i++) {
      const a = rand(0, Math.PI * 2);
      const r = startRadius * rand(0.65, 1);

      particles.push({
        x: w * 0.5 + Math.cos(a) * r,
        y: h * 0.5 + Math.sin(a) * r,
        tx: targets[i].x,
        ty: targets[i].y,
        vx: rand(-DRIFT, DRIFT),
        vy: rand(-DRIFT, DRIFT),
        r: rand(0.8, 1.9),
        a: rand(0.35, 0.85),
      });
    }
  }

  let pulse = 0;

  function draw() {
    ctx.clearRect(0, 0, w, h);

    pulse += PULSE_SPEED;
    const bell = 0.5 + 0.5 * Math.sin(pulse);

    const glowAlpha = 0.18 + 0.18 * bell;
    const glowBlur = 10 + 18 * bell;

    ctx.save();
    ctx.shadowColor = `rgba(${DOT_RGB}, ${glowAlpha})`;
    ctx.shadowBlur = glowBlur;

    for (const p of particles) {
      p.x += (p.tx - p.x) * SETTLE + p.vx * 0.1;
      p.y += (p.ty - p.y) * SETTLE + p.vy * 0.1;

      p.vx *= 0.985;
      p.vy *= 0.985;

      const alpha = Math.min(0.95, p.a + 0.08 * bell);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${DOT_RGB}, ${alpha})`;
      ctx.fill();
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

  // Start oder Restart (immer frisch)
  function startOrRestart() {
    if (!armed) return; // nur wenn Card offen
    stop(); // damit Restart wirklich neu ist
    resize();
    seed();
    pulse = 0;
    running = true;
    raf = requestAnimationFrame(draw);
  }

  // Card-Logik:
  // - beim Öffnen nur "armed" setzen (aber NICHT starten)
  // - beim Schließen stoppen und disarmen
  card.addEventListener("toggle", () => {
    if (card.open) {
      armed = true;
      // optional: Canvas vorbereiten.. aber leer lassen
      resize();
      ctx.clearRect(0, 0, w, h);
    } else {
      armed = false;
      stop();
    }
  });

  // Wenn Seite reloadet und die Card offen ist
  if (card.open) {
    armed = true;
    resize();
    ctx.clearRect(0, 0, w, h);
  }

  // Trigger: Hover (Desktop) + Click (überall)
  wrap.addEventListener("mouseenter", () => startOrRestart());
  wrap.addEventListener("click", () => startOrRestart());

  // Resize: nur wenn Card offen (sonst unnötig)
  window.addEventListener(
    "resize",
    () => {
      if (!armed) return;
      // Wenn gerade läuft -> sauber neu starten (weil Ziele sich ändern)
      if (running) startOrRestart();
      else {
        resize();
        ctx.clearRect(0, 0, w, h);
      }
    },
    { passive: true },
  );
})();
