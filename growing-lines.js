(() => {
  const card = document.getElementById("linesCard");
  const canvas = document.getElementById("linesCanvas");
  const wrap = document.querySelector(".lines-canvas-wrap");
  if (!card || !canvas || !wrap) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR_CAP = 2;

  const cfg = {
    count: 120,
    maxLinkDist: 120,
    maxLinksPerParticle: 6,
    speed: 0.6,
    repelRadius: 90,
    repelStrength: 1.8,
    lineAlpha: 0.22,
    dotAlpha: 0.85,
  };

  let w = 0;
  let h = 0;
  let dpr = 1;

  let particles = [];
  let showLines = true;

  // Pulse
  let glowPulse = 0;

  let raf = null;
  let running = false;
  let armed = false;

  const pointer = { x: 0, y: 0, down: false };

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function reseed() {
    particles = Array.from({ length: cfg.count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-cfg.speed, cfg.speed),
      vy: rand(-cfg.speed, cfg.speed),
      r: rand(1.2, 2.2),
    }));
  }

  function update() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      p.x = clamp(p.x, 0, w);
      p.y = clamp(p.y, 0, h);

      if (pointer.down) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.0001 && dist < cfg.repelRadius) {
          const t = 1 - dist / cfg.repelRadius;
          const push = t * cfg.repelStrength;
          p.vx += (dx / dist) * push * 0.15;
          p.vy += (dy / dist) * push * 0.15;
        }
      }

      p.vx *= 0.99;
      p.vy *= 0.99;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    //Pulse - Glow zw. 3 und 9 Px
    glowPulse += 0.02;
    const glow = 6 + Math.sin(glowPulse) * 3;

    if (showLines) {
      ctx.lineWidth = 1;

      // subtiler glow für Linien
      ctx.shadowColor = "rgba(255,138,61,0.35)";
      ctx.shadowBlur = glow; /*8;*/

      // Linie werden hier gezeichnet
      ctx.shadowBlur = 0;

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        let links = 0;

        for (let j = i + 1; j < particles.length; j++) {
          if (links >= cfg.maxLinksPerParticle) break;

          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);

          if (d < cfg.maxLinkDist) {
            const alpha = (1 - d / cfg.maxLinkDist) * cfg.lineAlpha;
            ctx.strokeStyle = `rgba(255,138,61,${alpha})`; /*`rgba(255,255,255,${alpha})`;*/
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            links++;
          }
        }
      }
    }

    for (const p of particles) {
      ctx.fillStyle = `rgba(255,138,61,${cfg.dotAlpha})`; /* `rgba(255,255,255,${cfg.dotAlpha})`;*/
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    ctx.clearRect(0, 0, w, h);
  }

  function startOrRestart() {
    if (!armed) return;
    stop();
    resize();
    reseed();
    running = true;

    const tick = () => {
      if (!running) return;
      update();
      draw();
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  // Card open / close -> armed / stop
  card.addEventListener("toggle", () => {
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

  // Hover / Click Start (wie Herz)
  wrap.addEventListener("mouseenter", () => startOrRestart());
  wrap.addEventListener("click", () => startOrRestart());

  // Pointer interaction
  function localPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (e) => {
    pointer.down = true;
    const pos = localPos(e);
    pointer.x = pos.x;
    pointer.y = pos.y;
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    const pos = localPos(e);
    pointer.x = pos.x;
    pointer.y = pos.y;
  });

  window.addEventListener("pointerup", () => {
    pointer.down = false;
  });

  // Keyboard
  window.addEventListener("keydown", (e) => {
    const tag =
      (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.code === "Space") {
      e.preventDefault();
      showLines = !showLines;
    }
    if (e.code === "KeyR") {
      if (!armed) return;
      reseed();
    }
  });

  // Resize: nur wenn Card offen; wenn läuft -> restart
  window.addEventListener(
    "resize",
    () => {
      if (!armed) return;
      if (running) startOrRestart();
      else {
        resize();
        ctx.clearRect(0, 0, w, h);
      }
    },
    { passive: true },
  );
})();
