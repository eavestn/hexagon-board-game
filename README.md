# Hexagon Board Game

A web-based hexagonal board game built with HTML5 Canvas and JavaScript, featuring zoom and pan functionality.

## Features

- ✅ Perfect hexagonal tessellation with flat-top orientation
- ✅ Mouse wheel zoom (10% - 500%)
- ✅ Click and drag panning
- ✅ Hexagon coordinate system for game logic
- ✅ Click detection with zoom/pan support
- ✅ Responsive canvas design

## Getting Started

### Prerequisites

- Node.js (for development server)
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone https://github.com/eavestn/hexagon-board-game.git
cd hexagon-board-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The game will open automatically at `http://localhost:3000`

### Alternative: Open Directly

You can also open `index.html` directly in your browser without a server.

## Development Scripts

- `npm run dev` - Start development server with live reload
- `npm start` - Start production server
- `npm run install-pan-zoom` - Install pan-zoom package for enhanced navigation

## Project Structure

```
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Stylesheet
├── js/
│   └── hexagonal-board.js  # Main game logic
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Controls

- **Mouse Wheel**: Zoom in/out
- **Click & Drag**: Pan around the board
- **Click Hexagon**: Select (logs to console)
- **Reset View**: Return to default zoom/position

## Future Enhancements

- Game pieces and player mechanics
- AI opponent
- Different board sizes and shapes
- Save/load game state
- Multiplayer support

## Technologies

- HTML5 Canvas
- Vanilla JavaScript
- CSS3
- Node.js (development)

## License

MIT License - see LICENSE file for details