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

  public assetKeysMap = ASSET_KEYS; // For direct access in click handlers
  public assetKeySelectOptions: { keyName: keyof typeof ASSET_KEYS; value: string; displayName: string }[];

  constructor() {
    this.assetKeySelectOptions = (Object.keys(ASSET_KEYS) as Array<keyof typeof ASSET_KEYS>).map(key => {
      return {
        keyName: key, // e.g., "STRAIGHT_BROWN"
        value: ASSET_KEYS[key], // e.g., "straightBrown"
        displayName: this.formatDisplayName(ASSET_KEYS[key]) // e.g., "Straight Brown"
      };
    });
  }

  private formatDisplayName(value: string): string {
    if (!value) return '';
    // Add space before capital letters (e.g., "straightBrown" -> "straight Brown")
    const withSpaces = value.replace(/([A-Z])/g, ' $1');
    // Capitalize the first letter of the resulting string
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
  }

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
