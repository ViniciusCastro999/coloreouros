(() => {
  const list = window.PROJETOS || [];
  const esc = (s) => (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (i) => String(i + 1).padStart(2, "0");

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

  /* ---------- índice e projetos ---------- */
  document.getElementById("pjIndex").innerHTML = list.map((p, i) =>
    `<a href="#${p.id}"><i>${num(i)}</i>${esc(p.titulo)}${p.status === "em breve" ? " <small>em breve</small>" : ""}</a>`).join("");

  const poster = (p) => {
    const [dia, hora] = (p.curto || "").split(" · ");
    return `<div class="pj-poster" aria-hidden="true">
      <span class="pp-day">${esc(dia)}</span>
      ${hora ? `<span class="pp-hour">${esc(hora)}</span>` : ""}
      <span class="pp-name">${esc(p.titulo)}</span>
      <span class="pp-place">${esc(p.lugar)}</span>
      <span class="pp-cta">reserve essa data</span>
      <svg class="pp-star"><use href="#star"/></svg>
    </div>`;
  };

  document.getElementById("pjList").innerHTML = list.map((p, i) => {
    const map = p.pos
      ? `<a class="pj-link" href="index.html?p=${p.id}#mapa">ver no mapa${p.aprox ? " (aprox.)" : ""}</a>`
      : `<span class="pj-nomap">ponto no mapa em breve</span>`;
    const links = (p.links || []).map((l) =>
      `<a class="${l.forte ? "btn btn-solid" : "pj-link"}" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}${l.forte ? "" : " ↗"}</a>`).join("");
    const gal = p.fotos.length ? `<div class="pj-gal">${p.fotos.map((f, k) =>
      `<figure class="ph reveal" style="--r:${[-1.6, 1.4, -0.8, 1.8, -1.2, 0.9][k % 6]}deg"><img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy"><figcaption>${esc(f.cap)}</figcaption></figure>`).join("")}</div>` : "";
    return `<article class="pj" id="${p.id}">
      <header class="pj-head reveal">
        <span class="pj-num">${num(i)}</span>
        <div>
          <p class="pj-tags"><span class="pj-status${p.status === "em breve" ? " soon" : ""}">${esc(p.status)}</span><span>${esc(p.tipo)}</span></p>
          <h2 class="display">${esc(p.titulo)}</h2>
          <p class="pj-meta">${esc(p.quando)} · ${esc(p.lugar)}${p.lugar === p.cidade ? "" : `, ${esc(p.cidade)}`}</p>
        </div>
      </header>
      <div class="pj-body reveal${p.fotos.length ? "" : " with-poster"}">
        <div class="pj-text">
          ${p.texto.map((t) => `<p>${esc(t)}</p>`).join("")}
          ${p.credito ? `<p class="pj-credit">${esc(p.credito)}</p>` : ""}
          <div class="pj-links">${links}${map}</div>
        </div>
        ${p.fotos.length ? "" : poster(p)}
      </div>
      ${gal}
    </article>`;
  }).join("");

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // o navegador tenta pular para a âncora antes dos projetos existirem
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

  /* ---------- fotos: ampliar ---------- */
  const box = document.getElementById("lightbox");
  if (!box.showModal) return;
  const img = box.querySelector("img"), cap = box.querySelector(".lb-cap");
  document.querySelectorAll(".pj-gal .ph").forEach((ph) => {
    const im = ph.querySelector("img");
    ph.tabIndex = 0;
    ph.setAttribute("role", "button");
    ph.setAttribute("aria-label", `Ampliar foto: ${im.alt}`);
    const open = () => {
      img.src = im.src; img.alt = im.alt;
      cap.textContent = ph.querySelector("figcaption").textContent;
      box.showModal();
    };
    ph.addEventListener("click", open);
    ph.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".lb-close")) box.close(); });
})();
