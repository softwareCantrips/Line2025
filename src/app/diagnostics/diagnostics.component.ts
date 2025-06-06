import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Text } from 'pixi.js';
import { PixiAppService } from '../pixi-app.service';
import { CommonModule } from '@angular/common'; // For titlecase pipe if used in text

@Component({
  selector: 'app-diagnostics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagnostics.component.html', // Will be empty
  styleUrls: ['./diagnostics.component.scss']
})
export class DiagnosticsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() showDiagnostics: boolean = false;
  @Input() canvasWidth: number = 0;
  @Input() canvasHeight: number = 0;
  @Input() initialCanvasWidth: number = 0;
  @Input() stageScaleX: number = 1;
  @Input() stageScaleY: number = 1;
  @Input() totalSpawned: number = 0;
  @Input() maxSpawned: number = 0;
  @Input() tileCounts: { type: string, count: number, max: number }[] = [];

  private diagnosticsTextDisplay: Text | null = null;
  private readonly MARGIN = 10; // Screen-space margin in pixels

  constructor(private pixiAppService: PixiAppService) {}

  ngOnInit(): void {
    if (!this.pixiAppService.stage) {
      console.error("DiagnosticsComponent: PixiAppService stage not available on init.");
      return;
    }
    this.diagnosticsTextDisplay = new Text({
      text: '', // Initial empty text
      style: {
        fontSize: 14,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
        align: 'right'
      }
    });
    this.diagnosticsTextDisplay.anchor.set(1, 0); // Anchor top-right
    this.pixiAppService.stage.addChild(this.diagnosticsTextDisplay);
    this.updateText(); // Initial update
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update text if any relevant input changes
    if (this.diagnosticsTextDisplay) { // Ensure text object is initialized
        this.updateText();
    }
  }

  private updateText(): void {
    if (!this.diagnosticsTextDisplay) return;

    if (this.showDiagnostics) {
      let tileCountsStr = this.tileCounts
        .map(tc => `${this.formatTileType(tc.type)}: ${tc.count}/${tc.max}`)
        .join(' | ');

      this.diagnosticsTextDisplay.text = `Canvas: ${this.canvasWidth}x${this.canvasHeight} | Total: ${this.totalSpawned}/${this.maxSpawned} | ${tileCountsStr}`;

      // Position calculation (same as previously in GameBoardComponent)
      if (this.initialCanvasWidth > 0 && this.stageScaleX !== 0) {
        this.diagnosticsTextDisplay.x = this.initialCanvasWidth - ((this.MARGIN + 20) / this.stageScaleX);
      } else {
        this.diagnosticsTextDisplay.x = this.canvasWidth - (this.MARGIN + 20);
      }

      if (this.stageScaleY !== 0) {
        this.diagnosticsTextDisplay.y = this.MARGIN / this.stageScaleY;
      } else {
        this.diagnosticsTextDisplay.y = this.MARGIN;
      }
      this.diagnosticsTextDisplay.visible = true;
    } else {
      this.diagnosticsTextDisplay.visible = false;
    }
  }

  private formatTileType(type: string): string {
    // Example: 'straightBrown' -> 'S.Brown'
    // This can be customized further.
    return type
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('.')
      .substring(0, 5); // Limit length if necessary e.g. S.Bro
  }

  ngOnDestroy(): void {
    if (this.diagnosticsTextDisplay) {
      if (this.pixiAppService.stage) {
        this.pixiAppService.stage.removeChild(this.diagnosticsTextDisplay);
      }
      this.diagnosticsTextDisplay.destroy({ children: true, texture: true, basePath: true });
      this.diagnosticsTextDisplay = null;
      console.log('DiagnosticsComponent: Text display destroyed.');
    }
  }
}
