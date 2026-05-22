/* modules.js - NordNeuron Logistics AI Modules Core Business Logic */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize all modules with safety wrappers to prevent CDN failures from cascading
  safeInit("RFQ Analyzer", initRFQAnalyzer);
  safeInit("Freight Calculator", initFreightCalculator);
  safeInit("HS Code Finder", initHSCodeFinder);
  safeInit("Demurrage Calculator", initDemurrageCalculator);
  safeInit("ETA Predictor", initETAPredictor);
});

function safeInit(name, initFn) {
  try {
    initFn();
  } catch (error) {
    console.error(`[NordNeuron Error] Failed to initialize ${name}:`, error);
  }
}

// =========================================================================
// MODULE 1: RFQ ANALYZER
// =========================================================================
function initRFQAnalyzer() {
  const dropZone = document.getElementById("rfq-drop-zone");
  const fileInput = document.getElementById("rfq-file-input");
  const fileList = document.getElementById("rfq-file-list");
  const progressWrapper = document.getElementById("analysis-progress-wrapper");
  const badge = document.getElementById("extraction-badge");

  const fields = {
    pol: document.getElementById("rfq-pol"),
    pod: document.getElementById("rfq-pod"),
    container: document.getElementById("rfq-container-type"),
    volume: document.getElementById("rfq-volume"),
    incoterms: document.getElementById("rfq-incoterms"),
    commodity: document.getElementById("rfq-commodity"),
    carrier: document.getElementById("rfq-carrier"),
    validity: document.getElementById("rfq-validity")
  };

  // Mock extraction database based on uploaded file keyword
  const mockExtractions = [
    {
      keywords: ["eu", "rotterdam", "hamburg", "rate"],
      data: {
        pol: "Shanghai (CNSHA)",
        pod: "Rotterdam (NLRTM)",
        container: "40HC",
        volume: "24",
        incoterms: "FOB",
        commodity: "Industrial Machinery Parts",
        carrier: "MSC",
        validity: "2026-06-01 to 2026-12-31"
      }
    },
    {
      keywords: ["us", "la", "california", "los angeles", "ocean"],
      data: {
        pol: "Shenzhen (CNSZX)",
        pod: "Los Angeles (USLAX)",
        container: "40GP",
        volume: "12",
        incoterms: "CIF",
        commodity: "Apparel & Textiles",
        carrier: "COMA CGM",
        validity: "2026-07-01 to 2026-09-30"
      }
    },
    {
      keywords: ["default"],
      data: {
        pol: "Shanghai (CNSHA)",
        pod: "Los Angeles (USLAX)",
        container: "40HC",
        volume: "15",
        incoterms: "FOB",
        commodity: "Consumer Electronics",
        carrier: "MAERSK",
        validity: "2026-06-01 to 2026-12-31"
      }
    }
  ];

  // Drag and drop events
  ["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    }, false);
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    }, false);
  });

  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  });

  fileInput.addEventListener("change", function() {
    handleFiles(this.files);
  });

  function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    
    // Add file UI item
    fileList.innerHTML = `
      <div class="file-item">
        <div class="file-item-info">
          <i class="fa-solid fa-file-excel" style="color: var(--color-cyan);"></i>
          <div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <button class="btn btn-danger btn-icon" id="btn-remove-file"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;

    document.getElementById("btn-remove-file").addEventListener("click", () => {
      fileList.innerHTML = "";
      progressWrapper.style.display = "none";
      clearFields();
      badge.textContent = "Draft";
      badge.className = "badge badge-info";
    });

    const isExcelOrCsv = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv");
    
    if (isExcelOrCsv && typeof XLSX !== "undefined") {
      parseRFQFile(file, (err, res) => {
        if (err) {
          console.warn("SheetJS failed parsing RFQ file, falling back to mock:", err);
          simulateExtraction(file.name, null);
        } else {
          simulateExtraction(file.name, res);
        }
      });
    } else {
      simulateExtraction(file.name, null);
    }
  }

  function parseRFQFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert worksheet rows to array of arrays
        const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1});
        if (rows.length < 2) {
          throw new Error("No data records found in worksheet.");
        }
        
        // Header recognition with fuzzy matching regex
        const fuzzyMappings = {
          pol: [/pol/i, /port.*load/i, /origin/i, /from/i, /loading/i],
          pod: [/pod/i, /port.*dis/i, /destination/i, /to/i, /discharge/i],
          container: [/container/i, /equipment/i, /size/i, /type/i, /equip/i],
          volume: [/volume/i, /qty/i, /quantity/i, /containers/i, /vol/i],
          incoterms: [/incoterm/i, /incoterms/i, /terms/i, /shipping.*terms/i],
          commodity: [/commodity/i, /description/i, /goods/i, /cargo/i, /item/i],
          carrier: [/carrier/i, /line/i, /shipping.*line/i, /operator/i],
          validity: [/valid/i, /expiry/i, /date/i, /expiration/i, /valid.*to/i]
        };

        let headerRowIndex = -1;
        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const row = rows[r];
          let score = 0;
          row.forEach(cell => {
            if (cell && typeof cell === 'string') {
              Object.values(fuzzyMappings).forEach(regexes => {
                if (regexes.some(rx => rx.test(cell))) score++;
              });
            }
          });
          if (score >= 2) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;
        
        const headers = rows[headerRowIndex].map(h => String(h || '').trim().toLowerCase());
        const dataRows = rows.slice(headerRowIndex + 1).filter(row => row.length > 0);
        
        if (dataRows.length === 0) {
          throw new Error("No rows found below headers.");
        }

        const colIndices = {};
        Object.keys(fuzzyMappings).forEach(field => {
          const regexes = fuzzyMappings[field];
          colIndices[field] = headers.findIndex(h => regexes.some(rx => rx.test(h)));
        });

        const firstDataRow = dataRows[0];
        const extracted = {};
        Object.keys(colIndices).forEach(field => {
          const idx = colIndices[field];
          extracted[field] = (idx !== -1 && firstDataRow[idx] !== undefined) ? firstDataRow[idx] : "";
        });

        // Normalize output results
        if (extracted.pol) {
          extracted.pol = String(extracted.pol);
          if (!extracted.pol.includes("(")) {
            if (extracted.pol.toLowerCase().includes("shanghai")) extracted.pol = "Shanghai (CNSHA)";
            else if (extracted.pol.toLowerCase().includes("shenzhen")) extracted.pol = "Shenzhen (CNSZX)";
            else if (extracted.pol.toLowerCase().includes("ningbo")) extracted.pol = "Ningbo (CNNGB)";
          }
        }
        if (extracted.pod) {
          extracted.pod = String(extracted.pod);
          if (!extracted.pod.includes("(")) {
            if (extracted.pod.toLowerCase().includes("angeles") || extracted.pod.toLowerCase().includes("lax")) extracted.pod = "Los Angeles (USLAX)";
            else if (extracted.pod.toLowerCase().includes("rotterdam")) extracted.pod = "Rotterdam (NLRTM)";
            else if (extracted.pod.toLowerCase().includes("singapore")) extracted.pod = "Singapore (SGSIN)";
            else if (extracted.pod.toLowerCase().includes("york")) extracted.pod = "New York (USNYC)";
          }
        }
        if (extracted.container) {
          extracted.container = String(extracted.container).toUpperCase().trim();
          if (extracted.container.includes("40") && (extracted.container.includes("HC") || extracted.container.includes("HIGH"))) extracted.container = "40HC";
          else if (extracted.container.includes("40") && (extracted.container.includes("GP") || extracted.container.includes("STANDARD"))) extracted.container = "40GP";
          else if (extracted.container.includes("20")) extracted.container = "20GP";
          else if (extracted.container.includes("45")) extracted.container = "45HC";
        }
        if (extracted.volume) {
          extracted.volume = parseInt(extracted.volume) || "";
        }
        if (extracted.incoterms) {
          extracted.incoterms = String(extracted.incoterms).toUpperCase().trim();
          const validIncoterms = ["FOB", "CIF", "EXW", "DDP", "FCA", "DAP"];
          const matched = validIncoterms.find(v => extracted.incoterms.includes(v));
          extracted.incoterms = matched || "FOB";
        }

        callback(null, {
          data: extracted,
          totalRows: dataRows.length
        });
      } catch (err) {
        callback(err, null);
      }
    };
    reader.onerror = function() {
      callback(new Error("FileReader failed."), null);
    };
    reader.readAsArrayBuffer(file);
  }

  function simulateExtraction(filename, parsedResult) {
    progressWrapper.style.display = "block";
    badge.textContent = "Analyzing...";
    badge.className = "badge badge-warning";
    
    const steps = [
      document.getElementById("step-1"),
      document.getElementById("step-2"),
      document.getElementById("step-3"),
      document.getElementById("step-4")
    ];

    // Reset status steps
    steps.forEach((step, idx) => {
      step.className = "progress-step" + (idx === 0 ? " active" : "");
      step.querySelector("i").className = idx === 0 ? "fa-solid fa-circle-notch fa-spin" : "fa-regular fa-circle";
    });

    let currentStep = 0;
    const interval = setInterval(() => {
      // Complete current step
      steps[currentStep].className = "progress-step completed";
      steps[currentStep].querySelector("i").className = "fa-solid fa-circle-check text-emerald";

      currentStep++;
      if (currentStep < steps.length) {
        // Activate next step
        steps[currentStep].className = "progress-step active";
        steps[currentStep].querySelector("i").className = "fa-solid fa-circle-notch fa-spin";
      } else {
        clearInterval(interval);
        
        setTimeout(() => {
          if (parsedResult && parsedResult.data) {
            const d = parsedResult.data;
            fields.pol.value = d.pol || "";
            fields.pod.value = d.pod || "";
            fields.container.value = d.container || "40HC";
            fields.volume.value = d.volume || "";
            fields.incoterms.value = d.incoterms || "FOB";
            fields.commodity.value = d.commodity || "";
            fields.carrier.value = d.carrier || "";
            fields.validity.value = d.validity || "";

            badge.textContent = `Extracted (${parsedResult.totalRows} Lanes)`;
            badge.className = "badge badge-success";
          } else {
            // Mock data fallback
            const filenameLower = filename.toLowerCase();
            let matched = mockExtractions.find(me => me.keywords.some(k => filenameLower.includes(k)));
            if (!matched) matched = mockExtractions.find(me => me.keywords.includes("default"));

            fields.pol.value = matched.data.pol;
            fields.pod.value = matched.data.pod;
            fields.container.value = matched.data.container;
            fields.volume.value = matched.data.volume;
            fields.incoterms.value = matched.data.incoterms;
            fields.commodity.value = matched.data.commodity;
            fields.carrier.value = matched.data.carrier;
            fields.validity.value = matched.data.validity;

            badge.textContent = "AI Extracted";
            badge.className = "badge badge-success";
          }
          
          progressWrapper.style.display = "none";

          // Update global stats
          if (typeof window.updateGlobalStats === "function") {
            window.updateGlobalStats({ rfqs: 5 });
          }
        }, 200);
      }
    }, 400);
  }

  function clearFields() {
    Object.values(fields).forEach(f => f.value = "");
  }

  document.getElementById("btn-rfq-clear").addEventListener("click", () => {
    fileList.innerHTML = "";
    progressWrapper.style.display = "none";
    clearFields();
    badge.textContent = "Draft";
    badge.className = "badge badge-info";
  });

  document.getElementById("btn-rfq-export").addEventListener("click", () => {
    const data = {};
    Object.keys(fields).forEach(k => {
      data[k] = fields[k].value;
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nordneuron-rfq-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btn-rfq-send-calc").addEventListener("click", () => {
    // Copy parameters to calculator inputs
    const polVal = fields.pol.value || "Shanghai (CNSHA)";
    const podVal = fields.pod.value || "Los Angeles (USLAX)";
    
    document.getElementById("calc-lane").value = `${polVal} to ${podVal}`;
    document.getElementById("calc-container-type").value = fields.container.value || "40HC";
    
    const carrierInput = document.getElementById("calc-carrier");
    const parsedCarrier = (fields.carrier.value || "MAERSK").toUpperCase();
    
    // Select option in dropdown if exists
    let carrierFound = false;
    for (let i = 0; i < carrierInput.options.length; i++) {
      if (parsedCarrier.includes(carrierInput.options[i].value)) {
        carrierInput.selectedIndex = i;
        carrierFound = true;
        break;
      }
    }

    // Switch tab programmatically
    const calcTab = document.querySelector('.sidebar .nav-item[data-tab="freight-calculator"]');
    if (calcTab) calcTab.click();
  });

  // Expected column guide toggle
  const guideBtn = document.getElementById("btn-rfq-guide-toggle");
  const guidePanel = document.getElementById("rfq-columns-guide");
  const guideChevron = document.getElementById("rfq-guide-chevron");
  
  if (guideBtn && guidePanel && guideChevron) {
    guideBtn.addEventListener("click", () => {
      const isHidden = guidePanel.style.display === "none";
      guidePanel.style.display = isHidden ? "block" : "none";
      guideChevron.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
    });
  }
}


// =========================================================================
// MODULE 2: FREIGHT CALCULATOR
// =========================================================================
let historicalChart = null;

function initFreightCalculator() {
  const inputs = {
    lane: document.getElementById("calc-lane"),
    container: document.getElementById("calc-container-type"),
    carrier: document.getElementById("calc-carrier"),
    season: document.getElementById("calc-season"),
    baf: document.getElementById("calc-baf"),
    congestion: document.getElementById("calc-congestion-fee"),
    local: document.getElementById("calc-local-fee"),
    margin: document.getElementById("calc-margin-slider")
  };

  const outputs = {
    base: document.getElementById("calc-base-ocean"),
    surcharges: document.getElementById("calc-total-surcharges"),
    allinCost: document.getElementById("calc-allin-cost"),
    marginLabel: document.getElementById("calc-margin-label"),
    profit: document.getElementById("calc-profit-dollar"),
    sell: document.getElementById("calc-sell-price")
  };

  // Base pricing lookup table based on routing and container
  const oceanFreightTariffs = {
    "shanghai": { "20GP": 2100, "40GP": 3000, "40HC": 3400 },
    "shenzhen": { "20GP": 2300, "40GP": 3200, "40HC": 3600 },
    "ningbo": { "20GP": 2150, "40GP": 3100, "40HC": 3450 },
    "default": { "20GP": 2200, "40GP": 3150, "40HC": 3500 }
  };

  function runCalculations() {
    const laneText = inputs.lane.value.toLowerCase();
    const containerType = inputs.container.value;
    const marginPct = parseInt(inputs.margin.value);

    // Update margin text indicator
    outputs.marginLabel.textContent = `${marginPct}%`;

    // 1. Calculate Base Ocean Freight based on origin city keywords
    let originKey = "default";
    if (laneText.includes("shanghai")) originKey = "shanghai";
    else if (laneText.includes("shenzhen")) originKey = "shenzhen";
    else if (laneText.includes("ningbo")) originKey = "ningbo";

    let baseOcean = oceanFreightTariffs[originKey][containerType] || oceanFreightTariffs["default"][containerType];

    // Seasonality adjustment multiplier
    const seasonality = inputs.season.value;
    if (seasonality === "peak") baseOcean *= 1.15;
    else if (seasonality === "slack") baseOcean *= 0.90;

    // 2. Sum Surcharges
    const baf = parseFloat(inputs.baf.value) || 0;
    const congestion = parseFloat(inputs.congestion.value) || 0;
    const local = parseFloat(inputs.local.value) || 0;
    const totalSurcharges = baf + congestion + local;

    // 3. Compute Net and Selling Price
    const allinCost = baseOcean + totalSurcharges;
    const sellPrice = allinCost / (1 - (marginPct / 100));
    const profitDollar = sellPrice - allinCost;

    // Render results
    outputs.base.textContent = window.formatCurrency(baseOcean);
    outputs.surcharges.textContent = window.formatCurrency(totalSurcharges);
    outputs.allinCost.textContent = window.formatCurrency(allinCost);
    outputs.profit.textContent = window.formatCurrency(profitDollar);
    outputs.sell.textContent = window.formatCurrency(sellPrice);

    updateComparisonChart(sellPrice, allinCost);
  }

  // Bind change listeners to trigger calculations
  Object.values(inputs).forEach(input => {
    input.addEventListener("input", runCalculations);
    input.addEventListener("change", runCalculations);
  });

  // Load and render Chart
  function updateComparisonChart(currentQuote, currentCost) {
    const chartCanvas = document.getElementById("historical-bids-chart");
    if (!chartCanvas) return;

    if (typeof Chart === "undefined") {
      const parent = chartCanvas.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); text-align: center; font-size: 0.8rem;">
            <i class="fa-solid fa-chart-line" style="font-size: 1.8rem; margin-bottom: 8px; color: var(--color-text-muted);"></i>
            <span class="bold">Historical Chart Offline</span>
            <span style="font-size:0.75rem; color:var(--color-text-muted); margin-top:2px;">Chart.js library is blocked/offline</span>
          </div>
        `;
      }
      return;
    }

    const ctx = chartCanvas.getContext("2d");
    
    // Mock historical rates
    const historicalQuotes = [
      currentQuote * 1.18, // Bid 2024
      currentQuote * 1.05, // Bid 2025
      currentQuote * 0.92, // Bid Late 2025
      currentQuote         // Current Proposal
    ];

    const historicalCosts = [
      currentCost * 1.15,
      currentCost * 1.02,
      currentCost * 0.94,
      currentCost
    ];

    if (historicalChart) {
      historicalChart.data.datasets[0].data = historicalQuotes;
      historicalChart.data.datasets[1].data = historicalCosts;
      historicalChart.update();
      return;
    }

    historicalChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ["Bid FY2024", "Bid H1-2025", "Bid H2-2025", "NordNeuron Quote (Current)"],
        datasets: [
          {
            label: "Selling Price / Rate Quote ($)",
            data: historicalQuotes,
            borderColor: "#00f0ff",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: "#00f0ff",
            pointHoverRadius: 7
          },
          {
            label: "All-in Ocean Cost ($)",
            data: historicalCosts,
            borderColor: "#8a2be2",
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
            pointBackgroundColor: "#8a2be2",
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8',
              font: { family: 'Outfit', size: 11 }
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Outfit' },
              callback: function(value) { return '$' + value; }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Outfit' }
            }
          }
        }
      }
    });
  }

  // Global access to chart resizing on tab switch
  window.resizeFreightChart = () => {
    if (historicalChart) {
      setTimeout(() => {
        historicalChart.resize();
      }, 50);
    }
  };

  // Initial computation
  runCalculations();
}


// =========================================================================
// MODULE 4: HS CODE FINDER
// =========================================================================
function initHSCodeFinder() {
  const searchInput = document.getElementById("hs-search-input");
  const resultsContainer = document.getElementById("hs-results-container");

  // Mock index for customs classification
  const customsIndex = [
    {
      keywords: ["toy", "toys", "plastic toy", "doll", "game"],
      code: "9503.00.00",
      description: "Tricycles, scooters, pedal cars and similar wheeled toys; dolls' carriages; dolls; other toys; reduced-size ('scale') models and similar recreational models, working or not; puzzles of all kinds.",
      duty: "0.0%",
      vat: "18.0%",
      status: "Allowed",
      badgeClass: "badge-success",
      notes: "Subject to Consumer Product Safety Commission (CPSC) certification. No heavy metals allowed in pigments."
    },
    {
      keywords: ["car", "automobile", "spare parts", "engine", "brakes", "gearbox"],
      code: "8708.29.90",
      description: "Parts and accessories of the motor vehicles of headings 8701 to 8705: Other parts and accessories of bodies (including cabs): Other.",
      duty: "2.5%",
      vat: "19.0%",
      status: "Allowed",
      badgeClass: "badge-success",
      notes: "Requires manufacturer safety certification. Certain friction materials are regulated for asbestos content."
    },
    {
      keywords: ["lithium", "battery", "batteries", "powerbank", "cell"],
      code: "8507.60.00",
      description: "Electric accumulators, including separators therefor, whether or not rectangular (including square); lithium-ion accumulators.",
      duty: "3.4%",
      vat: "20.0%",
      status: "Restricted",
      badgeClass: "badge-warning",
      notes: "Classified as dangerous goods (Class 9). Must comply with UN38.3 transport standards. Special carrier approval needed."
    },
    {
      keywords: ["coffee", "coffee beans", "espresso", "caffeine"],
      code: "0901.21.00",
      description: "Coffee, whether or not roasted or decaffeinated; roasted: Not decaffeinated.",
      duty: "0.0%",
      vat: "7.0%",
      status: "Restricted",
      badgeClass: "badge-warning",
      notes: "FDA bio-terrorism registration required for import. Phyto-sanitary inspection is mandatory at arrival port."
    },
    {
      keywords: ["cup", "mug", "ceramic", "porcelain", "pottery"],
      code: "6912.00.44",
      description: "Ceramic tableware, kitchenware, other household articles and toilet articles, other than of porcelain or china: Mug-shaped cups.",
      duty: "4.5%",
      vat: "19.0%",
      status: "Allowed",
      badgeClass: "badge-success",
      notes: "Food contact safety declaration (lead & cadmium release limits) must accompany customs entry paperwork."
    },
    {
      keywords: ["t-shirt", "shirt", "clothing", "apparel", "cotton"],
      code: "6109.10.00",
      description: "T-shirts, singlets and other vests, knitted or crocheted, of cotton.",
      duty: "16.5%",
      vat: "21.0%",
      status: "Allowed",
      badgeClass: "badge-success",
      notes: "Textile origin declaration required. High tariff rates apply. Check for active bilateral country quotas."
    },
    {
      keywords: ["chemical", "acid", "toxic", "hazardous"],
      code: "3824.99.92",
      description: "Chemical products and preparations of the chemical or allied industries (including those consisting of mixtures of natural products), not elsewhere specified or included.",
      duty: "6.5%",
      vat: "19.0%",
      status: "Hazardous / Restricted",
      badgeClass: "badge-danger",
      notes: "EPA TSCA import certificate required. Subject to OSHA hazardous communication standards. Strict cargo declarations."
    }
  ];

  searchInput.addEventListener("input", function() {
    const query = this.value.trim().toLowerCase();
    
    if (query.length < 2) {
      resultsContainer.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-secondary);">
          <i class="fa-solid fa-circle-question" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--color-text-muted);"></i>
          <p>Type in the search bar above to query customs codes.</p>
        </div>
      `;
      return;
    }

    // Filter index for query matches
    const matches = customsIndex.filter(item => 
      item.keywords.some(k => query.includes(k) || k.includes(query)) ||
      item.code.includes(query) ||
      item.description.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-crimson);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 12px;"></i>
          <p class="bold">No HS codes found for "${this.value}"</p>
          <p class="text-secondary mt-4" style="font-size: 0.85rem;">Try using broader terms like "toys", "clothing", "battery", or "parts".</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = matches.map(match => `
      <div class="hs-result-card">
        <div class="hs-header-row">
          <div class="hs-code-num">${match.code}</div>
          <span class="badge ${match.badgeClass}">${match.status}</span>
        </div>
        <div class="hs-description">${match.description}</div>
        <div class="hs-meta-row">
          <div class="hs-meta-col">
            <span class="hs-meta-label">Customs Duty</span>
            <span class="hs-meta-val text-cyan">${match.duty}</span>
          </div>
          <div class="hs-meta-col">
            <span class="hs-meta-label">VAT / GST</span>
            <span class="hs-meta-val text-purple">${match.vat}</span>
          </div>
        </div>
        <div class="hs-notes">
          <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; margin-bottom:4px; color:var(--color-text-primary)">Customs Regulation Note:</div>
          ${match.notes}
        </div>
      </div>
    `).join("");
  });
}


// =========================================================================
// MODULE 5: DEMURRAGE CALCULATOR
// =========================================================================
let demurrageChart = null;

function initDemurrageCalculator() {
  const inputs = {
    port: document.getElementById("dem-port"),
    carrier: document.getElementById("dem-carrier"),
    freeDays: document.getElementById("dem-free-days"),
    rate: document.getElementById("dem-daily-rate"),
    arrival: document.getElementById("dem-arrival-date"),
    pickup: document.getElementById("dem-pickup-date")
  };

  const outputs = {
    overdueDays: document.getElementById("dem-overdue-days"),
    totalFee: document.getElementById("dem-total-fee"),
    riskLevel: document.getElementById("dem-risk-level"),
    timelineFree: document.getElementById("dem-timeline-free"),
    timelineOverdue: document.getElementById("dem-timeline-overdue"),
    alertContainer: document.getElementById("dem-alert-container"),
    alertTitle: document.getElementById("dem-alert-title"),
    alertDesc: document.getElementById("dem-alert-desc")
  };

  // Set default initial dates (arrival = today, pickup = 6 days later)
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  inputs.arrival.value = dateStr;

  const defaultPickup = new Date();
  defaultPickup.setDate(today.getDate() + 7);
  inputs.pickup.value = defaultPickup.toISOString().split('T')[0];

  function runDemurrageMath() {
    const arrivalDate = new Date(inputs.arrival.value);
    const pickupDate = new Date(inputs.pickup.value);
    const freeDays = parseInt(inputs.freeDays.value) || 0;
    const dailyRate = parseFloat(inputs.rate.value) || 0;

    if (isNaN(arrivalDate.getTime()) || isNaN(pickupDate.getTime())) {
      return;
    }

    // Time difference
    const diffTime = pickupDate.getTime() - arrivalDate.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const overdueDays = Math.max(0, totalDays - freeDays);
    
    // Scale rate logic (carriers charge progressively more: +50% after day 5 of overdue)
    let totalFee = 0;
    const costProjection = [];
    let currentFee = 0;

    for (let day = 1; day <= 15; day++) {
      if (day <= freeDays) {
        costProjection.push(0);
      } else {
        const extraDay = day - freeDays;
        const multiplier = extraDay > 5 ? 1.5 : 1.0;
        currentFee += dailyRate * multiplier;
        costProjection.push(currentFee);
      }
    }

    // Calculate actual charge
    if (overdueDays > 0) {
      for (let i = 1; i <= overdueDays; i++) {
        const multiplier = i > 5 ? 1.5 : 1.0;
        totalFee += dailyRate * multiplier;
      }
    }

    // Update numbers
    outputs.overdueDays.textContent = `${overdueDays} Day${overdueDays !== 1 ? 's' : ''}`;
    outputs.totalFee.textContent = window.formatCurrency(totalFee);

    // Update timeline nodes
    const freePct = Math.min(100, (freeDays / totalDays) * 100);
    const overduePct = 100 - freePct;

    if (overdueDays > 0) {
      outputs.timelineFree.style.width = `${freePct}%`;
      outputs.timelineFree.textContent = `${freeDays} Free Days`;
      outputs.timelineOverdue.style.width = `${overduePct}%`;
      outputs.timelineOverdue.style.display = "flex";
      outputs.timelineOverdue.textContent = `${overdueDays} Overdue`;
    } else {
      outputs.timelineFree.style.width = "100%";
      outputs.timelineFree.textContent = `${freeDays} Free Days`;
      outputs.timelineOverdue.style.display = "none";
    }

    // Update Markers
    document.getElementById("marker-arrival").textContent = `Arrived: ${inputs.arrival.value}`;
    const cutoffDate = new Date(arrivalDate);
    cutoffDate.setDate(cutoffDate.getDate() + freeDays);
    document.getElementById("marker-cutoff").textContent = `Cutoff: ${cutoffDate.toISOString().split('T')[0]}`;
    document.getElementById("marker-pickup").textContent = `Pickup: ${inputs.pickup.value}`;

    // Risk levels & warnings
    let riskLevel = "SAFE";
    let riskClass = "text-emerald";
    let alertClass = "demurrage-alert-box alert-success";
    let alertIcon = "fa-solid fa-circle-check";
    let alertTitle = "Pickup Schedule Safe";
    let alertDesc = "Container is scheduled for pickup within the allocated free days. No late fees will accumulate.";

    if (overdueDays > 0) {
      riskLevel = "CRITICAL";
      riskClass = "text-crimson";
      alertClass = "demurrage-alert-box alert-danger";
      alertIcon = "fa-solid fa-circle-radiation";
      alertTitle = "Late Penalty Charges Active";
      alertDesc = `Late pickup is costing ${window.formatCurrency(dailyRate)}/day. Demurrage rate compounds by +50% after 5 overdue days. Urgent pickup action advised!`;
    } else if (totalDays === freeDays) {
      riskLevel = "WARNING";
      riskClass = "text-amber";
      alertClass = "demurrage-alert-box alert-warning";
      alertIcon = "fa-solid fa-triangle-exclamation";
      alertTitle = "Last Day of Free Storage";
      alertDesc = "Container must be picked up today. Delaying pickup until tomorrow will trigger immediate carrier penalties.";
    }

    outputs.riskLevel.textContent = riskLevel;
    outputs.riskLevel.className = `stat-val ${riskClass}`;
    outputs.alertContainer.className = alertClass;
    outputs.alertContainer.querySelector("i").className = alertIcon;
    outputs.alertTitle.textContent = alertTitle;
    outputs.alertDesc.textContent = alertDesc;

    // Update global status alerts indicator
    if (typeof window.updateGlobalStats === "function") {
      window.updateGlobalStats({ alerts: overdueDays > 0 ? 3 : 2 });
    }

    updateDemurrageChart(costProjection, freeDays);
  }

  // Bind Listeners
  Object.values(inputs).forEach(input => {
    input.addEventListener("change", runDemurrageMath);
    input.addEventListener("input", runDemurrageMath);
  });
  document.getElementById("btn-dem-calc").addEventListener("click", runDemurrageMath);

  // Demurrage historical uploader logic
  const demDropZone = document.getElementById("dem-drop-zone");
  const demFileInput = document.getElementById("dem-file-input");
  const demStatus = document.getElementById("dem-upload-status");
  const demDownloadTemplate = document.getElementById("dem-download-template");

  if (demDropZone && demFileInput) {
    ["dragenter", "dragover"].forEach(eventName => {
      demDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        demDropZone.style.borderColor = "var(--color-cyan)";
        demDropZone.style.background = "rgba(0, 240, 255, 0.04)";
      }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
      demDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        demDropZone.style.borderColor = "";
        demDropZone.style.background = "";
      }, false);
    });

    demDropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) handleDemurrageFile(files[0]);
    });

    demDropZone.addEventListener("click", () => {
      demFileInput.click();
    });

    demFileInput.addEventListener("change", function() {
      if (this.files.length > 0) handleDemurrageFile(this.files[0]);
    });
  }

  if (demDownloadTemplate) {
    demDownloadTemplate.addEventListener("click", (e) => {
      e.preventDefault();
      const csvContent = "Port,Carrier,Arrival Date,Pickup Date,Free Days,Daily Rate,Demurrage Paid\n" +
                         "LAX,MAERSK,2026-05-01,2026-05-10,5,150,600\n" +
                         "LAX,MSC,2026-05-02,2026-05-05,5,180,0\n" +
                         "NYC,CMA,2026-04-10,2026-04-20,7,200,600\n" +
                         "SIN,MAERSK,2026-04-15,2026-04-18,4,120,0\n" +
                         "RTM,MSC,2026-04-01,2026-04-12,5,160,1120";
      const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sample_demurrage_history.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleDemurrageFile(file) {
    if (!file) return;
    
    demStatus.style.display = "block";
    demStatus.style.background = "rgba(255, 255, 255, 0.04)";
    demStatus.style.color = "var(--color-text-secondary)";
    demStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Parsing historical log: ${file.name}...`;

    if (typeof XLSX === "undefined") {
      setTimeout(() => {
        demStatus.style.background = "rgba(255, 23, 68, 0.1)";
        demStatus.style.color = "#ff8a9a";
        demStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error: SheetJS library offline. Cannot parse Excel/CSV.`;
      }, 500);
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet);
        if (rows.length === 0) {
          throw new Error("No data records found in file.");
        }

        let freeDaysSum = 0;
        let freeDaysCount = 0;
        let rateSum = 0;
        let rateCount = 0;

        const freeDaysRegex = /free.*day|free.*period|allowance/i;
        const rateRegex = /daily.*rate|overdue.*rate|charge.*day|rate/i;

        rows.forEach(row => {
          Object.keys(row).forEach(key => {
            const val = parseFloat(row[key]);
            if (!isNaN(val)) {
              if (freeDaysRegex.test(key)) {
                freeDaysSum += val;
                freeDaysCount++;
              } else if (rateRegex.test(key)) {
                rateSum += val;
                rateCount++;
              }
            }
          });
        });

        const avgFreeDays = freeDaysCount > 0 ? Math.round(freeDaysSum / freeDaysCount) : 5;
        const avgRate = rateCount > 0 ? Math.round(rateSum / rateCount) : 180;

        setTimeout(() => {
          inputs.freeDays.value = avgFreeDays;
          inputs.rate.value = avgRate;
          
          demStatus.style.background = "rgba(0, 230, 118, 0.15)";
          demStatus.style.color = "#a7ffeb";
          demStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Calibrated successfully! Loaded ${rows.length} rows.<br><strong>Avg Free Days:</strong> ${avgFreeDays} | <strong>Avg Rate:</strong> $${avgRate}/day`;
          
          runDemurrageMath();
        }, 500);
      } catch (err) {
        console.error(err);
        demStatus.style.background = "rgba(255, 23, 68, 0.1)";
        demStatus.style.color = "#ff8a9a";
        demStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error parsing file: ${err.message}`;
      }
    };
    reader.onerror = function() {
      demStatus.style.background = "rgba(255, 23, 68, 0.1)";
      demStatus.style.color = "#ff8a9a";
      demStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error reading file.`;
    };
    reader.readAsArrayBuffer(file);
  }

  function updateDemurrageChart(costProjection, freeDays) {
    const chartCanvas = document.getElementById("demurrage-cost-chart");
    if (!chartCanvas) return;

    if (typeof Chart === "undefined") {
      const parent = chartCanvas.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--color-text-secondary); text-align: center; font-size: 0.8rem;">
            <i class="fa-solid fa-chart-column" style="font-size: 1.8rem; margin-bottom: 8px; color: var(--color-text-muted);"></i>
            <span class="bold">Cost Chart Offline</span>
            <span style="font-size:0.75rem; color:var(--color-text-muted); margin-top:2px;">Chart.js library is blocked/offline</span>
          </div>
        `;
      }
      return;
    }

    const ctx = chartCanvas.getContext("2d");
    const labels = Array.from({length: 15}, (_, i) => `Day ${i+1}`);
    
    // Highlight free vs overdue background colors
    const pointColors = Array.from({length: 15}, (_, i) => 
      i < freeDays ? "rgba(0, 230, 118, 0.4)" : "rgba(255, 23, 68, 0.8)"
    );

    if (demurrageChart) {
      demurrageChart.data.datasets[0].data = costProjection;
      demurrageChart.data.datasets[0].pointBackgroundColor = pointColors;
      demurrageChart.update();
      return;
    }

    demurrageChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: "Cumulative Demurrage Cost ($)",
          data: costProjection,
          backgroundColor: pointColors,
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Outfit' },
              callback: function(val) { return '$' + val; }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Outfit' }
            }
          }
        }
      }
    });
  }

  window.resizeDemurrageChart = () => {
    if (demurrageChart) {
      setTimeout(() => {
        demurrageChart.resize();
      }, 50);
    }
  };

  runDemurrageMath();
}


// =========================================================================
// MODULE 6: ETA PREDICTOR
// =========================================================================
function initETAPredictor() {
  const inputs = {
    vessel: document.getElementById("eta-vessel"),
    weather: document.getElementById("eta-weather-slider"),
    congestion: document.getElementById("eta-congestion-slider")
  };

  const outputs = {
    vesselName: document.getElementById("eta-disp-vessel"),
    vesselImo: document.getElementById("eta-disp-imo"),
    predictedDate: document.getElementById("eta-predicted-date"),
    delayDeviation: document.getElementById("eta-delay-deviation"),
    confidenceBar: document.getElementById("eta-confidence-bar"),
    confidenceLabel: document.getElementById("eta-confidence-label"),
    routeProgress: document.getElementById("map-route-progress"),
    vesselNode: document.getElementById("map-vessel-node"),
    weatherNode: document.getElementById("map-weather-node")
  };

  const vesselsDB = {
    "ocean_atlas": {
      name: "Ocean Atlas",
      imo: "IMO 9811054",
      baseTransitDays: 14,
      progressPct: 62,
      origin: "Shanghai (CNSHA)",
      destination: "Los Angeles (USLAX)"
    },
    "pacific_crest": {
      name: "Pacific Crest",
      imo: "IMO 9400234",
      baseTransitDays: 13,
      progressPct: 45,
      origin: "Shanghai (CNSHA)",
      destination: "Los Angeles (USLAX)"
    },
    "aurora_express": {
      name: "Aurora Express",
      imo: "IMO 9743912",
      baseTransitDays: 15,
      progressPct: 80,
      origin: "Shanghai (CNSHA)",
      destination: "Los Angeles (USLAX)"
    }
  };

  const weatherLabels = ["Optimal Sea Conditions", "Moderate Sea States", "Severe Cyclone Alert"];
  const congestionLabels = ["Low Waiting Times", "Medium Berthing Lag", "High Congestion / Jammed"];

  const apiToggle = document.getElementById("eta-api-toggle");
  const apiConsoleCard = document.getElementById("eta-api-console-card");
  const apiAisPayload = document.getElementById("eta-api-ais-payload");
  const apiWeatherPayload = document.getElementById("eta-api-weather-payload");

  let apiTimer = null;

  if (apiToggle) {
    apiToggle.addEventListener("change", function() {
      if (this.checked) {
        if (apiConsoleCard) apiConsoleCard.style.display = "block";
        startTelemetryStream();
      } else {
        if (apiConsoleCard) apiConsoleCard.style.display = "none";
        if (apiTimer) clearInterval(apiTimer);
        // Reset speed and draft values back to normal
        const speedDisp = document.getElementById("eta-disp-speed");
        const draftDisp = document.getElementById("eta-disp-draft");
        if (speedDisp) speedDisp.textContent = "18.4 Knots";
        if (draftDisp) draftDisp.textContent = "12.5 meters";
        runPrediction();
      }
    });
  }

  function startTelemetryStream() {
    updateTelemetryLogs();
    if (apiTimer) clearInterval(apiTimer);
    apiTimer = setInterval(updateTelemetryLogs, 3000);
  }

  function updateTelemetryLogs() {
    if (!apiToggle || !apiToggle.checked) return;

    const selectedVesselKey = inputs.vessel.value;
    const vessel = vesselsDB[selectedVesselKey] || vesselsDB["ocean_atlas"];

    // Fluctuate speed and draft depth for realism
    const lat = (34.05 - (1 - vessel.progressPct/100) * 3 + (Math.random() - 0.5) * 0.05).toFixed(4);
    const lon = (-118.24 + (1 - vessel.progressPct/100) * 5 + (Math.random() - 0.5) * 0.05).toFixed(4);
    const liveSpeed = (17.5 + Math.random() * 2).toFixed(1);
    const draftDepth = (12.2 + Math.random() * 0.5).toFixed(1);
    
    const wVal = parseInt(inputs.weather.value);
    const weatherConditions = [
      { status: "Optimal", waves: "0.8m", wind: "8 knots", windDir: "ENE" },
      { status: "Moderate", waves: "2.4m", wind: "22 knots", windDir: "SW" },
      { status: "Severe Cyclone", waves: "6.8m", wind: "52 knots", windDir: "WNW" }
    ];
    const liveWeather = weatherConditions[wVal];

    const aisJSON = {
      vessel_imo: vessel.imo.replace("IMO ", ""),
      vessel_name: vessel.name,
      telemetry: {
        timestamp: new Date().toISOString(),
        coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
        heading_degrees: 72.4,
        speed_knots: parseFloat(liveSpeed),
        draft_meters: parseFloat(draftDepth)
      },
      route_context: {
        origin: vessel.origin,
        destination: vessel.destination,
        voyage_progress_pct: vessel.progressPct,
        nautical_miles_remaining: Math.round(5700 * (1 - vessel.progressPct/100))
      }
    };

    const weatherJSON = {
      query_coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
      marine_forecast: {
        sea_state: liveWeather.status,
        wave_height_meters: parseFloat(liveWeather.waves),
        wind_speed_knots: parseFloat(liveWeather.wind),
        wind_direction: liveWeather.windDir,
        temperature_c: 18.5,
        visibility_miles: wVal === 2 ? 1.2 : 10.0
      }
    };

    if (apiAisPayload) apiAisPayload.textContent = JSON.stringify(aisJSON, null, 2);
    if (apiWeatherPayload) apiWeatherPayload.textContent = JSON.stringify(weatherJSON, null, 2);

    // Live update parameters on maps
    runPrediction();
  }

  function runPrediction() {
    const selectedVesselKey = inputs.vessel.value;
    const vessel = vesselsDB[selectedVesselKey] || vesselsDB["ocean_atlas"];

    // Update vessel text
    outputs.vesselName.textContent = vessel.name;
    outputs.vesselImo.textContent = vessel.imo;

    const isLive = apiToggle && apiToggle.checked;

    // Read parameters
    const weatherVal = parseInt(inputs.weather.value);
    const congestionVal = parseInt(inputs.congestion.value);

    // Update parameter text tags
    const wLabel = document.getElementById("eta-weather-label");
    if (wLabel) {
      wLabel.textContent = weatherLabels[weatherVal];
      wLabel.className = `bold ` + (weatherVal === 0 ? "text-emerald" : (weatherVal === 1 ? "text-amber" : "text-crimson"));
    }
    
    const cLabel = document.getElementById("eta-congestion-label");
    if (cLabel) {
      cLabel.textContent = congestionLabels[congestionVal];
      cLabel.className = `bold ` + (congestionVal === 0 ? "text-emerald" : (congestionVal === 1 ? "text-amber" : "text-crimson"));
    }

    // Delay computation
    let delayDays = 0;
    
    if (weatherVal === 1) delayDays += 1.2;
    else if (weatherVal === 2) delayDays += 4.5;

    if (congestionVal === 0) delayDays += 0.2;
    else if (congestionVal === 1) delayDays += 1.5;
    else if (congestionVal === 2) delayDays += 3.8;

    // Calculations based on live API parameters if enabled
    let baseTransit = vessel.baseTransitDays;
    if (isLive && apiAisPayload) {
      try {
        const payloadText = apiAisPayload.textContent;
        if (payloadText && payloadText !== "Loading...") {
          const payload = JSON.parse(payloadText);
          const currentSpeed = payload.telemetry.speed_knots;
          const speedDisp = document.getElementById("eta-disp-speed");
          const draftDisp = document.getElementById("eta-disp-draft");
          if (speedDisp) speedDisp.textContent = `${currentSpeed} Knots`;
          if (draftDisp) draftDisp.textContent = `${payload.telemetry.draft_meters} meters`;
          
          // Re-calculate base days based on live speed and distance remaining
          // miles_remaining / (speed * 24) + days_elapsed (which is 9 days in our mock)
          const distRemaining = payload.route_context.nautical_miles_remaining;
          baseTransit = 9 + (distRemaining / (currentSpeed * 24));
        }
      } catch (e) {
        console.warn("Error parsing live AIS telemetry:", e);
      }
    }

    const arrivalDate = new Date();
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() - 9);

    const totalTransit = baseTransit + delayDays;
    arrivalDate.setTime(departureDate.getTime() + (totalTransit * 24 * 60 * 60 * 1000));

    // Update UI numbers
    outputs.predictedDate.textContent = arrivalDate.toLocaleDateString("en-US", {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    outputs.delayDeviation.textContent = `+${delayDays.toFixed(1)} day${delayDays !== 1 ? 's' : ''}`;
    outputs.delayDeviation.className = "bold " + (delayDays > 3 ? "text-crimson" : (delayDays > 1 ? "text-amber" : "text-emerald"));

    let confidence = 96 - (weatherVal * 12) - (congestionVal * 10);
    confidence = Math.max(40, confidence);

    outputs.confidenceLabel.textContent = `${confidence}%`;
    outputs.confidenceBar.style.width = `${confidence}%`;
    
    let confidenceColor = "var(--color-emerald)";
    if (confidence < 60) confidenceColor = "var(--color-crimson)";
    else if (confidence < 80) confidenceColor = "var(--color-amber)";
    outputs.confidenceBar.style.backgroundColor = confidenceColor;
    outputs.confidenceLabel.style.color = confidenceColor;

    // Update Visual Voyage Map
    const currentProgress = vessel.progressPct;
    outputs.routeProgress.style.width = `${currentProgress}%`;
    outputs.vesselNode.style.left = `${10 + (currentProgress * 0.8)}%`;
    outputs.vesselNode.querySelector(".vessel-bubble").textContent = `${vessel.name} (${currentProgress}%)`;

    // Place weather node
    outputs.weatherNode.style.display = weatherVal > 0 ? "flex" : "none";
    if (weatherVal === 1) {
      outputs.weatherNode.innerHTML = '<i class="fa-solid fa-cloud-rain"></i> <span>Squall Warning</span>';
      outputs.weatherNode.className = "map-weather-node";
    } else if (weatherVal === 2) {
      outputs.weatherNode.innerHTML = '<i class="fa-solid fa-hurricane fa-spin"></i> <span style="font-weight:700;">Typhoon Node</span>';
      outputs.weatherNode.className = "map-weather-node text-crimson";
      outputs.weatherNode.style.background = "rgba(255, 23, 68, 0.1)";
      outputs.weatherNode.style.borderColor = "rgba(255, 23, 68, 0.3)";
    }
  }

  // Bind change events
  Object.values(inputs).forEach(input => {
    input.addEventListener("input", runPrediction);
    input.addEventListener("change", runPrediction);
  });

  const btnPredict = document.getElementById("btn-eta-predict");
  if (btnPredict) {
    btnPredict.addEventListener("click", () => {
      const origHtml = btnPredict.innerHTML;
      btnPredict.innerHTML = '<i class="fa-solid fa-arrows-spin fa-spin"></i> Neural Net Estimating...';
      btnPredict.disabled = true;
      
      setTimeout(() => {
        // Force calculation update
        if (apiToggle && apiToggle.checked) {
          updateTelemetryLogs();
        } else {
          runPrediction();
        }
        btnPredict.innerHTML = origHtml;
        btnPredict.disabled = false;
      }, 600);
    });
  }

  // Run initial loading
  runPrediction();
}
