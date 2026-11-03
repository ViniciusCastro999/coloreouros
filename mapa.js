(() => {
  // Planilha do Google compartilhada como "qualquer pessoa com o link pode ver".
  const SHEET_ID = "19nOOmSqQqRDxrJcpooilH6-NgvOTnHX-bnZUeBY3zuI";
  // Nome da aba que o mapa lê. Vazio = primeira aba da planilha.
  const SHEET_TAB = "";
  // Link do Google Forms para o público indicar uma arte. Vazio = botão escondido.
  const FORM_URL = "";
  // Centro de Conceição dos Ouros (MG), usado quando ainda não há pontos.
  const CENTER = [-22.4097, -45.7978];

  const el = document.getElementById("map");
  if (!el || !window.L) return;

  const countEl = document.getElementById("mapCount");
  const listEl = document.getElementById("mapList");
  if (FORM_URL) {
    document.getElementById("mapForm").href = FORM_URL;
    document.getElementById("mapCta").hidden = false;
  }

  /* ---------- mapa ---------- */
  const touch = matchMedia("(hover: none)").matches;
  const map = L.map(el, {
    center: CENTER, zoom: 15,
    scrollWheelZoom: false,   // a rolagem da página continua livre
    dragging: !touch,         // no celular, um dedo rola a página; pinça e botões dão zoom
    zoomControl: true,
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const pin = (n) => L.divIcon({ className: "pin", html: `<span>${n}</span>`, iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -18] });

  /* ---------- leitura da planilha ---------- */
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv` +
    (SHEET_TAB ? `&sheet=${encodeURIComponent(SHEET_TAB)}` : "") + `&t=${Date.now()}`;

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c !== "\r") cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  const norm = (s) => (s || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const esc = (s) => (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");

  // acha as colunas pelo nome do cabeçalho, em qualquer ordem
  function columns(header) {
    const h = header.map(norm), used = new Set();
    const pick = (...keys) => {
      const i = h.findIndex((t, k) => !used.has(k) && keys.some((key) => t.includes(key)));
      if (i >= 0) used.add(i);
      return i;
    };
    return {
      ok: pick("aprovad"),
      artista: pick("artista", "autor"),
      coord: pick("coorden", "latitude"),
      maps: pick("maps", "link do local", "localizacao"),
      foto: pick("foto", "imagem"),
      insta: pick("insta"),
      desc: pick("descri", "sobre", "historia"),
      end: pick("endere", "local", "rua"),
      ano: pick("ano"),
      nome: pick("nome", "obra", "titulo"),
    };
  }

  function coordsFrom(text) {
    const s = text || "";
    const pats = [
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
      /[?&](?:q|ll|query|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i,
      /(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/,
    ];
    for (const p of pats) {
      const m = s.match(p);
      if (m) {
        const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
      }
    }
    return null;
  }

  // links de arquivo do Google Drive viram imagem direta
  function photoUrl(u) {
    const m = (u || "").match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w900`;
    return safeUrl(u);
  }

  function instaUrl(v) {
    const s = (v || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return /instagram\.com/i.test(s) ? s : "";
    const handle = s.replace(/^@/, "").replace(/[^\w.]/g, "");
    return handle ? `https://www.instagram.com/${handle}/` : "";
  }

  const APPROVED = new Set(["sim", "s", "x", "ok", "true", "verdadeiro", "aprovado", "aprovada", "yes", "1"]);

  function toArts(rows) {
    if (!rows.length) return [];
    const c = columns(rows[0]);
    const get = (r, i) => (i >= 0 ? (r[i] || "").trim() : "");
    return rows.slice(1).map((r) => {
      const pos = coordsFrom(get(r, c.coord)) || coordsFrom(get(r, c.maps));
      return {
        ok: c.ok < 0 || APPROVED.has(norm(get(r, c.ok))),
        nome: get(r, c.nome) || "Arte sem nome",
        artista: get(r, c.artista),
        end: get(r, c.end),
        desc: get(r, c.desc),
        foto: photoUrl(get(r, c.foto)),
        insta: instaUrl(get(r, c.insta)),
        ano: get(r, c.ano),
        pos,
      };
    }).filter((a) => a.ok && a.pos);
  }

  function popup(a) {
    const [lat, lng] = a.pos;
    const route = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    return `<article class="pop">
      ${a.foto ? `<img src="${esc(a.foto)}" alt="${esc(a.nome)}" loading="lazy">` : `<div class="pop-noimg" aria-hidden="true"></div>`}
      <div class="pop-body">
        <h4>${esc(a.nome)}</h4>
        ${a.artista || a.ano ? `<p class="pop-by">${esc(a.artista)}${a.artista && a.ano ? " · " : ""}${esc(a.ano)}</p>` : ""}
        ${a.desc ? `<p>${esc(a.desc)}</p>` : ""}
        ${a.end ? `<p class="pop-end">${esc(a.end)}</p>` : ""}
        <p class="pop-links">
          <a href="${route}" target="_blank" rel="noopener">como chegar ↗</a>
          ${a.insta ? `<a href="${esc(a.insta)}" target="_blank" rel="noopener">instagram ↗</a>` : ""}
        </p>
      </div>
    </article>`;
  }

  // projetos do coletivo (projetos-dados.js) que já têm lugar no mapa
  const PROJS = (window.PROJETOS || []).filter((p) => p.pos);
  const projPin = L.divIcon({ className: "pin pin-proj", html: `<svg><use href="#star"/></svg>`, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -20] });

  function projPopup(p) {
    const [lat, lng] = p.pos;
    const foto = p.fotos[0];
    return `<article class="pop">
      ${foto ? `<img src="${esc(foto.src)}" alt="${esc(foto.alt)}" loading="lazy">` : `<div class="pop-noimg pop-soon" aria-hidden="true"><b>${esc(p.curto)}</b></div>`}
      <div class="pop-body">
        <p class="pop-kind">projeto · ${esc(p.status)}</p>
        <h4>${esc(p.titulo)}</h4>
        <p class="pop-by">${esc(p.quando)}</p>
        <p>${esc(p.resumo)}</p>
        <p class="pop-end">${esc(p.lugar)}${p.aprox ? " (local aproximado)" : ""}</p>
        <p class="pop-links">
          <a href="projetos.html#${p.id}">ver projeto →</a>
          ${p.aprox ? "" : `<a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener">como chegar ↗</a>`}
        </p>
      </div>
    </article>`;
  }

  function render(arts, failed) {
    const markers = [];
    const pick = new URLSearchParams(location.search).get("p");
    const add = (pos, icon, title, html, label, sub, tag) => {
      const m = L.marker(pos, { icon, title }).addTo(map)
        .bindPopup(html, { maxWidth: 280, minWidth: 240, className: "pop-wrap" });
      const li = document.createElement("li");
      li.innerHTML = `<button type="button">${tag}<span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span></button>`;
      li.querySelector("button").addEventListener("click", () => {
        if (innerWidth < 760) el.scrollIntoView({ behavior: "smooth", block: "center" });
        map.flyTo(pos, Math.max(map.getZoom(), 17), { duration: 0.8 });
        setTimeout(() => m.openPopup(), 850);
      });
      listEl.append(li);
      m.on("popupopen", () => { [...listEl.children].forEach((x) => x.classList.remove("on")); li.classList.add("on"); });
      markers.push(m);
      return m;
    };

    let opened = null;
    PROJS.forEach((p) => {
      const m = add(p.pos, projPin, p.titulo, projPopup(p), p.titulo, `projeto · ${p.curto}`, `<i class="li-proj"><svg><use href="#star"/></svg></i>`);
      if (p.id === pick) opened = { m, p };
    });
    arts.forEach((a, i) => add(a.pos, pin(i + 1), a.nome, popup(a), a.nome, a.artista, `<i>${i + 1}</i>`));

    const parts = [];
    if (PROJS.length) parts.push(`<b>${PROJS.length}</b> ${PROJS.length === 1 ? "projeto" : "projetos"}`);
    if (arts.length) parts.push(`<b>${arts.length}</b> ${arts.length === 1 ? "arte" : "artes"}`);
    countEl.innerHTML = failed && !markers.length ? "O mapa não carregou. Recarregue a página para tentar de novo."
      : parts.length ? `${parts.join(" e ")} no mapa` : "As primeiras artes chegam ao mapa em breve.";
    if (!markers.length) return;

    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25), { maxZoom: 16 });
    if (opened) {
      // veio de "ver no mapa" na página de projetos
      setTimeout(() => { map.setView(opened.p.pos, opened.p.aprox ? 14 : 17); opened.m.openPopup(); }, 900);
    }
  }

  fetch(url)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((t) => render(toArts(parseCSV(t))))
    .catch(() => render([], true));

  // o Leaflet precisa recalcular o tamanho quando a seção aparece animada
  new IntersectionObserver((es, o) => {
    if (es[0].isIntersecting) { setTimeout(() => map.invalidateSize(), 900); o.disconnect(); }
  }).observe(el);
})();
