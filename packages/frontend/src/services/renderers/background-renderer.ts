import * as PIXI from 'pixi.js';

import type { BackgroundType, BackgroundConfig } from '../../types/game-types';
import type { LayerManager } from '../../types/renderer-types';

/**
 * BackgroundRenderer handles the rendering and animation of background elements
 * including starfields and FTL streaks.
 */
export class BackgroundRenderer {
	private app: PIXI.Application;
	private layerManager: LayerManager;
	private backgroundLayer: PIXI.Container;

	// Background elements
	private starfield: PIXI.Graphics | null = null;
	private ftlStreaksLayer: PIXI.Container | null = null;
	private ftlStreaks: PIXI.Graphics[] = [];

	// State management
	private currentBackgroundType: BackgroundType = 'stars';
	private animationFrame: number = 0;
	private isAnimating: boolean = false;

	// Configuration
	private config: BackgroundConfig = {
		starCount: 200,
		starColor: 0xffffff,
		starRadius: 1.5,
		ftlStreakCount: 100,
		ftlSpeed: 8,
	};

	// Additional FTL configuration
	private ftlConfig = {
		baseLength: 200,
		maxLength: 400,
		baseWidth: 2,
		maxWidth: 3,
		colors: {
			primary: 0x0066ff,
			secondary: 0x66aaff,
		},
		alphaRange: { min: 0.6, max: 1.0 },
		secondaryAlpha: 0.8,
		depthLayers: 3, // Different speed layers for depth effect
	};

	constructor(app: PIXI.Application, layerManager: LayerManager) {
		this.app = app;
		this.layerManager = layerManager;

		// Create or get background layer (lowest z-index)
		this.backgroundLayer = this.layerManager.getLayer('background') || this.layerManager.createLayer('background', 0);

		console.log('[BACKGROUND-RENDERER] Initialized with background layer');

		// Initialize with starfield by default
		this.initializeStarfield();
	}

	/**
	 * Update background configuration
	 */
	updateConfig(newConfig: Partial<BackgroundConfig>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('[BACKGROUND-RENDERER] Updated configuration');

		// Re-initialize current background with new config
		if (this.currentBackgroundType === 'stars') {
			this.initializeStarfield();
		} else {
			this.initializeFTLStreaks();
		}
	}

	/**
	 * Update FTL-specific configuration
	 */
	updateFTLConfig(newConfig: Partial<typeof BackgroundRenderer.prototype.ftlConfig>): void {
		this.ftlConfig = { ...this.ftlConfig, ...newConfig };
		console.log('[BACKGROUND-RENDERER] Updated FTL configuration');

		if (this.currentBackgroundType === 'ftl') {
			this.initializeFTLStreaks();
		}
	}

	/**
	 * Set the background type
	 */
	setBackgroundType(type: BackgroundType): void {
		if (this.currentBackgroundType === type) return;

		console.log(`[BACKGROUND-RENDERER] Switching background from ${this.currentBackgroundType} to ${type}`);
		this.currentBackgroundType = type;

		if (type === 'ftl') {
			// Hide starfield and show FTL streaks
			if (this.starfield) {
				this.starfield.visible = false;
			}

			if (!this.ftlStreaksLayer) {
				this.initializeFTLStreaks();
			} else {
				this.ftlStreaksLayer.visible = true;
			}

			this.startAnimation();
		} else {
			// Show starfield and hide FTL streaks
			if (!this.starfield) {
				this.initializeStarfield();
			} else {
				this.starfield.visible = true;
			}

			if (this.ftlStreaksLayer) {
				this.ftlStreaksLayer.visible = false;
			}

			this.stopAnimation();
		}
	}

	/**
	 * Update background based on FTL status
	 */
	updateFTLStatus(ftlStatus: string): void {
		const backgroundType: BackgroundType = ftlStatus === 'ftl' ? 'ftl' : 'stars';
		this.setBackgroundType(backgroundType);
	}

	/**
	 * Initialize starfield background
	 */
	private initializeStarfield(): void {
		// Remove existing starfield
		if (this.starfield) {
			this.backgroundLayer.removeChild(this.starfield);
			this.starfield.destroy();
		}

		// Create new starfield
		this.starfield = this.createStarfield();
		this.starfield.visible = this.currentBackgroundType === 'stars';
		this.backgroundLayer.addChild(this.starfield);

		console.log(`[BACKGROUND-RENDERER] Initialized starfield with ${this.config.starCount} stars`);
	}

	/**
	 * Create starfield graphics
	 */
	private createStarfield(): PIXI.Graphics {
		const starfield = new PIXI.Graphics();

		for (let i = 0; i < this.config.starCount; i++) {
			const x = Math.random() * 4000 - 2000; // Spread stars over larger area
			const y = Math.random() * 4000 - 2000;
			starfield.circle(x, y, this.config.starRadius).fill(this.config.starColor);
		}

		return starfield;
	}

	/**
	 * Initialize FTL streaks
	 */
	private initializeFTLStreaks(): void {
		// Remove existing FTL streaks
		if (this.ftlStreaksLayer) {
			this.backgroundLayer.removeChild(this.ftlStreaksLayer);
			this.ftlStreaksLayer.destroy();
		}

		// Create new FTL streaks
		this.ftlStreaksLayer = this.createFTLStreaks();
		this.ftlStreaksLayer.visible = this.currentBackgroundType === 'ftl';
		this.backgroundLayer.addChild(this.ftlStreaksLayer);

		console.log(`[BACKGROUND-RENDERER] Initialized FTL streaks with ${this.config.ftlStreakCount} streaks`);
	}

	/**
	 * Create FTL streaks container
	 */
	private createFTLStreaks(): PIXI.Container {
		const container = new PIXI.Container();
		this.ftlStreaks = [];

		for (let i = 0; i < this.config.ftlStreakCount; i++) {
			const streak = this.createSingleFTLStreak(i);
			container.addChild(streak);
			this.ftlStreaks.push(streak);
		}

		return container;
	}

	/**
	 * Create a single FTL streak
	 */
	private createSingleFTLStreak(index: number): PIXI.Graphics {
		const streak = new PIXI.Graphics();

		// Random initial position
		const x = Math.random() * this.app.screen.width;
		const y = Math.random() * this.app.screen.height;

		// Variable streak length and width
		const length = this.ftlConfig.baseLength + Math.random() * this.ftlConfig.maxLength;
		const width = this.ftlConfig.baseWidth + Math.random() * this.ftlConfig.maxWidth;

		// Create primary streak (main blue line)
		const primaryAlpha = this.ftlConfig.alphaRange.min +
			Math.random() * (this.ftlConfig.alphaRange.max - this.ftlConfig.alphaRange.min);

		streak.moveTo(x, y)
			.lineTo(x + length, y)
			.stroke({
				color: this.ftlConfig.colors.primary,
				width: width,
				alpha: primaryAlpha,
			});

		// Add secondary glow effect (lighter blue)
		streak.moveTo(x, y)
			.lineTo(x + length, y)
			.stroke({
				color: this.ftlConfig.colors.secondary,
				width: 1,
				alpha: this.ftlConfig.secondaryAlpha,
			});

		// Store initial position and properties for animation
		(streak as any).initialX = x;
		(streak as any).streakLength = length;
		(streak as any).depthLayer = index % this.ftlConfig.depthLayers; // Assign depth layer

		// Position the streak
		streak.x = 0; // We'll animate the x position
		streak.y = 0;

		return streak;
	}

	/**
	 * Start background animation
	 */
	startAnimation(): void {
		this.isAnimating = true;
		console.log('[BACKGROUND-RENDERER] Started animation');
	}

	/**
	 * Stop background animation
	 */
	stopAnimation(): void {
		this.isAnimating = false;
		console.log('[BACKGROUND-RENDERER] Stopped animation');
	}

	/**
	 * Update animation frame (called from game loop)
	 */
	update(): void {
		if (!this.isAnimating || this.currentBackgroundType !== 'ftl') return;

		this.animationFrame++;
		this.animateFTLStreaks();
	}

	/**
	 * Animate FTL streaks
	 */
	private animateFTLStreaks(): void {
		if (!this.ftlStreaksLayer || this.ftlStreaks.length === 0) return;

		for (let i = 0; i < this.ftlStreaks.length; i++) {
			const streak = this.ftlStreaks[i];
			const depthLayer = (streak as any).depthLayer || 0;

			// Calculate speed based on depth layer for parallax effect
			const speedVariation = 1 + (depthLayer * 0.5); // Different speeds for depth
			const speed = this.config.ftlSpeed * speedVariation;

			// Move streak horizontally
			streak.x -= speed;

			// Reset streak position when it goes off screen
			const streakLength = (streak as any).streakLength || this.ftlConfig.baseLength;
			if (streak.x < -streakLength) {
				// Reset to right side of screen with random Y position
				streak.x = this.app.screen.width + Math.random() * 200;
				streak.y = Math.random() * this.app.screen.height;

				// Occasionally vary the streak properties for visual interest
				if (Math.random() < 0.1) { // 10% chance to regenerate
					this.regenerateStreak(streak, i);
				}
			}
		}
	}

	/**
	 * Regenerate a streak with new properties
	 */
	private regenerateStreak(streak: PIXI.Graphics, index: number): void {
		// Clear existing graphics
		streak.clear();

		// Create new streak with random properties
		const length = this.ftlConfig.baseLength + Math.random() * this.ftlConfig.maxLength;
		const width = this.ftlConfig.baseWidth + Math.random() * this.ftlConfig.maxWidth;
		const primaryAlpha = this.ftlConfig.alphaRange.min +
			Math.random() * (this.ftlConfig.alphaRange.max - this.ftlConfig.alphaRange.min);

		// Draw primary streak
		streak.moveTo(0, 0)
			.lineTo(length, 0)
			.stroke({
				color: this.ftlConfig.colors.primary,
				width: width,
				alpha: primaryAlpha,
			});

		// Draw secondary glow
		streak.moveTo(0, 0)
			.lineTo(length, 0)
			.stroke({
				color: this.ftlConfig.colors.secondary,
				width: 1,
				alpha: this.ftlConfig.secondaryAlpha,
			});

		// Update stored properties
		(streak as any).streakLength = length;
	}

	/**
	 * Get current background type
	 */
	getCurrentBackgroundType(): BackgroundType {
		return this.currentBackgroundType;
	}

	/**
	 * Show/hide background layer
	 */
	setVisible(visible: boolean): void {
		this.layerManager.setLayerVisibility('background', visible);
		console.log(`[BACKGROUND-RENDERER] Set background layer visibility: ${visible}`);
	}

	/**
	 * Clear all background elements
	 */
	clear(): void {
		if (this.backgroundLayer) {
			this.backgroundLayer.removeChildren();
		}

		if (this.starfield) {
			this.starfield.destroy();
			this.starfield = null;
		}

		if (this.ftlStreaksLayer) {
			this.ftlStreaksLayer.destroy();
			this.ftlStreaksLayer = null;
		}

		this.ftlStreaks = [];
		this.stopAnimation();

		console.log('[BACKGROUND-RENDERER] Cleared all background elements');
	}

	/**
	 * Get background rendering statistics
	 */
	getStats(): {
		currentType: BackgroundType;
		isAnimating: boolean;
		starCount: number;
		ftlStreakCount: number;
		animationFrame: number;
		backgroundLayer: string;
		config: BackgroundConfig;
		} {
		return {
			currentType: this.currentBackgroundType,
			isAnimating: this.isAnimating,
			starCount: this.config.starCount,
			ftlStreakCount: this.ftlStreaks.length,
			animationFrame: this.animationFrame,
			backgroundLayer: this.backgroundLayer ? 'available' : 'missing',
			config: { ...this.config },
		};
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.clear();
		console.log('[BACKGROUND-RENDERER] Background renderer destroyed');
	}
}
