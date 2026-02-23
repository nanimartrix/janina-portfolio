const canvas = document.getElementById("thoughts");
const ctx = canvas.getContext("2d", { alpha: true });

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Für Performance: DPI begrenzen (sonst zu heavy auf Retina)
function dpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function resize() {
  const ratio = dpr();
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
resize();
window.addEventListener("resize", resize);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

const particles = [];
let lastTime = performance.now();

// Akzentfarbe (passt zum Orange).. auf „warmweiß“ ändern.
const DOT_RGB = "255,138,61"; // var(--accent) als RGB

class Particle {
  constructor() {
    this.x = rand(0, window.innerWidth);
    this.y = rand(0, window.innerHeight);

    // ultrafein
    this.r = rand(0.35, 1.1);
    this.rGrow = rand(0.002, 0.01);

    // ganz langsame Drift
    this.vx = rand(-0.03, 0.03);
    this.vy = rand(-0.03, 0.03);

    this.alpha = 0;
    this.alphaIn = rand(0.002, 0.007);
    this.alphaOut = rand(0.002, 0.007);

    this.life = 0;
    this.lifeMax = rand(300, 700); // Lebensdauer in Frames (skaliert über dt)
  }

  update(dt) {
    // dt ~ 1 bei 60fps (normalisiert)
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // subtil wachsen = "Raum entsteht"
    this.r += this.rGrow * dt * 60;

    this.life += dt * 60;

    // Fade-in / Fade-out
    const fadeInEnd = this.lifeMax * 0.25;
    const fadeOutStart = this.lifeMax * 0.7;

    if (this.life < fadeInEnd) {
      this.alpha = Math.min(0.35, this.alpha + this.alphaIn * dt * 60);
    } else if (this.life > fadeOutStart) {
      this.alpha = Math.max(0, this.alpha - this.alphaOut * dt * 60);
    }
  }

  draw() {
    if (this.alpha <= 0) return;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${DOT_RGB}, ${this.alpha})`;
    ctx.fill();
  }

  get dead() {
    return this.alpha <= 0 && this.life > this.lifeMax * 0.75;
  }
}

function isActive() {
  return document.body.classList.contains("active");
}

function spawnBudget() {
  // Anzahl an Bildschirm koppeln
  const area = window.innerWidth * window.innerHeight;
  // ca. 60–140 je nach Größe
  return Math.max(50, Math.min(140, Math.floor(area / 18000)));
}

function animate(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000); // cap
  lastTime = now;

  // Wenn Reduced Motion: nur statisch / kaum Bewegung
  const active = isActive();

  // Canvas immer clearen, damit er nicht "schmiert"
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  if (active && !prefersReducedMotion) {
    const maxParticles = spawnBudget();

    // “endlose Expansion”: kontinuierlich neue Partikel dazu
    if (particles.length < maxParticles) {
      // pro Frame evtl. mehrere (subtil)
      const spawnCount = particles.length < maxParticles * 0.6 ? 2 : 1;
      for (let i = 0; i < spawnCount; i++) particles.push(new Particle());
    }

    // Update + Draw (rückwärts iterieren wegen splice)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update(dt);
      p.draw();
      if (p.dead) particles.splice(i, 1);
    }
  } else if (active && prefersReducedMotion) {
    // Reduced Motion: ein paar sehr schwache Punkte ohne Bewegung
    const maxParticles = 35;
    while (particles.length < maxParticles) particles.push(new Particle());
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      // kein Wachstum / minimal
      p.vx = 0;
      p.vy = 0;
      p.rGrow = 0;
      p.alpha = Math.min(p.alpha + 0.01, 0.18);
      p.draw();
      // keine Entfernung nötig
    }
  } else {
    // Nicht aktiv: Partikel leeren, damit beim nächsten Aktivieren frisch startet
    particles.length = 0;
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
