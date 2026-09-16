/* Pivovarská dílna — interakce
   Moduly: Navbar · HeroVideo · Reveal · Parallax · Lunch · MenuTabs · Hours · MapEmbed
   (3D sud je v barrel.js) */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Navbar ---------------- */
  function Navbar() {
    const nav = $("#nav");
    const burger = $(".nav__burger");
    const mnav = $("#mnav");
    let lastY = scrollY;

    const onScroll = () => {
      const y = scrollY;
      nav.classList.toggle("is-solid", y > 40);
      const menuOpen = burger.getAttribute("aria-expanded") === "true";
      nav.classList.toggle("is-hidden", !menuOpen && y > innerHeight && y > lastY + 4);
      if (y < lastY - 4) nav.classList.remove("is-hidden");
      lastY = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const setMenu = open => {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        mnav.hidden = false;
        requestAnimationFrame(() => mnav.classList.add("is-open"));
      } else {
        mnav.classList.remove("is-open");
        setTimeout(() => { if (burger.getAttribute("aria-expanded") === "false") mnav.hidden = true; }, 500);
      }
    };
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
    $$("a", mnav).forEach(a => a.addEventListener("click", () => setMenu(false)));
    addEventListener("keydown", e => { if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") setMenu(false); });

    const links = $$(".nav__links a");
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.remove("is-active"));
        map.get(en.target.id)?.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------- Hero video ---------------- */
  function HeroVideo() {
    const hero = $(".hero");
    const video = $("#heroVideo");
    const tall = matchMedia("(max-aspect-ratio: 4/5)").matches;
    if (tall) video.poster = video.dataset.posterTall;

    const ready = () => document.body.classList.add("is-ready");
    // pruhy se otevřou, jakmile je k dispozici první snímek (nejpozději po 1,2 s)
    const fallback = setTimeout(ready, 1200);

    const saveData = navigator.connection && navigator.connection.saveData;
    if (!reduced && !saveData) {
      video.src = tall ? video.dataset.srcTall : video.dataset.srcWide;
      video.addEventListener("loadeddata", () => { clearTimeout(fallback); ready(); }, { once: true });
      video.play().catch(() => {});
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting) video.play().catch(() => {}); else video.pause();
      }).observe(hero);
    } else {
      requestAnimationFrame(ready);
    }

    if (reduced) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const hs = clamp(scrollY / (hero.offsetHeight * .9));
        hero.style.setProperty("--hs", hs.toFixed(2));
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- Reveal ---------------- */
  function Reveal() {
    const els = $$(".reveal, .reveal-img, .coaster");
    if (reduced || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: .05 });
    els.forEach(el => {
      const sib = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
      const i = sib.indexOf(el);
      if (i > 0) el.style.transitionDelay = `${Math.min(i, 4) * 90}ms`;
      io.observe(el);
    });
  }

  /* ---------------- Parallax obrázků ---------------- */
  function Parallax() {
    if (reduced) return;
    const items = $$("[data-parallax], .lunch__bg img");
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight;
      for (const img of items) {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const p = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
        img.style.setProperty("--py", `${(p * -12).toFixed(2)}%`);
      }
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------------- Polední menu (menicka.cz) ---------------- */
  function Lunch() {
    const box = $("#lunchFrame");
    if (!box) return;
    const DAYS = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
    const d = new Date();
    $("#slateDay").textContent = `Dnes je ${DAYS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;

    let frame;
    const load = range => {
      const params = new URLSearchParams({ id: "2524", size: "15", color: "e6dac2", bg: "171613", font: "Georgia" });
      if (range === "dnes") params.set("datum", "dnes");
      box.classList.toggle("is-week", range !== "dnes");
      if (!frame) {
        frame = document.createElement("iframe");
        frame.title = "Polední menu Pivovarská dílna — menicka.cz";
        frame.addEventListener("load", () => { const l = $(".slate__loading", box); if (l) l.remove(); });
        box.appendChild(frame);
      }
      frame.src = `https://www.menicka.cz/api/iframe/?${params}`;
    };
    $$("[data-range]").forEach(b => b.addEventListener("click", () => {
      $$("[data-range]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      load(b.dataset.range);
    }));
    new IntersectionObserver(([en], obs) => {
      if (en.isIntersecting) { load("dnes"); obs.disconnect(); }
    }, { rootMargin: "600px 0px" }).observe(box);
  }

  /* ---------------- Jídelní / nápojový lístek ---------------- */
  function MenuTabs() {
    const tabs = $$(".menu__switch [role=tab]");
    const panels = tabs.map(t => document.getElementById(t.getAttribute("aria-controls")));
    let io;

    const observeGroups = () => {
      io?.disconnect();
      const panel = panels.find(p => !p.hidden);
      const links = $$(".menu__cats a", panel);
      const byId = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
      io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          links.forEach(l => l.classList.remove("is-active"));
          const a = byId.get(en.target.id);
          if (a) {
            a.classList.add("is-active");
            a.parentElement.scrollTo({ left: a.offsetLeft - 40, behavior: reduced ? "auto" : "smooth" });
          }
        });
      }, { rootMargin: "-30% 0px -60% 0px" });
      byId.forEach((_, id) => { const g = document.getElementById(id); if (g) io.observe(g); });
    };

    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      if (focus) tabs[i].focus();
      observeGroups();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", e => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          select((i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length, true);
        }
      });
    });
    observeGroups();
  }

  /* ---------------- Otevírací doba ---------------- */
  function Hours() {
    // dle jídelního lístku (02/2026): Po–Čt 11–23, Pá–So 11–24, Ne 11–21
    const HOURS = { 0: [11, 21], 1: [11, 23], 2: [11, 23], 3: [11, 23], 4: [11, 23], 5: [11, 24], 6: [11, 24] };
    const now = new Date();
    const day = now.getDay();
    const h = now.getHours() + now.getMinutes() / 60;
    const [o, c] = HOURS[day];
    const open = h >= o && h < c;
    let text;
    if (open) text = `Právě otevřeno · do ${c === 24 ? "půlnoci" : c + ":00"}`;
    else if (h < o) text = `Zavřeno · otevíráme dnes v ${o}:00`;
    else text = `Zavřeno · otevíráme zítra v ${HOURS[(day + 1) % 7][0]}:00`;
    $$("[data-status]").forEach(el => { el.textContent = text; el.classList.toggle("is-open-now", open); });
    $(`.hours tr[data-day="${day}"]`)?.classList.add("is-today");
  }

  /* ---------------- Mapa (načtení až na klik) ---------------- */
  function MapEmbed() {
    const btn = $("[data-map]");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2535.9360269847825!2d14.127065415710645!3d50.53536087948714!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47097f46bb246ac5%3A0x41491e253ddd3ff0!2zUGl2b3ZhcnNrw6EgRMOtbG5h!5e0!3m2!1scs!2scz!4v1594031021146!5m2!1scs!2scz";
      f.title = "Mapa — Pivovarská dílna, Krajská 61/4, Litoměřice";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      $("#mapFrame").replaceChildren(f);
    });
  }

  Navbar();
  HeroVideo();
  Reveal();
  Parallax();
  Lunch();
  MenuTabs();
  Hours();
  MapEmbed();
})();
