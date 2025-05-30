import { RouterOutlet } from '@angular/router';
import { Component, AfterViewInit } from '@angular/core';
import { Application, Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
// Ticker from '@pixi/ticker' has been removed as Application handles its own ticker.
// DisplayObject import removed as Graphics objects (which are Containers) are used.

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  private app!: Application;
  private stage!: Container;
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

    // Calculate the offset between the pointer's global position and the object's global position.
    // This offset is used to maintain the object's relative position to the pointer during drag.
    const pointerPosition = event.global.clone();
    const objectPosition = object.getGlobalPosition();

    this.dragOffset.x = pointerPosition.x - objectPosition.x;
    this.dragOffset.y = pointerPosition.y - objectPosition.y;

    // Make the stage interactive to listen for move and up events globally.
    // This ensures dragging continues smoothly even if the pointer moves outside the dragged object.
    this.app.stage.eventMode = 'static';
    this.app.stage.on('pointermove', this.onDragMove, this);
    this.app.stage.on('pointerup', this.onDragEnd, this);
    this.app.stage.on('pointerupoutside', this.onDragEnd, this);
  }

  /**
   * Handles the movement during a drag operation.
   * @param event The pointer move event.
   */
  private onDragMove(event: FederatedPointerEvent) {
    if (this.draggedObject) {
      // Get the new global position of the pointer.
      const newPosition = event.global.clone();

      // Convert the global pointer position to the local coordinates of the dragged object's parent.
      // This is necessary because the object's x/y properties are relative to its parent.
      const parent = this.draggedObject.parent || this.app.stage;
      const localPosition = parent.toLocal(newPosition);

      // Update the dragged object's position, adjusting for the initial drag offset.
      this.draggedObject.x = localPosition.x - this.dragOffset.x;
      this.draggedObject.y = localPosition.y - this.dragOffset.y;
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

      // Remove global event listeners from the stage.
      this.app.stage.off('pointermove', this.onDragMove, this);
      this.app.stage.off('pointerup', this.onDragEnd, this);
      this.app.stage.off('pointerupoutside', this.onDragEnd, this);
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
      buttonBackground.drawRoundedRect(0, 0, 200, 50, 10); // x, y, width, height, radius
      buttonBackground.endFill();
      this.addButtonHoverEffect(buttonBackground, 0xAAFFAA); // Apply hover effect (lighter green)
      buttonBackground.eventMode = 'static'; // Make background interactive
      buttonBackground.cursor = 'pointer';   // Set cursor for background

      const buttonText = new Text('Spawn Rectangle', {
        fontSize: 24,
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
        rectangle.drawRect(0, 0, 100, 100); // x, y, width, height
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
      deleteButtonBackground.drawRoundedRect(0, 0, 200, 50, 10); // Same dimensions
      deleteButtonBackground.endFill();
      this.addButtonHoverEffect(deleteButtonBackground, 0xFF5555); // Lighter red hover
      deleteButtonBackground.eventMode = 'static';
      deleteButtonBackground.cursor = 'pointer';

      const deleteButtonText = new Text('Delete All', {
        fontSize: 24,
        fill: 0xFFFFFF, // White text
        align: 'center'
      });
      deleteButtonText.anchor.set(0.5);
      deleteButtonText.x = deleteButtonBackground.width / 2;
      deleteButtonText.y = deleteButtonBackground.height / 2;

      deleteButtonContainer.addChild(deleteButtonBackground, deleteButtonText);

      // Position it to the right of the spawn button
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
}
