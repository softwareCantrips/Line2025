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

  ngAfterViewInit() {
    // Create a PIXI application
    this.app = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xADD8E6, // Light blue
      antialias: true
    });

    // Set the stage
    this.stage = this.app.stage;

    // Append the canvas to the DOM
    document.getElementById('pixi-container')?.appendChild(this.app.view as HTMLCanvasElement);

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
    });

    // Application starts the ticker by default, so no need to manually start it
    // or add a render function to the ticker.
  }
}
