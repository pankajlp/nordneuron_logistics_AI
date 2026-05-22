/* modules.js - NordNeuron Logistics AI Modules Core Business Logic */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize all modules
  initRFQAnalyzer();
  initFreightCalculator();
  initHSCodeFinder();
  initDemurrageCalculator();
  initETAPredictor();
});

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
          <i class="fa-solid fa-file-excel"></i>
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
      progressWrapper.style.style = "none";
      clearFields();
      badge.textContent = "Draft";
      badge.className = "badge badge-info";
    });

    simulateExtraction(file.name);
  }

  function simulateExtraction(filename) {
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
        // Fill data
        const filenameLower = filename.toLowerCase();
        let matched = mockExtractions.find(me => me.keywords.some(k => filenameLower.includes(k)));
        if (!matched) matched = mockExtractions.find(me => me.keywords.includes("default"));

        setTimeout(() => {
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
          progressWrapper.style.display = "none";

          // Update global stats
          if (typeof window.updateGlobalStats === "function") {
            window.updateGlobalStats({ rfqs: 5 });
          }
        }, 300);
      }
    }, 800);
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
    const ctx = document.getElementById("historical-bids-chart").getContext("2d");
    
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

  function updateDemurrageChart(costProjection, freeDays) {
    const ctx = document.getElementById("demurrage-cost-chart").getContext("2d");
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

  function runPrediction() {
    const selectedVesselKey = inputs.vessel.value;
    const vessel = vesselsDB[selectedVesselKey] || vesselsDB["ocean_atlas"];

    // Update vessel text
    outputs.vesselName.textContent = vessel.name;
    outputs.vesselImo.textContent = vessel.imo;

    // Read parameters
    const weatherVal = parseInt(inputs.weather.value);
    const congestionVal = parseInt(inputs.congestion.value);

    // Update parameter text tags
    document.getElementById("eta-weather-label").textContent = weatherLabels[weatherVal];
    document.getElementById("eta-weather-label").className = `bold ` + (weatherVal === 0 ? "text-emerald" : (weatherVal === 1 ? "text-amber" : "text-crimson"));
    
    document.getElementById("eta-congestion-label").textContent = congestionLabels[congestionVal];
    document.getElementById("eta-congestion-label").className = `bold ` + (congestionVal === 0 ? "text-emerald" : (congestionVal === 1 ? "text-amber" : "text-crimson"));

    // Delay computation
    let delayDays = 0;
    
    // Weather impacts: Optimal: 0 days, Moderate: +1.2 days, Cyclone: +4.5 days
    if (weatherVal === 1) delayDays += 1.2;
    else if (weatherVal === 2) delayDays += 4.5;

    // Congestion impacts: Low: 0.2 days, Medium: +1.5 days, High: +3.8 days
    if (congestionVal === 0) delayDays += 0.2;
    else if (congestionVal === 1) delayDays += 1.5;
    else if (congestionVal === 2) delayDays += 3.8;

    // Calculate dates
    const arrivalDate = new Date();
    // Simulate vessel departure 9 days ago
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() - 9);

    const totalTransit = vessel.baseTransitDays + delayDays;
    arrivalDate.setTime(departureDate.getTime() + (totalTransit * 24 * 60 * 60 * 1000));

    // Update UI numbers
    outputs.predictedDate.textContent = arrivalDate.toLocaleDateString("en-US", {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    outputs.delayDeviation.textContent = `+${delayDays.toFixed(1)} day${delayDays !== 1 ? 's' : ''}`;
    outputs.delayDeviation.className = "bold " + (delayDays > 3 ? "text-crimson" : (delayDays > 1 ? "text-amber" : "text-emerald"));

    // Confidence Calculation
    // Base confidence is 96%, reduced by weather severity and port issues
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

    // Place weather node in middle of path
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

  document.getElementById("btn-eta-predict").addEventListener("click", () => {
    // Add micro-animation spinning radar icon to button
    const btn = document.getElementById("btn-eta-predict");
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-arrows-spin fa-spin"></i> Neural Net Estimating...';
    btn.disabled = true;
    
    setTimeout(() => {
      runPrediction();
      btn.innerHTML = origHtml;
      btn.disabled = false;
    }, 600);
  });

  // Run initial loading
  runPrediction();
}
