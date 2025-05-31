import { Component, AfterViewInit, OnDestroy } from '@angular/core'; // Added OnDestroy
import { Router } from '@angular/router'; // Import Router
import { Application, Container, Graphics, Text, FederatedPointerEvent, Point } from 'pixi.js'; // Added Point
import { ReusableButtonComponent } from '../reusable-button/reusable-button.component';
// Ticker from '@pixi/ticker' has been removed as Application handles its own ticker.
// DisplayObject import removed as Graphics objects (which are Containers) are used.

export interface AnchorRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  graphics: Graphics;
}

@Component({
  selector: 'app-game-board', // Changed selector
  standalone: true,
  imports: [ReusableButtonComponent], // Removed RouterLink, kept ReusableButtonComponent
  templateUrl: './game-board.component.html', // Changed templateUrl
  styleUrls: ['./game-board.component.scss'] // Changed styleUrls
})
export class GameBoardComponent implements AfterViewInit, OnDestroy { // Renamed class
  private readonly GRID_ROWS: number = 12;
  private readonly GRID_COLS: number = 12;
  private readonly GRID_MARGIN: number = 50; // Pixels from canvas edge for the grid container
  private readonly CELL_SPACING: number = 2; // Pixels between anchor cells

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

  /**
   * Handles the start of a drag operation on a Container (specifically, a Graphics object).
   * @param event The pointer event that triggered the drag.
   * @param object The Container (Graphics object) to be dragged.
   */
  private onDragStart(event: FederatedPointerEvent, object: Container) {
    // Visual feedback: make object semi-transparent and change cursor
    object.alpha = 0.7;
    object.cursor = 'grabbing';
    this.draggedObject = object;

    // Calculate dragOffset based on the rectangle's known local (unscaled) dimensions.
    // This ensures the offset is correct for positioning within the stage's coordinate system,
    // especially when the stage itself is scaled.
    const localRectangleWidth = 50;
    const localRectangleHeight = 50;
    this.dragOffset.x = localRectangleWidth / 2;
    this.dragOffset.y = localRectangleHeight / 2;

    // Immediately update the object's position to snap its (local) center to the cursor
    // Use the new DOM-based move handler, passing the native PointerEvent
    this.onDragMoveDOM(event.nativeEvent as PointerEvent);

    // Add new DOM listeners to the canvas for the drag operation
    if (this.app && this.app.canvas) {
        this.app.canvas.addEventListener('pointermove', this.boundOnDragMoveDOM, { passive: false });
        this.app.canvas.addEventListener('pointerup', this.boundOnDragEndDOM, { passive: false });
        this.app.canvas.addEventListener('pointerleave', this.boundOnDragEndDOM, { passive: false }); // Catches mouse leaving canvas
        console.log('DOM drag listeners added to canvas.');
    } else {
        console.error('Cannot add DOM drag listeners: PixiJS app or canvas not available.');
    }
  }

  /**
   * Handles the movement during a drag operation.
   * @param event The pointer move event.
   */
  private onDragMove(event: FederatedPointerEvent) {
    if (this.draggedObject) {
            console.log('--- onDragMove ---');
            console.log(`Window Inner W/H: ${window.innerWidth} / ${window.innerHeight}`);
            console.log(`App Renderer W/H: ${this.app.renderer.width} / ${this.app.renderer.height}`);
            console.log(`Stage Scale X/Y: ${this.stage.scale.x.toFixed(2)} / ${this.stage.scale.y.toFixed(2)}`);
            console.log(`Event Global X/Y: ${event.global.x.toFixed(2)} / ${event.global.y.toFixed(2)}`);

            const parent = this.draggedObject.parent || this.app.stage;
            const localPosition = parent.toLocal(event.global); // Pointer in stage's local (scaled) coordinates
            console.log(`Local Pointer X/Y (in stage coords): ${localPosition.x.toFixed(2)} / ${localPosition.y.toFixed(2)}`);

            // this.dragOffset is based on local (unscaled) rectangle dimensions, e.g., 25/25 for a 50x50 rect
            console.log(`Drag Offset X/Y (local to rect): ${this.dragOffset.x} / ${this.dragOffset.y}`);

            const newObjX = localPosition.x - this.dragOffset.x;
            const newObjY = localPosition.y - this.dragOffset.y;
            console.log(`Calculated New Obj X/Y (local in stage): ${newObjX.toFixed(2)} / ${newObjY.toFixed(2)}`);

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

        console.log('--- onDragMoveDOM ---');
        console.log(`Window Inner W/H: ${window.innerWidth} / ${window.innerHeight}`);
        console.log(`App Renderer W/H: ${this.app.renderer.width} / ${this.app.renderer.height}`);
        console.log(`Stage Scale X/Y: ${this.stage.scale.x.toFixed(2)} / ${this.stage.scale.y.toFixed(2)}`);
        console.log(`Event ClientX/Y: ${event.clientX.toFixed(2)} / ${event.clientY.toFixed(2)}`);

        const parent = this.draggedObject.parent || this.app.stage;
        const localPosition = parent.toLocal(newPixiPosition);
        console.log(`Local Pointer X/Y (in stage coords): ${localPosition.x.toFixed(2)} / ${localPosition.y.toFixed(2)}`);

        console.log(`Drag Offset X/Y (local to rect): ${this.dragOffset.x} / ${this.dragOffset.y}`);

        const newObjX = localPosition.x - this.dragOffset.x;
        const newObjY = localPosition.y - this.dragOffset.y;
        console.log(`Calculated New Obj X/Y (local in stage): ${newObjX.toFixed(2)} / ${newObjY.toFixed(2)}`);

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
                console.log(`PixiJS stage scaled by ${scaleX.toFixed(2)}x (width), ${scaleY.toFixed(2)}x (height)`);
            }
        } else if (this.stage) {
            this.stage.hitArea = this.app.screen;
        }
        console.log(`PixiJS canvas resized to ${newWidth}x${newHeight}`);
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
        const draggedGfx = this.draggedObject as Graphics;
        const anchorGfx = anchor.graphics;

        // Use getBounds() for robust collision detection, especially if stage scaling is involved.
        const draggedBounds = draggedGfx.getBounds();
        const anchorBounds = anchorGfx.getBounds(); // Get bounds of the specific anchor cell's graphics

        // AABB collision detection
        const collision = draggedBounds.x < anchorBounds.x + anchorBounds.width &&
                         draggedBounds.x + draggedBounds.width > anchorBounds.x &&
                         draggedBounds.y < anchorBounds.y + anchorBounds.height &&
                         draggedBounds.y + draggedBounds.height > anchorBounds.y;

        if (collision) {
          console.log('Collision detected with an anchor cell! Snapping rectangle.');
          // Calculate the center of the *collided* anchor cell
          // Use anchor.x, anchor.y, anchor.width, anchor.height which are the unscaled, stage-relative values
          const anchorCenterX = anchor.x + anchor.width / 2;
          const anchorCenterY = anchor.y + anchor.height / 2;

          // Snap the center of the dragged object to the center of this anchor cell
          // this.dragOffset is pre-calculated based on the local (unscaled) dimensions of the dragged object
          draggedGfx.x = anchorCenterX - this.dragOffset.x;
          draggedGfx.y = anchorCenterY - this.dragOffset.y;

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
          console.log('DOM drag listeners removed from canvas.');
      } else {
          console.warn('Cannot remove DOM drag listeners: PixiJS app or canvas not available.');
      }
    }
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
    console.log(`Initial canvas dimensions stored: ${this.initialCanvasWidth}x${this.initialCanvasHeight}`);

    console.log('Attempting to access pixi-container. Element found:', document.getElementById('pixi-container'));
    if (!this.app.canvas) {
      console.error('Pixi Application canvas is null or undefined before appendChild!');
      return;
    }
    console.log('this.app.canvas before appendChild:', this.app.canvas);

    const containerElement = document.getElementById('pixi-container');
    if (containerElement && this.app && this.app.canvas) {
      containerElement.appendChild(this.app.canvas as HTMLCanvasElement);

      this.stage = this.app.stage;
      console.log('Pixi Stage initialized:', this.stage);

      this.stage.hitArea = this.app.screen;
      this.stage.eventMode = 'static';

      // PixiJS button creation code removed

      // --- Start of New Anchor Grid Creation ---
      if (!this.app || !this.stage) {
        console.error("Pixi Application or Stage not ready for anchor grid creation");
        return;
      }

      // Use the class constants for grid parameters
      const availableWidth = this.app.screen.width - 2 * this.GRID_MARGIN;
      const availableHeight = this.app.screen.height - 2 * this.GRID_MARGIN;

      const cellWidth = (availableWidth - (this.GRID_COLS - 1) * this.CELL_SPACING) / this.GRID_COLS;
      const cellHeight = (availableHeight - (this.GRID_ROWS - 1) * this.CELL_SPACING) / this.GRID_ROWS;

      if (cellWidth <= 0 || cellHeight <= 0) {
          console.warn("Calculated cell dimensions are not positive. Grid may not be visible or layout is incorrect.",
                       {availableWidth, availableHeight, cellWidth, cellHeight});
          // Optionally, don't draw the grid if dimensions are invalid
          // return;
      }

      for (let row = 0; row < this.GRID_ROWS; row++) {
        for (let col = 0; col < this.GRID_COLS; col++) {
          const anchorX = this.GRID_MARGIN + col * (cellWidth + this.CELL_SPACING);
          const anchorY = this.GRID_MARGIN + row * (cellHeight + this.CELL_SPACING);

          const anchorGraphics = new Graphics();

          // Style the anchor cell (using new v8 API order)
          anchorGraphics.rect(0, 0, cellWidth, cellHeight); // Define shape
          anchorGraphics.fill({ color: 0xEEEEEE });        // Apply fill (light gray)
          anchorGraphics.stroke({ width: 1, color: 0xBBBBBB }); // Apply stroke (thinner, lighter border)

          anchorGraphics.x = anchorX;
          anchorGraphics.y = anchorY;

          this.stage.addChild(anchorGraphics);
          this.anchorRectangles.push({
            x: anchorX,
            y: anchorY,
            width: cellWidth,
            height: cellHeight,
            graphics: anchorGraphics
          });
        }
      }
      console.log(`${this.GRID_ROWS * this.GRID_COLS} anchor grid cells created.`);
      // --- End of New Anchor Grid Creation ---

      this.boundHandleResize = this.handleResize.bind(this);
      window.addEventListener('resize', this.boundHandleResize);
      console.log('Window resize listener added.');

      this.boundOnDragMoveDOM = this.onDragMoveDOM.bind(this);
      this.boundOnDragEndDOM = this.onDragEndDOM.bind(this);
      console.log('DOM drag handlers bound.');

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

  public handleSpawnRectangleClick(): void {
    if (!this.stage || !this.app) return; // Guard if stage/app not ready

    // Logic copied & adapted from the old PixiJS button's pointerdown event:
    const rectangle = new Graphics();
    const randomColor = Math.random() * 0xFFFFFF;
    rectangle.rect(0, 0, 50, 50); // Shape first
    rectangle.fill({ color: randomColor });   // Then style

    // Position - try to place it near where the old buttons were, or a default spot
    // For simplicity, let's place it at a fixed position or relative to canvas center for now
    rectangle.x = (this.app.screen.width / 2) - 25;
    rectangle.y = (this.app.screen.height / 2) - 25;

    rectangle.eventMode = 'static';
    rectangle.cursor = 'grab';
    rectangle.on('pointerdown', (event: FederatedPointerEvent) => this.onDragStart(event, rectangle));

    this.stage.addChild(rectangle);
    this.spawnedRectangles.push(rectangle);
    console.log('Rectangle spawned via HTML button and added to tracking array');
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
      this.diagnosticsTextDisplay.text = `Canvas: ${this.app.screen.width} x ${this.app.screen.height}`;
      this.diagnosticsTextDisplay.x = this.app.screen.width - 10;
      this.diagnosticsTextDisplay.y = 10;
      this.diagnosticsTextDisplay.visible = true;
    } else {
      if (this.diagnosticsTextDisplay) {
        this.diagnosticsTextDisplay.visible = false;
      }
    }
  }
}
