/* ============================
1) Tagline Hover / Tap Reveal
============================ */

const tagline = document.querySelector(".tagline");

if (tagline) {
  const enable = () => document.body.classList.add("active");
  const disable = () => document.body.classList.remove("active");
  const toggle = () => document.body.classList.toggle("active");

  const canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;

  if (canHover) {
    tagline.addEventListener("mouseenter", enable);
    tagline.addEventListener("mouseleave", disable);
  } else {
    tagline.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });

    document.addEventListener("click", (e) => {
      if (!tagline.contains(e.target)) disable();
    });
  }
}

/* ============================
2) Scroll Fade-In Animation
============================ */

const elements = document.querySelectorAll(".fade-in");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // nur einmal
      }
    });
  },
  { threshold: 0.15 },
);

elements.forEach((el) => observer.observe(el));
