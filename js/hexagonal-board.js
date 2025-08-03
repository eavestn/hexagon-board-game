const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (window.board) {
        board.draw();
    }
}

// Initial resize
resizeCanvas();

// Handle window resize
window.addEventListener('resize', resizeCanvas);

const BOARD_CONFIG = {
    hexRadius: 50,
    hexWidth: 0,
    hexHeight: 0,
    boardColumns: 11,  // Number of columns
    boardRows: 11,     // Number of rows
    offsetX: 100,
    offsetY: 50
};

const FACTIONS = {
    german: { name: 'German', color: '#5a5a5a', borderColor: '#2c2c2c', flagImage: null },
    british: { name: 'British', color: '#8b4513', borderColor: '#654321', flagImage: null },
    italian: { name: 'Italian', color: '#556b2f', borderColor: '#3c4f21', flagImage: null },
    american: { name: 'American', color: '#4682b4', borderColor: '#2f4f4f', flagImage: null }
};

const UNIT_TYPES = {
    lightInfantry: {
        name: 'Light Infantry',
        health: 1,
        strength: 1,
        movementCost: 1,
        purchaseCost: 3,
        symbol: '🚶',
        color: '#8FBC8F'
    },
    heavyInfantry: {
        name: 'Heavy Infantry',
        health: 1,
        strength: 2,
        movementCost: 2,
        purchaseCost: 3,
        symbol: '🥾',
        color: '#556B2F'
    },
    lightMechanical: {
        name: 'Light Mechanical',
        health: 1,
        strength: 3,
        movementCost: 2,
        purchaseCost: 3,
        symbol: '🚗',
        color: '#4682B4'
    },
    heavyMechanical: {
        name: 'Heavy Mechanical',
        health: 2,
        strength: 4,
        movementCost: 3,
        purchaseCost: 3,
        symbol: '🚛',
        color: '#2F4F4F'
    },
    artillery: {
        name: 'Artillery',
        health: 1,
        strength: 1,
        movementCost: 2,
        purchaseCost: 3,
        symbol: '🎯',
        color: '#B22222',
        range: 2
    }
};

function updateHexDimensions() {
    BOARD_CONFIG.hexWidth = Math.sqrt(3) * BOARD_CONFIG.hexRadius;
    BOARD_CONFIG.hexHeight = 2 * BOARD_CONFIG.hexRadius;
}

updateHexDimensions();

class Unit {
    constructor(id, type, faction, hex = null) {
        this.id = id;
        this.type = type;
        this.faction = faction;
        this.hex = hex;
        this.currentHealth = UNIT_TYPES[type].health;
        this.hasActed = false; // Track if unit has moved/fired this turn
    }

    get typeData() {
        return UNIT_TYPES[this.type];
    }

    get strength() {
        return this.typeData.strength;
    }

    get maxHealth() {
        return this.typeData.health;
    }

    get movementCost() {
        return this.typeData.movementCost;
    }

    get symbol() {
        return this.typeData.symbol;
    }

    get color() {
        return this.typeData.color;
    }

    get isAlive() {
        return this.currentHealth > 0;
    }

    get isArtillery() {
        return this.type === 'artillery';
    }

    takeDamage(amount = 1) {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        return this.isAlive;
    }

    canAct() {
        return this.isAlive && !this.hasActed;
    }

    markActed() {
        this.hasActed = true;
    }

    resetForNewTurn() {
        this.hasActed = false;
    }
}

class HexagonalBoard {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = config;
        this.hexagons = [];
        
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.faction1 = 'german';
        this.faction2 = 'british';
        
        // Resource management
        this.faction1Resources = 0;
        this.faction2Resources = 0;
        
        // Unit management
        this.units = new Map(); // Map of unit ID to Unit instance
        this.nextUnitId = 1;
        this.selectedUnit = null;
        
        // Turn management system
        this.currentYear = 1935;
        this.currentMonth = 3; // March (1-12)
        this.currentTurnInMonth = 1; // 1 or 2
        this.currentSeason = 'Spring';
        this.hasInitiative = Math.random() < 0.5 ? this.faction1 : this.faction2; // Random initial initiative
        this.totalTurns = 0;
        this.maxTurns = 264; // 11 years * 24 turns per year
        
        // Compass properties
        this.compassX = 100;
        this.compassY = 100;
        this.compassSize = 70;
        this.compassDragging = false;
        this.compassResizing = false;
        this.compassHovered = false;
        this.minCompassSize = 40;
        this.maxCompassSize = 150;
        
        // Turn panel properties
        this.turnPanelX = 0; // Will be set to top-right initially
        this.turnPanelY = 20;
        this.turnPanelWidth = 320;
        this.turnPanelHeight = 200;
        this.turnPanelDragging = false;
        
        // Ground texture
        this.groundImage = null;
        this.cityImage = null;
        this.waterImage = null;
        
        this.loadFactionImages();
        this.loadGroundImage();
        this.loadCityImage();
        this.loadWaterImage();
        this.initializeBoard();
        this.setupEventListeners();
        this.loadCompassPosition();
        this.loadTurnPanelPosition();
        this.updateSeasonFromDate();
    }
    
    // Turn Management System
    updateSeasonFromDate() {
        if (this.currentMonth >= 3 && this.currentMonth <= 5) {
            this.currentSeason = 'Spring';
        } else if (this.currentMonth >= 6 && this.currentMonth <= 8) {
            this.currentSeason = 'Summer';
        } else if (this.currentMonth >= 9 && this.currentMonth <= 11) {
            this.currentSeason = 'Fall';
        } else {
            this.currentSeason = 'Winter';
        }
    }
    
    getMonthName(monthNum) {
        const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[monthNum];
    }
    
    getCurrentTurnString() {
        return `${this.currentYear} ${this.getMonthName(this.currentMonth)} Turn ${this.currentTurnInMonth}, ${this.currentSeason}`;
    }
    
    advanceTurn() {
        if (this.totalTurns >= this.maxTurns) {
            alert('Game Over! The war has ended in February 1945.');
            return false;
        }
        
        this.totalTurns++;
        
        // Advance turn within month
        if (this.currentTurnInMonth === 1) {
            this.currentTurnInMonth = 2;
        } else {
            // Advance to next month
            this.currentTurnInMonth = 1;
            this.currentMonth++;
            
            // Handle year transition
            if (this.currentMonth > 12) {
                this.currentMonth = 1;
                this.currentYear++;
                
                // Initiative alternates yearly
                this.hasInitiative = this.hasInitiative === this.faction1 ? this.faction2 : this.faction1;
            }
            
            this.updateSeasonFromDate();
        }
        
        // Reset units for new turn
        this.resetUnitsForNewTurn();
        
        this.draw(); // Redraw to update UI
        return true;
    }
    
    resetToGameStart() {
        this.currentYear = 1935;
        this.currentMonth = 3;
        this.currentTurnInMonth = 1;
        this.totalTurns = 0;
        this.hasInitiative = Math.random() < 0.5 ? this.faction1 : this.faction2;
        this.updateSeasonFromDate();
        this.draw();
    }
    
    calculateResources() {
        // Reset resource counters
        this.faction1Resources = 0;
        this.faction2Resources = 0;
        
        // Count resources from owned hexes
        this.hexagons.forEach(hex => {
            if (hex.owner === this.faction1) {
                this.faction1Resources += hex.resourceValue;
            } else if (hex.owner === this.faction2) {
                this.faction2Resources += hex.resourceValue;
            }
        });
    }
    
    loadFactionImages() {
        const factionNames = Object.keys(FACTIONS);
        let loadedCount = 0;
        
        factionNames.forEach(factionKey => {
            const img = new Image();
            img.onload = () => {
                FACTIONS[factionKey].flagImage = img;
                loadedCount++;
                
                // Redraw when all images are loaded
                if (loadedCount === factionNames.length) {
                    this.draw();
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load flag image for ${factionKey}`);
                loadedCount++;
                
                // Continue even if some images fail to load
                if (loadedCount === factionNames.length) {
                    this.draw();
                }
            };
            img.src = `assets/${factionKey}-flag.png`;
        });
    }
    
    loadGroundImage() {
        const img = new Image();
        img.onload = () => {
            this.groundImage = img;
            this.draw(); // Redraw when ground image loads
        };
        img.onerror = () => {
            console.warn('Failed to load ground texture image');
        };
        img.src = 'assets/ground.png';
    }
    
    loadCityImage() {
        const img = new Image();
        img.onload = () => {
            this.cityImage = img;
            this.draw(); // Redraw when city image loads
        };
        img.onerror = () => {
            console.warn('Failed to load city texture image');
        };
        img.src = 'assets/city.png';
    }
    
    loadWaterImage() {
        const img = new Image();
        img.onload = () => {
            this.waterImage = img;
            this.draw(); // Redraw when water image loads
        };
        img.onerror = () => {
            console.warn('Failed to load water texture image');
        };
        img.src = 'assets/water.png';
    }
    
    loadCompassPosition() {
        const savedPos = localStorage.getItem('compassPosition');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            this.compassX = pos.x;
            this.compassY = pos.y;
            if (pos.size) {
                this.compassSize = Math.max(this.minCompassSize, Math.min(this.maxCompassSize, pos.size));
            }
        }
    }
    
    loadTurnPanelPosition() {
        const savedPos = localStorage.getItem('turnPanelPosition');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            this.turnPanelX = pos.x;
            this.turnPanelY = pos.y;
        } else {
            // Default to top-right corner
            this.turnPanelX = this.canvas.width - this.turnPanelWidth - 20;
        }
    }
    
    initializeBoard() {
        this.hexagons = [];
        
        for (let row = 0; row < this.config.boardRows; row++) {
            for (let col = 0; col < this.config.boardColumns; col++) {
                const hex = this.createHexagon(row, col);
                if (hex) {
                    this.hexagons.push(hex);
                }
            }
        }
        
        // Place strategic hexes
        this.placeStrategicHexes();
        
        // Place water hexes (optional)
        this.placeWaterHexes();
        
        // Set up starting positions and distribute strategic hexes
        this.setupStartingPositions();
        
        // Calculate initial resources
        this.calculateResources();
        
        // Give starting resources for first turn gameplay
        this.faction1Resources += 10; // Starting resources
        this.faction2Resources += 10; // Starting resources
        
        // Debug: log initial resources
        console.log(`Initial resources - ${this.faction1}: ${this.faction1Resources}, ${this.faction2}: ${this.faction2Resources}`);
    }
    
    setupStartingPositions() {
        if (this.hexagons.length === 0) return;
        
        // Find opposite corners
        // Top-left corner: row 0, col 0
        const topLeft = this.hexagons.find(h => h.row === 0 && h.col === 0);
        
        // Bottom-right corner: last row, last col (accounting for offset)
        const maxRow = Math.max(...this.hexagons.map(h => h.row));
        const bottomRowHexes = this.hexagons.filter(h => h.row === maxRow);
        const bottomRight = bottomRowHexes[bottomRowHexes.length - 1];
        
        if (topLeft && bottomRight) {
            // Assign corner hexes to factions
            topLeft.owner = this.faction1;
            bottomRight.owner = this.faction2;
            
            // Distribute strategic hexes
            this.distributeStrategicHexes();
            
            // Add starting units - each faction starts with 1 Light Infantry unit
            // Players can choose to place at corner or strategic hex, for now place at corner
            this.createUnit('lightInfantry', this.faction1, topLeft);
            this.createUnit('lightInfantry', this.faction2, bottomRight);
        }
    }
    
    distributeStrategicHexes() {
        const strategicHexes = this.hexagons.filter(h => h.isStrategic);
        const maxPerFaction = 3; // Maximum 3 strategic hexes per faction
        
        // Calculate how many each faction gets (max 3 each)
        const totalToAssign = Math.min(strategicHexes.length, maxPerFaction * 2);
        const faction1Count = Math.min(maxPerFaction, Math.floor(totalToAssign / 2));
        const faction2Count = Math.min(maxPerFaction, totalToAssign - faction1Count);
        
        // Shuffle strategic hexes for random distribution
        const shuffled = [...strategicHexes].sort(() => Math.random() - 0.5);
        
        // Assign to faction 1 (up to 3)
        for (let i = 0; i < faction1Count; i++) {
            shuffled[i].owner = this.faction1;
        }
        
        // Assign to faction 2 (up to 3)
        for (let i = faction1Count; i < faction1Count + faction2Count; i++) {
            shuffled[i].owner = this.faction2;
        }
        
        // All remaining strategic hexes stay unowned (must be captured)
    }
    
    placeStrategicHexes() {
        const numStrategic = parseInt(document.getElementById('strategicHexes').value) || 4;
        
        // Reset all hexes to non-strategic and non-water
        this.hexagons.forEach(hex => {
            hex.isStrategic = false;
            hex.isWater = false;
            hex.resourceValue = 2; // Reset to default
        });
        
        if (numStrategic > 0 && this.hexagons.length > 0) {
            const placedIndices = [];
            const minDistance = 2; // Minimum 2 hex distance (prevents direct adjacency)
            
            // Try to place strategic hexes with minimum spacing
            let attempts = 0;
            while (placedIndices.length < numStrategic && attempts < 1000) {
                const randomIndex = Math.floor(Math.random() * this.hexagons.length);
                const candidate = this.hexagons[randomIndex];
                
                // Check if this hex is far enough from all placed strategic hexes
                let validPlacement = true;
                for (const placedIndex of placedIndices) {
                    const placed = this.hexagons[placedIndex];
                    const distance = this.getHexDistance(candidate, placed);
                    
                    if (distance < minDistance) {
                        validPlacement = false;
                        break;
                    }
                }
                
                if (validPlacement) {
                    placedIndices.push(randomIndex);
                    this.hexagons[randomIndex].isStrategic = true;
                    this.hexagons[randomIndex].resourceValue = 4;
                }
                
                attempts++;
            }
            
            // If we couldn't place all with spacing, fill remaining randomly
            while (placedIndices.length < numStrategic) {
                const randomIndex = Math.floor(Math.random() * this.hexagons.length);
                if (!placedIndices.includes(randomIndex)) {
                    placedIndices.push(randomIndex);
                    this.hexagons[randomIndex].isStrategic = true;
                    this.hexagons[randomIndex].resourceValue = 4;
                }
            }
        }
    }
    
    placeWaterHexes() {
        const waterDensity = parseFloat(document.getElementById('waterDensity')?.value) || 0;
        
        if (waterDensity <= 0) return; // No water if density is 0
        
        // Calculate how many hexes should be water
        const totalHexes = this.hexagons.length;
        const waterHexCount = Math.floor(totalHexes * (waterDensity / 100));
        
        if (waterHexCount === 0) return;
        
        // Generate water areas using a seeded approach for realistic patterns
        const waterAreas = this.generateWaterAreas(waterHexCount);
        
        // Mark hexes as water (but avoid corners and strategic hexes)
        waterAreas.forEach(hexIndex => {
            if (hexIndex < this.hexagons.length) {
                const hex = this.hexagons[hexIndex];
                
                // Don't place water on corner hexes (starting positions)
                const isCorner = (hex.row === 0 && hex.col === 0) || 
                                (hex.row === Math.max(...this.hexagons.map(h => h.row)) && 
                                 hex.col === Math.max(...this.hexagons.filter(h => h.row === hex.row).map(h => h.col)));
                
                if (!isCorner && !hex.isStrategic) {
                    hex.isWater = true;
                    hex.resourceValue = 0; // Water hexes give no resources
                    hex.isStrategic = false; // Water can't be strategic
                }
            }
        });
    }
    
    generateWaterAreas(targetCount) {
        const waterHexes = [];
        const numSeeds = Math.max(1, Math.floor(targetCount / 8)); // Create 1-3 water bodies
        
        // Create seed points for water bodies
        for (let i = 0; i < numSeeds; i++) {
            const seedIndex = Math.floor(Math.random() * this.hexagons.length);
            waterHexes.push(seedIndex);
        }
        
        // Grow water areas from seed points
        const remainingCount = targetCount - waterHexes.length;
        const growthPerSeed = Math.floor(remainingCount / numSeeds);
        
        waterHexes.forEach(seedIndex => {
            this.growWaterArea(seedIndex, growthPerSeed, waterHexes);
        });
        
        return waterHexes;
    }
    
    growWaterArea(seedIndex, maxGrowth, existingWater) {
        const seed = this.hexagons[seedIndex];
        if (!seed) return;
        
        const toProcess = [seedIndex];
        let grown = 0;
        
        while (toProcess.length > 0 && grown < maxGrowth) {
            const currentIndex = toProcess.shift();
            const neighbors = this.getHexNeighbors(currentIndex);
            
            // Randomly select some neighbors to expand to
            const shuffledNeighbors = neighbors.sort(() => Math.random() - 0.5);
            const expansionCount = Math.min(2, shuffledNeighbors.length);
            
            for (let i = 0; i < expansionCount && grown < maxGrowth; i++) {
                const neighborIndex = shuffledNeighbors[i];
                if (!existingWater.includes(neighborIndex)) {
                    existingWater.push(neighborIndex);
                    toProcess.push(neighborIndex);
                    grown++;
                }
            }
        }
    }
    
    getHexNeighbors(hexIndex) {
        const hex = this.hexagons[hexIndex];
        if (!hex) return [];
        
        const neighbors = [];
        const { row, col } = hex;
        const isEvenRow = row % 2 === 0;
        
        // Define neighbor offsets for hex grid (flat-top orientation)
        const neighborOffsets = isEvenRow ? [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
        ] : [
            [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]
        ];
        
        neighborOffsets.forEach(([dRow, dCol]) => {
            const neighborRow = row + dRow;
            const neighborCol = col + dCol;
            
            const neighborIndex = this.hexagons.findIndex(h => 
                h.row === neighborRow && h.col === neighborCol
            );
            
            if (neighborIndex !== -1) {
                neighbors.push(neighborIndex);
            }
        });
        
        return neighbors;
    }
    
    getHexDistance(hex1, hex2) {
        // Convert offset coordinates to cube coordinates for accurate hex distance
        const cube1 = this.offsetToCube(hex1.row, hex1.col);
        const cube2 = this.offsetToCube(hex2.row, hex2.col);
        
        // Calculate hex distance using cube coordinate formula
        const hexDistance = (Math.abs(cube1.x - cube2.x) + Math.abs(cube1.y - cube2.y) + Math.abs(cube1.z - cube2.z)) / 2;
        
        return Math.floor(hexDistance);
    }
    
    offsetToCube(row, col) {
        // Convert offset coordinates to cube coordinates for flat-top hexagons
        const x = col - Math.floor(row / 2);
        const z = row;
        const y = -x - z;
        return { x, y, z };
    }
    
    createHexagon(row, col) {
        const isEvenRow = row % 2 === 0;
        const x = this.config.offsetX + col * this.config.hexWidth + (isEvenRow ? 0 : this.config.hexWidth / 2);
        const y = this.config.offsetY + row * this.config.hexHeight * 0.75;
        
        // Remove boundary check to allow hexagons beyond canvas edges
        // Users can pan to see them
        
        return {
            row: row,
            col: col,
            x: x,
            y: y,
            radius: this.config.hexRadius,
            isStrategic: false,
            isWater: false,
            owner: null,
            resourceValue: 2, // Default resource value (will be 4 for strategic hexes, 0 for water)
            units: [] // Array of unit IDs on this hex
        };
    }
    
    // Unit Management Methods
    createUnit(type, faction, hex = null) {
        const unit = new Unit(this.nextUnitId++, type, faction, hex);
        this.units.set(unit.id, unit);
        
        if (hex) {
            hex.units.push(unit.id);
            unit.hex = hex;
        }
        
        return unit;
    }
    
    removeUnit(unitId) {
        const unit = this.units.get(unitId);
        if (unit && unit.hex) {
            const hexIndex = unit.hex.units.indexOf(unitId);
            if (hexIndex !== -1) {
                unit.hex.units.splice(hexIndex, 1);
            }
        }
        this.units.delete(unitId);
    }
    
    moveUnit(unitId, targetHex) {
        const unit = this.units.get(unitId);
        if (!unit) return false;
        
        // Remove from current hex
        if (unit.hex) {
            const hexIndex = unit.hex.units.indexOf(unitId);
            if (hexIndex !== -1) {
                unit.hex.units.splice(hexIndex, 1);
            }
        }
        
        // Add to target hex
        targetHex.units.push(unitId);
        unit.hex = targetHex;
        
        return true;
    }
    
    getUnitsOnHex(hex) {
        return hex.units.map(unitId => this.units.get(unitId)).filter(unit => unit);
    }
    
    getFactionUnits(faction) {
        return Array.from(this.units.values()).filter(unit => unit.faction === faction);
    }
    
    getTotalFactionStrength(faction) {
        return this.getFactionUnits(faction)
            .filter(unit => unit.isAlive)
            .reduce((total, unit) => total + unit.strength, 0);
    }
    
    canPurchaseUnit(faction) {
        const factionResources = faction === this.faction1 ? this.faction1Resources : this.faction2Resources;
        const currentStrength = this.getTotalFactionStrength(faction);
        
        return factionResources >= 3 && currentStrength < 100;
    }
    
    purchaseUnit(type, faction, hex) {
        if (!this.canPurchaseUnit(faction)) return null;
        
        const unit = this.createUnit(type, faction, hex);
        
        // Deduct resources
        if (faction === this.faction1) {
            this.faction1Resources -= 3;
        } else {
            this.faction2Resources -= 3;
        }
        
        return unit;
    }
    
    resetUnitsForNewTurn() {
        this.units.forEach(unit => unit.resetForNewTurn());
    }
    
    // Movement system
    calculateMovementCost(unit, fromHex, toHex) {
        const distance = this.getHexDistance(fromHex, toHex);
        let baseCost = unit.movementCost * distance;
        
        // Group movement penalty: +1 resource if moving away from unit group
        const unitsOnStartHex = this.getUnitsOnHex(fromHex);
        const hasOtherUnits = unitsOnStartHex.length > 1;
        
        if (hasOtherUnits) {
            baseCost += 1; // Group movement penalty
        }
        
        return baseCost;
    }
    
    canMoveUnit(unit, targetHex) {
        if (!unit || !unit.canAct()) return false;
        if (!targetHex) return false;
        if (unit.hex === targetHex) return false;
        if (targetHex.isWater) return false; // Cannot move into water hexes
        
        const faction = unit.faction;
        const currentResources = faction === this.faction1 ? this.faction1Resources : this.faction2Resources;
        const movementCost = this.calculateMovementCost(unit, unit.hex, targetHex);
        
        return currentResources >= movementCost;
    }
    
    moveUnitToHex(unit, targetHex) {
        if (!this.canMoveUnit(unit, targetHex)) return false;
        
        const movementCost = this.calculateMovementCost(unit, unit.hex, targetHex);
        
        // Deduct movement cost
        if (unit.faction === this.faction1) {
            this.faction1Resources -= movementCost;
        } else {
            this.faction2Resources -= movementCost;
        }
        
        // Move the unit
        this.moveUnit(unit.id, targetHex);
        unit.markActed();
        
        // Check for combat if enemy units are present
        const unitsOnHex = this.getUnitsOnHex(targetHex);
        const enemyUnits = unitsOnHex.filter(u => u.faction !== unit.faction);
        
        if (enemyUnits.length > 0) {
            this.resolveCombat(targetHex);
        }
        
        return true;
    }
    
    // Combat system
    resolveCombat(hex) {
        const unitsOnHex = this.getUnitsOnHex(hex);
        const faction1Units = unitsOnHex.filter(u => u.faction === this.faction1);
        const faction2Units = unitsOnHex.filter(u => u.faction === this.faction2);
        
        if (faction1Units.length === 0 || faction2Units.length === 0) return;
        
        // Calculate total health and strength for each side
        const faction1Health = faction1Units.reduce((total, unit) => total + unit.currentHealth, 0);
        const faction1Strength = faction1Units.reduce((total, unit) => total + unit.strength, 0);
        
        const faction2Health = faction2Units.reduce((total, unit) => total + unit.currentHealth, 0);
        const faction2Strength = faction2Units.reduce((total, unit) => total + unit.strength, 0);
        
        // Combat resolution
        const faction1Damage = Math.min(faction1Strength, faction2Health);
        const faction2Damage = Math.min(faction2Strength, faction1Health);
        
        // Apply damage
        if (faction1Damage > 0) {
            this.applyDamageToUnits(faction2Units, faction1Damage);
        }
        
        if (faction2Damage > 0) {
            this.applyDamageToUnits(faction1Units, faction2Damage);
        }
        
        // Remove dead units
        this.removeDeadUnits();
        
        console.log(`Combat at ${hex.row},${hex.col}: F1 dealt ${faction1Damage}, F2 dealt ${faction2Damage}`);
    }
    
    applyDamageToUnits(units, totalDamage) {
        // Simple damage distribution - kill units in order until damage is used up
        let remainingDamage = totalDamage;
        
        for (const unit of units) {
            if (remainingDamage <= 0) break;
            
            const damageToApply = Math.min(remainingDamage, unit.currentHealth);
            unit.takeDamage(damageToApply);
            remainingDamage -= damageToApply;
        }
    }
    
    removeDeadUnits() {
        const deadUnits = Array.from(this.units.values()).filter(unit => !unit.isAlive);
        deadUnits.forEach(unit => this.removeUnit(unit.id));
        
        // Clear selection if selected unit is dead
        if (this.selectedUnit && !this.selectedUnit.isAlive) {
            this.selectedUnit = null;
        }
    }
    
    drawHexagon(hex) {
        const { x, y, radius } = hex;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + (Math.PI / 6);
            const hexX = x + radius * Math.cos(angle);
            const hexY = y + radius * Math.sin(angle);
            
            if (i === 0) {
                this.ctx.moveTo(hexX, hexY);
            } else {
                this.ctx.lineTo(hexX, hexY);
            }
        }
        
        this.ctx.closePath();
        
        // Draw base texture first (water, ground for regular, city for strategic)
        if (hex.isWater) {
            // Water hex - use water texture or fallback to blue
            this.ctx.strokeStyle = '#4682b4'; // Water blue border
            this.ctx.lineWidth = 3;
            
            if (this.waterImage) {
                this.ctx.save();
                this.ctx.clip(); // Clip to hexagon shape
                
                const imgSize = radius * 2.2;
                const imgX = x - imgSize / 2;
                const imgY = y - imgSize / 2;
                
                this.ctx.globalAlpha = 0.9;
                this.ctx.drawImage(this.waterImage, imgX, imgY, imgSize, imgSize);
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = '#4682b4'; // Water blue
                this.ctx.fill();
            }
        } else if (hex.isStrategic) {
            // Strategic hex - use city texture or fallback to military olive-gold
            this.ctx.strokeStyle = '#b8860b'; // Dark goldenrod border
            this.ctx.lineWidth = 3;
            
            if (this.cityImage) {
                this.ctx.save();
                this.ctx.clip(); // Clip to hexagon shape
                
                const imgSize = radius * 2.2;
                const imgX = x - imgSize / 2;
                const imgY = y - imgSize / 2;
                
                this.ctx.globalAlpha = 0.85;
                this.ctx.drawImage(this.cityImage, imgX, imgY, imgSize, imgSize);
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = '#8b7d3a'; // Military olive-gold
                this.ctx.fill();
            }
        } else {
            // Regular hex - use ground texture or fallback to neutral terrain
            this.ctx.strokeStyle = '#4a5568';
            this.ctx.lineWidth = 2;
            
            if (this.groundImage) {
                this.ctx.save();
                this.ctx.clip(); // Clip to hexagon shape
                
                const imgSize = radius * 2.2;
                const imgX = x - imgSize / 2;
                const imgY = y - imgSize / 2;
                
                this.ctx.globalAlpha = 0.8;
                this.ctx.drawImage(this.groundImage, imgX, imgY, imgSize, imgSize);
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = '#68768a'; // Neutral gray terrain
                this.ctx.fill();
            }
        }
        
        // Add faction flag overlay if hex is owned
        if (hex.owner) {
            const faction = FACTIONS[hex.owner];
            this.ctx.strokeStyle = faction.borderColor;
            this.ctx.lineWidth = 3;
            
            // Use flag image as overlay if available
            if (faction.flagImage) {
                this.ctx.save();
                this.ctx.clip(); // Clip to hexagon shape
                
                // Scale image to completely fill the hexagon
                const imgSize = radius * 2.2;
                const imgX = x - imgSize / 2;
                const imgY = y - imgSize / 2;
                
                // Low opacity overlay - shows base texture underneath
                this.ctx.globalAlpha = hex.isStrategic ? 0.4 : 0.3; // Lower opacity for overlay effect
                this.ctx.drawImage(faction.flagImage, imgX, imgY, imgSize, imgSize);
                this.ctx.restore();
            }
        }
        
        this.ctx.stroke();
        
        // Draw movement indicator if this hex is a valid movement target
        if (this.selectedUnit && this.selectedUnit.canAct() && 
            this.selectedUnit.faction === this.currentTurn && 
            hex !== this.selectedUnit.hex && !hex.isWater) {
            
            const movementCost = this.calculateMovementCost(this.selectedUnit, this.selectedUnit.hex, hex);
            const currentResources = this.selectedUnit.faction === this.faction1 ? 
                this.faction1Resources : this.faction2Resources;
            
            if (currentResources >= movementCost) {
                // Valid movement target - draw green overlay
                this.ctx.save();
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + (Math.PI / 6);
                    const hexX = x + radius * Math.cos(angle);
                    const hexY = y + radius * Math.sin(angle);
                    if (i === 0) {
                        this.ctx.moveTo(hexX, hexY);
                    } else {
                        this.ctx.lineTo(hexX, hexY);
                    }
                }
                this.ctx.closePath();
                
                // Green overlay for valid moves
                this.ctx.fillStyle = 'rgba(72, 187, 120, 0.3)';
                this.ctx.fill();
                
                // Draw movement cost
                this.ctx.fillStyle = '#1a202c';
                this.ctx.fillRect(x - 20, y - 30, 40, 20);
                this.ctx.fillStyle = '#48bb78';
                this.ctx.font = 'bold 14px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`-${movementCost}`, x, y - 16);
                this.ctx.restore();
            }
        }
        
        this.ctx.fillStyle = '#f7fafc'; // Light text for contrast
        this.ctx.textAlign = 'center';
        
        // Display resource value prominently - military style
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillText(`${hex.resourceValue}`, x, y - 8);
        
        // Display coordinates smaller below - tactical style
        this.ctx.font = '9px monospace';
        this.ctx.fillStyle = '#cbd5e0';
        this.ctx.fillText(`${hex.row},${hex.col}`, x, y + 8);
        
        // Add strategic indicator for strategic hexes
        if (hex.isStrategic) {
            this.ctx.fillStyle = '#f6ad55'; // Military gold/orange
            this.ctx.strokeStyle = '#1a202c'; // Dark outline for contrast
            this.ctx.lineWidth = 2;
            this.ctx.font = 'bold 24px "Font Awesome 6 Free"';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.strokeText('\uf005', x, y + 20); // FA solid star
            this.ctx.fillText('\uf005', x, y + 20); // FA solid star
        }
        
        // Add brown border to all hexes
        this.ctx.strokeStyle = '#c4b5a0'; // Light brown tone
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw units on this hex
        this.drawUnitsOnHex(hex);
    }
    
    drawUnitsOnHex(hex) {
        const units = this.getUnitsOnHex(hex);
        if (units.length === 0) return;
        
        const { x, y, radius } = hex;
        const unitRadius = 8;
        const spacing = 16;
        
        // Calculate positions for units in a grid pattern
        const cols = Math.ceil(Math.sqrt(units.length));
        const rows = Math.ceil(units.length / cols);
        const startX = x - ((cols - 1) * spacing) / 2;
        const startY = y - ((rows - 1) * spacing) / 2 + 25; // Offset down from center
        
        units.forEach((unit, index) => {
            if (!unit.isAlive) return;
            
            const col = index % cols;
            const row = Math.floor(index / cols);
            const unitX = startX + col * spacing;
            const unitY = startY + row * spacing;
            
            // Draw unit circle background
            this.ctx.fillStyle = unit.color;
            this.ctx.strokeStyle = '#1a202c';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(unitX, unitY, unitRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Add faction border color
            const faction = FACTIONS[unit.faction];
            if (faction) {
                this.ctx.strokeStyle = faction.borderColor;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(unitX, unitY, unitRadius + 2, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
            
            // Draw unit symbol
            this.ctx.fillStyle = '#f7fafc';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(unit.symbol, unitX, unitY);
            
            // Show health if unit is damaged
            if (unit.currentHealth < unit.maxHealth) {
                this.ctx.fillStyle = '#e53e3e';
                this.ctx.font = 'bold 8px monospace';
                this.ctx.fillText(unit.currentHealth, unitX + unitRadius - 2, unitY - unitRadius + 2);
            }
            
            // Highlight selected unit
            if (this.selectedUnit && this.selectedUnit.id === unit.id) {
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(unitX, unitY, unitRadius + 4, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        });
    }
    
    
    updateResourceDisplays() {
        const faction1Display = document.getElementById('faction1ResourceDisplay');
        const faction2Display = document.getElementById('faction2ResourceDisplay');
        
        if (faction1Display && faction2Display) {
            const faction1Info = FACTIONS[this.faction1];
            const faction2Info = FACTIONS[this.faction2];
            
            faction1Display.textContent = `${faction1Info.name}: ${this.faction1Resources} Resources`;
            faction2Display.textContent = `${faction2Info.name}: ${this.faction2Resources} Resources`;
        }
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(this.offsetX, this.offsetY);
        
        this.hexagons.forEach(hex => {
            this.drawHexagon(hex);
        });
        
        this.ctx.restore();
        
        // Draw north indicator
        this.drawNorthIndicator();
        this.drawCompassResizeHandle();
        
        // Draw turn information on canvas
        this.drawTurnInfo();
        
        document.getElementById('hexCount').textContent = this.hexagons.length;
        
        // Update resource displays
        this.updateResourceDisplays();
    }
    
    drawNorthIndicator() {
        this.ctx.save();
        
        // Drag state styling
        const isDragging = this.compassDragging;
        const compassBorder = isDragging ? '#e53e3e' : '#f7fafc';
        const compassBg = isDragging ? 'rgba(229, 62, 62, 0.15)' : 'rgba(26, 32, 44, 0.95)';
        
        // Military-style compass background with hover/drag effects
        this.ctx.fillStyle = compassBg;
        this.ctx.strokeStyle = compassBorder;
        this.ctx.lineWidth = isDragging ? 3 : 2;
        this.ctx.beginPath();
        this.ctx.arc(this.compassX, this.compassY, this.compassSize / 2, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Outer ring for better visibility
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(this.compassX, this.compassY, this.compassSize / 2 + 2, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Inner circle
        this.ctx.strokeStyle = '#718096';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(this.compassX, this.compassY, this.compassSize / 2 - 8, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Draw cardinal directions
        const directions = [
            { angle: -Math.PI/2, label: 'N', color: '#e53e3e' },
            { angle: 0, label: 'E', color: '#cbd5e0' },
            { angle: Math.PI/2, label: 'S', color: '#cbd5e0' },
            { angle: Math.PI, label: 'W', color: '#cbd5e0' }
        ];
        
        directions.forEach(dir => {
            const x = this.compassX + Math.cos(dir.angle) * (this.compassSize / 2 - 18);
            const y = this.compassY + Math.sin(dir.angle) * (this.compassSize / 2 - 18);
            
            this.ctx.fillStyle = dir.color;
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(dir.label, x, y);
        });
        
        // North arrow (tactical style) - bigger
        this.ctx.fillStyle = '#e53e3e';
        this.ctx.strokeStyle = '#1a202c';
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.compassX, this.compassY - this.compassSize / 2 + 12);
        this.ctx.lineTo(this.compassX - 8, this.compassY - 12);
        this.ctx.lineTo(this.compassX, this.compassY - 4);
        this.ctx.lineTo(this.compassX + 8, this.compassY - 12);
         
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Center dot
        this.ctx.fillStyle = '#f7fafc';
        this.ctx.beginPath();
        this.ctx.arc(this.compassX, this.compassY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Add drag indicator when hovering/dragging
        if (isDragging) {
            this.ctx.fillStyle = 'rgba(229, 62, 62, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(this.compassX, this.compassY, this.compassSize / 2 + 8, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    isPointInCompass(x, y) {
        const distance = Math.sqrt(
            Math.pow(x - this.compassX, 2) + Math.pow(y - this.compassY, 2)
        );
        return distance <= this.compassSize / 2 + 5; // Slightly larger hit area
    }
    
    isPointInCompassResizeHandle(x, y) {
        // Resize handle is at the bottom-right of the compass
        const handleX = this.compassX + this.compassSize / 2 - 8;
        const handleY = this.compassY + this.compassSize / 2 - 8;
        const handleSize = 16;
        
        return x >= handleX && x <= handleX + handleSize && 
               y >= handleY && y <= handleY + handleSize;
    }
    
    drawCompassResizeHandle() {
        if (this.compassHovered || this.compassDragging || this.compassResizing) {
            const handleX = this.compassX + this.compassSize / 2 - 8;
            const handleY = this.compassY + this.compassSize / 2 - 8;
            const handleSize = 16;
            
            this.ctx.save();
            
            // Handle background
            this.ctx.fillStyle = this.compassResizing ? '#e53e3e' : '#4a5568';
            this.ctx.strokeStyle = '#f7fafc';
            this.ctx.lineWidth = 2;
            
            this.ctx.fillRect(handleX, handleY, handleSize, handleSize);
            this.ctx.strokeRect(handleX, handleY, handleSize, handleSize);
            
            // Resize icon (diagonal lines)
            this.ctx.strokeStyle = '#f7fafc';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(handleX + 4, handleY + 12);
            this.ctx.lineTo(handleX + 12, handleY + 4);
            this.ctx.moveTo(handleX + 8, handleY + 12);
            this.ctx.lineTo(handleX + 12, handleY + 8);
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    drawTurnInfo() {
        this.ctx.save();
        
        // Use draggable position
        const x = this.turnPanelX + this.turnPanelWidth;
        const y = this.turnPanelY;
        
        // Drag state styling with papery aesthetic
        const isDragging = this.turnPanelDragging;
        const panelBg = isDragging ? 'rgba(240, 230, 210, 0.98)' : 'rgba(244, 241, 234, 0.95)';
        const panelBorder = isDragging ? '#8b7355' : '#8b7355';
        const borderWidth = isDragging ? 3 : 2;
        
        // Create papery background with gradient
        const gradient = this.ctx.createLinearGradient(this.turnPanelX, y, this.turnPanelX, y + this.turnPanelHeight);
        gradient.addColorStop(0, '#f4f1ea');
        gradient.addColorStop(0.25, '#ede6d3');
        gradient.addColorStop(0.5, '#e3d5b7');
        gradient.addColorStop(0.75, '#d9c7a3');
        gradient.addColorStop(1, '#cdb896');
        
        // Background panel with rounded corners effect
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = panelBorder;
        this.ctx.lineWidth = borderWidth;
        this.ctx.shadowColor = 'rgba(139, 115, 85, 0.4)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillRect(this.turnPanelX, y, this.turnPanelWidth, this.turnPanelHeight);
        this.ctx.shadowBlur = 0; // Reset shadow
        this.ctx.strokeRect(this.turnPanelX, y, this.turnPanelWidth, this.turnPanelHeight);
        
        // Inner highlight for paper effect
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.turnPanelX + 1, y + 1, this.turnPanelWidth - 2, this.turnPanelHeight - 2);
        
        // Turn information text with papery styling
        this.ctx.fillStyle = '#4a3728';
        this.ctx.font = 'bold 18px Georgia, serif';
        this.ctx.textAlign = 'right';
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        this.ctx.shadowBlur = 1;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        // Current turn
        this.ctx.fillText(this.getCurrentTurnString(), x - 15, y + 30);
        
        // Turn counter
        this.ctx.font = 'bold 16px Georgia, serif';
        this.ctx.fillText(`Turn ${this.totalTurns + 1} of ${this.maxTurns}`, x - 15, y + 50);
        
        // Initiative with decorative styling
        const initiativeFaction = FACTIONS[this.hasInitiative];
        this.ctx.fillStyle = '#8b7355';
        this.ctx.font = 'bold 16px Georgia, serif';
        this.ctx.fillText(`Initiative: ${initiativeFaction.name}`, x - 15, y + 70);
        
        // Enhanced progress bar with papery styling
        const progressBarWidth = this.turnPanelWidth - 30;
        const progressBarHeight = 12;
        const progressBarX = this.turnPanelX + 15;
        const progressBarY = y + 85;
        
        // Progress background with inset shadow
        this.ctx.fillStyle = '#d9c7a3';
        this.ctx.shadowColor = 'rgba(139, 115, 85, 0.4)';
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        this.ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
        this.ctx.shadowBlur = 0;
        
        // Progress fill with gradient
        const progress = this.totalTurns / this.maxTurns;
        const progressGradient = this.ctx.createLinearGradient(progressBarX, progressBarY, progressBarX, progressBarY + progressBarHeight);
        progressGradient.addColorStop(0, '#8b7355');
        progressGradient.addColorStop(1, '#6b5a47');
        this.ctx.fillStyle = progressGradient;
        this.ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);
        
        // Progress border
        this.ctx.strokeStyle = '#8b7355';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
        
        // War progress text
        this.ctx.fillStyle = '#4a3728';
        this.ctx.font = '14px Georgia, serif';
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        this.ctx.shadowBlur = 1;
        this.ctx.fillText(`War Progress: ${Math.round(progress * 100)}%`, x - 15, y + 115);
        
        // Resource counters and strength with better styling
        this.ctx.font = 'bold 16px Georgia, serif';
        
        // Faction 1 resources and strength
        const faction1Info = FACTIONS[this.faction1];
        const faction1Strength = this.getTotalFactionStrength(this.faction1);
        this.ctx.fillStyle = '#4a3728';
        this.ctx.fillText(`${faction1Info.name}: ${this.faction1Resources} Resources`, x - 15, y + 140);
        this.ctx.font = '14px Georgia, serif';
        this.ctx.fillText(`Strength: ${faction1Strength}/100`, x - 15, y + 155);
        
        // Faction 2 resources and strength
        const faction2Info = FACTIONS[this.faction2];
        const faction2Strength = this.getTotalFactionStrength(this.faction2);
        this.ctx.font = 'bold 16px Georgia, serif';
        this.ctx.fillText(`${faction2Info.name}: ${this.faction2Resources} Resources`, x - 15, y + 175);
        this.ctx.font = '14px Georgia, serif';
        this.ctx.fillText(`Strength: ${faction2Strength}/100`, x - 15, y + 190);
        
        this.ctx.restore();
    }
    
    isPointInTurnPanel(x, y) {
        return x >= this.turnPanelX && x <= this.turnPanelX + this.turnPanelWidth &&
               y >= this.turnPanelY && y <= this.turnPanelY + this.turnPanelHeight;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(5, this.scale * zoomFactor));
            
            if (newScale !== this.scale) {
                // Convert mouse position to world coordinates
                const worldMouseX = (mouseX / this.scale) - this.offsetX;
                const worldMouseY = (mouseY / this.scale) - this.offsetY;
                
                // Update scale
                this.scale = newScale;
                
                // Adjust offset to keep the world point under the mouse cursor
                this.offsetX = (mouseX / this.scale) - worldMouseX;
                this.offsetY = (mouseY / this.scale) - worldMouseY;
                
                this.draw();
                updateZoomDisplay();
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Check if clicking on turn panel first
            if (this.isPointInTurnPanel(mouseX, mouseY)) {
                this.turnPanelDragging = true;
                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
                this.canvas.style.cursor = 'grabbing';
            } else if (this.isPointInCompassResizeHandle(mouseX, mouseY)) {
                this.compassResizing = true;
                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
                this.canvas.style.cursor = 'nw-resize';
            } else if (this.isPointInCompass(mouseX, mouseY)) {
                this.compassDragging = true;
                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
                this.canvas.style.cursor = 'grabbing';
            } else {
                this.isDragging = true;
                this.canvas.classList.add('dragging');
                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            if (this.turnPanelDragging) {
                const deltaX = mouseX - this.lastMouseX;
                const deltaY = mouseY - this.lastMouseY;
                this.turnPanelX += deltaX;
                this.turnPanelY += deltaY;
                
                // Keep turn panel within canvas bounds
                this.turnPanelX = Math.max(0, Math.min(this.canvas.width - this.turnPanelWidth, this.turnPanelX));
                this.turnPanelY = Math.max(0, Math.min(this.canvas.height - this.turnPanelHeight, this.turnPanelY));
                
                this.draw();
            } else if (this.compassResizing) {
                const deltaX = mouseX - this.lastMouseX;
                const deltaY = mouseY - this.lastMouseY;
                
                // Use the larger delta for uniform scaling
                const delta = Math.max(deltaX, deltaY);
                const newSize = this.compassSize + delta;
                
                // Clamp to min/max size
                this.compassSize = Math.max(this.minCompassSize, Math.min(this.maxCompassSize, newSize));
                
                this.draw();
            } else if (this.compassDragging) {
                const deltaX = mouseX - this.lastMouseX;
                const deltaY = mouseY - this.lastMouseY;
                this.compassX += deltaX;
                this.compassY += deltaY;
                
                // Keep compass within canvas bounds
                const compassRadius = this.compassSize / 2;
                this.compassX = Math.max(compassRadius, Math.min(this.canvas.width - compassRadius, this.compassX));
                this.compassY = Math.max(compassRadius, Math.min(this.canvas.height - compassRadius, this.compassY));
                
                this.draw();
            } else if (this.isDragging) {
                const deltaX = mouseX - this.lastMouseX;
                const deltaY = mouseY - this.lastMouseY;
                this.offsetX += deltaX / this.scale;
                this.offsetY += deltaY / this.scale;
                this.draw();
            } else {
                // Check for compass hover when not dragging anything
                const wasHovered = this.compassHovered;
                this.compassHovered = this.isPointInCompass(mouseX, mouseY);
                
                // Redraw if hover state changed
                if (wasHovered !== this.compassHovered) {
                    this.draw();
                }
            }
            
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            if (this.turnPanelDragging) {
                this.turnPanelDragging = false;
                this.canvas.style.cursor = '';
                this.draw(); // Redraw to remove drag state styling
                
                // Save turn panel position
                localStorage.setItem('turnPanelPosition', JSON.stringify({
                    x: this.turnPanelX,
                    y: this.turnPanelY
                }));
            } else if (this.compassResizing) {
                this.compassResizing = false;
                this.canvas.style.cursor = '';
                this.draw(); // Redraw to remove resize state styling
                
                // Save compass position and size
                localStorage.setItem('compassPosition', JSON.stringify({
                    x: this.compassX,
                    y: this.compassY,
                    size: this.compassSize
                }));
            } else if (this.compassDragging) {
                this.compassDragging = false;
                this.canvas.style.cursor = '';
                this.draw(); // Redraw to remove drag state styling
                
                // Save compass position and size
                localStorage.setItem('compassPosition', JSON.stringify({
                    x: this.compassX,
                    y: this.compassY,
                    size: this.compassSize
                }));
            }
            
            this.isDragging = false;
            this.canvas.classList.remove('dragging');
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            if (this.turnPanelDragging) {
                this.turnPanelDragging = false;
                this.canvas.style.cursor = '';
                this.draw();
            } else if (this.compassResizing) {
                this.compassResizing = false;
                this.canvas.style.cursor = '';
                this.draw();
            } else if (this.compassDragging) {
                this.compassDragging = false;
                this.canvas.style.cursor = '';
                this.draw();
            }
            
            this.isDragging = false;
            this.canvas.classList.remove('dragging');
        });
    }
    
    getHexagonAt(mouseX, mouseY) {
        const transformedX = (mouseX - this.offsetX * this.scale) / this.scale;
        const transformedY = (mouseY - this.offsetY * this.scale) / this.scale;
        
        return this.hexagons.find(hex => {
            const distance = Math.sqrt(
                Math.pow(transformedX - hex.x, 2) + Math.pow(transformedY - hex.y, 2)
            );
            return distance <= hex.radius;
        });
    }
}

const board = new HexagonalBoard(canvas, BOARD_CONFIG);
window.board = board; // Make board globally accessible for resize handler

function drawBoard() {
    board.initializeBoard(); // Regenerate the entire board
    board.calculateResources(); // Recalculate resources after board generation
    board.draw();
    updateZoomDisplay();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function resetView() {
    board.scale = 1;
    board.offsetX = 0;
    board.offsetY = 0;
    board.draw();
    updateZoomDisplay();
}

function updateZoomDisplay() {
    document.getElementById('zoomLevel').textContent = Math.round(board.scale * 100) + '%';
}

function updateTurnDisplay() {
    document.getElementById('currentTurn').textContent = board.getCurrentTurnString();
}

function advanceTurn() {
    if (board.advanceTurn()) {
        updateTurnDisplay();
    }
}

function resetGame() {
    board.resetToGameStart();
    updateTurnDisplay();
}

canvas.addEventListener('click', function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickedHex = board.getHexagonAt(x, y);
    if (clickedHex) {
        const unitsOnHex = board.getUnitsOnHex(clickedHex);
        
        if (unitsOnHex.length > 0) {
            // Cycle through units on the hex
            if (board.selectedUnit && unitsOnHex.includes(board.selectedUnit)) {
                const currentIndex = unitsOnHex.indexOf(board.selectedUnit);
                const nextIndex = (currentIndex + 1) % unitsOnHex.length;
                board.selectedUnit = unitsOnHex[nextIndex];
            } else {
                board.selectedUnit = unitsOnHex[0];
            }
            console.log(`Selected unit: ${board.selectedUnit.typeData.name} (${board.selectedUnit.faction})`);
        } else {
            board.selectedUnit = null;
            console.log(`Clicked empty hexagon at row: ${clickedHex.row}, col: ${clickedHex.col}`);
        }
        
        board.draw(); // Redraw to show selection
    }
});

canvas.addEventListener('contextmenu', function(event) {
    event.preventDefault(); // Prevent context menu
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickedHex = board.getHexagonAt(x, y);
    if (clickedHex && board.selectedUnit) {
        const unit = board.selectedUnit;
        const faction = unit.faction;
        const currentResources = faction === board.faction1 ? board.faction1Resources : board.faction2Resources;
        const movementCost = board.calculateMovementCost(unit, unit.hex, clickedHex);
        
        console.log(`Unit: ${unit.typeData.name}, Faction: ${faction}`);
        console.log(`Current resources: ${currentResources}, Movement cost: ${movementCost}`);
        console.log(`Unit can act: ${unit.canAct()}, Unit has acted: ${unit.hasActed}`);
        
        if (board.canMoveUnit(unit, clickedHex)) {
            // Show movement cost overlay before confirming
            const confirmMove = confirm(
                `Move ${unit.typeData.name} to (${clickedHex.row},${clickedHex.col})?\n\n` +
                `Movement Cost: ${movementCost} resources\n` +
                `Current Resources: ${currentResources}\n` +
                `Remaining Resources: ${currentResources - movementCost}\n` +
                (board.getUnitsOnHex(unit.hex).length > 1 ? '\nNote: +1 resource penalty for leaving unit group' : '')
            );
            
            if (confirmMove) {
                console.log(`Moving ${unit.typeData.name} to ${clickedHex.row},${clickedHex.col} (Cost: ${movementCost})`);
                
                if (board.moveUnitToHex(unit, clickedHex)) {
                    console.log('Movement successful');
                    board.draw();
                }
            }
        } else {
            // Show why movement is not possible
            let reason = '';
            if (!unit.canAct()) {
                reason = 'Unit has already acted this turn';
            } else if (currentResources < movementCost) {
                reason = `Insufficient resources (need ${movementCost}, have ${currentResources})`;
            } else if (clickedHex.isWater) {
                reason = 'Cannot move into water';
            } else if (unit.hex === clickedHex) {
                reason = 'Unit is already on this hex';
            }
            
            alert(`Cannot move ${unit.typeData.name}:\n${reason}`);
        }
    }
});

// Add keyboard controls for unit purchasing
document.addEventListener('keydown', function(event) {
    if (!board.selectedUnit) return;
    
    const selectedHex = board.selectedUnit.hex;
    const faction = board.selectedUnit.faction;
    
    // Number keys 1-5 to purchase different unit types
    const unitTypeMap = {
        '1': 'lightInfantry',
        '2': 'heavyInfantry', 
        '3': 'lightMechanical',
        '4': 'heavyMechanical',
        '5': 'artillery'
    };
    
    const unitType = unitTypeMap[event.key];
    if (unitType && board.canPurchaseUnit(faction)) {
        const newUnit = board.purchaseUnit(unitType, faction, selectedHex);
        if (newUnit) {
            console.log(`Purchased ${newUnit.typeData.name} for ${faction} at ${selectedHex.row},${selectedHex.col}`);
            board.draw();
        }
    }
});

function updateBoardConfig() {
    const newColumns = parseInt(document.getElementById('boardWidth').value);
    const newRows = parseInt(document.getElementById('boardHeight').value);
    const newRadius = parseInt(document.getElementById('hexRadius').value);
    
    if (newColumns && newRows && newRadius) {
        BOARD_CONFIG.boardColumns = newColumns;
        BOARD_CONFIG.boardRows = newRows;
        BOARD_CONFIG.hexRadius = newRadius;
        updateHexDimensions();
        
        board.config = BOARD_CONFIG;
        board.initializeBoard();
        board.draw();
    }
}

function updateFactions() {
    const faction1 = document.getElementById('faction1').value;
    const faction2 = document.getElementById('faction2').value;
    
    if (faction1 === faction2) {
        alert('Please select different factions for each player');
        return;
    }
    
    board.faction1 = faction1;
    board.faction2 = faction2;
    board.setupStartingPositions();
    board.calculateResources();
    board.draw();
}

function toggleControls() {
    const controls = document.querySelector('.controls');
    const isCollapsed = controls.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expanding - restore saved size if available
        controls.classList.remove('collapsed');
        const savedPosition = localStorage.getItem('controlsPosition');
        if (savedPosition) {
            const pos = JSON.parse(savedPosition);
            if (pos.width && pos.height) {
                controls.style.width = pos.width + 'px';
                controls.style.height = pos.height + 'px';
                controls.style.maxWidth = 'none';
            }
        }
    } else {
        // Collapsing - remove any explicit sizing to let CSS take over
        controls.classList.add('collapsed');
        controls.style.width = '';
        controls.style.height = '';
        controls.style.maxWidth = '';
    }
}

function toggleUnitControls() {
    const unitControls = document.querySelector('.unit-controls');
    unitControls.classList.toggle('collapsed');
}

// Draggable and resizable controls functionality
function initDraggableControls() {
    const controlsPanel = document.getElementById('controlsPanel');
    const dragHandle = document.querySelector('.drag-handle');
    let isDragging = false;
    let isResizing = false;
    let dragOffset = { x: 0, y: 0 };
    let initialSize = { width: 0, height: 0 };
    let minWidth = 300;
    let minHeight = 200;
    
    // Check if click is on resize handle
    function isResizeHandleClick(e) {
        const rect = controlsPanel.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const handleSize = 20; // Account for padding around the handle
        
        return clickX >= rect.width - handleSize && clickY >= rect.height - handleSize;
    }
    
    // Handle mousedown on controls
    controlsPanel.addEventListener('mousedown', (e) => {
        if (isResizeHandleClick(e)) {
            isResizing = true;
            const rect = controlsPanel.getBoundingClientRect();
            initialSize.width = rect.width;
            initialSize.height = rect.height;
            dragOffset.x = e.clientX;
            dragOffset.y = e.clientY;
            
            document.body.style.cursor = 'nw-resize';
            controlsPanel.style.transition = 'none';
            controlsPanel.classList.add('resizing');
            
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    dragHandle.addEventListener('mousedown', (e) => {
        if (isResizing) return; // Don't drag if we're resizing
        
        isDragging = true;
        const rect = controlsPanel.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        // Change cursor and add visual feedback
        document.body.style.cursor = 'grabbing';
        controlsPanel.style.transition = 'none'; // Disable transition during drag
        controlsPanel.style.transform = 'none'; // Remove centering transform
        controlsPanel.classList.add('dragging'); // Add drag visual feedback
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            const deltaX = e.clientX - dragOffset.x;
            const deltaY = e.clientY - dragOffset.y;
            
            const newWidth = Math.max(minWidth, initialSize.width + deltaX);
            const newHeight = Math.max(minHeight, initialSize.height + deltaY);
            
            controlsPanel.style.width = newWidth + 'px';
            controlsPanel.style.height = newHeight + 'px';
            controlsPanel.style.maxWidth = 'none';
            
        } else if (isDragging) {
            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;
            
            // Constrain to viewport bounds
            const panelRect = controlsPanel.getBoundingClientRect();
            const maxX = window.innerWidth - panelRect.width;
            const maxY = window.innerHeight - panelRect.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            controlsPanel.style.left = newX + 'px';
            controlsPanel.style.top = newY + 'px';
            controlsPanel.style.bottom = 'auto';
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            controlsPanel.style.transition = '';
            controlsPanel.classList.remove('resizing');
            
            // Save size and position to localStorage
            const rect = controlsPanel.getBoundingClientRect();
            localStorage.setItem('controlsPosition', JSON.stringify({
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            }));
            
        } else if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            controlsPanel.style.transition = ''; // Re-enable transitions
            controlsPanel.classList.remove('dragging'); // Remove drag visual feedback
            
            // Save position to localStorage  
            const rect = controlsPanel.getBoundingClientRect();
            const savedData = JSON.parse(localStorage.getItem('controlsPosition') || '{}');
            localStorage.setItem('controlsPosition', JSON.stringify({
                ...savedData,
                left: rect.left,
                top: rect.top
            }));
        }
    });
    
    // Load saved position and size
    const savedPosition = localStorage.getItem('controlsPosition');
    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        controlsPanel.style.left = pos.left + 'px';
        controlsPanel.style.top = pos.top + 'px';
        controlsPanel.style.bottom = 'auto';
        controlsPanel.style.transform = 'none';
        
        if (pos.width && pos.height) {
            controlsPanel.style.width = pos.width + 'px';
            controlsPanel.style.height = pos.height + 'px';
            controlsPanel.style.maxWidth = 'none';
        }
    }
}

// Draggable turn controls functionality
function initDraggableTurnControls() {
    const turnControlsPanel = document.getElementById('turnControlsPanel');
    const dragHandle = turnControlsPanel.querySelector('.drag-handle');
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = turnControlsPanel.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        // Change cursor and add visual feedback
        document.body.style.cursor = 'grabbing';
        turnControlsPanel.style.transition = 'none';
        turnControlsPanel.classList.add('dragging');
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport bounds
        const panelRect = turnControlsPanel.getBoundingClientRect();
        const maxX = window.innerWidth - panelRect.width;
        const maxY = window.innerHeight - panelRect.height;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        turnControlsPanel.style.left = newX + 'px';
        turnControlsPanel.style.top = newY + 'px';
        turnControlsPanel.style.bottom = 'auto';
        turnControlsPanel.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            turnControlsPanel.style.transition = '';
            turnControlsPanel.classList.remove('dragging');
            
            // Save position to localStorage
            const rect = turnControlsPanel.getBoundingClientRect();
            localStorage.setItem('turnControlsPosition', JSON.stringify({
                left: rect.left,
                top: rect.top
            }));
        }
    });
    
    // Load saved position
    const savedPosition = localStorage.getItem('turnControlsPosition');
    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        turnControlsPanel.style.left = pos.left + 'px';
        turnControlsPanel.style.top = pos.top + 'px';
        turnControlsPanel.style.bottom = 'auto';
        turnControlsPanel.style.right = 'auto';
    }
}

// Draggable unit controls functionality
function initDraggableUnitControls() {
    const unitControlsPanel = document.getElementById('unitControlsPanel');
    const dragHandle = unitControlsPanel.querySelector('.drag-handle');
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = unitControlsPanel.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        // Change cursor and add visual feedback
        document.body.style.cursor = 'grabbing';
        unitControlsPanel.style.transition = 'none';
        unitControlsPanel.classList.add('dragging');
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport bounds
        const panelRect = unitControlsPanel.getBoundingClientRect();
        const maxX = window.innerWidth - panelRect.width;
        const maxY = window.innerHeight - panelRect.height;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        unitControlsPanel.style.left = newX + 'px';
        unitControlsPanel.style.top = newY + 'px';
        unitControlsPanel.style.bottom = 'auto';
        unitControlsPanel.style.right = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            unitControlsPanel.style.transition = '';
            unitControlsPanel.classList.remove('dragging');
            
            // Save position to localStorage
            const rect = unitControlsPanel.getBoundingClientRect();
            localStorage.setItem('unitControlsPosition', JSON.stringify({
                left: rect.left,
                top: rect.top
            }));
        }
    });
    
    // Load saved position
    const savedPosition = localStorage.getItem('unitControlsPosition');
    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        unitControlsPanel.style.left = pos.left + 'px';
        unitControlsPanel.style.top = pos.top + 'px';
        unitControlsPanel.style.bottom = 'auto';
        unitControlsPanel.style.right = 'auto';
    }
}

// Draggable title functionality
function initDraggableTitle() {
    const gameTitle = document.getElementById('gameTitle');
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    gameTitle.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = gameTitle.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        // Change cursor and add visual feedback
        document.body.style.cursor = 'grabbing';
        gameTitle.style.transition = 'none'; // Disable transition during drag
        gameTitle.style.transform = 'none'; // Remove centering transform
        gameTitle.classList.add('dragging'); // Add drag visual feedback
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport bounds
        const titleRect = gameTitle.getBoundingClientRect();
        const maxX = window.innerWidth - titleRect.width;
        const maxY = window.innerHeight - titleRect.height;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        gameTitle.style.left = newX + 'px';
        gameTitle.style.top = newY + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
            gameTitle.style.transition = ''; // Re-enable transitions
            gameTitle.classList.remove('dragging'); // Remove drag visual feedback
            
            // Save position to localStorage
            const rect = gameTitle.getBoundingClientRect();
            localStorage.setItem('titlePosition', JSON.stringify({
                left: rect.left,
                top: rect.top
            }));
        }
    });
    
    // Load saved position
    const savedPosition = localStorage.getItem('titlePosition');
    if (savedPosition) {
        const pos = JSON.parse(savedPosition);
        gameTitle.style.left = pos.left + 'px';
        gameTitle.style.top = pos.top + 'px';
        gameTitle.style.transform = 'none';
    }
}

drawBoard();
updateZoomDisplay();
updateTurnDisplay();
initDraggableControls();
initDraggableTurnControls();
initDraggableUnitControls();
initDraggableTitle();