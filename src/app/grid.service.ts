import { Injectable } from '@angular/core';
import { Graphics } from 'pixi.js'; // For AnchorRectangle.graphics type

export interface AnchorRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  graphics?: Graphics; // Optional: If GridService only stores data, Graphics might not be needed here.
                      // Or it could be added by the component that draws them.
                      // For now, let's keep it to mirror the original structure,
                      // but it might be refactored later.
  id: string; // Unique ID, e.g., "row-col"
}

@Injectable({
  providedIn: 'root'
})
export class GridService {
  private readonly GRID_ROWS: number = 12;
  private readonly GRID_COLS: number = 12;
  private readonly GRID_MARGIN: number = 50; // Pixels from canvas edge
  private readonly CELL_SPACING: number = 2; // Pixels between anchor cells

  private anchorRectanglesData: AnchorRectangle[] = [];
  private actualCellSideLength: number = 0;
  private spawnedRectangleSideLength: number = 0; // Dependent on anchor cell size

  constructor() {}

  // Call this method after the PixiJS app screen dimensions are known
  initializeGrid(appScreenWidth: number, appScreenHeight: number): void {
    this.anchorRectanglesData = []; // Clear previous data if any

    const availableWidthForGrid = appScreenWidth - 2 * this.GRID_MARGIN;
    const availableHeightForGrid = appScreenHeight - 2 * this.GRID_MARGIN;

    const potentialCellWidth = (availableWidthForGrid - (this.GRID_COLS - 1) * this.CELL_SPACING) / this.GRID_COLS;
    const potentialCellHeight = (availableHeightForGrid - (this.GRID_ROWS - 1) * this.CELL_SPACING) / this.GRID_ROWS;

    this.actualCellSideLength = Math.max(5, Math.floor(Math.min(potentialCellWidth, potentialCellHeight)));
    this.spawnedRectangleSideLength = Math.max(4, Math.floor(this.actualCellSideLength * 0.8));

    if (this.actualCellSideLength <= 0) {
      console.warn("Calculated anchor cell dimensions are not positive. Grid may not be visible.");
      return;
    }

    const totalGridWidth = this.GRID_COLS * this.actualCellSideLength + (this.GRID_COLS - 1) * this.CELL_SPACING;
    const totalGridHeight = this.GRID_ROWS * this.actualCellSideLength + (this.GRID_ROWS - 1) * this.CELL_SPACING;

    const gridXOffset = (appScreenWidth - totalGridWidth) / 2;
    const gridYOffset = (appScreenHeight - totalGridHeight) / 2;

    for (let row = 0; row < this.GRID_ROWS; row++) {
      for (let col = 0; col < this.GRID_COLS; col++) {
        const anchorX = gridXOffset + col * (this.actualCellSideLength + this.CELL_SPACING);
        const anchorY = gridYOffset + row * (this.actualCellSideLength + this.CELL_SPACING);
        this.anchorRectanglesData.push({
          id: `anchor-${row}-${col}`,
          x: anchorX,
          y: anchorY,
          width: this.actualCellSideLength,
          height: this.actualCellSideLength,
          // graphics object will be created and managed by the component that renders the grid
        });
      }
    }
    console.log(`GridService initialized with ${this.anchorRectanglesData.length} anchor points. Cell side: ${this.actualCellSideLength}, Spawned item side: ${this.spawnedRectangleSideLength}`);
  }

  getAnchorRectangles(): ReadonlyArray<AnchorRectangle> {
    if (this.anchorRectanglesData.length === 0) {
        console.warn("GridService: getAnchorRectangles called before grid is initialized or if initialization failed.");
    }
    return this.anchorRectanglesData;
  }

  getAnchorRectangleById(id: string): Readonly<AnchorRectangle> | undefined {
    return this.anchorRectanglesData.find(anchor => anchor.id === id);
  }

  getSpawnedRectangleSideLength(): number {
    if (this.spawnedRectangleSideLength === 0) {
        console.warn("GridService: getSpawnedRectangleSideLength called before grid is initialized.");
    }
    return this.spawnedRectangleSideLength;
  }

  getGridDimensions(): { rows: number, cols: number } {
    return { rows: this.GRID_ROWS, cols: this.GRID_COLS };
  }
}
