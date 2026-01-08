(() => {
  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function formatEUR(amount) {
    const n = Number(amount || 0);
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(n);
  }

  function toast(message, type = "info") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
    el.classList.add("show");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => el.classList.remove("show"), 2400);
  }

  function setYear() {
    const y = new Date().getFullYear();
    const el = $("#year");
    if (el) el.textContent = String(y);
  }

  function setupMobileNav() {
    const toggle = $("[data-nav-toggle]");
    const nav = $("[data-nav]");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Close menu on link click (mobile)
    $all("a", nav).forEach(a => {
      a.addEventListener("click", () => {
        if (nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  function createVehicleCard(car, { onDetails, onBook, compact = false } = {}) {
    const el = document.createElement("div");
    el.className = "card vehicle";

    const badge = car.badge ? `<span class="badge">${escapeHtml(car.badge)}</span>` : "";

    el.innerHTML = `
      <div class="top">
        <div>
          <h3>${escapeHtml(car.name)}</h3>
          <div class="muted small">${escapeHtml(car.typeLabel)} • ${escapeHtml(car.fuelLabel)}</div>
        </div>
        ${badge}
      </div>

      <div class="specs">
        <span class="spec">${escapeHtml(String(car.seats))} seats</span>
        <span class="spec">${escapeHtml(car.transmissionLabel)}</span>
        <span class="spec">${escapeHtml(car.bagsLabel)}</span>
      </div>

      <div class="price-row">
        <div class="price">${formatEUR(car.pricePerDay)} <small>/ day</small></div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline btn-sm" type="button" data-details>Details</button>
          <button class="btn btn-primary btn-sm" type="button" data-book>Book</button>
        </div>
      </div>
    `;

    el.querySelector("[data-details]").addEventListener("click", () => onDetails?.(car));
    el.querySelector("[data-book]").addEventListener("click", () => onBook?.(car));

    return el;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.ui = { $, $all, toast, setYear, setupMobileNav, formatEUR, createVehicleCard, escapeHtml };
})();
