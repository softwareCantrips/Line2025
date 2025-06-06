import { Injectable } from '@angular/core';
import { Container } from 'pixi.js'; // Will be used to type tile objects if they store PIXI objects

// Could be expanded with more tile-specific data (ID, rotation, grid position, etc.)
export interface TileData {
  id: string; // Unique ID for each tile instance
  type: string; // e.g., 'straightBrown', 'turnGreen'
  pixiObject?: Container; // Reference to the PIXI Container/Sprite, optional here
                           // If not storing PIXI objects directly, this can be removed or be just an ID
}

@Injectable({
  providedIn: 'root'
})
export class TileService {
  private spawnedTiles: TileData[] = [];
  private tileCounts: Map<string, number> = new Map();

  private readonly MAX_SPAWNED_TILES_OVERALL: number = 20;
  private readonly MAX_INDIVIDUAL_TILE_TYPE_SPAWN: number = 5;

  // Tile types - these should ideally match keys used in AssetService
  public readonly TILE_TYPES = {
    STRAIGHT_BROWN: 'straightBrown',
    STRAIGHT_GREEN: 'straightGreen',
    TURN_BROWN: 'turnBrown',
    TURN_GREEN: 'turnGreen',
  };

  constructor() {
    this.initializeTileCounts();
  }

  private initializeTileCounts(): void {
    Object.values(this.TILE_TYPES).forEach(type => {
      this.tileCounts.set(type, 0);
    });
  }

  private generateUniqueId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  canSpawnTile(tileType: string): { canSpawn: boolean; reason?: string } {
    if (this.spawnedTiles.length >= this.MAX_SPAWNED_TILES_OVERALL) {
      return { canSpawn: false, reason: `Overall maximum spawned items reached (${this.MAX_SPAWNED_TILES_OVERALL}).` };
    }
    const currentTypeCount = this.tileCounts.get(tileType) || 0;
    if (currentTypeCount >= this.MAX_INDIVIDUAL_TILE_TYPE_SPAWN) {
      return { canSpawn: false, reason: `Max spawns reached for ${tileType} (${this.MAX_INDIVIDUAL_TILE_TYPE_SPAWN})` };
    }
    return { canSpawn: true };
  }

  addSpawnedTile(tileType: string, pixiObjectRef?: Container): TileData | null {
    const spawnCheck = this.canSpawnTile(tileType);
    if (!spawnCheck.canSpawn) {
      console.warn(`Cannot add tile: ${spawnCheck.reason}`);
      return null;
    }

    const newTile: TileData = {
      id: this.generateUniqueId(),
      type: tileType,
      pixiObject: pixiObjectRef // Store reference if provided
    };

    this.spawnedTiles.push(newTile);
    this.tileCounts.set(tileType, (this.tileCounts.get(tileType) || 0) + 1);

    console.log(`Tile added: ${tileType}, ID: ${newTile.id}. Total: ${this.spawnedTiles.length}`);
    return newTile;
  }

  removeTile(tileId: string): void {
    const tileIndex = this.spawnedTiles.findIndex(t => t.id === tileId);
    if (tileIndex > -1) {
      const tileToRemove = this.spawnedTiles[tileIndex];
      this.spawnedTiles.splice(tileIndex, 1);
      this.tileCounts.set(tileToRemove.type, (this.tileCounts.get(tileToRemove.type) || 1) - 1);
      console.log(`Tile removed: ${tileToRemove.type}, ID: ${tileId}. Total: ${this.spawnedTiles.length}`);
    }
  }

  removeAllTiles(): void {
    this.spawnedTiles = [];
    this.initializeTileCounts(); // Reset all counts
    console.log('All tiles removed from TileService.');
  }

  getSpawnedTiles(): ReadonlyArray<TileData> {
    return this.spawnedTiles;
  }

  getTileCount(tileType: string): number {
    return this.tileCounts.get(tileType) || 0;
  }

  getTotalSpawnedCount(): number {
    return this.spawnedTiles.length;
  }

  getMaxOverallSpawnCount(): number {
    return this.MAX_SPAWNED_TILES_OVERALL;
  }

  getMaxIndividualSpawnCount(): number {
    return this.MAX_INDIVIDUAL_TILE_TYPE_SPAWN;
  }
}
