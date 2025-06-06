import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ASSET_KEYS } from '../asset.service'; // For consistency

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
  @Output() spawnTileRequest = new EventEmitter<string>();
  @Output() spawnAtCoordinatesRequest = new EventEmitter<{ imageType: string; x: number; y: number }>();
  @Output() deleteAllRequest = new EventEmitter<void>();
  @Output() toggleDiagnosticsRequest = new EventEmitter<void>();
  @Output() navigateToMainMenuRequest = new EventEmitter<void>();

  public selectedImageForSpawn: string = ASSET_KEYS.STRAIGHT_BROWN;
  public spawnGridX: number | null = null;
  public spawnGridY: number | null = null;

  // Expose ASSET_KEYS object directly for template access
  public assetKeys = ASSET_KEYS;
  // Helper to iterate over object keys in the template for the select dropdown
  objectKeys = Object.keys;

  constructor() {}

  onSpawnTileClick(imageType: string): void {
    this.spawnTileRequest.emit(imageType);
  }

  onSpawnAtCoordinatesClick(): void {
    if (this.selectedImageForSpawn && this.spawnGridX !== null && this.spawnGridY !== null &&
        !isNaN(Number(this.spawnGridX)) && !isNaN(Number(this.spawnGridY))) {
      this.spawnAtCoordinatesRequest.emit({
        imageType: this.selectedImageForSpawn,
        x: Number(this.spawnGridX),
        y: Number(this.spawnGridY)
      });
    } else {
      console.warn('ToolbarComponent: Invalid input for spawning at coordinates.');
      // Optionally, provide user feedback here
    }
  }

  onDeleteAllClick(): void {
    this.deleteAllRequest.emit();
  }

  onToggleDiagnosticsClick(): void {
    this.toggleDiagnosticsRequest.emit();
  }

  onNavigateToMainMenuClick(): void {
    this.navigateToMainMenuRequest.emit();
  }
}
