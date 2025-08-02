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

function updateHexDimensions() {
    BOARD_CONFIG.hexWidth = Math.sqrt(3) * BOARD_CONFIG.hexRadius;
    BOARD_CONFIG.hexHeight = 2 * BOARD_CONFIG.hexRadius;
}

updateHexDimensions();

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
        
        // Compass properties
        this.compassX = 100;
        this.compassY = 100;
        this.compassSize = 70;
        this.compassDragging = false;
        this.compassResizing = false;
        this.compassHovered = false;
        this.minCompassSize = 40;
        this.maxCompassSize = 150;
        
        this.loadFactionImages();
        this.initializeBoard();
        this.setupEventListeners();
        this.loadCompassPosition();
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
        
        // Set up starting positions and distribute strategic hexes
        this.setupStartingPositions();
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
        }
    }
    
    distributeStrategicHexes() {
        const strategicHexes = this.hexagons.filter(h => h.isStrategic);
        const numPerFaction = Math.floor(strategicHexes.length / 2);
        
        // Shuffle strategic hexes for random distribution
        const shuffled = [...strategicHexes].sort(() => Math.random() - 0.5);
        
        // Assign to faction 1
        for (let i = 0; i < numPerFaction; i++) {
            shuffled[i].owner = this.faction1;
        }
        
        // Assign to faction 2
        for (let i = numPerFaction; i < numPerFaction * 2; i++) {
            shuffled[i].owner = this.faction2;
        }
        
        // Remaining strategic hexes (if odd number) stay unowned
    }
    
    placeStrategicHexes() {
        const numStrategic = parseInt(document.getElementById('strategicHexes').value) || 4;
        
        // Reset all hexes to non-strategic
        this.hexagons.forEach(hex => hex.isStrategic = false);
        
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
    
    getHexDistance(hex1, hex2) {
        // Convert offset coordinates to axial coordinates for accurate hex distance
        const q1 = hex1.col - Math.floor(hex1.row / 2);
        const r1 = hex1.row;
        const q2 = hex2.col - Math.floor(hex2.row / 2);
        const r2 = hex2.row;
        
        // Calculate axial distance (proper hex grid distance)
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
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
            owner: null,
            resourceValue: 2 // Default resource value (will be 4 for strategic hexes)
        };
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
        
        // Different styling based on ownership and strategic status
        if (hex.owner) {
            const faction = FACTIONS[hex.owner];
            this.ctx.strokeStyle = faction.borderColor;
            this.ctx.lineWidth = 3;
            
            // Use flag image as background if available
            if (faction.flagImage) {
                this.ctx.save();
                this.ctx.clip(); // Clip to hexagon shape
                
                // Scale image to completely fill the hexagon (with overflow hidden by clip)
                const imgSize = radius * 2.2; // Larger size to ensure full coverage
                const imgX = x - imgSize / 2;
                const imgY = y - imgSize / 2;
                
                // Add transparency overlay for strategic vs regular hexes
                this.ctx.globalAlpha = hex.isStrategic ? 0.9 : 0.7;
                this.ctx.drawImage(faction.flagImage, imgX, imgY, imgSize, imgSize);
                this.ctx.restore();
            } else {
                // Fallback to solid colors if image not loaded
                if (hex.isStrategic) {
                    // Owned strategic hex - military base style
                    this.ctx.fillStyle = faction.color + 'cc'; // Less transparency for strategic
                } else {
                    // Owned regular hex - occupied territory
                    this.ctx.fillStyle = faction.color + '77'; // More transparency
                }
                this.ctx.fill();
            }
        } else if (hex.isStrategic) {
            // Unowned strategic hex - neutral military installation
            this.ctx.strokeStyle = '#b8860b'; // Dark goldenrod border
            this.ctx.lineWidth = 3;
            this.ctx.fillStyle = '#8b7d3a'; // Military olive-gold
        } else {
            // Unowned regular hex - neutral terrain
            this.ctx.strokeStyle = '#4a5568';
            this.ctx.lineWidth = 2;
            this.ctx.fillStyle = '#68768a'; // Neutral gray terrain
            this.ctx.fill();
        }
        
        this.ctx.stroke();
        
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
            this.ctx.font = 'bold 14px monospace';
            this.ctx.fillText('◆', x, y + 20); // Diamond for strategic sites
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
        
        document.getElementById('hexCount').textContent = this.hexagons.length;
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
            this.ctx.font = 'bold 14px monospace';
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
            
            // Check if clicking on compass resize handle first
            if (this.isPointInCompassResizeHandle(mouseX, mouseY)) {
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
            
            if (this.compassResizing) {
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
            if (this.compassResizing) {
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
            if (this.compassResizing) {
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

canvas.addEventListener('click', function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickedHex = board.getHexagonAt(x, y);
    if (clickedHex) {
        console.log(`Clicked hexagon at row: ${clickedHex.row}, col: ${clickedHex.col}`);
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
initDraggableControls();
initDraggableTitle();