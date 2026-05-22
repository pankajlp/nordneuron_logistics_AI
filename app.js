/* app.js - NordNeuron Logistics AI Global App Controller */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initGlobalStats();
});

// Sidebar navigation handler
function initNavigation() {
  const navItems = document.querySelectorAll(".sidebar .nav-item");
  const panels = document.querySelectorAll(".module-panel");
  const moduleTitle = document.getElementById("module-title");
  const moduleSubtitle = document.getElementById("module-subtitle");

  const tabContentMap = {
    "rfq-analyzer": {
      title: "RFQ Analyzer",
      subtitle: "Extract and structure shipping rates automatically from unstructured documents."
    },
    "freight-calculator": {
      title: "Freight Calculator",
      subtitle: "Determine ocean freight, surcharges, profit margins, and historical comparison."
    },
    "container-planner": {
      title: "Container Load Planner",
      subtitle: "Optimize carton and pallet orientation using dynamic 3D bin-packing calculations."
    },
    "hs-finder": {
      title: "HS Code Finder",
      subtitle: "Locate international tariff codes, duty levels, and customs restrictions."
    },
    "demurrage-calc": {
      title: "Demurrage Calculator",
      subtitle: "Audit container storage free days, risk timelines, and cumulative late charges."
    },
    "eta-predictor": {
      title: "ETA Predictor",
      subtitle: "Project accurate cargo arrival times incorporating congestion, weather, and sea routes."
    }
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tabId = item.getAttribute("data-tab");
      
      // Update nav active styling
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");

      // Update visibility of module panels
      panels.forEach(panel => panel.classList.remove("active"));
      
      const activePanel = document.getElementById(`${tabId}-panel`);
      if (activePanel) {
        activePanel.classList.add("active");
      }

      // Update top header texts
      if (tabContentMap[tabId]) {
        moduleTitle.textContent = tabContentMap[tabId].title;
        moduleSubtitle.textContent = tabContentMap[tabId].subtitle;
      }

      // Special triggers on tab switch
      if (tabId === "container-planner") {
        // Trigger Three.js canvas size recalculation
        if (typeof handleContainerPlannerResize === "function") {
          handleContainerPlannerResize();
        }
      } else if (tabId === "freight-calculator") {
        if (typeof resizeFreightChart === "function") {
          resizeFreightChart();
        }
      } else if (tabId === "demurrage-calc") {
        if (typeof resizeDemurrageChart === "function") {
          resizeDemurrageChart();
        }
      }
    });
  });
}

// Set up mock starting stats
function initGlobalStats() {
  const rfqCount = document.getElementById("stat-active-rfqs");
  const savings = document.getElementById("stat-freight-savings");
  const util = document.getElementById("stat-vol-packed");
  const alerts = document.getElementById("stat-demurrage-alerts");
  
  // These variables can be updated programmatically by modules.js
  window.updateGlobalStats = (stats) => {
    if (stats.rfqs !== undefined) rfqCount.textContent = stats.rfqs;
    if (stats.savings !== undefined) savings.textContent = stats.savings;
    if (stats.utilization !== undefined) util.textContent = stats.utilization + "%";
    if (stats.alerts !== undefined) alerts.textContent = stats.alerts;
  };
}

// Global helper for formatting currency
window.formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};
