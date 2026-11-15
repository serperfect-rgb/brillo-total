/* ============================================================
   Brillo Total — Servicios de Limpieza
   ------------------------------------------------------------
   ⚙️ CONFIGURACIÓN DEL NEGOCIO
   Reemplaza el valor de BUSINESS_WHATSAPP por el número de
   WhatsApp del negocio en formato internacional, solo dígitos
   (ej.: "50761234567" para Panamá). Mientras esté vacío, los
   botones de WhatsApp mostrarán el resumen de la cotización
   en pantalla en lugar de abrir WhatsApp.
   ============================================================ */
const BUSINESS_WHATSAPP = "50765456555"; // ← Número de WhatsApp del negocio (solo dígitos, con código de país)

/* ---------- Modelo de precios (anclado a la tabla de tarifas) ----------
   Tarifas base por m² (USD) con un mínimo por tipo de propiedad:
   - Apartamento pequeño (≤60 m²): $30–$50 · grande: $50–$80
   - Casa: $60–$150+ · Oficina pequeña: $50–$80 · grande: $80–$200+
   Limpieza profunda: desde $100 · Mudanza: recargo sobre la regular.  */
const RATES = {
  apartamento: { low: 0.55, high: 0.85, min: 30, label: "Apartamento" },
  casa:        { low: 0.60, high: 1.05, min: 60, label: "Casa" },
  oficina:     { low: 0.55, high: 0.90, min: 50, label: "Oficina" }
};
const SERVICES = {
  regular:  { mult: 1.0, min: 0,   label: "Regular" },
  profunda: { mult: 1.7, min: 100, label: "Profunda" },
  mudanza:  { mult: 1.4, min: 80,  label: "Mudanza" }
};
const FREQUENCIES = {
  unica:     { disc: 0,    visits: 0, label: "Una sola vez" },
  mensual:   { disc: 0.05, visits: 1, label: "Mensual (−5%)" },
  quincenal: { disc: 0.10, visits: 2, label: "Quincenal (−10%)" },
  semanal:   { disc: 0.15, visits: 4, label: "Semanal (−15%)" }
};

const state = { tipo: "casa", m2: 100, servicio: "regular", frecuencia: "unica" };

const $ = (s, c = document) => c.querySelector(s);
const round5 = n => Math.round(n / 5) * 5;
const money = n => "$" + n.toLocaleString("en-US");

function calculate() {
  const r = RATES[state.tipo], s = SERVICES[state.servicio], f = FREQUENCIES[state.frecuencia];
  let low  = Math.max(r.low  * state.m2 * s.mult, r.min, s.min);
  let high = Math.max(r.high * state.m2 * s.mult, r.min, s.min);
  low  = round5(low  * (1 - f.disc));
  high = round5(high * (1 - f.disc));
  if (high < low + 10) high = low + 10;
  return { low, high, visits: f.visits };
}

function render() {
  const { low, high, visits } = calculate();
  $("#priceLow").textContent = money(low);
  $("#priceHigh").textContent = money(high);

  const monthly = $("#priceMonthly");
  if (visits > 0) {
    monthly.hidden = false;
    monthly.textContent = `Total aproximado al mes (${visits} visita${visits > 1 ? "s" : ""}): ${money(low * visits)} – ${money(high * visits)}`;
  } else {
    monthly.hidden = true;
    monthly.textContent = "";
  }

  const money2 = n => "$" + n.toFixed(2);
  const feeLow = low * 0.05, feeHigh = high * 0.05;
  const taxLow = (low + feeLow) * 0.07, taxHigh = (high + feeHigh) * 0.07;
  const totLow = low + feeLow + taxLow, totHigh = high + feeHigh + taxHigh;
  const items = [
    ["Tipo de propiedad", RATES[state.tipo].label],
    ["Tamaño", state.m2 + " m²"],
    ["Tipo de servicio", SERVICES[state.servicio].label],
    ["Frecuencia", FREQUENCIES[state.frecuencia].label],
    ["Servicio Brillo Total (5%)", money2(feeLow) + " – " + money2(feeHigh)],
    ["ITBMS (7%)", money2(taxLow) + " – " + money2(taxHigh)],
    ["Total a pagar", money2(totLow) + " – " + money2(totHigh)]
  ];
  $("#calcSummary").innerHTML = items
    .map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`)
    .join("");
  return { low, high };
}

/* ---------- Controles segmentados ---------- */
function wireSegControl(id, key) {
  const group = document.getElementById(id);
  group.addEventListener("click", e => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    group.querySelectorAll(".seg-btn").forEach(b => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-checked", b === btn ? "true" : "false");
    });
    state[key] = btn.dataset.value;
    render();
  });
}
wireSegControl("propType", "tipo");
wireSegControl("serviceType", "servicio");
wireSegControl("frequency", "frecuencia");

/* ---------- Slider + número de m² (sincronizados) ---------- */
const range = $("#m2Range"), number = $("#m2Number");
range.addEventListener("input", () => { state.m2 = +range.value; number.value = range.value; render(); });
number.addEventListener("input", () => {
  let v = Math.min(500, Math.max(10, +number.value || 10));
  state.m2 = v;
  range.value = Math.min(+range.max, v);
  render();
});

/* ---------- Cotización por WhatsApp ---------- */
function quoteMessage() {
  const { low, high } = calculate();
  const lines = [
    "Hola Brillo Total, quiero cotizar una limpieza:",
    `• Tipo de propiedad: ${RATES[state.tipo].label}`,
    `• Tamaño: ${state.m2} m²`,
    `• Tipo de servicio: ${SERVICES[state.servicio].label}`,
    `• Frecuencia: ${FREQUENCIES[state.frecuencia].label}`,
    `• Estimado por visita: ${money(low)} – ${money(high)}`,
    `• Total con servicio (5%) e ITBMS (7%): $${(low * 1.05 * 1.07).toFixed(2)} – $${(high * 1.05 * 1.07).toFixed(2)}`,
    "¿Me confirman disponibilidad? ¡Gracias!"
  ];
  return lines.join("\n");
}

function handleWhatsApp(fallbackId) {
  const msg = quoteMessage();
  if (BUSINESS_WHATSAPP.trim()) {
    window.open(`https://wa.me/${BUSINESS_WHATSAPP.trim()}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    return;
  }
  const box = document.getElementById(fallbackId);
  box.hidden = false;
  box.textContent =
    "Tu cotización está lista:\n\n" + msg +
    "\n\n⚠️ Aún falta configurar el número de WhatsApp del negocio para enviarla directamente (constante BUSINESS_WHATSAPP en script.js).";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
$("#whatsappBtn").addEventListener("click", () => handleWhatsApp("waFallback"));
$("#whatsappBtn2").addEventListener("click", () => handleWhatsApp("waFallback2"));

/* ---------- FAQ (acordeón) ---------- */
document.querySelectorAll(".faq-item").forEach(item => {
  const btn = $(".faq-q", item), panel = $(".faq-a", item);
  btn.addEventListener("click", () => {
    const open = item.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    panel.style.maxHeight = open ? panel.scrollHeight + "px" : "0px";
  });
});

/* ---------- Nav: sombra al hacer scroll + menú móvil ---------- */
const nav = $("#nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 12), { passive: true });
const toggle = $("#navToggle"), links = $("#navLinks");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
});
links.addEventListener("click", e => { if (e.target.tagName === "A") links.classList.remove("open"); });

/* ---------- Animación al hacer scroll ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); } });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* ---------- Año del pie de página ---------- */
$("#year").textContent = new Date().getFullYear();

/* ---------- Catálogo: panel de pedido (bosquejo) ---------- */
const orderPanel = $("#orderPanel");
document.querySelectorAll(".order-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const price = parseFloat(btn.dataset.price);
    const desde = btn.dataset.desde === "1";
    const fee = price * 0.05;
    const tax = (price + fee) * 0.07;
    const total = price + fee + tax;
    const m2 = n => "$" + n.toFixed(2);
    const rows = [
      ["Servicio", btn.dataset.name],
      ["Precio", (desde ? "desde " : "") + m2(price)],
      ["Servicio Brillo Total (5%)", m2(fee)],
      ["ITBMS (7%)", m2(tax)],
      ["Total a pagar", (desde ? "desde " : "") + m2(total)]
    ];
    $("#orderSummary").innerHTML = rows
      .map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`)
      .join("");
    $("#confirmOrderBtn").textContent = "Confirmar pedido";
    $("#orderNote").textContent = "Bosquejo: al confirmar, tu pedido le aparece a los contratistas y uno lo toma.";
    orderPanel.hidden = false;
    orderPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});
$("#confirmOrderBtn").addEventListener("click", e => {
  e.target.textContent = "¡Pedido publicado! (bosquejo)";
  $("#orderNote").textContent = "Así quedaría: tu pedido ya es visible para los contratistas. En producción aquí seguiría el pago y la confirmación.";
});

/* ---------- Contratistas: tomar pedido (bosquejo) ---------- */
document.querySelectorAll(".take-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const taken = btn.classList.toggle("taken");
    btn.textContent = taken ? "Pedido tomado ✓" : "Tomar pedido";
    const badge = btn.closest(".order-card").querySelector(".order-badge");
    if (badge) badge.textContent = taken ? "Tomado por ti" : "Pedido disponible";
  });
});

/* Pintado inicial de la calculadora */
render();
