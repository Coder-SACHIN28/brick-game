/**
 * Brick Game: Retro Classic Definitive Edition
 * LcdDisplay.js - Authentic 1990s Double-Bevel LCD Segment Renderer
 * 
 * Draws the 10x20 primary matrix, 4x4 next/hold sub-matrices, and digital LCD HUD
 * with crisp devicePixelRatio scaling, pixel-level ghosting, and authentic wipe animations.
 */

export class LcdDisplay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Grid Dimensions
    this.COLS = 10;
    this.ROWS = 20;

    // Active Theme Palette (Default: Classic 90s LCD Green-Gray)
    this.palette = {
      bg: '#9caa88',          // LCD Background glass
      pixelOn: '#192514',      // Active black LCD liquid crystal
      pixelOff: '#8d9c7a',     // Inactive faint ghost LCD cell
      pixelGhost: '#556649',   // Projected drop position (hollow preview)
      border: '#6f7e5e'        // Screen bezel inset border
    };

    // Responsive metrics
    this.scale = 1;
    this.cellSize = 20;
    this.gridX = 14;
    this.gridY = 14;

    // Animation states
    this.flashingRows = [];
    this.flashState = false;
    this.curtainRow = -1; // -1: inactive, 0..19: game over curtain sweep
    this.curtainFill = true;

    this.showGhost = true;
  }

  setTheme(palette) {
    this.palette = { ...this.palette, ...palette };
    this.renderStatic();
  }

  setShowGhost(val) {
    this.showGhost = val;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    // Internal resolution matches display aspect
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.scale(dpr, dpr);

    this.width = rect.width;
    this.height = rect.height;

    // Layout configuration:
    // Screen is divided into: Main 10x20 Field (Left 62%) and HUD Column (Right 38%)
    const padding = 10;
    const availableWidthForGrid = (this.width * 0.62) - (padding * 2);
    const availableHeightForGrid = this.height - (padding * 2);

    this.cellSize = Math.floor(Math.min(
      availableWidthForGrid / this.COLS,
      availableHeightForGrid / this.ROWS
    ));

    this.gridWidth = this.COLS * this.cellSize;
    this.gridHeight = this.ROWS * this.cellSize;

    // Center grid vertically
    this.gridX = padding + Math.floor((availableWidthForGrid - this.gridWidth) / 2);
    this.gridY = padding + Math.floor((availableHeightForGrid - this.gridHeight) / 2);

    // HUD metrics
    this.hudX = this.gridX + this.gridWidth + 12;
    this.hudWidth = this.width - this.hudX - padding;
    this.miniCellSize = Math.max(7, Math.floor(this.cellSize * 0.6));
  }

  /**
   * Render an authentic 90s double-beveled brick LCD segment
   */
  drawLcdSegment(x, y, size, state, isHollow = false) {
    const gap = Math.max(1, Math.floor(size * 0.08));
    const drawSize = size - gap;
    const innerPadding = Math.max(1, Math.floor(drawSize * 0.22));
    const innerSize = drawSize - (innerPadding * 2);

    const ctx = this.ctx;

    if (state === 'ON') {
      ctx.fillStyle = this.palette.pixelOn;
      // Outer beveled frame
      ctx.fillRect(x, y, drawSize, drawSize);
      // Faint inner bezel cutout (slightly lighter)
      ctx.fillStyle = this.palette.bg;
      ctx.fillRect(x + 1, y + 1, drawSize - 2, drawSize - 2);
      // Solid inner core
      ctx.fillStyle = this.palette.pixelOn;
      ctx.fillRect(x + innerPadding, y + innerPadding, innerSize, innerSize);
    } else if (state === 'GHOST') {
      // Projected landing position (dotted / thin outline)
      ctx.strokeStyle = this.palette.pixelGhost;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 1, y + 1, drawSize - 2, drawSize - 2);
      ctx.fillStyle = this.palette.pixelGhost;
      ctx.fillRect(x + innerPadding + 1, y + innerPadding + 1, Math.max(1, innerSize - 2), Math.max(1, innerSize - 2));
    } else {
      // Inactive ghost segment
      ctx.fillStyle = this.palette.pixelOff;
      ctx.fillRect(x, y, drawSize, drawSize);
      ctx.fillStyle = this.palette.bg;
      ctx.fillRect(x + 1, y + 1, drawSize - 2, drawSize - 2);
      ctx.fillStyle = this.palette.pixelOff;
      ctx.fillRect(x + innerPadding, y + innerPadding, innerSize, innerSize);
    }
  }

  /**
   * Main render pass
   */
  render(gameState) {
    const ctx = this.ctx;

    // 1. Clear background glass
    ctx.fillStyle = this.palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Main Grid Inset Border
    ctx.strokeStyle = this.palette.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.gridX - 3, this.gridY - 3, this.gridWidth + 6, this.gridHeight + 6);

    // 3. Render 10x20 LCD Grid
    const { board, currentPiece, ghostY, nextPiece, holdPiece, score, hiScore, level, speed, lines, isPaused, isMuted } = gameState;

    for (let r = 0; r < this.ROWS; r++) {
      const isFlashing = this.flashingRows.includes(r);
      const isCurtainRow = (this.curtainRow >= 0 && (this.curtainFill ? r >= this.curtainRow : r < this.curtainRow));

      for (let c = 0; c < this.COLS; c++) {
        const px = this.gridX + (c * this.cellSize);
        const py = this.gridY + (r * this.cellSize);

        let cellState = 'OFF';

        if (isCurtainRow) {
          cellState = 'ON';
        } else if (isFlashing) {
          cellState = this.flashState ? 'ON' : 'OFF';
        } else if (board && board[r] && board[r][c] === 1) {
          cellState = 'ON';
        }

        // Draw static/board pixel
        this.drawLcdSegment(px, py, this.cellSize, cellState);
      }
    }

    // 4. Render Ghost Piece (if enabled and piece active)
    if (this.showGhost && currentPiece && ghostY !== null && ghostY !== currentPiece.y && this.curtainRow === -1) {
      const shape = currentPiece.shape;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] === 1) {
            const bx = currentPiece.x + c;
            const by = ghostY + r;
            if (by >= 0 && by < this.ROWS && bx >= 0 && bx < this.COLS) {
              const px = this.gridX + (bx * this.cellSize);
              const py = this.gridY + (by * this.cellSize);
              this.drawLcdSegment(px, py, this.cellSize, 'GHOST');
            }
          }
        }
      }
    }

    // 5. Render Active Falling Piece
    if (currentPiece && this.curtainRow === -1) {
      const shape = currentPiece.shape;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] === 1) {
            const bx = currentPiece.x + c;
            const by = currentPiece.y + r;
            if (by >= 0 && by < this.ROWS && bx >= 0 && bx < this.COLS) {
              const px = this.gridX + (bx * this.cellSize);
              const py = this.gridY + (by * this.cellSize);
              this.drawLcdSegment(px, py, this.cellSize, 'ON');
            }
          }
        }
      }
    }

    // 6. Render HUD (Right Column)
    this.renderHUD({
      score,
      hiScore,
      level,
      speed,
      lines,
      nextPiece,
      holdPiece,
      isPaused,
      isMuted
    });
  }

  /**
   * Render side HUD: 7-segment style numbers, Hold, Next, and Status
   */
  renderHUD(data) {
    const ctx = this.ctx;
    const x = this.hudX;
    let y = this.gridY;

    ctx.fillStyle = this.palette.pixelOn;
    ctx.textAlign = 'left';

    // Helper for retro LCD typography
    const drawSectionHeader = (title, curY) => {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = this.palette.pixelGhost;
      ctx.fillText(title, x, curY);
      return curY + 12;
    };

    const drawDigitalNumber = (val, digits, curY) => {
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillStyle = this.palette.pixelOn;
      const str = String(val).padStart(digits, '0');
      ctx.fillText(str, x, curY);
      return curY + 18;
    };

    // 1. HIGH SCORE
    y = drawSectionHeader('HI-SCORE', y);
    y = drawDigitalNumber(data.hiScore || 0, 6, y);

    // 2. SCORE
    y = drawSectionHeader('SCORE', y);
    y = drawDigitalNumber(data.score || 0, 6, y);

    // 3. SPEED & LEVEL in compact side-by-side
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = this.palette.pixelGhost;
    ctx.fillText('SPEED', x, y);
    ctx.fillText('LEVEL', x + 44, y);
    y += 11;

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = this.palette.pixelOn;
    ctx.fillText(String(data.speed).padStart(2, '0'), x, y);
    ctx.fillText(String(data.level).padStart(2, '0'), x + 44, y);
    y += 18;

    // 4. LINES CLEARED
    y = drawSectionHeader('LINES', y);
    y = drawDigitalNumber(data.lines || 0, 4, y);

    // 5. NEXT PIECE (4x4 Matrix)
    y = drawSectionHeader('NEXT', y);
    this.drawMiniMatrix(x, y, data.nextPiece);
    y += (this.miniCellSize * 4) + 12;

    // 6. HOLD PIECE (4x4 Matrix) - As requested in reviews!
    y = drawSectionHeader('HOLD [C/TAP]', y);
    this.drawMiniMatrix(x, y, data.holdPiece);
    y += (this.miniCellSize * 4) + 14;

    // 7. Status Icons (Pause & Sound)
    ctx.font = 'bold 11px "Courier New", monospace';
    if (data.isPaused) {
      ctx.fillStyle = this.palette.pixelOn;
      ctx.fillText('PAUSE', x, y);
    }
    if (data.isMuted) {
      ctx.fillStyle = this.palette.pixelGhost;
      ctx.fillText('MUTE', x + 44, y);
    }
  }

  /**
   * Draw 4x4 mini LCD preview box for Next and Hold pieces
   */
  drawMiniMatrix(startX, startY, piece) {
    const size = this.miniCellSize;
    const boxWidth = size * 4;
    const boxHeight = size * 4;

    // Inset border around mini matrix
    this.ctx.strokeStyle = this.palette.border;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(startX - 2, startY - 2, boxWidth + 4, boxHeight + 4);

    // Centering offsets
    let offsetX = 0;
    let offsetY = 0;
    if (piece && piece.shape) {
      const pw = piece.shape[0].length;
      const ph = piece.shape.length;
      offsetX = Math.floor((4 - pw) / 2);
      offsetY = Math.floor((4 - ph) / 2);
    }

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const px = startX + (c * size);
        const py = startY + (r * size);

        let active = false;
        if (piece && piece.shape) {
          const pr = r - offsetY;
          const pc = c - offsetX;
          if (pr >= 0 && pr < piece.shape.length && pc >= 0 && pc < piece.shape[pr].length) {
            active = piece.shape[pr][pc] === 1;
          }
        }

        this.drawLcdSegment(px, py, size, active ? 'ON' : 'OFF');
      }
    }
  }

  // Trigger Flash Animation for Line Clears
  triggerLineClearFlash(rowIndices, callback) {
    this.flashingRows = [...rowIndices];
    let count = 0;
    const interval = setInterval(() => {
      this.flashState = !this.flashState;
      count++;
      if (count >= 6) {
        clearInterval(interval);
        this.flashingRows = [];
        this.flashState = false;
        if (callback) callback();
      }
    }, 45);
  }

  // Trigger Authentic 90s Game Over Curtain Sweep
  triggerGameOverCurtain(callback) {
    this.curtainRow = 19;
    this.curtainFill = true;

    // Fill curtain from bottom to top
    const fillInterval = setInterval(() => {
      this.curtainRow--;
      if (this.curtainRow < 0) {
        clearInterval(fillInterval);
        // Pause briefly, then unfill curtain from top to bottom
        setTimeout(() => {
          this.curtainRow = 0;
          this.curtainFill = false;
          const unfillInterval = setInterval(() => {
            this.curtainRow++;
            if (this.curtainRow > 20) {
              clearInterval(unfillInterval);
              this.curtainRow = -1;
              if (callback) callback();
            }
          }, 35);
        }, 200);
      }
    }, 35);
  }

  renderStatic() {
    // Force immediate redraw with current palette
    this.render({
      board: Array(20).fill(null).map(() => Array(10).fill(0)),
      currentPiece: null,
      ghostY: null,
      nextPiece: null,
      holdPiece: null,
      score: 0,
      hiScore: 0,
      level: 1,
      speed: 1,
      lines: 0,
      isPaused: false,
      isMuted: false
    });
  }
}
