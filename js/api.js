(() => {
  const API_BASE_URL = ""; // e.g. "https://api.yourdomain.com" later

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  function dateDiffDays(isoStart, isoEnd) {
    const s = new Date(isoStart + "T00:00:00");
    const e = new Date(isoEnd + "T00:00:00");
    const ms = e - s;
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  }

  const extrasPerDay = {
    none: 0,
    gps: 5,
    childSeat: 4,
    fullInsurance: 12
  };

  const api = {
    async getFleet() {
      return loadJSON("data/fleet.json");
    },

    async getCarById(carId) {
      const fleet = await api.getFleet();
      return fleet.find(c => c.id === carId) || null;
    },

    // Mock availability search (always returns "available" for demo)
    // Replace with a real endpoint call later:
    // POST /availability { pickupLocation, pickupDate, dropoffDate, category }
    async searchAvailability({ pickupLocation, pickupDate, dropoffDate, category }) {
      const fleet = await api.getFleet();
      const filtered = category && category !== "any"
        ? fleet.filter(c => c.type === category)
        : fleet;

      return {
        pickupLocation,
        pickupDate,
        dropoffDate,
        category,
        results: filtered.map(c => ({ carId: c.id, available: true }))
      };
    },

    // Quote calculation is client-side in this demo.
    // In production, you may prefer server-side quoting.
    async calculateQuote({ carId, pickupDate, dropoffDate, extras }) {
      const car = await api.getCarById(carId);
      if (!car) throw new Error("Vehicle not found");

      const days = dateDiffDays(pickupDate, dropoffDate);
      if (days <= 0) throw new Error("Drop-off date must be after pick-up date");

      const base = car.pricePerDay * days;
      const extrasCost = (extrasPerDay[extras] ?? 0) * days;
      const total = base + extrasCost;

      return {
        carId,
        days,
        currency: "EUR",
        pricePerDay: car.pricePerDay,
        extras,
        base,
        extrasCost,
        total
      };
    },

    // Mock booking creation
    // Replace with:
    // POST /bookings { trip, driver, quote }
    async createBooking(payload) {
      // Example of how you would implement later:
      // const res = await fetch(`${API_BASE_URL}/bookings`, { method:"POST", headers:{...}, body: JSON.stringify(payload) })
      // return await res.json()

      await new Promise(r => setTimeout(r, 500));
      return {
        bookingId: "DEMO-" + Math.random().toString(16).slice(2, 10).toUpperCase(),
        status: "confirmed",
        receivedAt: new Date().toISOString(),
        payload
      };
    },

    // Mock contact submission
    async submitContact(payload) {
      await new Promise(r => setTimeout(r, 400));
      return { status: "ok", receivedAt: new Date().toISOString(), payload };
    }
  };

  window.api = api;
})();
