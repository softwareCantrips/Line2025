import { RouterOutlet } from '@angular/router';
import { Component, AfterViewInit, OnDestroy } from '@angular/core'; // Added OnDestroy
import { Application, Container, Graphics, Text, FederatedPointerEvent, Point } from 'pixi.js'; // Added Point
// Ticker from '@pixi/ticker' has been removed as Application handles its own ticker.
// DisplayObject import removed as Graphics objects (which are Containers) are used.

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit, OnDestroy { // Implemented OnDestroy
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

    // Remove PixiJS stage listeners for drag move/end
    // this.app.stage.eventMode = 'static'; // This was for PixiJS stage listeners, stage eventMode is set globally in ngAfterViewInit
    // this.app.stage.off('pointermove', this.onDragMove, this); // Switched to DOM listener
    // this.app.stage.off('pointerup', this.onDragEnd, this); // Switched to DOM listener
    // this.app.stage.off('pointerupoutside', this.onDragEnd, this); // Switched to DOM listener

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

      // Get the new global position of the pointer.
      // const newPosition = event.global.clone(); // Already available as event.global for toLocal

      // Convert the global pointer position to the local coordinates of the dragged object's parent.
      // This is necessary because the object's x/y properties are relative to its parent.
      // const parent = this.draggedObject.parent || this.app.stage; // Already defined above
      // const localPosition = parent.toLocal(event.global); // Already defined above

      // Update the dragged object's position, adjusting for the initial drag offset.
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

        // --- Start of copied/adapted diagnostic logging ---
        console.log('--- onDragMoveDOM ---'); // Indicate DOM handler
        console.log(`Window Inner W/H: ${window.innerWidth} / ${window.innerHeight}`);
        console.log(`App Renderer W/H: ${this.app.renderer.width} / ${this.app.renderer.height}`);
        console.log(`Stage Scale X/Y: ${this.stage.scale.x.toFixed(2)} / ${this.stage.scale.y.toFixed(2)}`);
        console.log(`Event ClientX/Y: ${event.clientX.toFixed(2)} / ${event.clientY.toFixed(2)}`); // Changed from event.global

        const parent = this.draggedObject.parent || this.app.stage;
        const localPosition = parent.toLocal(newPixiPosition); // Use newPixiPosition
        console.log(`Local Pointer X/Y (in stage coords): ${localPosition.x.toFixed(2)} / ${localPosition.y.toFixed(2)}`);

        console.log(`Drag Offset X/Y (local to rect): ${this.dragOffset.x} / ${this.dragOffset.y}`);

        const newObjX = localPosition.x - this.dragOffset.x;
        const newObjY = localPosition.y - this.dragOffset.y;
        console.log(`Calculated New Obj X/Y (local in stage): ${newObjX.toFixed(2)} / ${newObjY.toFixed(2)}`);
        // --- End of copied/adapted diagnostic logging ---

        this.draggedObject.x = newObjX;
        this.draggedObject.y = newObjY;
    }
  }

  private onDragEndDOM(event: PointerEvent): void {
    event.preventDefault(); // Recommended

    // Call the existing onDragEnd logic.
    // onDragEnd will be responsible for resetting the object's state
    // and, importantly, removing these DOM listeners.
    this.onDragEnd();
  }

  private handleResize(): void {
    // Check if PixiJS app and its renderer are initialized
    if (this.app && this.app.renderer) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        // Resize the PixiJS renderer
        this.app.renderer.resize(newWidth, newHeight);

        // Update the stage's hitArea if stage is initialized
        // The stage's screen rectangle should update automatically with the renderer
        if (this.initialCanvasWidth > 0 && this.initialCanvasHeight > 0) { // Avoid division by zero
            const scaleX = newWidth / this.initialCanvasWidth;
            const scaleY = newHeight / this.initialCanvasHeight;

            if (this.stage) {
                this.stage.scale.set(scaleX, scaleY);
                this.stage.hitArea = this.app.screen; // Ensure hitArea matches the new screen dimensions
                console.log(`PixiJS stage scaled by ${scaleX.toFixed(2)}x (width), ${scaleY.toFixed(2)}x (height)`);
            }
        } else if (this.stage) { // Fallback if initial dimensions weren't captured, just update hitArea
            this.stage.hitArea = this.app.screen;
        }

        // Original log for renderer resize
        console.log(`PixiJS canvas resized to ${newWidth}x${newHeight}`);
    } else {
        console.warn('handleResize called but PixiJS app or renderer not ready.');
    }
  }

  /**
   * Handles the end of a drag operation.
   */
  private onDragEnd() {
    if (this.draggedObject) {
      // Restore visual properties of the dragged object.
      this.draggedObject.alpha = 1;
      this.draggedObject.cursor = 'grab';
      this.draggedObject = null; // Release the reference to the dragged object.

      // Remove DOM event listeners from the canvas.
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

  private addButtonHoverEffect(buttonGraphic: Graphics, hoverTint: number = 0xDDDDDD): void {
    const initialTint = buttonGraphic.tint; // Store the tint it had before hover setup

    buttonGraphic.on('pointerover', () => {
        buttonGraphic.tint = hoverTint;
    });

    buttonGraphic.on('pointerout', () => {
        buttonGraphic.tint = initialTint; // Reset to its tint before hover
    });
  }

  async ngAfterViewInit(): Promise<void> {
    // Create a PIXI application
    this.app = new Application(); // Options can be passed here or to init

    // Initialize the application (asynchronous operation)
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xADD8E6, // Light blue
      antialias: true
    });
    console.log('Pixi Application instance (after init):', this.app);
    if (!this.app) {
      // This check might be redundant if init() throws on failure, but good for safety.
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

      // Make the entire stage interactive to capture events more reliably for drag-and-drop
      this.stage.hitArea = this.app.screen; // Set hit area to the entire screen
      this.stage.eventMode = 'static';    // Ensure stage can receive pointer events

      // Create a button
      const buttonContainer = new Container();
      buttonContainer.x = 50;
      buttonContainer.y = 50;
      buttonContainer.eventMode = 'static'; // Make container interactive
      buttonContainer.cursor = 'pointer';   // Set cursor for container

      const buttonBackground = new Graphics();
      buttonBackground.beginFill(0x00FF00); // Green color
      buttonBackground.drawRoundedRect(0, 0, 100, 25, 5); // x, y, width, height, radius (50% smaller)
      buttonBackground.endFill();
      this.addButtonHoverEffect(buttonBackground, 0xAAFFAA); // Apply hover effect (lighter green)
      buttonBackground.eventMode = 'static'; // Make background interactive
      buttonBackground.cursor = 'pointer';   // Set cursor for background

      const buttonText = new Text('Spawn Rectangle', {
        fontSize: 12, // 50% smaller font
        fill: 0x000000, // Black color
        align: 'center'
      });
      buttonText.anchor.set(0.5); // Anchor to the center of the text
      buttonText.x = buttonBackground.width / 2;
      buttonText.y = buttonBackground.height / 2;

      buttonContainer.addChild(buttonBackground);
      buttonContainer.addChild(buttonText);

      this.stage.addChild(buttonContainer);
      console.log('Button added to stage');

      // Event listener for the button to spawn rectangles
      buttonContainer.on('pointerdown', () => {
        // Create a new Graphics object for the rectangle
        const rectangle = new Graphics();

        // Style the rectangle: random fill color, specific size
        rectangle.beginFill(Math.random() * 0xFFFFFF); // Random color
        rectangle.drawRect(0, 0, 50, 50); // x, y, width, height (now 50x50)
        rectangle.endFill();

        // Position the new rectangle (e.g., to the right of the button)
        rectangle.x = buttonContainer.x + buttonContainer.width + 20;
        rectangle.y = buttonContainer.y;

        // Make the rectangle interactive for dragging
        rectangle.eventMode = 'static'; // Enable pointer events
        rectangle.cursor = 'grab';      // Set initial cursor style

        // Attach the drag start listener to this new rectangle
        rectangle.on('pointerdown', (event) => this.onDragStart(event, rectangle));

        // Add the new rectangle to the main stage
        this.stage.addChild(rectangle);
        this.spawnedRectangles.push(rectangle); // Track the spawned rectangle
        console.log('Rectangle spawned and added to tracking array');
      });

      // Create "Delete All Rectangles" button
      const deleteButtonContainer = new Container();

      const deleteButtonBackground = new Graphics();
      deleteButtonBackground.beginFill(0xFF0000); // Red color
      deleteButtonBackground.drawRoundedRect(0, 0, 100, 25, 5); // 50% smaller dimensions
      deleteButtonBackground.endFill();
      this.addButtonHoverEffect(deleteButtonBackground, 0xFF5555); // Lighter red hover
      deleteButtonBackground.eventMode = 'static';
      deleteButtonBackground.cursor = 'pointer';

      const deleteButtonText = new Text('Delete All', {
        fontSize: 12, // 50% smaller font
        fill: 0xFFFFFF, // White text
        align: 'center'
      });
      deleteButtonText.anchor.set(0.5);
      deleteButtonText.x = deleteButtonBackground.width / 2;
      deleteButtonText.y = deleteButtonBackground.height / 2;

      deleteButtonContainer.addChild(deleteButtonBackground, deleteButtonText);

      // Position it to the right of the (now smaller) spawn button.
      // buttonContainer.width will correctly reflect the new width of the spawn button's background (100).
      deleteButtonContainer.x = buttonContainer.x + buttonContainer.width + 20; // 20px spacing
      deleteButtonContainer.y = buttonContainer.y; // Same y-level

      deleteButtonContainer.eventMode = 'static';
      deleteButtonContainer.cursor = 'pointer';

      this.stage.addChild(deleteButtonContainer);
      console.log('Delete All button added to stage');

      // Event listener for the "Delete All" button
      deleteButtonContainer.on('pointerdown', () => {
        // Iterate over the array and remove/destroy each rectangle
        while (this.spawnedRectangles.length > 0) {
            const rectangle = this.spawnedRectangles.pop(); // Get and remove the last rectangle from array
            if (rectangle) {
                this.stage.removeChild(rectangle); // Remove from stage
                rectangle.destroy({ children: true }); // Destroy the rectangle and its children (if any)
            }
        }
        console.log('All spawned rectangles deleted.');
      });

      // Application starts the ticker by default, so no need to manually start it
      // or add a render function to the ticker.

      // Setup and add window resize listener
      this.boundHandleResize = this.handleResize.bind(this);
      window.addEventListener('resize', this.boundHandleResize);
      console.log('Window resize listener added.');

      // Bind DOM drag handlers
      this.boundOnDragMoveDOM = this.onDragMoveDOM.bind(this);
      this.boundOnDragEndDOM = this.onDragEndDOM.bind(this);
      console.log('DOM drag handlers bound.');

    } else {
      if (!containerElement) {
        console.error('pixi-container element not found in the DOM!');
      }
      // Check for app and canvas readiness, though earlier checks should catch this.
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
}
