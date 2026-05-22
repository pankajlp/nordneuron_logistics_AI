/* load-planner.js - NordNeuron 3D Container Load Planner and Three.js Visualizer */

// Three.js instances
let plannerScene, plannerCamera, plannerRenderer, plannerControls;
let containerMesh = null;
let cargoGroup = null;
let isWireframeMode = false;

document.addEventListener("DOMContentLoaded", () => {
  initThreeJS();
  initPlannerEvents();
});

// Initialize Three.js Scene, Camera, Renderer, and Controls
function initThreeJS() {
  const container = document.getElementById("canvas-container");
  if (!container) return;

  // Scene
  plannerScene = new THREE.Scene();
  plannerScene.background = new THREE.Color(0x05070d);

  // Camera
  plannerCamera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  resetCameraPosition();

  // Renderer
  plannerRenderer = new THREE.WebGLRenderer({ antialias: true });
  plannerRenderer.setSize(container.clientWidth, container.clientHeight);
  plannerRenderer.setPixelRatio(window.devicePixelRatio);
  plannerRenderer.shadowMap.enabled = true;
  container.appendChild(plannerRenderer.domElement);

  // Controls
  plannerControls = new THREE.OrbitControls(plannerCamera, plannerRenderer.domElement);
  plannerControls.enableDamping = true;
  plannerControls.dampingFactor = 0.05;
  plannerControls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below floor
  plannerControls.minDistance = 2;
  plannerControls.maxDistance = 30;

  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  plannerScene.add(ambientLight);

  // Directional Light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 15, 10);
  dirLight.castShadow = true;
  plannerScene.add(dirLight);

  // Additional soft fill light
  const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.2);
  fillLight.position.set(-10, 10, -10);
  plannerScene.add(fillLight);

  // Ground grid helper
  const gridHelper = new THREE.GridHelper(30, 30, 0x1e293b, 0x0f172a);
  gridHelper.position.y = -1.5;
  plannerScene.add(gridHelper);

  // Cargo Group
  cargoGroup = new THREE.Group();
  plannerScene.add(cargoGroup);

  // Start animation loop
  animate();

  // Initial draw
  updatePlannerScene();
}

function resetCameraPosition() {
  plannerCamera.position.set(12, 8, 12);
  if (plannerControls) {
    plannerControls.target.set(0, 0, 0);
    plannerControls.update();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (plannerControls) {
    plannerControls.update();
  }
  if (plannerRenderer && plannerScene && plannerCamera) {
    plannerRenderer.render(plannerScene, plannerCamera);
  }
}

// Global hook to resize Three.js window when navigation tab changes
window.handleContainerPlannerResize = () => {
  const container = document.getElementById("canvas-container");
  if (!container || !plannerRenderer || !plannerCamera) return;
  
  setTimeout(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    plannerCamera.aspect = width / height;
    plannerCamera.updateProjectionMatrix();
    plannerRenderer.setSize(width, height);
  }, 100);
};

// =========================================================================
// PACKING ALGORITHM & SCENE BUILDER
// =========================================================================
function updatePlannerScene() {
  // Clear existing meshes
  if (containerMesh) {
    plannerScene.remove(containerMesh);
  }
  while (cargoGroup.children.length > 0) {
    const obj = cargoGroup.children[0];
    cargoGroup.remove(obj);
  }

  // Get inputs
  const sizeType = document.getElementById("planner-container-size").value;
  
  // Container standard dimensions (length, width, height in meters)
  // 20ft: 5.90m x 2.35m x 2.39m
  // 40ft: 12.03m x 2.35m x 2.39m
  let cL = sizeType === "20ft" ? 5.90 : 12.03;
  let cW = 2.35;
  let cH = 2.39;

  // Create Container Mesh Representation
  buildContainerMesh(cL, cW, cH);

  // Fetch Items Input details
  // Item 1: Cartons
  const boxDim = {
    length: parseFloat(document.getElementById("item1-length").value) / 100, // cm to m
    width: parseFloat(document.getElementById("item1-width").value) / 100,
    height: parseFloat(document.getElementById("item1-height").value) / 100,
    weight: parseFloat(document.getElementById("item1-weight").value),
    qty: parseInt(document.getElementById("item1-qty").value) || 0
  };

  // Item 2: Pallets
  const palletDim = {
    length: parseFloat(document.getElementById("item2-length").value) / 100, // cm to m
    width: parseFloat(document.getElementById("item2-width").value) / 100,
    height: parseFloat(document.getElementById("item2-height").value) / 100,
    weight: parseFloat(document.getElementById("item2-weight").value),
    qty: parseInt(document.getElementById("item2-qty").value) || 0
  };

  // Run Packing algorithm
  const result = run3DPackingHeuristic(cL, cW, cH, boxDim, palletDim);

  // Render placed items into Three.js Scene
  renderCargoItems(result.placedItems, cL, cW, cH);

  // Update DOM elements with calculated metrics
  document.getElementById("planner-space-util").textContent = `${result.utilization.toFixed(1)}%`;
  document.getElementById("planner-cartons-fit").textContent = `${result.boxFit} / ${boxDim.qty}`;
  document.getElementById("planner-pallets-fit").textContent = `${result.palletFit} / ${palletDim.qty}`;
  document.getElementById("planner-unused-space").textContent = `${result.unusedVol.toFixed(2)} m³`;
  document.getElementById("planner-total-weight").textContent = `${result.totalWeight.toLocaleString()} kg`;
  document.getElementById("planner-weight-balance").textContent = result.balanceText;
  
  const balanceValElement = document.getElementById("planner-weight-balance");
  if (result.balanceText.includes("Balanced")) {
    balanceValElement.className = "val text-emerald";
  } else {
    balanceValElement.className = "val text-amber";
  }

  // Update Global Stats Utilization
  if (typeof window.updateGlobalStats === "function") {
    window.updateGlobalStats({ utilization: result.utilization.toFixed(1) });
  }
}

// Build the container outer boundaries
function buildContainerMesh(cL, cW, cH) {
  const group = new THREE.Group();

  // Create Container Frame (Wireframe box)
  const geom = new THREE.BoxGeometry(cL, cH, cW);
  const wireGeom = new THREE.EdgesGeometry(geom);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
  const frame = new THREE.LineSegments(wireGeom, lineMat);
  group.add(frame);

  // Floor (Solid dark block)
  const floorGeom = new THREE.BoxGeometry(cL, 0.05, cW);
  const floorMat = new THREE.MeshPhongMaterial({
    color: 0x111827,
    roughness: 0.8,
    transparent: true,
    opacity: 0.7
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.position.y = -cH / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Semi-transparent side walls
  const wallGeom = new THREE.BoxGeometry(cL, cH, 0.02);
  const wallMat = new THREE.MeshPhongMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide
  });
  
  const backWall = new THREE.Mesh(wallGeom, wallMat);
  backWall.position.z = -cW / 2;
  group.add(backWall);

  const frontWall = new THREE.Mesh(wallGeom, wallMat);
  frontWall.position.z = cW / 2;
  group.add(frontWall);

  containerMesh = group;
  plannerScene.add(containerMesh);
}

// Greedy 3D Bin Packing Solver Heuristic
function run3DPackingHeuristic(cL, cW, cH, box, pallet) {
  const placedItems = [];
  let boxFit = 0;
  let palletFit = 0;
  let totalWeight = 0;
  
  // Container coordinates: X = Length (-cL/2 to cL/2), Y = Height (-cH/2 to cH/2), Z = Width (-cW/2 to cW/2)
  // Let's model coordinate space starting at (0, 0, 0) up to (cL, cH, cW) for simplicity in math,
  // then offset by half when rendering.
  
  // Track occupied space using a 3D packing grid index or simplified coordinate stack
  // Since pallets are heavy, we always pack them first at the floor (y = 0)
  
  // 1. Pack Pallets on Floor
  // Try packing in rows along width
  if (pallet.qty > 0) {
    let px = 0;
    let pz = 0;
    while (palletFit < pallet.qty) {
      // Check if it fits along length and width
      if (px + pallet.length <= cL) {
        if (pz + pallet.width <= cW) {
          // Verify height
          if (pallet.height <= cH) {
            placedItems.push({
              x: px + pallet.length / 2,
              y: pallet.height / 2,
              z: pz + pallet.width / 2,
              l: pallet.length,
              w: pallet.width,
              h: pallet.height,
              weight: pallet.weight,
              type: "pallet"
            });
            palletFit++;
            totalWeight += pallet.weight;
            
            // Advance z pointer
            pz += pallet.width;
          } else {
            break; // Height violation
          }
        } else {
          // End of width row. Reset z, advance x
          pz = 0;
          px += pallet.length;
        }
      } else {
        break; // Out of length
      }
    }
  }

  // 2. Pack Cartons (Boxes)
  // Fill the remaining spaces. We can stack them on top of pallets or in remaining floor space
  // We will run a simplified bounding box heuristic.
  // Define placement grid
  if (box.qty > 0) {
    // Collect occupied spaces to run collision detection
    const colliders = [...placedItems];

    let bx = 0;
    let by = 0;
    let bz = 0;

    let stepCount = 0;
    const maxSteps = 10000; // safety valve

    while (boxFit < box.qty && stepCount < maxSteps) {
      stepCount++;
      
      // Check if box fits here
      if (bx + box.length <= cL && by + box.height <= cH && bz + box.width <= cW) {
        
        // Collision overlap check
        let collision = false;
        for (const item of colliders) {
          const overlapX = (bx < item.x + item.l/2 && bx + box.length > item.x - item.l/2);
          const overlapY = (by < item.y + item.h/2 && by + box.height > item.y - item.h/2);
          const overlapZ = (bz < item.z + item.w/2 && bz + box.width > item.z - item.w/2);
          if (overlapX && overlapY && overlapZ) {
            collision = true;
            break;
          }
        }

        if (!collision) {
          // Pack box
          const placedBox = {
            x: bx + box.length / 2,
            y: by + box.height / 2,
            z: bz + box.width / 2,
            l: box.length,
            w: box.width,
            h: box.height,
            weight: box.weight,
            type: "box"
          };
          placedItems.push(placedBox);
          colliders.push(placedBox);
          boxFit++;
          totalWeight += box.weight;

          // Try packing along height stack first
          by += box.height;
        } else {
          // Collision occurred. Try advancing height, width, or length
          by += 0.1; // advance height slightly
          if (by + box.height > cH) {
            by = 0;
            bz += box.width;
            if (bz + box.width > cW) {
              bz = 0;
              bx += box.length;
            }
          }
        }
      } else {
        // Fits limits violation, advance pointers
        by = 0;
        bz += box.width;
        if (bz + box.width > cW) {
          bz = 0;
          bx += box.length;
          if (bx + box.length > cL) {
            break; // Packed as much as physically possible
          }
        }
      }
    }
  }

  // 3. Math Metrics
  const containerVol = cL * cW * cH;
  let packedVol = 0;
  placedItems.forEach(item => {
    packedVol += item.l * item.w * item.h;
  });

  const utilization = (packedVol / containerVol) * 100;
  const unusedVol = Math.max(0, containerVol - packedVol);

  // 4. Weight Balance / Center of Gravity Heuristic
  // Split container along length (x axis) into Front half (x > cL/2) vs Back half (x < cL/2)
  let backWeight = 0;
  let frontWeight = 0;

  placedItems.forEach(item => {
    if (item.x > cL / 2) {
      frontWeight += item.weight;
    } else {
      backWeight += item.weight;
    }
  });

  let balanceText = "Balanced (Center)";
  const weightDiff = Math.abs(frontWeight - backWeight);
  const weightRatio = totalWeight > 0 ? (weightDiff / totalWeight) * 100 : 0;

  if (totalWeight > 0 && weightRatio > 12) {
    if (frontWeight > backWeight) {
      balanceText = `Nose Heavy (+${weightRatio.toFixed(0)}% Fwd)`;
    } else {
      balanceText = `Tail Heavy (+${weightRatio.toFixed(0)}% Aft)`;
    }
  }

  return {
    placedItems,
    boxFit,
    palletFit,
    utilization,
    unusedVol,
    totalWeight,
    balanceText
  };
}

// Render the 3D meshes inside container walls
function renderCargoItems(items, cL, cW, cH) {
  items.forEach((item, index) => {
    const geom = new THREE.BoxGeometry(item.l, item.h, item.w);
    
    // Colorful pallet vs box materials
    let colorVal = item.type === "pallet" ? 0x8a2be2 : 0x00f0ff; // Purple vs Cyan
    
    // Add shading variations based on index to differentiate individual boxes
    const shadeIntensity = 0.85 + (index % 5) * 0.03;
    const finalColor = new THREE.Color(colorVal).multiplyScalar(shadeIntensity);

    const mat = new THREE.MeshPhongMaterial({
      color: finalColor,
      transparent: true,
      opacity: isWireframeMode ? 0.3 : 0.85,
      wireframe: isWireframeMode,
      shininess: 40,
      specular: 0x111111
    });

    const mesh = new THREE.Mesh(geom, mat);

    // Map logic coordinate spaces:
    // Our logic X goes 0 -> cL. Translate to THREE.js X goes -cL/2 -> cL/2.
    // Our logic Y goes 0 -> cH. Translate to THREE.js Y goes -cH/2 -> cH/2.
    // Our logic Z goes 0 -> cW. Translate to THREE.js Z goes -cW/2 -> cW/2.
    mesh.position.x = item.x - cL / 2;
    mesh.position.y = item.y - cH / 2;
    mesh.position.z = item.z - cW / 2;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Optional: add a fine dark outline border to each box
    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0a0f1d, linewidth: 1.5 });
    const outline = new THREE.LineSegments(edges, lineMat);
    mesh.add(outline);

    cargoGroup.add(mesh);
  });
}

// Button Events binding
function initPlannerEvents() {
  const btnPack = document.getElementById("btn-planner-pack");
  const btnReset = document.getElementById("btn-planner-reset");
  const btnCamReset = document.getElementById("btn-canvas-reset-view");
  const btnWireframe = document.getElementById("btn-canvas-wireframe");
  const btnRotate = document.getElementById("btn-canvas-rotate");

  if (btnPack) btnPack.addEventListener("click", updatePlannerScene);
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      document.getElementById("item1-length").value = 60;
      document.getElementById("item1-width").value = 40;
      document.getElementById("item1-height").value = 40;
      document.getElementById("item1-weight").value = 12;
      document.getElementById("item1-qty").value = 450;
      
      document.getElementById("item2-length").value = 120;
      document.getElementById("item2-width").value = 80;
      document.getElementById("item2-height").value = 160;
      document.getElementById("item2-weight").value = 250;
      document.getElementById("item2-qty").value = 16;
      
      updatePlannerScene();
    });
  }

  if (btnCamReset) btnCamReset.addEventListener("click", resetCameraPosition);
  
  if (btnWireframe) {
    btnWireframe.addEventListener("click", () => {
      isWireframeMode = !isWireframeMode;
      // Change visual icon border indicator
      btnWireframe.classList.toggle("btn-primary");
      btnWireframe.classList.toggle("btn-secondary");
      updatePlannerScene();
    });
  }

  if (btnRotate) {
    btnRotate.addEventListener("click", () => {
      plannerControls.autoRotate = !plannerControls.autoRotate;
      btnRotate.classList.toggle("btn-primary");
      btnRotate.classList.toggle("btn-secondary");
    });
  }

  // Trigger auto re-draw if container size changes
  const containerSelect = document.getElementById("planner-container-size");
  if (containerSelect) {
    containerSelect.addEventListener("change", updatePlannerScene);
  }
}
