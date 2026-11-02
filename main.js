(() => {
  const COLORS = ["#F28A3A", "#00734A", "#00E68A", "#F28A3A", "#00E68A"];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none)").matches;

  /* ---------- nav: some ao descer, volta ao subir ---------- */
  const nav = document.getElementById("nav");
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("scrolled", y > 30);
    nav.classList.toggle("hidden", y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) nav.classList.remove("hidden");
    lastY = y;
  }, { passive: true });

  /* ---------- canvas com DPR ---------- */
  function setupCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      // guarda a pintura atual para não perder ao redimensionar
      const old = document.createElement("canvas");
      old.width = canvas.width; old.height = canvas.height;
      if (canvas.width) old.getContext("2d").drawImage(canvas, 0, 0);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (old.width) ctx.drawImage(old, 0, 0, old.width, old.height, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    let t;
    addEventListener("resize", () => { clearTimeout(t); t = setTimeout(fit, 150); });
    return ctx;
  }

  /* ---------- spray ---------- */
  function spray(ctx, x, y, color, size) {
    ctx.fillStyle = color;
    // núcleo sólido
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(x, y, size * 0.42, 0, Math.PI * 2); ctx.fill();
    // nuvem de partículas
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.pow(Math.random(), 0.6) * size;
      const r = Math.random() * 1.6 + 0.4;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, Math.PI * 2); ctx.fill();
    }
    // escorrido de tinta ocasional
    if (Math.random() < 0.035) drip(ctx, x, y + size * 0.3, color, size * 0.22);
    ctx.globalAlpha = 1;
  }

  function drip(ctx, x, y, color, w) {
    const len = 30 + Math.random() * 90;
    let p = 0;
    const step = () => {
      p += 2.2;
      ctx.fillStyle = color; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(x, y + p, w * (1 - p / len * 0.4), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      if (p < len) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function splat(ctx, x, y, color, size) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const pts = 18;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = size * (0.7 + Math.random() * 0.5);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = size * (1.1 + Math.random() * 1.6);
      const r = Math.random() * size * 0.18 + 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 3; i++) drip(ctx, x + (Math.random() - 0.5) * size, y + size * 0.5, color, size * 0.12 + 2);
  }

  /* ---------- hero: a parede que você colore ---------- */
  const paint = document.getElementById("paint");
  const hero = paint.parentElement;
  const pctx = setupCanvas(paint);
  const wipe = document.getElementById("wipe");
  const hint = document.querySelector(".paint-hint");
  let color = 0, last = null, painted = 0;

  if (touch && hint) hint.lastChild.textContent = "toca na parede e colore";

  function strokeTo(x, y, size = 22) {
    const c = COLORS[color % COLORS.length];
    if (last) {
      const dx = x - last.x, dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.floor(dist / 6));
      for (let i = 1; i <= steps; i++) spray(pctx, last.x + dx * i / steps, last.y + dy * i / steps, c, size);
    } else spray(pctx, x, y, c, size);
    last = { x, y };
    if (++painted > 40) wipe.classList.add("show");
  }

  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = paint.getBoundingClientRect();
    strokeTo(e.clientX - r.left, e.clientY - r.top);
  });
  hero.addEventListener("pointerleave", () => { last = null; color++; });
  hero.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a,button")) return;
    const r = paint.getBoundingClientRect();
    splat(pctx, e.clientX - r.left, e.clientY - r.top, COLORS[color++ % COLORS.length], 18 + Math.random() * 16);
    wipe.classList.add("show");
  });
  wipe.addEventListener("click", () => {
    pctx.save(); pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, paint.width, paint.height); pctx.restore();
    painted = 0; wipe.classList.remove("show");
  });

  // um traço automático de abertura, como alguém grafitando a parede
  function autoStroke(path, delay, c, size) {
    setTimeout(() => {
      let i = 0, prev = null;
      const run = () => {
        for (let k = 0; k < 3 && i < path.length; k++, i++) {
          const [x, y] = path[i];
          if (prev) {
            const steps = Math.max(1, Math.floor(Math.hypot(x - prev[0], y - prev[1]) / 5));
            for (let s = 1; s <= steps; s++)
              spray(pctx, prev[0] + (x - prev[0]) * s / steps, prev[1] + (y - prev[1]) * s / steps, c, size);
          }
          prev = [x, y];
        }
        if (i < path.length) requestAnimationFrame(run);
      };
      run();
    }, delay);
  }
  if (!reduced) {
    const r = paint.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wave = (y0, amp, from, to, n = 70) =>
      Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        return [W * (from + (to - from) * t), H * y0 + Math.sin(t * Math.PI * 2.4) * amp];
      });
    autoStroke(wave(0.9, 22, -0.05, 0.55), 700, "#00E68A", touch ? 14 : 20);
    autoStroke(wave(0.16, 18, 0.55, 1.05), 1300, "#F28A3A", touch ? 12 : 18);
  }

  /* ---------- CTA: jogar tinta ---------- */
  const splats = document.getElementById("splats");
  const sctx = setupCanvas(splats);
  const cta = splats.parentElement;
  const CTA_COLORS = ["#00734A", "#00E68A", "#EFE9D8", "#D96F20"];
  let sc = 0;
  cta.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a")) return;
    const r = splats.getBoundingClientRect();
    splat(sctx, e.clientX - r.left, e.clientY - r.top, CTA_COLORS[sc++ % CTA_COLORS.length], 22 + Math.random() * 26);
  });

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- manifesto acende palavra por palavra ---------- */
  const man = document.getElementById("manifesto");
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(part);
          else { const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.append(s); }
        });
        n.replaceWith(frag);
      } else wrap(n);
    });
  };
  wrap(man);
  const words = man.querySelectorAll(".w");
  const light = () => {
    const r = man.getBoundingClientRect();
    const vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("on", i < n));
  };
  if (reduced) words.forEach((w) => w.classList.add("on"));
  else { addEventListener("scroll", light, { passive: true }); light(); }

  /* ---------- parallax suave no logo do hero ---------- */
  const mark = document.querySelector(".hero-mark");
  if (!reduced && !touch) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      mark.style.transform = `translate(${x * -18}px, ${y * -18}px) rotate(${x * 4}deg)`;
    });
  }
})();

/* ============ animações extras ============ */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (reduced) return;
  const $$ = (s) => [...document.querySelectorAll(s)];

  // letras soltas
  const split = (el, cls) => {
    const txt = el.textContent;
    el.textContent = "";
    [...txt].forEach((c, i) => {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = c === " " ? " " : c;
      s.style.setProperty("--i", i);
      el.append(s);
    });
  };
  $$(".hero-title .line").forEach((l) => split(l, "ch"));
  $$(".cta-title span").forEach((l) => split(l, "wv"));

  // títulos entram como carimbo
  const stamps = $$(".about-head h2, .purpose-title, .crew-copy h2, .tag-title span, .cta-title");
  stamps.forEach((s) => s.classList.add("stamp-in"));
  const sio = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); sio.unobserve(e.target); }
  }), { threshold: 0.4 });
  stamps.forEach((s) => sio.observe(s));

  // cards e pilares entram em sequência
  $$(".pillars .pillar, .cards .card").forEach((el) => {
    const i = [...el.parentElement.children].indexOf(el);
    el.style.setProperty("--d", i * 0.12 + "s");
  });

  // pilares inclinam seguindo o mouse
  if (fine) {
    $$(".pillar").forEach((p) => {
      p.addEventListener("pointermove", (e) => {
        const r = p.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        p.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${y * -14}deg) translateY(-6px)`;
      });
      p.addEventListener("pointerleave", () => (p.style.transform = ""));
    });

    // botões magnéticos
    $$(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        b.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px) rotate(${x * 0.03}deg)`;
      });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    });
  }

  // parallax leve
  const crewImg = document.querySelector(".crew-photo img");
  const blobs = $$(".purpose-bg .blob");
  const brushes = document.querySelector(".brushes img");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    const off = (el) => { const r = el.getBoundingClientRect(); return (r.top + r.height / 2 - vh / 2) / vh; };
    if (crewImg) crewImg.style.transform = `translateY(${off(crewImg) * -30}px) rotate(${off(crewImg) * -2}deg)`;
    if (brushes) brushes.style.transform = `rotate(${off(brushes) * 12}deg)`;
    blobs.forEach((b, i) => (b.style.translate = `0 ${off(b) * (i + 1) * -40}px`));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
