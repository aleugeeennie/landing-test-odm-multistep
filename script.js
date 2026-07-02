/* ============================================================
   ODM — Optimus Duo Mundi · Lógica compartida
   Detecta qué bloques existen en cada página y los activa.
   ============================================================ */

/* ---------- CONFIG ---------- *
 * [A VALIDAR CON CLIENTE] — Ajustar antes de publicar. */
const ODM = {
  // Número real de WhatsApp en formato internacional sin signos, ej: "5215512345678".
  // Si se deja vacío, los botones de WhatsApp abren el popup de inscripción.
  whatsapp: "",
  waMessageB2C: "Hola, quiero información sobre los programas de ODM.",

  // Endpoint (webhook) al que se envían los eventos de lead y de abandono.
  // Recibe POST JSON: { event, data:{...} }. Eventos:
  //   "lead_datos"            -> completó el Paso 1 (datos)
  //   "lead_abandonado_pago"  -> llegó al Paso 2 y cerró/salió sin pagar
  //   "pago_completado"       -> envió el Paso 2 (pago maqueta)
  // Si se deja vacío, los eventos solo se registran en consola (modo demo).
  webhook: "",

  // URL real de Calendly (solo se usa en gracias.html si aplica).
  calendly: "https://calendly.com/odm-diagnostico/30min",
};

document.addEventListener("DOMContentLoaded", () => {
  initLeadModal();   // primero: expone window.ODMopenLead para el fallback de WhatsApp
  initWhatsApp();
  initNavbar();
  initMobileMenu();
  initMarquee();
  initTabs();
  initFAQ();
  initReveal();
  initThanks();
});

/* ---------- Envío de eventos al webhook ---------- */
function postLead(event, data, beacon) {
  const payload = JSON.stringify({ event, data });
  if (!ODM.webhook) {
    console.log("[ODM lead]", event, data);
    return;
  }
  if (beacon && navigator.sendBeacon) {
    try { navigator.sendBeacon(ODM.webhook, new Blob([payload], { type: "application/json" })); return; }
    catch (e) { /* cae al fetch */ }
  }
  fetch(ODM.webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/* ---------- WhatsApp ---------- */
function initWhatsApp() {
  const msg = ODM.waMessageB2C;
  const hasModal = !!document.querySelector("[data-modal]");
  document.querySelectorAll("[data-wa]").forEach(a => {
    if (ODM.whatsapp) {
      a.setAttribute("href", `https://wa.me/${ODM.whatsapp}?text=${encodeURIComponent(msg)}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    } else if (hasModal) {
      a.setAttribute("href", "#");
      a.addEventListener("click", e => { e.preventDefault(); window.ODMopenLead && window.ODMopenLead(); });
    } else {
      a.setAttribute("href", "b2c.html");
    }
  });
}

/* ---------- Navbar: transparente -> sólida con blur ---------- */
function initNavbar() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Menú hamburguesa mobile ---------- */
function initMobileMenu() {
  const burger = document.querySelector(".hamburger");
  const menu = document.querySelector(".mobile-menu");
  const overlay = document.querySelector(".overlay");
  if (!burger || !menu) return;

  const close = () => {
    burger.classList.remove("open");
    menu.classList.remove("open");
    overlay && overlay.classList.remove("open");
    document.body.style.overflow = "";
  };
  const toggle = () => {
    const open = menu.classList.toggle("open");
    burger.classList.toggle("open", open);
    overlay && overlay.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", toggle);
  overlay && overlay.addEventListener("click", close);
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
}

/* ---------- Marquee + carruseles: duplica contenido para loop infinito ---------- */
function initMarquee() {
  document.querySelectorAll(".marquee-track").forEach(track => {
    track.innerHTML += track.innerHTML;
  });
  document.querySelectorAll(".t-row").forEach(row => {
    row.innerHTML += row.innerHTML;
  });
  document.querySelectorAll(".t-avatar img").forEach(img => {
    const show = () => { img.style.opacity = 1; };
    if (img.complete && img.naturalWidth > 0) show();
    else img.addEventListener("load", show);
  });
}

/* ---------- Tabs (programas) ---------- */
function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach(group => {
    const btns = group.querySelectorAll(".tab-btn");
    const panels = group.querySelectorAll(".tab-panel");
    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.tab;
        btns.forEach(b => {
          const active = b === btn;
          b.classList.toggle("active", active);
          b.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach(p => p.classList.toggle("active", p.dataset.panel === id));
      });
    });
  });
}

/* ---------- FAQ accordion ---------- */
function initFAQ() {
  document.querySelectorAll(".faq-item").forEach(item => {
    const q = item.querySelector(".faq-q");
    const a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      item.closest(".faq").querySelectorAll(".faq-item.open").forEach(o => {
        if (o !== item) { o.classList.remove("open"); o.querySelector(".faq-a").style.maxHeight = null; o.querySelector(".faq-q").setAttribute("aria-expanded", "false"); }
      });
      item.classList.toggle("open", !isOpen);
      q.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      a.style.maxHeight = !isOpen ? a.scrollHeight + "px" : null;
    });
  });
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach(e => e.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  els.forEach(e => io.observe(e));
}

/* ---------- Popup de inscripción multistep (datos -> pago) ---------- */
function initLeadModal() {
  const backdrop = document.querySelector("[data-modal]");
  if (!backdrop) return;

  const form        = backdrop.querySelector(".modal-form");
  const subEl       = backdrop.querySelector("[data-modal-sub]");
  const locked      = backdrop.querySelector("[data-prog-locked]");
  const lockedName  = backdrop.querySelector("[data-prog-name]");
  const selectField = backdrop.querySelector("[data-prog-select-field]");
  const select      = backdrop.querySelector("#pop-prog");
  const progHidden  = backdrop.querySelector("[data-prog-hidden]");
  const nivelHidden = backdrop.querySelector("[data-nivel-hidden]");
  const payProg     = backdrop.querySelector("[data-pay-prog]");
  const payAmt      = backdrop.querySelector("[data-pay-amt]");
  const payBtn      = backdrop.querySelector("[data-pay-btn]");
  const steps       = backdrop.querySelectorAll(".mstep-panel");
  const inds        = backdrop.querySelectorAll("[data-step-ind]");

  let state = { program: "", level: "", price: "", step1Done: false, paid: false, reported: false };

  function currentProgram() {
    if (state.program) return { program: state.program, level: state.level, price: state.price };
    const opt = select && select.selectedOptions[0];
    if (opt && opt.value) return { program: opt.value, level: opt.dataset.level || "", price: opt.dataset.price || "" };
    return { program: "", level: "", price: "" };
  }

  function updatePay() {
    const c = currentProgram();
    payProg.textContent = c.program || "—";
    payAmt.textContent  = c.price ? `$${c.price} MXN` : "—";
    payBtn.textContent  = c.price ? `Pagar $${c.price} MXN` : "Pagar";
    progHidden.value = c.program || "";
    nivelHidden.value = c.level || "";
  }

  function setProgram(program, level, price) {
    state.program = program || "";
    state.level   = level || "";
    state.price   = price || "";
    if (program) {
      locked.hidden = false;
      selectField.style.display = "none";
      lockedName.textContent = program + (level ? " · " + level : "");
      subEl.innerHTML = `Estás por inscribirte a <b>${program}</b>. Completa tus datos para continuar.`;
    } else {
      locked.hidden = true;
      selectField.style.display = "";
      subEl.textContent = "Déjanos tus datos y elige tu programa para continuar.";
    }
    updatePay();
  }

  function goStep(n) {
    steps.forEach(p => { p.hidden = (+p.dataset.step) !== n; });
    inds.forEach(i => {
      const s = +i.dataset.stepInd;
      i.classList.toggle("active", s === n);
      i.classList.toggle("done", s < n);
    });
    backdrop.querySelector(".modal").scrollTop = 0;
  }

  function validStep1() {
    let ok = true;
    // programa
    const c = currentProgram();
    if (!c.program) { selectField && selectField.classList.add("invalid"); ok = false; }
    else { selectField && selectField.classList.remove("invalid"); }
    // campos requeridos
    form.querySelectorAll('[data-step="1"] [required]').forEach(el => {
      const field = el.closest(".field");
      let bad = el.type === "checkbox" ? !el.checked : !el.value.trim();
      if (el.type === "email" && el.value.trim()) bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim());
      if (field) field.classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    return ok;
  }

  function payload(extra) {
    const fd = new FormData(form), o = {};
    fd.forEach((v, k) => { o[k] = v; });
    delete o.card; delete o.cvv; delete o.exp; // nunca enviamos datos sensibles de tarjeta
    const c = currentProgram();
    return Object.assign({
      programa: c.program, nivel: c.level, precio: c.price,
      page: "b2c", ts: new Date().toISOString(),
    }, o, extra || {});
  }

  function maybeAbandon() {
    if (state.step1Done && !state.paid && !state.reported) {
      state.reported = true;
      postLead("lead_abandonado_pago", payload({ estado: "abandono_en_pago" }), true);
    }
  }

  function open(trigger) {
    const d = (trigger && trigger.dataset) || {};
    form.reset();
    state = { program: "", level: "", price: "", step1Done: false, paid: false, reported: false };
    setProgram(d.program, d.level, d.price);
    goStep(1);
    backdrop.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => backdrop.classList.add("open"));
    setTimeout(() => {
      const first = state.program ? form.querySelector('[name="nombre"]') : select;
      first && first.focus();
    }, 320);
  }

  function close() {
    maybeAbandon();
    backdrop.classList.remove("open");
    document.body.classList.remove("modal-open");
    setTimeout(() => { backdrop.hidden = true; }, 300);
  }

  select && select.addEventListener("change", () => { updatePay(); selectField.classList.remove("invalid"); });

  form.querySelector("[data-next]").addEventListener("click", () => {
    if (!validStep1()) return;
    state.step1Done = true;
    updatePay();
    postLead("lead_datos", payload({ estado: "datos_completos" }));
    goStep(2);
  });

  form.querySelector("[data-back]").addEventListener("click", () => goStep(1));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    state.paid = true;
    state.reported = true;
    postLead("pago_completado", payload({ estado: "pagado" }));
    window.location.href = "gracias.html?audiencia=b2c";
  });

  backdrop.querySelectorAll("[data-modal-close]").forEach(b => b.addEventListener("click", close));
  backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !backdrop.hidden) close(); });
  window.addEventListener("beforeunload", maybeAbandon);

  // Abrir desde cualquier disparador con [data-lead]
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-lead]");
    if (t) { e.preventDefault(); open(t); }
  });

  // Expuesto para el fallback de WhatsApp
  window.ODMopenLead = open;
}

/* ---------- Página de gracias: mensaje + Calendly según audiencia ---------- */
function initThanks() {
  const el = document.querySelector("[data-thanks-msg]");
  if (!el) return;
  const params = new URLSearchParams(window.location.search);
  const aud = params.get("audiencia");
  const back = document.querySelector("[data-thanks-back]");
  const cal = document.querySelector("[data-calendly]");

  el.textContent = "Gracias, ya recibimos tu información. Un asesor de ODM te contactará para acompañarte en tu inscripción.";
  if (back) { back.setAttribute("href", "b2c.html"); back.textContent = "Volver al inicio"; }

  if (cal) {
    const showCal = aud !== "b2c";
    cal.style.display = showCal ? "" : "none";
    if (showCal) loadCalendly(cal);
  }
}

function loadCalendly(container) {
  const widget = container.querySelector(".calendly-inline-widget");
  if (widget && ODM.calendly) widget.setAttribute("data-url", ODM.calendly + "?hide_gdpr_banner=1&primary_color=ff7c10");
  if (document.getElementById("calendly-js")) return;
  const s = document.createElement("script");
  s.id = "calendly-js";
  s.src = "https://assets.calendly.com/assets/external/widget.js";
  s.async = true;
  document.body.appendChild(s);
}
