import { Injectable } from '@angular/core';
import { Assets, Texture } from 'pixi.js';

export interface GameAsset {
  key: string;
  path: string;
}

// Define asset keys for type safety and easy reference
export const ASSET_KEYS = {
  STRAIGHT_BROWN: 'straightBrown',
  STRAIGHT_GREEN: 'straightGreen',
  TURN_BROWN: 'turnBrown',
  TURN_GREEN: 'turnGreen',
};

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  private textures: Map<string, Texture> = new Map();
  private assetsToLoad: GameAsset[] = [
    { key: ASSET_KEYS.STRAIGHT_BROWN, path: 'assets/images/straight-brown.jpg' },
    { key: ASSET_KEYS.STRAIGHT_GREEN, path: 'assets/images/straight-green.jpg' },
    { key: ASSET_KEYS.TURN_BROWN, path: 'assets/images/turn-brown.jpg' },
    { key: ASSET_KEYS.TURN_GREEN, path: 'assets/images/turn-green.jpg' },
  ];

  constructor() {}

  async loadAssets(): Promise<void> {
    try {
      for (const asset of this.assetsToLoad) {
        const texture = await Assets.load<Texture>(asset.path);
        this.textures.set(asset.key, texture);
        console.log(`Texture loaded and stored for key: ${asset.key}`);
      }
      console.log('All game assets loaded successfully.');
    } catch (error) {
      console.error('Error loading game assets:', error);
      // Optionally, re-throw the error or handle it as per application requirements
      throw error;
    }
  }

  getTexture(key: string): Texture | undefined {
    const texture = this.textures.get(key);
    if (!texture) {
      console.warn(`AssetService: Texture not found for key: ${key}. Was it loaded?`);
    }
    return texture;
  }

  // Optional: Method to get all loaded textures
  getAllTextures(): Map<string, Texture> {
    return this.textures;
  }
}
