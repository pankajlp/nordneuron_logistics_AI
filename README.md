# NordNeuron Logistics AI Suite

An intelligent, client-side Single Page Application (SPA) dashboard designed to automate and optimize logistics workflows. The suite features a premium dark glassmorphic design system and offers advanced tools for RFQ analyzing, pricing, 3D container packing, customs lookup, demurrage risk assessment, and vessel telemetry tracking.

---

## 🚀 Key Modules

### 1. RFQ Analyzer
* **Fuzzy Parsing**: Employs **SheetJS (xlsx.js)** to parse dropped `.xlsx`, `.xls`, or `.csv` sheets on the client side.
* **Auto-Extraction**: Uses regular-expression mapping to scan header rows for semantic synonyms (e.g., matching `Origin`, `POL`, or `From` for Port of Loading) and auto-populates the structured form with the first active record.
* **Bridges**: Includes a **"Send to Freight Calculator"** action to carry over rate data and switch tabs seamlessly.

### 2. Freight Calculator
* **Margin Simulator**: Adjust dynamic markup ranges and bunkers adjustment factors.
* **Lanes Comparison**: Renders a live **Chart.js** comparison chart displaying historical spot rates against contract bids.
* **Fallback Mode**: Displays clean HTML warning alerts if Chart.js CDNs are blocked, preserving calculation buttons.

### 3. Container Load Planner
* **3D Visualizer**: Implements a translucent 3D shipping container using **Three.js** and **OrbitControls**.
* **Packing Heuristics**: Solves box and pallet fitting calculations in real-time, calculating overall space utilization, box fit volumes, and forward/aft weight balances.
* **Crash Prevention**: Safeguards initialization against division-by-zero errors when loading on hidden tabs (zero-dimension bounds) and runs math metrics even when WebGL is offline.

### 4. HS Code Finder
* **Customs Search**: Runs rapid client-side fuzzy queries against a built-in customs classification database.
* **Tariff Metadata**: Instantly suggests HS codes, VAT rates, import duties, restricted statuses, and compliance notes.

### 5. Demurrage Calculator
* **Historical Auto-Calibrator**: Upload a CSV history of past demurrage payments to automatically calibrate standard free-day allocations and daily overdue fees using historical averages.
* **Projections**: Compounds rates dynamically and displays alerts based on pickup dates.

### 6. ETA Predictor
* **Live Telemetry Stream**: Simulates real-time AIS vessel telemetry and OpenWeatherMap marine forecasts.
* **Dynamic ETA**: Computes arrival dates and confidence levels based on fluctuating vessel speed and storm conditions.

---

## 🛠️ Technology Stack

* **Structure**: Semantic HTML5 with an SPA view router.
* **Styling**: Vanilla CSS3 custom variables, glassmorphic panels, grid systems, custom webkit scrollbars, and keyframe animations.
* **3D Viewport**: Three.js (r128) & OrbitControls.
* **Charts**: Chart.js.
* **File Parser**: SheetJS (XLSX v0.18.5).

---

## 💻 Quick Start

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pankajlp/nordneuron_logistics_AI.git
   cd nordneuron_logistics_AI
   ```

2. **Start the local server**:
   Make sure you have Node.js installed to use `npx`.
   ```bash
   npm run dev
   ```
   *This starts a server at `http://localhost:3000` and automatically opens a browser window.*

### Docker Deployment

To build and run the application in a lightweight Nginx container:

1. **Build the image**:
   ```bash
   docker build -t nordneuron-logistics-ai .
   ```

2. **Run the container**:
   ```bash
   docker run -d -p 8080:80 --name logistics-ai nordneuron-logistics-ai
   ```

3. **Access the application**:
   Open `http://localhost:8080` in your web browser.

---

## 📁 Repository Structure

```
nordneuron_logistics_AI/
├── index.html          # Core SPA Layout & CDNs
├── styles.css          # Dark Glassmorphic Design System
├── app.js              # SPA Router & Top Header Stats controller
├── modules.js          # Logic for Modules 1, 2, 4, 5, 6
├── load-planner.js     # Three.js 3D Container packing solver
├── package.json        # Host script & metadata
├── Dockerfile          # Nginx static deployment container
└── requirements.txt    # Optional Python API dependencies
```
