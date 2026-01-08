(() => {
  const { $, $all, toast, setYear, setupMobileNav, formatEUR, createVehicleCard, escapeHtml } = window.ui;

  function page() {
    const p = location.pathname.split("/").pop();
    return p || "index.html";
  }

  function setMinDates() {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);

    const ids = ["pickDate", "dropDate", "pickupDate", "dropoffDate"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.min = iso;
    });
  }

  function defaultDates() {
    const today = new Date();
    const plus2 = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    const plus5 = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
    const d2 = plus2.toISOString().slice(0, 10);
    const d5 = plus5.toISOString().slice(0, 10);

    const pick = $("#pickDate") || $("#pickupDate");
    const drop = $("#dropDate") || $("#dropoffDate");

    if (pick && !pick.value) pick.value = d2;
    if (drop && !drop.value) drop.value = d5;
  }

  function storeQuickQuote(formData) {
    const payload = Object.fromEntries(formData.entries());
    localStorage.setItem("swiftRent.quickQuote", JSON.stringify(payload));
  }

  function loadQuickQuote() {
    const raw = localStorage.getItem("swiftRent.quickQuote");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function setSelectedCarId(carId) {
    localStorage.setItem("swiftRent.selectedCarId", carId);
  }

  function getSelectedCarId() {
    return localStorage.getItem("swiftRent.selectedCarId");
  }

  async function initHome() {
    const featuredEl = $("#featured");
    if (!featuredEl) return;

    const fleet = await api.getFleet();
    const featured = fleet.filter(c => c.featured).slice(0, 6);

    featuredEl.innerHTML = "";
    featured.forEach(car => {
      featuredEl.appendChild(createVehicleCard(car, {
        onDetails: () => {
          setSelectedCarId(car.id);
          location.href = "fleet.html#car=" + encodeURIComponent(car.id);
        },
        onBook: () => {
          setSelectedCarId(car.id);
          location.href = "booking.html";
        }
      }));
    });

    const quickForm = $("#quick-quote");
    if (quickForm) {
      quickForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(quickForm);
        storeQuickQuote(fd);
        toast("Searching availability (demo) …");
        location.href = "fleet.html";
      });
    }
  }

  function normalizeFleetItem(c) {
    return {
      ...c,
      typeLabel: labelType(c.type),
      fuelLabel: labelFuel(c.fuel),
      transmissionLabel: c.transmission === "automatic" ? "Automatic" : "Manual",
      bagsLabel: `${c.bags} bag${c.bags === 1 ? "" : "s"}`
    };
  }

  function labelType(type) {
    const map = { economy: "Economy", compact: "Compact", suv: "SUV", van: "Van", luxury: "Luxury" };
    return map[type] || "Vehicle";
  }

  function labelFuel(fuel) {
    const map = { petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", electric: "Electric" };
    return map[fuel] || "Fuel";
  }

  function applyFleetFilters(fleet, { q, type, trans, seats, sort }) {
    let out = fleet;

    const qn = (q || "").trim().toLowerCase();
    if (qn) {
      out = out.filter(c => {
        const hay = [
          c.name, c.type, c.typeLabel, c.fuel, c.fuelLabel,
          c.transmission, c.transmissionLabel,
          String(c.seats), String(c.bags), c.badge || ""
        ].join(" ").toLowerCase();
        return hay.includes(qn);
      });
    }

    if (type && type !== "any") out = out.filter(c => c.type === type);
    if (trans && trans !== "any") out = out.filter(c => c.transmission === trans);
    if (seats && seats !== "any") out = out.filter(c => String(c.seats) === String(seats));

    out = out.slice();

    switch (sort) {
      case "priceDesc": out.sort((a,b) => b.pricePerDay - a.pricePerDay); break;
      case "nameAsc": out.sort((a,b) => a.name.localeCompare(b.name)); break;
      case "nameDesc": out.sort((a,b) => b.name.localeCompare(a.name)); break;
      case "priceAsc":
      default: out.sort((a,b) => a.pricePerDay - b.pricePerDay); break;
    }

    return out;
  }

  async function initFleet() {
    const grid = $("#fleetGrid");
    if (!grid) return;

    const fleetRaw = await api.getFleet();
    const fleet = fleetRaw.map(normalizeFleetItem);

    const qEl = $("#q");
    const typeEl = $("#type");
    const transEl = $("#trans");
    const seatsEl = $("#seats");
    const sortEl = $("#sort");
    const resetEl = $("#reset");
    const metaEl = $("#resultsMeta");

    const modal = $("#carModal");
    const modalTitle = $("#modalTitle");
    const modalBody = $("#modalBody");
    const bookFromModal = $("#bookFromModal");

    function openModal(car) {
      if (!modal) return;
      modalTitle.textContent = car.name;
      modalBody.innerHTML = `
        <div class="muted small">${escapeHtml(car.typeLabel)} • ${escapeHtml(car.fuelLabel)} • ${escapeHtml(car.transmissionLabel)}</div>
        <div class="grid cards" style="grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px;">
          <div class="card" style="padding:12px; box-shadow:none;">
            <div class="muted small">Seats</div>
            <strong>${escapeHtml(String(car.seats))}</strong>
          </div>
          <div class="card" style="padding:12px; box-shadow:none;">
            <div class="muted small">Bags</div>
            <strong>${escapeHtml(String(car.bags))}</strong>
          </div>
          <div class="card" style="padding:12px; box-shadow:none;">
            <div class="muted small">Deposit</div>
            <strong>${formatEUR(car.deposit)}</strong>
          </div>
          <div class="card" style="padding:12px; box-shadow:none;">
            <div class="muted small">Price</div>
            <strong>${formatEUR(car.pricePerDay)} / day</strong>
          </div>
        </div>
        <div class="notice">
          <strong>Policy (example)</strong>
          <p class="small muted">
            Unlimited mileage, basic insurance included. Driver must hold a valid license.
            Replace this text with your actual terms.
          </p>
        </div>
      `;
      bookFromModal.href = "booking.html";
      setSelectedCarId(car.id);
      modal.showModal();
    }

    function render() {
      const filters = {
        q: qEl?.value ?? "",
        type: typeEl?.value ?? "any",
        trans: transEl?.value ?? "any",
        seats: seatsEl?.value ?? "any",
        sort: sortEl?.value ?? "priceAsc"
      };

      const list = applyFleetFilters(fleet, filters);
      grid.innerHTML = "";

      list.forEach(car => {
        grid.appendChild(createVehicleCard(car, {
          onDetails: openModal,
          onBook: () => {
            setSelectedCarId(car.id);
            toast("Vehicle selected. Continue to booking.");
            location.href = "booking.html";
          }
        }));
      });

      if (metaEl) metaEl.textContent = `${list.length} vehicle(s) shown`;
    }

    [qEl, typeEl, transEl, seatsEl, sortEl].forEach(el => {
      if (!el) return;
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    resetEl?.addEventListener("click", () => {
      if (qEl) qEl.value = "";
      if (typeEl) typeEl.value = "any";
      if (transEl) transEl.value = "any";
      if (seatsEl) seatsEl.value = "any";
      if (sortEl) sortEl.value = "priceAsc";
      render();
    });

    // If coming from home quick quote, pre-apply type filter.
    const qq = loadQuickQuote();
    if (qq?.category && typeEl) typeEl.value = qq.category;

    render();

    // Support deep-link: fleet.html#car=car_001
    const hash = location.hash || "";
    if (hash.includes("car=")) {
      const id = decodeURIComponent(hash.split("car=")[1] || "");
      const found = fleet.find(c => c.id === id);
      if (found) openModal(found);
    }
  }

  async function initBooking() {
    const form = $("#bookingForm");
    const carSelect = $("#carSelect");
    if (!form || !carSelect) return;

    const fleetRaw = await api.getFleet();
    const fleet = fleetRaw.map(normalizeFleetItem);

    carSelect.innerHTML = fleet.map(c =>
      `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} — ${formatEUR(c.pricePerDay)}/day</option>`
    ).join("");

    const selected = getSelectedCarId();
    if (selected && fleet.some(c => c.id === selected)) {
      carSelect.value = selected;
    }

    // Load quick quote if available
    const qq = loadQuickQuote();
    if (qq) {
      const pickupLocation = $("#pickupLocation");
      const pickupDate = $("#pickupDate");
      const dropoffDate = $("#dropoffDate");
      if (pickupLocation && !pickupLocation.value) pickupLocation.value = qq.pickup || "";
      if (pickupDate && !pickupDate.value) pickupDate.value = qq.pickDate || "";
      if (dropoffDate && !dropoffDate.value) dropoffDate.value = qq.dropDate || "";
    }

    // Quote UI elements
    const sumCar = $("#sumCar");
    const sumDays = $("#sumDays");
    const sumBase = $("#sumBase");
    const sumExtras = $("#sumExtras");
    const sumTotal = $("#sumTotal");

    async function updateQuote() {
      const pickupDate = $("#pickupDate")?.value;
      const dropoffDate = $("#dropoffDate")?.value;
      const carId = carSelect.value;
      const extras = $("#extras")?.value ?? "none";

      const car = fleet.find(c => c.id === carId);
      if (sumCar) sumCar.textContent = car ? car.name : "—";

      if (!pickupDate || !dropoffDate || !carId) return;

      try {
        const quote = await api.calculateQuote({ carId, pickupDate, dropoffDate, extras });

        if (sumDays) sumDays.textContent = String(quote.days);
        if (sumBase) sumBase.textContent = formatEUR(quote.base);
        if (sumExtras) sumExtras.textContent = formatEUR(quote.extrasCost);
        if (sumTotal) sumTotal.textContent = formatEUR(quote.total);
      } catch (err) {
        if (sumDays) sumDays.textContent = "—";
        if (sumBase) sumBase.textContent = "—";
        if (sumExtras) sumExtras.textContent = "—";
        if (sumTotal) sumTotal.textContent = "—";
      }
    }

    ["change", "input"].forEach(evt => {
      form.addEventListener(evt, (e) => {
        const t = e.target;
        if (!t) return;
        if (["pickupDate", "dropoffDate", "carSelect", "extras"].includes(t.id) || t === carSelect) {
          updateQuote();
        }
      });
    });

    carSelect.addEventListener("change", () => {
      setSelectedCarId(carSelect.value);
      updateQuote();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const pickupDate = $("#pickupDate")?.value;
      const dropoffDate = $("#dropoffDate")?.value;

      if (!pickupDate || !dropoffDate) {
        toast("Please select pick-up and drop-off dates.", "error");
        return;
      }

      try {
        const fd = new FormData(form);
        const extras = $("#extras")?.value ?? "none";
        const carId = fd.get("carId");

        const quote = await api.calculateQuote({
          carId,
          pickupDate,
          dropoffDate,
          extras
        });

        const payload = {
          trip: {
            pickupLocation: fd.get("pickupLocation"),
            dropoffLocation: fd.get("dropoffLocation"),
            pickupDate,
            dropoffDate,
            carId,
            extras
          },
          driver: {
            fullName: fd.get("fullName"),
            email: fd.get("email"),
            phone: fd.get("phone")
          },
          quote
        };

        const result = await api.createBooking(payload);
        toast(`Booking confirmed (demo): ${result.bookingId}`);
        form.reset();
        updateQuote();
      } catch (err) {
        toast(err?.message || "Booking failed (demo).", "error");
      }
    });

    updateQuote();
  }

  async function initContact() {
    const form = $("#contactForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());

      try {
        await api.submitContact(payload);
        toast("Message sent (demo).");
        form.reset();
      } catch {
        toast("Failed to send message (demo).", "error");
      }
    });
  }

  // Boot
  document.addEventListener("DOMContentLoaded", async () => {
    setYear();
    setupMobileNav();
    setMinDates();
    defaultDates();

    const p = page();
    try {
      if (p === "index.html") await initHome();
      if (p === "fleet.html") await initFleet();
      if (p === "booking.html") await initBooking();
      if (p === "contact.html") await initContact();
    } catch (err) {
      toast(err?.message || "Something went wrong.");
      console.error(err);
    }
  });
})();
