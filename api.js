/* api.js - thin client for the NordNeuron Logistics AI backend.
 *
 * The SPA remains fully functional if the backend is offline: every module
 * calls the API first and silently falls back to its built-in local logic on
 * any error. Point the app at a different backend by setting, before this
 * script loads:  <script>window.NORD_API_BASE = "https://api.example.com/api";</script>
 */
(function () {
  const DEFAULT_BASE = "http://127.0.0.1:8000/api";
  const BASE = (window.NORD_API_BASE || DEFAULT_BASE).replace(/\/$/, "");

  let online = null; // null = unknown, true/false once probed

  async function req(path, opts) {
    const res = await fetch(BASE + path, opts);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.status === 204 ? null : res.json();
  }

  function json(method, body) {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    };
  }

  const API = {
    base: BASE,
    get online() { return online; },

    async health() {
      try { await req("/health"); online = true; }
      catch (e) { online = false; }
      return online;
    },

    // Reference data
    ports: () => req("/reference/ports"),
    carriers: () => req("/reference/carriers"),
    containerTypes: () => req("/reference/container-types"),
    commodities: () => req("/reference/commodities"),
    incoterms: () => req("/reference/incoterms"),
    seasons: () => req("/reference/seasons"),

    // Modules
    hsSearch: (q) => req("/hs/search?q=" + encodeURIComponent(q)),
    freightQuote: (body) => req("/freight/quote", json("POST", body)),
    demurrageCalc: (body) => req("/demurrage/calculate", json("POST", body)),
    demurrageTariffs: (port, carrier) =>
      req("/demurrage/tariffs?port=" + encodeURIComponent(port || "") +
          "&carrier=" + encodeURIComponent(carrier || "")),
    etaVessels: () => req("/eta/vessels"),
    etaTelemetry: (key, weather) =>
      req("/eta/vessels/" + encodeURIComponent(key) + "/telemetry?weather=" + (weather || 0)),
    etaPredict: (body) => req("/eta/predict", json("POST", body)),
    pack: (body) => req("/container/pack", json("POST", body)),
    stats: () => req("/stats"),

    // RFQ
    rfqExtract: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return req("/rfq/extract", { method: "POST", body: fd });
    },
    rfqStandardFields: () => req("/rfq/standard-fields"),
    rfqCreate: (body) => req("/rfq", json("POST", body)),
    rfqList: () => req("/rfq")
  };

  window.NordAPI = API;

  // Probe once at startup and reflect status in the header pill if present.
  document.addEventListener("DOMContentLoaded", () => {
    API.health().then((ok) => {
      const pill = document.querySelector(".ai-status-pill span, #ai-engine-status");
      if (pill && ok) pill.textContent = "Backend Connected";
      if (!ok) console.info("[NordNeuron] Backend offline - using local fallback data.");
    });
  });
})();
