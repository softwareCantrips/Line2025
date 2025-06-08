import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Graphics, FederatedPointerEvent, Point, Sprite, Texture, Container } from 'pixi.js'; // Text import removed
import { CommonModule } from '@angular/common';

import { PixiAppService } from '../pixi-app.service';
import { AssetService, ASSET_KEYS } from '../asset.service';
import { TileService } from '../tile.service';
import { GridService } from '../grid.service';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { DiagnosticsComponent } from '../diagnostics/diagnostics.component'; // Import DiagnosticsComponent
// DisplayObject import removed as Graphics objects (which are Containers) are used.

// This interface is for the component's representation of anchor graphics,
// linking GridService's AnchorRectangle data with the created PIXI.Graphics object.
export interface AnchorGraphicsData {
  id: string; // To link with GridService's AnchorRectangle id
  graphics: Graphics;
  // x, y, width, height are sourced from GridService.getAnchorRectangleById(id) when needed
}

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [ToolbarComponent, DiagnosticsComponent, CommonModule], // Added DiagnosticsComponent
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements AfterViewInit, OnDestroy {
  // Grid constants are now managed by GridService
  // private readonly GRID_ROWS: number = 12;
  // private readonly GRID_COLS: number = 12;
  // private readonly GRID_MARGIN: number = 50; // In GridService
  // private readonly CELL_SPACING: number = 2; // In GridService
  // private readonly MAX_SPAWNED_RECTANGLES: number = 20; // In TileService

  // Image paths are in AssetService
  // Constructor is already updated

  // Service-provided properties are accessed via services
  // Old app, stage, initialCanvasWidth, initialCanvasHeight are via PixiAppService
  // Old spawnedRectangleSideLength is via GridService

  @ViewChild('pixiContainer', { static: true }) pixiContainer!: ElementRef<HTMLDivElement>;

  private boundOnDragMoveDOM!: (event: PointerEvent) => void;
  private boundOnDragEndDOM!: (event: PointerEvent) => void;
  private draggedObject: Container | null = null;
  private dragOffset = { x: 0, y: 0 }; // Offset from pointer to object's origin during drag
  // private spawnedRectangles: Container[] = []; // Replaced by TileService logic + pixiObjectsOnBoard
  private pixiObjectsOnBoard: Map<string, Container> = new Map();
  private anchorGraphicsMap: Map<string, AnchorGraphicsData> = new Map();
  public showDiagnosticsState: boolean = false;
  // All other commented out properties (old texture stores, counts, max spawns, UI model properties) are removed
  // as they are handled by services or ToolbarComponent.

  constructor(
    private router: Router,
    public pixiAppService: PixiAppService,  // Changed to public
    private assetService: AssetService,
    public tileService: TileService,        // Changed to public
    private gridService: GridService
  ) {}

  // Method names changed to reflect they are internal logic, not direct event handlers
  private _onDragStart(event: FederatedPointerEvent, object: Container) {
    if (event.button === 0) {
      object.alpha = 0.7;
      object.cursor = 'grabbing';
      this.draggedObject = object;

      // Get the pointer position in the parent's local coordinates.
      // The parent is typically the stage.
      const parent = object.parent || this.pixiAppService.stage;
      if (parent) { // Ensure parent is available
        const initialClickPositionInParent = parent.toLocal(event.global);

        // Since the object's anchor is (0.5, 0.5), its x/y coordinates represent its center.
        // Set the object's center directly to this click position.
        object.x = initialClickPositionInParent.x;
        object.y = initialClickPositionInParent.y;
      } else {
        console.error("Dragged object has no parent, cannot determine initial position.");
        // Fallback or error handling if needed, though objects on stage should always have a parent.
      }

      // dragOffset remains (0,0) because we want the object's center
      // (which is its x,y due to anchor 0.5) to follow the cursor during subsequent moves.
      this.dragOffset.x = 0;
      this.dragOffset.y = 0;

      // Add new DOM listeners to the canvas for the drag operation
      if (this.pixiAppService.app && this.pixiAppService.app.canvas) {
          this.pixiAppService.app.canvas.addEventListener('pointermove', this.boundOnDragMoveDOM, { passive: false });
          this.pixiAppService.app.canvas.addEventListener('pointerup', this.boundOnDragEndDOM, { passive: false });
          this.pixiAppService.app.canvas.addEventListener('pointerleave', this.boundOnDragEndDOM, { passive: false });
      } else {
          console.error('Cannot add DOM drag listeners: PixiJS app or canvas not available.');
      }
    } else if (event.button === 2) { // Right-click
      event.preventDefault();
      event.stopPropagation();
      object.rotation += Math.PI / 2;
      // Future: Find tile ID from `object` if it's a tracked tile in pixiObjectsOnBoard,
      // then call tileService.updateTileRotation(tileId, object.rotation) if such a method exists.
    }
  }

  // private _onDragMove(event: FederatedPointerEvent) { ... } // If needed

  private _onDragMoveDOM(event: PointerEvent): void {
    event.preventDefault();
    if (this.draggedObject) {
        const globalX = event.clientX;
        const globalY = event.clientY;
        const newPixiPosition = new Point(globalX, globalY);
        const parent = this.draggedObject.parent || this.pixiAppService.stage;
        const localPosition = parent.toLocal(newPixiPosition);
        this.draggedObject.x = localPosition.x - this.dragOffset.x;
        this.draggedObject.y = localPosition.y - this.dragOffset.y;
    }
  }

  private _onDragEndDOM(event: PointerEvent): void {
    event.preventDefault();
    this._onDragEnd();
  }

  private _onDragEnd() {
    if (this.draggedObject) {
      let snapped = false;
      const draggedItem = this.draggedObject!;
      const draggedBounds = draggedItem.getBounds();

      const anchorRectsData = this.gridService.getAnchorRectangles();
      for (const anchorData of anchorRectsData) {
        const anchorGraphicsData = this.anchorGraphicsMap.get(anchorData.id);
        if (!anchorGraphicsData) continue;

        const anchorGfx = anchorGraphicsData.graphics;
        const anchorBounds = anchorGfx.getBounds(); // Using graphics bounds for collision

        const collision = draggedBounds.x < anchorBounds.x + anchorBounds.width &&
                         draggedBounds.x + draggedBounds.width > anchorBounds.x &&
                         draggedBounds.y < anchorBounds.y + anchorBounds.height &&
                         draggedBounds.y + draggedBounds.height > anchorBounds.y;

        if (collision) {
          console.log(`Dragging ended on anchor: ${anchorData.id}`);
          // Snap to the center of the anchorData (from GridService), not the graphics' current position
          draggedItem.x = anchorData.x + anchorData.width / 2;
          draggedItem.y = anchorData.y + anchorData.height / 2;
          snapped = true;
          // Future: If TileService stores positions, update it here.
          // const tileId = [...this.pixiObjectsOnBoard].find(([id, obj]) => obj === draggedItem)?.[0];
          // if (tileId) this.tileService.updateTilePosition(tileId, draggedItem.x, draggedItem.y);
          break;
        }
      }

      this.draggedObject.alpha = 1;
      this.draggedObject.cursor = 'grab';
      this.draggedObject = null;

      if (this.pixiAppService.app && this.pixiAppService.app.canvas) {
          this.pixiAppService.app.canvas.removeEventListener('pointermove', this.boundOnDragMoveDOM);
          this.pixiAppService.app.canvas.removeEventListener('pointerup', this.boundOnDragEndDOM);
          this.pixiAppService.app.canvas.removeEventListener('pointerleave', this.boundOnDragEndDOM);
      }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.pixiContainer || !this.pixiContainer.nativeElement) {
        console.error('Pixi container element not found!');
        return;
    }
    await this.pixiAppService.initialize(this.pixiContainer.nativeElement);
    await this.assetService.loadAssets();

    this.gridService.initializeGrid(this.pixiAppService.app.screen.width, this.pixiAppService.app.screen.height);

    const anchorsData = this.gridService.getAnchorRectangles();
    if (this.pixiAppService.stage) {
        anchorsData.forEach(anchor => {
            const anchorGraphics = new Graphics();
            anchorGraphics.rect(0, 0, anchor.width, anchor.height);
            anchorGraphics.fill({ color: 0xEEEEEE, alpha: 0.3 }); // Made slightly transparent
            anchorGraphics.stroke({ width: 1, color: 0xBBBBBB });
            anchorGraphics.x = anchor.x;
            anchorGraphics.y = anchor.y;
            this.pixiAppService.stage.addChild(anchorGraphics);
            this.anchorGraphicsMap.set(anchor.id, { id: anchor.id, graphics: anchorGraphics });
        });
        console.log(`${this.anchorGraphicsMap.size} anchor graphics created and added to stage.`);
    } else {
        console.error("PixiAppService stage not available for drawing anchor grid.");
    }

    this.boundOnDragMoveDOM = this._onDragMoveDOM.bind(this);
    this.boundOnDragEndDOM = this._onDragEndDOM.bind(this);
    // No call to updateDiagnosticsDisplay() here, DiagnosticsComponent handles its own updates.
  }

  ngOnDestroy(): void {
    // PixiAppService's ngOnDestroy handles app destruction and resize listener.
    // If there were other component-specific listeners, they'd be removed here.
    if (this.pixiAppService.app && this.pixiAppService.app.canvas) {
        this.pixiAppService.app.canvas.removeEventListener('pointermove', this.boundOnDragMoveDOM);
        this.pixiAppService.app.canvas.removeEventListener('pointerup', this.boundOnDragEndDOM);
        this.pixiAppService.app.canvas.removeEventListener('pointerleave', this.boundOnDragEndDOM);
    }
  }

  // navigateToMainMenu is now handled by onNavigateToMainMenuRequested which calls router directly

  // Renamed to indicate it's internal logic triggered by an event from toolbar
  private _handleSpawnSpecificImage(imageTypeKey: string, x?: number, y?: number): void {
    const assetKey = imageTypeKey;

    const spawnCheck = this.tileService.canSpawnTile(assetKey);
    if (!spawnCheck.canSpawn) {
      console.warn(spawnCheck.reason);
      return;
    }

    const selectedTexture = this.assetService.getTexture(assetKey);
    if (!selectedTexture) {
      console.warn(`AssetService: Texture not found for key: ${assetKey}.`);
      return;
    }

    if (!this.pixiAppService.stage || !this.pixiAppService.app) {
      console.warn('Stage or App not ready (PixiAppService), cannot spawn sprite.');
      return;
    }

    const spawnedSideLength = this.gridService.getSpawnedRectangleSideLength();

    const sprite = new Sprite(selectedTexture);
    sprite.width = spawnedSideLength;
    sprite.height = spawnedSideLength;
    sprite.anchor.set(0.5);

    if (x !== undefined && y !== undefined) {
      sprite.x = x;
      sprite.y = y;
    } else {
      sprite.x = (this.pixiAppService.app.screen.width / 2);
      sprite.y = (this.pixiAppService.app.screen.height / 2);
    }

    sprite.eventMode = 'static';
    sprite.cursor = 'grab';

    const tileData = this.tileService.addSpawnedTile(assetKey); // Pass only type, pixiObject is not stored in TileService in this iteration
    if (!tileData) {
      console.warn("TileService failed to add tile, aborting sprite spawn.");
      sprite.destroy(); // Clean up sprite if not added to service
      return;
    }

    this.pixiObjectsOnBoard.set(tileData.id, sprite);

    sprite.on('pointerdown', (event: FederatedPointerEvent) => {
      this._onDragStart(event, sprite); // Use renamed internal method
    });

    this.pixiAppService.stage.addChild(sprite);
    // No call to updateDiagnosticsDisplay() here, DiagnosticsComponent handles its own updates.
  }

  // Renamed to indicate it's internal logic
  private _spawnTileAtCoordinates(imageTypeKey: string, gridX: number, gridY: number): void {
    const gridDims = this.gridService.getGridDimensions();
    if (gridX < 0 || gridX >= gridDims.cols || gridY < 0 || gridY >= gridDims.rows) {
      console.warn(`Invalid grid coordinates: (${gridX}, ${gridY}). Must be within (0-${gridDims.cols -1}, 0-${gridDims.rows -1}).`);
      return;
    }
    const anchorId = `anchor-${gridY}-${gridX}`;
    const anchorDataFromService = this.gridService.getAnchorRectangleById(anchorId);

    if (!anchorDataFromService) {
      console.error(`Anchor data not found in GridService for ID: ${anchorId}.`);
      return;
    }

    const targetX = anchorDataFromService.x + anchorDataFromService.width / 2;
    const targetY = anchorDataFromService.y + anchorDataFromService.height / 2;

    this._handleSpawnSpecificImage(imageTypeKey, targetX, targetY);
  }

  // handleSpawnAtCoordinatesClick is removed, logic handled by onSpawnAtCoordinatesRequested

  // Renamed to indicate it's internal logic
  private _deleteAllTilesAndPixiObjects(): void {
    if (!this.pixiAppService.stage) return;

    this.pixiObjectsOnBoard.forEach((pixiObject, tileId) => {
      this.pixiAppService.stage.removeChild(pixiObject);
      pixiObject.destroy({ children: true });
    });
    this.pixiObjectsOnBoard.clear();
    this.tileService.removeAllTiles();

    console.log('All spawned items cleared from board and TileService.');
    // No call to updateDiagnosticsDisplay() here, DiagnosticsComponent handles its own updates.
  }

  // Renamed to indicate it's internal logic
  private _toggleDiagnostics(): void {
    // This method is now just for toggling the state for the new component.
    // The actual text update will be handled by DiagnosticsComponent's OnChanges.
    this.showDiagnosticsState = !this.showDiagnosticsState;
    // No direct call to updateDiagnosticsDisplay here anymore for the text object.
  }

  // updateDiagnosticsDisplay method is removed as its logic is now in DiagnosticsComponent.
  // However, we might need to call it if other non-diagnostic related text needs updating,
  // or remove it completely if not. For now, assuming it was only for the diagnostics text.

  // --- Event Handlers for ToolbarComponent Outputs ---
  onSpawnTileRequested(imageType: string): void {
    this._handleSpawnSpecificImage(imageType);
  }

  onSpawnAtCoordinatesRequested(data: { imageType: string; x: number; y: number }): void {
    this._spawnTileAtCoordinates(data.imageType, data.x, data.y);
  }

  onDeleteAllRequested(): void {
    this._deleteAllTilesAndPixiObjects();
  }

  onToggleDiagnosticsRequested(): void {
    this._toggleDiagnostics(); // This now just flips the showDiagnosticsState boolean
  }

  onNavigateToMainMenuRequested(): void {
    this.router.navigate(['/']);
  }

  // Getter for DiagnosticsComponent's tileCounts input
  getTileCountsForDiagnostics(): { type: string, count: number, max: number }[] {
    if (!this.tileService || !this.tileService.TILE_TYPES) { // Ensure tileService and TILE_TYPES are available
        // console.warn("TileService or TILE_TYPES not available for diagnostics.");
        return [];
    }
    const types = Object.values(this.tileService.TILE_TYPES);
    return types.map(type => ({
      type: type,
      count: this.tileService.getTileCount(type),
      max: this.tileService.getMaxIndividualSpawnCount()
    }));
  }
}
