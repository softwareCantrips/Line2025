import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { Application, Container } from 'pixi.js';

@Injectable({
  providedIn: 'root'
})
export class PixiAppService implements OnDestroy {
  private appInstance!: Application;
  private mainStage!: Container;
  private boundHandleResize!: () => void;
  private initialCanvasWidth: number = 0;
  private initialCanvasHeight: number = 0;

  constructor(private ngZone: NgZone) {}

  async initialize(containerElement: HTMLElement): Promise<void> {
    this.appInstance = new Application();

    await this.appInstance.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xADD8E6, // Light blue, can be configured
      antialias: true
    });

    if (!this.appInstance.canvas) {
      console.error('Pixi Application canvas is null or undefined after init!');
      return;
    }

    this.initialCanvasWidth = this.appInstance.screen.width;
    this.initialCanvasHeight = this.appInstance.screen.height;

    containerElement.appendChild(this.appInstance.canvas as HTMLCanvasElement);

    this.mainStage = this.appInstance.stage;
    this.mainStage.hitArea = this.appInstance.screen;
    this.mainStage.eventMode = 'static'; // For interaction on the stage

    // Prevent context menu on the canvas globally for right-clicks
    this.appInstance.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    this.boundHandleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundHandleResize);

    console.log('PixiAppService initialized and canvas appended.');
  }

  private handleResize(): void {
    // Run resize logic outside Angular zone to prevent unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      if (this.appInstance && this.appInstance.renderer) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        this.appInstance.renderer.resize(newWidth, newHeight);

        if (this.initialCanvasWidth > 0 && this.initialCanvasHeight > 0) {
          const scaleX = newWidth / this.initialCanvasWidth;
          const scaleY = newHeight / this.initialCanvasHeight;

          if (this.mainStage) {
            this.mainStage.scale.set(scaleX, scaleY);
            this.mainStage.hitArea = this.appInstance.screen; // Update hitArea after scaling
          }
        } else if (this.mainStage) {
          this.mainStage.hitArea = this.appInstance.screen;
        }
        // console.log(`PixiJS canvas resized to ${newWidth}x${newHeight}`);
      }
    });
  }

  get app(): Application {
    if (!this.appInstance) {
      throw new Error('PixiAppService: Application not initialized. Call initialize() first.');
    }
    return this.appInstance;
  }

  get stage(): Container {
    if (!this.mainStage) {
      throw new Error('PixiAppService: Stage not initialized. Call initialize() first.');
    }
    return this.mainStage;
  }

  getInitialWidth(): number {
    return this.initialCanvasWidth;
  }

  getInitialHeight(): number {
    return this.initialCanvasHeight;
  }

  ngOnDestroy(): void {
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
      console.log('Window resize listener removed by PixiAppService.');
    }
    if (this.appInstance) {
      // Destroy the PixiJS application, removing canvas and freeing resources
      this.appInstance.destroy(true, { children: true, texture: true }); // basePath removed
      console.log('PixiJS Application destroyed by PixiAppService.');
    }
  }
}
