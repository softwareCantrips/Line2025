import { Component, AfterViewInit, OnDestroy } from '@angular/core'; // Added OnDestroy
import { Router } from '@angular/router'; // Import Router
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { Application, Container, Graphics, Text, FederatedPointerEvent, Point, Assets, Sprite, Texture } from 'pixi.js';
import { ReusableButtonComponent } from '../reusable-button/reusable-button.component';
// Ticker from '@pixi/ticker' has been removed as Application handles its own ticker.
// DisplayObject import removed as Graphics objects (which are Containers) are used.

export interface AnchorRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  graphics: Graphics;
  gridRow: number; // Add this
  gridCol: number; // Add this
}

export interface PlacedTileData {
  tileName: string;
  gridX: number; // Representing column
  gridY: number; // Representing row
}

@Component({
  selector: 'app-game-board', // Changed selector
  standalone: true,
  imports: [ReusableButtonComponent, FormsModule], // Added FormsModule
  templateUrl: './game-board.component.html', // Changed templateUrl
  styleUrls: ['./game-board.component.scss'] // Changed styleUrls
})
export class GameBoardComponent implements AfterViewInit, OnDestroy { // Renamed class
  private readonly GRID_ROWS: number = 12;
  private readonly GRID_COLS: number = 12;
  private readonly GRID_MARGIN: number = 50; // Pixels from canvas edge for the grid container
  private readonly CELL_SPACING: number = 2; // Pixels between anchor cells
  private readonly MAX_SPAWNED_RECTANGLES: number = 20;

  // Image paths       
  private readonly IMAGE_PATH_STRAIGHT_BROWN = 'assets/images/straight-brown.jpg';
  private readonly IMAGE_PATH_STRAIGHT_GREEN = 'assets/images/straight-green.jpg';
  private readonly IMAGE_PATH_CORNER_BROWN = 'assets/images/turn-brown.jpg';
  private readonly IMAGE_PATH_CORNER_GREY = 'assets/images/turn-green.jpg';

  constructor(private router: Router) {} // Inject Router

  private app!: Application;
  private stage!: Container;
  private boundHandleResize!: () => void; // For window resize event listener
  private initialCanvasWidth!: number; // Store initial canvas width
  private initialCanvasHeight!: number; // Store initial canvas height
  private boundOnDragMoveDOM!: (event: PointerEvent) => void; // For DOM pointermove
  private boundOnDragEndDOM!: (event: PointerEvent) => void;   // For DOM pointerup/pointerleave
  private draggedObject: Container | null = null; // Holds the object currently being dragged (Graphics objects are Containers)
  private dragOffset = { x: 0, y: 0 }; // Offset from pointer to object's origin during drag
  private spawnedRectangles: Container[] = []; // Array to keep track of all spawned rectangles
  private anchorRectangles: AnchorRectangle[] = [];
  private showDiagnosticsText: boolean = false;
  private diagnosticsTextDisplay: Text | null = null;
  // Textures for new images
  private straightBrownTexture: Texture | null = null;
  private straightGreenTexture: Texture | null = null;
  private turnBrownTexture: Texture | null = null;
  private turnGreenTexture: Texture | null = null;

  // Spawn counts for new images
  public straightBrownCount: number = 0;
  public straightGreyCount: number = 0;
  public cornerBrownCount: number = 0;
  public cornerGreyCount: number = 0;

  // Max spawn count for individual new image types
  private readonly MAX_INDIVIDUAL_IMAGE_SPAWN: number = 5;

  private spawnedRectangleSideLength: number = 40; // Default size, will be updated in ngAfterViewInit

  // Properties for UI controls for spawning at coordinates
  public selectedImageForSpawn: string = 'straightBrown';
  public spawnGridX: number | null = null;
  public spawnGridY: number | null = null;

  /**
   * Handles the start of a drag operation on a Container (specifically, a Graphics object).
   * @param event The pointer event that triggered the drag.
   * @param object The Container (Graphics object) to be dragged.
   */
  private onDragStart(event: FederatedPointerEvent, object: Container) {
    // Prevent default browser actions (e.g., text selection, context menu)
    // event.preventDefault(); // This might be too aggressive here, let's do it in specific handlers

    if (event.button === 0) { // Left-click
      object.alpha = 0.7;
      object.cursor = 'grabbing';
      this.draggedObject = object;

      // dragOffset is now relative to the center pivot.
      this.dragOffset.x = 0; // Object's center (pivot) will align with cursor
      this.dragOffset.y = 0; // Object's center (pivot) will align with cursor

      // Immediately update the object's position to snap its center to the cursor
      this.onDragMoveDOM(event.nativeEvent as PointerEvent);

      // Add new DOM listeners to the canvas for the drag operation
      if (this.app && this.app.canvas) {
          this.app.canvas.addEventListener('pointermove', this.boundOnDragMoveDOM, { passive: false });
          this.app.canvas.addEventListener('pointerup', this.boundOnDragEndDOM, { passive: false });
          this.app.canvas.addEventListener('pointerleave', this.boundOnDragEndDOM, { passive: false });
          // console.log('DOM drag listeners added for left-click drag.');
      } else {
          console.error('Cannot add DOM drag listeners: PixiJS app or canvas not available.');
      }
    } else if (event.button === 2) { // Right-click
      event.preventDefault(); // Prevent context menu specifically on right-click
      event.stopPropagation(); // Stop event from bubbling further

      // Rotate the object if it's a right-click, but don't drag
      object.rotation += Math.PI / 2; // 90 degrees
      // console.log('Object rotated on right-click in onDragStart.');
      // Do not set this.draggedObject or add move/end listeners for right-click.
    }
  }

  /**
   * Handles the movement during a drag operation.
   * @param event The pointer move event.
   */
  private onDragMove(event: FederatedPointerEvent) {
    if (this.draggedObject) {
            // console.log('--- onDragMove ---');
            // console.log(`Window Inner W/H: ${window.innerWidth} / ${window.innerHeight}`);
            // console.log(`App Renderer W/H: ${this.app.renderer.width} / ${this.app.renderer.height}`);
            // console.log(`Stage Scale X/Y: ${this.stage.scale.x.toFixed(2)} / ${this.stage.scale.y.toFixed(2)}`);
            // console.log(`Event Global X/Y: ${event.global.x.toFixed(2)} / ${event.global.y.toFixed(2)}`);

            const parent = this.draggedObject.parent || this.app.stage;
            const localPosition = parent.toLocal(event.global); // Pointer in stage's local (scaled) coordinates
            // console.log(`Local Pointer X/Y (in stage coords): ${localPosition.x.toFixed(2)} / ${localPosition.y.toFixed(2)}`);

            // this.dragOffset is based on local (unscaled) rectangle dimensions, e.g., 25/25 for a 50x50 rect
            // console.log(`Drag Offset X/Y (local to rect): ${this.dragOffset.x} / ${this.dragOffset.y}`);

            const newObjX = localPosition.x - this.dragOffset.x;
            const newObjY = localPosition.y - this.dragOffset.y;
            // console.log(`Calculated New Obj X/Y (local in stage): ${newObjX.toFixed(2)} / ${newObjY.toFixed(2)}`);

      this.draggedObject.x = localPosition.x - this.dragOffset.x;
      this.draggedObject.y = localPosition.y - this.dragOffset.y;
    }
  }

  private onDragMoveDOM(event: PointerEvent): void {
    event.preventDefault(); // Recommended for drag operations

    if (this.draggedObject) {
        const globalX = event.clientX;
        const globalY = event.clientY;
        const newPixiPosition = new Point(globalX, globalY); // Use imported Point

        // console.log('--- onDragMoveDOM ---');
        // console.log(`Window Inner W/H: ${window.innerWidth} / ${window.innerHeight}`);
        // console.log(`App Renderer W/H: ${this.app.renderer.width} / ${this.app.renderer.height}`);
        // console.log(`Stage Scale X/Y: ${this.stage.scale.x.toFixed(2)} / ${this.stage.scale.y.toFixed(2)}`);
        // console.log(`Event ClientX/Y: ${event.clientX.toFixed(2)} / ${event.clientY.toFixed(2)}`);

        const parent = this.draggedObject.parent || this.app.stage;
        const localPosition = parent.toLocal(newPixiPosition);
        // console.log(`Local Pointer X/Y (in stage coords): ${localPosition.x.toFixed(2)} / ${localPosition.y.toFixed(2)}`);

        // console.log(`Drag Offset X/Y (local to rect): ${this.dragOffset.x} / ${this.dragOffset.y}`);

        const newObjX = localPosition.x - this.dragOffset.x;
        const newObjY = localPosition.y - this.dragOffset.y;
        // console.log(`Calculated New Obj X/Y (local in stage): ${newObjX.toFixed(2)} / ${newObjY.toFixed(2)}`);

        this.draggedObject.x = newObjX;
        this.draggedObject.y = newObjY;
    }
  }

  private onDragEndDOM(event: PointerEvent): void {
    event.preventDefault();
    this.onDragEnd();
  }

  private handleResize(): void {
    if (this.app && this.app.renderer) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        this.app.renderer.resize(newWidth, newHeight);

        if (this.initialCanvasWidth > 0 && this.initialCanvasHeight > 0) {
            const scaleX = newWidth / this.initialCanvasWidth;
            const scaleY = newHeight / this.initialCanvasHeight;

            if (this.stage) {
                this.stage.scale.set(scaleX, scaleY);
                this.stage.hitArea = this.app.screen;
                // console.log(`PixiJS stage scaled by ${scaleX.toFixed(2)}x (width), ${scaleY.toFixed(2)}x (height)`);
            }
        } else if (this.stage) {
            this.stage.hitArea = this.app.screen;
        }
        // console.log(`PixiJS canvas resized to ${newWidth}x${newHeight}`);
    } else {
        console.warn('handleResize called but PixiJS app or renderer not ready.');
    }
    this.updateDiagnosticsDisplay(); // Add this call
  }

  private onDragEnd() {
    if (this.draggedObject) {
      // --- Start of New Grid Snapping Logic ---
      let snapped = false; // Flag to ensure we only snap to one anchor
      // Iterate over all anchor rectangles in the grid
      for (const anchor of this.anchorRectangles) {
        // Ensure draggedObject is treated as Graphics for getBounds, if not already guaranteed by type
        const draggedItem = this.draggedObject; // this.draggedObject is Container, which is fine
        const anchorGfx = anchor.graphics;

        // Use getBounds() for robust collision detection, especially if stage scaling is involved.
        const draggedBounds = draggedItem.getBounds(); // Use draggedItem
        const anchorBounds = anchorGfx.getBounds(); // Get bounds of the specific anchor cell's graphics

        // AABB collision detection
        const collision = draggedBounds.x < anchorBounds.x + anchorBounds.width &&
                         draggedBounds.x + draggedBounds.width > anchorBounds.x &&
                         draggedBounds.y < anchorBounds.y + anchorBounds.height &&
                         draggedBounds.y + draggedBounds.height > anchorBounds.y;

        if (collision) {
          // console.log('Collision detected with an anchor cell! Snapping rectangle.');
          // Calculate the center of the *collided* anchor cell
          // Use anchor.x, anchor.y, anchor.width, anchor.height which are the unscaled, stage-relative values
          const anchorCenterX = anchor.x + anchor.width / 2;
          const anchorCenterY = anchor.y + anchor.height / 2;

          // Snap the center of the dragged object (its pivot point) to the center of this anchor cell
          draggedItem.x = anchorCenterX;
          draggedItem.y = anchorCenterY;

          // Logging the tile placement
          const placedData = this.getPlacedTileData(draggedItem, anchor);
          if (placedData) {
            console.log(`Tile Event Data: { tileName: '${placedData.tileName}', gridX: ${placedData.gridX}, gridY: ${placedData.gridY} }`);
          }

          snapped = true; // Mark that snapping has occurred
          break; // Exit loop after snapping to the first collided anchor
        }
      }
      // If (snapped) { /* any post-snap logic if needed, though break handles it */ }
      // --- End of New Grid Snapping Logic ---

      this.draggedObject.alpha = 1;
      this.draggedObject.cursor = 'grab';
      this.draggedObject = null;

      if (this.app && this.app.canvas) {
          this.app.canvas.removeEventListener('pointermove', this.boundOnDragMoveDOM);
          this.app.canvas.removeEventListener('pointerup', this.boundOnDragEndDOM);
          this.app.canvas.removeEventListener('pointerleave', this.boundOnDragEndDOM);
          // console.log('DOM drag listeners removed from canvas.');
      } else {
          console.warn('Cannot remove DOM drag listeners: PixiJS app or canvas not available.');
      }
    }
  }

  private getPlacedTileData(tileSprite: any, anchor: AnchorRectangle): PlacedTileData | null {
    if (!tileSprite || !tileSprite.imageTypeUsed || anchor.gridCol === undefined || anchor.gridRow === undefined) {
      console.error('Could not retrieve placed tile data: missing required properties on tile or anchor.');
      return null;
    }

    const tileName = tileSprite.imageTypeUsed as string;
    const gridX = anchor.gridCol;
    const gridY = anchor.gridRow;

    return {
      tileName: tileName,
      gridX: gridX,
      gridY: gridY
    };
  }

  // addButtonHoverEffect method removed as it's no longer used

  async ngAfterViewInit(): Promise<void> {
    this.app = new Application();

    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xADD8E6,
      antialias: true
    });
    console.log('Pixi Application instance (after init):', this.app);
    if (!this.app) {
      console.error('Pixi Application object is null or undefined after init!');
      return;
    }
    this.initialCanvasWidth = this.app.screen.width;
    this.initialCanvasHeight = this.app.screen.height;
    // console.log(`Initial canvas dimensions stored: ${this.initialCanvasWidth}x${this.initialCanvasHeight}`);

    // Load straight brown texture
    try {
      this.straightBrownTexture = await Assets.load(this.IMAGE_PATH_STRAIGHT_BROWN);
      console.log('Straight brown texture loaded successfully.');
    } catch (error) {
      console.error('Error loading straight brown texture:', error);
    }

    // Load straight grey texture
    try {
      this.straightGreenTexture = await Assets.load(this.IMAGE_PATH_STRAIGHT_GREEN);
      console.log('Straight grey texture loaded successfully.');
    } catch (error) {
      console.error('Error loading straight grey texture:', error);
    }

    // Load corner brown texture
    try {
      this.turnBrownTexture = await Assets.load(this.IMAGE_PATH_CORNER_BROWN);
      console.log('Corner brown texture loaded successfully.');
    } catch (error) {
      console.error('Error loading corner brown texture:', error);
    }

    // Load corner grey texture
    try {
      this.turnGreenTexture = await Assets.load(this.IMAGE_PATH_CORNER_GREY);
      console.log('Corner grey texture loaded successfully.');
    } catch (error) {
      console.error('Error loading corner grey texture:', error);
    }

    // console.log('Attempting to access pixi-container. Element found:', document.getElementById('pixi-container'));
    if (!this.app.canvas) {
      console.error('Pixi Application canvas is null or undefined before appendChild!');
      return;
    }
    // console.log('this.app.canvas before appendChild:', this.app.canvas);

    const containerElement = document.getElementById('pixi-container');
    if (containerElement && this.app && this.app.canvas) {
      containerElement.appendChild(this.app.canvas as HTMLCanvasElement);

      this.stage = this.app.stage;
      // console.log('Pixi Stage initialized:', this.stage);

      this.stage.hitArea = this.app.screen;
      this.stage.eventMode = 'static';

      // PixiJS button creation code removed

      // --- Start of New Anchor Grid Creation ---
      if (!this.app || !this.stage) {
        console.error("Pixi Application or Stage not ready for anchor grid creation");
        return;
      }

      const availableWidthForGrid = this.app.screen.width - 2 * this.GRID_MARGIN;
      const availableHeightForGrid = this.app.screen.height - 2 * this.GRID_MARGIN;

      // Calculate potential side length based on width and height to maintain square shape
      const potentialCellWidthBasedOnTotalWidth = (availableWidthForGrid - (this.GRID_COLS - 1) * this.CELL_SPACING) / this.GRID_COLS;
      const potentialCellHeightBasedOnTotalHeight = (availableHeightForGrid - (this.GRID_ROWS - 1) * this.CELL_SPACING) / this.GRID_ROWS;

      // Actual cell side length is the minimum of the two, ensuring cells are square and fit
      // Use Math.floor to get integer pixel values, and Math.max to ensure a minimum size (e.g., 5px)
      const actualCellSideLength = Math.max(5, Math.floor(Math.min(potentialCellWidthBasedOnTotalWidth, potentialCellHeightBasedOnTotalHeight)));

      // Update the side length for spawned rectangles (e.g., 80% of anchor cell side, ensure integer and min size)
      this.spawnedRectangleSideLength = Math.max(4, Math.floor(actualCellSideLength * 0.8));
      // console.log(`Anchor cell side length: ${actualCellSideLength}, Spawned rectangle side length: ${this.spawnedRectangleSideLength}`);

      if (actualCellSideLength <= 0) {
          console.warn("Calculated anchor cell dimensions are not positive. Grid may not be visible or layout is incorrect.",
                       {availableWidthForGrid, availableHeightForGrid, actualCellSideLength});
          // Optionally, do not proceed to draw the grid if dimensions are invalid
      } else {
          // Recalculate actual total grid dimensions using square cells
          const totalGridWidth = this.GRID_COLS * actualCellSideLength + (this.GRID_COLS - 1) * this.CELL_SPACING;
          const totalGridHeight = this.GRID_ROWS * actualCellSideLength + (this.GRID_ROWS - 1) * this.CELL_SPACING;

          // Calculate offsets to center the new square grid within the original GRID_MARGIN space
          const gridXOffset = (this.app.screen.width - totalGridWidth) / 2;
          const gridYOffset = (this.app.screen.height - totalGridHeight) / 2;

          for (let row = 0; row < this.GRID_ROWS; row++) {
            for (let col = 0; col < this.GRID_COLS; col++) {
              // Use new offsets and actualCellSideLength
              const anchorX = gridXOffset + col * (actualCellSideLength + this.CELL_SPACING);
              const anchorY = gridYOffset + row * (actualCellSideLength + this.CELL_SPACING);

              const anchorGraphics = new Graphics();

              // Style the anchor cell (square)
              anchorGraphics.rect(0, 0, actualCellSideLength, actualCellSideLength); // Use actualCellSideLength for both
              anchorGraphics.fill({ color: 0xEEEEEE });
              anchorGraphics.stroke({ width: 1, color: 0xBBBBBB });

              anchorGraphics.x = anchorX;
              anchorGraphics.y = anchorY;

              this.stage.addChild(anchorGraphics);
              this.anchorRectangles.push({
                x: anchorX,
                y: anchorY,
                width: actualCellSideLength, // Use actualCellSideLength
                height: actualCellSideLength, // Use actualCellSideLength
                graphics: anchorGraphics,
                gridRow: row, // Add this
                gridCol: col   // Add this
              });
            }
          }
          // console.log(`${this.GRID_ROWS * this.GRID_COLS} anchor grid cells created.`);
      }
      // --- End of New Anchor Grid Creation ---

      this.boundHandleResize = this.handleResize.bind(this);
      window.addEventListener('resize', this.boundHandleResize);
      // console.log('Window resize listener added.');

      this.boundOnDragMoveDOM = this.onDragMoveDOM.bind(this);
      this.boundOnDragEndDOM = this.onDragEndDOM.bind(this);
      // console.log('DOM drag handlers bound.');

      // Prevent context menu on the canvas globally for right-clicks
      if (this.app && this.app.canvas) {
        this.app.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        // console.log('Global contextmenu listener added to canvas.');
      }

    } else {
      if (!containerElement) {
        console.error('pixi-container element not found in the DOM!');
      }
      if (!this.app || !this.app.canvas) {
        console.error('Pixi Application or its canvas is not ready for DOM insertion.');
      }
    }
  }

  ngOnDestroy(): void {
    if (this.boundHandleResize) {
        window.removeEventListener('resize', this.boundHandleResize);
        console.log('Window resize listener removed.');
    }
    // Optional: Consider destroying the PixiJS application to free up all resources
    // if (this.app) {
    //     this.app.destroy(true, { children: true, texture: true, basePath: true });
    //     console.log('PixiJS Application destroyed.');
    // }
  }

  navigateToMainMenu() {
    this.router.navigate(['/']); // Navigate to default route (main-menu)
  }

  public handleSpawnSpecificImage(imageType: string, x?: number, y?: number): void {
    let selectedTexture: Texture | null = null;
    let currentCount: number = 0;
    let countPropertyName: keyof GameBoardComponent | null = null;

    switch (imageType) {
      case 'straightBrown':
        selectedTexture = this.straightBrownTexture;
        currentCount = this.straightBrownCount;
        countPropertyName = 'straightBrownCount';
        break;
      case 'straightGreen':
        selectedTexture = this.straightGreenTexture;
        currentCount = this.straightGreyCount;
        countPropertyName = 'straightGreyCount';
        break;
      case 'turnBrown':
        selectedTexture = this.turnBrownTexture;
        currentCount = this.cornerBrownCount;
        countPropertyName = 'cornerBrownCount';
        break;
      case 'turnGreen':
        selectedTexture = this.turnGreenTexture;
        currentCount = this.cornerGreyCount;
        countPropertyName = 'cornerGreyCount';
        break;
      default:
        console.warn(`Invalid imageType: ${imageType}`);
        return;
    }

    if (currentCount >= this.MAX_INDIVIDUAL_IMAGE_SPAWN) {
      console.warn(`Max spawns reached for ${imageType} (${this.MAX_INDIVIDUAL_IMAGE_SPAWN})`);
      return;
    }

    if (this.spawnedRectangles.length >= this.MAX_SPAWNED_RECTANGLES) {
      console.warn(`Overall maximum spawned items reached (${this.MAX_SPAWNED_RECTANGLES}).`);
      return;
    }

    if (!selectedTexture) {
      console.warn(`${imageType} texture not loaded yet.`);
      return;
    }

    if (!this.stage || !this.app) {
      console.warn('Stage or App not ready, cannot spawn sprite.');
      return;
    }

    const sprite = new Sprite(selectedTexture);
    sprite.width = this.spawnedRectangleSideLength;
    sprite.height = this.spawnedRectangleSideLength;
    sprite.anchor.set(0.5);
    sprite.imageTypeUsed = imageType; // Store image type on sprite

    if (x !== undefined && y !== undefined) {
      sprite.x = x;
      sprite.y = y;
    } else {
      sprite.x = (this.app.screen.width / 2);
      sprite.y = (this.app.screen.height / 2);
    }

    sprite.eventMode = 'static';
    sprite.cursor = 'grab';

    sprite.on('pointerdown', (event: FederatedPointerEvent) => {
      if (event.button === 0) { // Left-click
        this.onDragStart(event, sprite);
      } else if (event.button === 2) { // Right-click
        event.preventDefault();
        event.stopPropagation();
        if (this.draggedObject !== sprite) {
          sprite.rotation += Math.PI / 2;
        } else {
           sprite.rotation += Math.PI / 2;
        }
      }
    });

    this.stage.addChild(sprite);
    this.spawnedRectangles.push(sprite);

    if (countPropertyName) {
      // Increment the count for the specific image type
      // This type assertion is safe due to the logic assigning countPropertyName
      (this[countPropertyName] as number)++;
    }

    this.updateDiagnosticsDisplay();
  }

  public spawnTileAtCoordinates(imageType: string, gridX: number, gridY: number): void {
    if (gridX < 0 || gridX >= this.GRID_COLS || gridY < 0 || gridY >= this.GRID_ROWS) {
      console.warn(`Invalid grid coordinates: (${gridX}, ${gridY}). Must be within (0-${this.GRID_COLS - 1}, 0-${this.GRID_ROWS - 1}).`);
      return;
    }

    const anchorIndex = gridY * this.GRID_COLS + gridX;
    const anchor = this.anchorRectangles[anchorIndex];

    if (!anchor) {
      console.error(`Anchor not found at grid coordinates: (${gridX}, ${gridY}), calculated index: ${anchorIndex}.`);
      return;
    }

    const targetX = anchor.x + anchor.width / 2;
    const targetY = anchor.y + anchor.height / 2;

    this.handleSpawnSpecificImage(imageType, targetX, targetY);
  }

  public handleSpawnAtCoordinatesClick(): void {
    if (!this.selectedImageForSpawn || this.spawnGridX === null || this.spawnGridY === null || isNaN(Number(this.spawnGridX)) || isNaN(Number(this.spawnGridY))) {
      console.warn('Invalid input for spawning at coordinates. Please select an image type and enter valid X and Y grid coordinates.');
      return;
    }

    const gridX = Number(this.spawnGridX);
    const gridY = Number(this.spawnGridY);

    this.spawnTileAtCoordinates(this.selectedImageForSpawn, gridX, gridY);
  }

  public handleDeleteAllClick(): void {
    if (!this.stage) return; // Guard

    // Logic copied & adapted from the old PixiJS button's pointerdown event:
    while (this.spawnedRectangles.length > 0) {
      const rectangle = this.spawnedRectangles.pop();
      if (rectangle) {
        this.stage.removeChild(rectangle);
        rectangle.destroy({ children: true });
      }
    }
    console.log('All spawned rectangles deleted via HTML button.');
    this.updateDiagnosticsDisplay(); // Update diagnostics after deleting all
  }

  public toggleDiagnostics(): void {
    this.showDiagnosticsText = !this.showDiagnosticsText;
    this.updateDiagnosticsDisplay();
  }

  private updateDiagnosticsDisplay(): void {
    if (!this.app || !this.stage) return; // Ensure app and stage are available

    if (this.showDiagnosticsText) {
      if (!this.diagnosticsTextDisplay) {
        this.diagnosticsTextDisplay = new Text({
          text: '',
          style: {
            fontSize: 14,
            fill: 0xffffff,
            stroke: { color: 0x000000, width: 2 }, // Using object style for v8 Text
            align: 'right'
          }
        });
        this.diagnosticsTextDisplay.anchor.set(1, 0); // Anchor top-right
        this.stage.addChild(this.diagnosticsTextDisplay);
      }
      this.diagnosticsTextDisplay.text = `Canvas: ${this.app.screen.width}x${this.app.screen.height} | Total: ${this.spawnedRectangles.length}/${this.MAX_SPAWNED_RECTANGLES} | S.Brown: ${this.straightBrownCount}/${this.MAX_INDIVIDUAL_IMAGE_SPAWN} | S.Grey: ${this.straightGreyCount}/${this.MAX_INDIVIDUAL_IMAGE_SPAWN} | C.Brown: ${this.cornerBrownCount}/${this.MAX_INDIVIDUAL_IMAGE_SPAWN} | C.Grey: ${this.cornerGreyCount}/${this.MAX_INDIVIDUAL_IMAGE_SPAWN}`;
      // Position it in the top-right corner of the original stage area,
      // adjusting the margin for the current scale.
      // The text object's anchor is (1,0) [top-right].
      const margin = 10; // Desired screen-space margin in pixels

      if (this.initialCanvasWidth > 0 && this.stage.scale.x !== 0) {
          this.diagnosticsTextDisplay.x = this.initialCanvasWidth - ((margin + 20) / this.stage.scale.x);
      } else {
          // Fallback if initialCanvasWidth isn't set or scale is zero (to avoid errors)
          this.diagnosticsTextDisplay.x = this.app.screen.width - (margin + 20);
      }

      if (this.stage.scale.y !== 0) {
          this.diagnosticsTextDisplay.y = margin / this.stage.scale.y;
      } else {
          // Fallback if scale is zero
          this.diagnosticsTextDisplay.y = margin;
      }
      this.diagnosticsTextDisplay.visible = true;
    } else {
      if (this.diagnosticsTextDisplay) {
        this.diagnosticsTextDisplay.visible = false;
      }
    }
  }
}
