import * as PIXI from 'pixi.js';

import type { LayerDefinition, LayerManager as ILayerManager, LayerName } from '../types/renderer-types';

/**
 * LayerManager handles the creation, organization, and management of PIXI rendering layers.
 * This provides a centralized way to manage the z-order and visibility of different game elements.
 */
export class LayerManager implements ILayerManager {
	private world: PIXI.Container;
	private layers: Map<string, LayerDefinition> = new Map();
	private nextZIndex: number = 0;

	constructor(world: PIXI.Container) {
		this.world = world;
		console.log('[LAYER-MANAGER] Initialized with world container');
	}

	/**
	 * Create a new layer and add it to the world container
	 * @param name - Unique name for the layer
	 * @param zIndex - Optional z-index for layer ordering. If not provided, layers are ordered by creation time
	 * @returns The created PIXI.Container
	 */
	createLayer(name: string, zIndex?: number): PIXI.Container {
		if (this.layers.has(name)) {
			console.warn(`[LAYER-MANAGER] Layer '${name}' already exists. Returning existing layer.`);
			return this.layers.get(name)!.container;
		}

		const container = new PIXI.Container();
		container.name = name; // Set container name for debugging

		// Use provided zIndex or assign next available index
		const layerZIndex = zIndex !== undefined ? zIndex : this.nextZIndex++;

		const layerDefinition: LayerDefinition = {
			name,
			zIndex: layerZIndex,
			container,
			visible: true,
		};

		this.layers.set(name, layerDefinition);

		// Add to world and sort by z-index
		this.world.addChild(container);
		this.sortLayers();

		console.log(`[LAYER-MANAGER] Created layer '${name}' with z-index ${layerZIndex}`);
		return container;
	}

	/**
	 * Get an existing layer by name
	 * @param name - Name of the layer to retrieve
	 * @returns The layer container or null if not found
	 */
	getLayer(name: string): PIXI.Container | null {
		const layer = this.layers.get(name);
		return layer ? layer.container : null;
	}

	/**
	 * Remove a layer from the world and layer management
	 * @param name - Name of the layer to remove
	 */
	removeLayer(name: string): void {
		const layer = this.layers.get(name);
		if (!layer) {
			console.warn(`[LAYER-MANAGER] Cannot remove layer '${name}' - not found`);
			return;
		}

		// Remove from world
		if (layer.container.parent) {
			layer.container.parent.removeChild(layer.container);
		}

		// Clean up container
		layer.container.destroy({ children: true });

		// Remove from management
		this.layers.delete(name);

		console.log(`[LAYER-MANAGER] Removed layer '${name}'`);
	}

	/**
	 * Set the order of layers by providing layer names in desired order
	 * @param layerNames - Array of layer names in desired order (first = bottom, last = top)
	 */
	setLayerOrder(layerNames: string[]): void {
		// Validate all layer names exist
		const missingLayers = layerNames.filter(name => !this.layers.has(name));
		if (missingLayers.length > 0) {
			console.warn(`[LAYER-MANAGER] Cannot set layer order - missing layers: ${missingLayers.join(', ')}`);
			return;
		}

		// Update z-indices based on provided order
		layerNames.forEach((name, index) => {
			const layer = this.layers.get(name)!;
			layer.zIndex = index;
		});

		// Update nextZIndex to avoid conflicts
		this.nextZIndex = Math.max(this.nextZIndex, layerNames.length);

		// Re-sort layers in world container
		this.sortLayers();

		console.log(`[LAYER-MANAGER] Set layer order: ${layerNames.join(' → ')}`);
	}

	/**
	 * Set the visibility of a layer
	 * @param name - Name of the layer
	 * @param visible - Whether the layer should be visible
	 */
	setLayerVisibility(name: string, visible: boolean): void {
		const layer = this.layers.get(name);
		if (!layer) {
			console.warn(`[LAYER-MANAGER] Cannot set visibility for layer '${name}' - not found`);
			return;
		}

		layer.visible = visible;
		layer.container.visible = visible;

		console.log(`[LAYER-MANAGER] Set layer '${name}' visibility to ${visible}`);
	}

	/**
	 * Get all layer definitions for debugging/inspection
	 * @returns Array of all layer definitions
	 */
	getAllLayers(): LayerDefinition[] {
		return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
	}

	/**
	 * Initialize default game layers in the correct order
	 * This creates the standard layer structure used by the game
	 */
	initializeDefaultLayers(): void {
		// Create layers in z-order (bottom to top)
		const defaultLayers: Array<{ name: LayerName; zIndex: number }> = [
			{ name: 'background', zIndex: 0 },
			{ name: 'galaxy', zIndex: 10 },
			{ name: 'rooms', zIndex: 20 },
			{ name: 'doors', zIndex: 30 },
			{ name: 'furniture', zIndex: 40 },
			{ name: 'npcs', zIndex: 50 },
			{ name: 'player', zIndex: 60 },
			{ name: 'fog-of-war', zIndex: 70 },
			{ name: 'ui', zIndex: 80 },
		];

		defaultLayers.forEach(({ name, zIndex }) => {
			this.createLayer(name, zIndex);
		});

		console.log('[LAYER-MANAGER] Initialized default game layers');
	}

	/**
	 * Sort layers in the world container based on their z-index
	 * @private
	 */
	private sortLayers(): void {
		// Get all layers sorted by z-index
		const sortedLayers = this.getAllLayers();

		// Remove all children from world
		this.world.removeChildren();

		// Add them back in correct order
		sortedLayers.forEach(layer => {
			this.world.addChild(layer.container);
		});
	}

	/**
	 * Clean up all layers and resources
	 */
	destroy(): void {
		console.log('[LAYER-MANAGER] Destroying all layers');

		// Destroy all layer containers
		for (const layer of this.layers.values()) {
			if (layer.container.parent) {
				layer.container.parent.removeChild(layer.container);
			}
			layer.container.destroy({ children: true });
		}

		// Clear layer map
		this.layers.clear();
		this.nextZIndex = 0;

		console.log('[LAYER-MANAGER] Cleanup complete');
	}

	/**
	 * Get debug information about current layer state
	 * @returns Debug information object
	 */
	getDebugInfo(): {
		layerCount: number;
		layers: Array<{ name: string; zIndex: number; visible: boolean; children: number }>;
		} {
		const layers = this.getAllLayers().map(layer => ({
			name: layer.name,
			zIndex: layer.zIndex,
			visible: layer.visible,
			children: layer.container.children.length,
		}));

		return {
			layerCount: this.layers.size,
			layers,
		};
	}
}
