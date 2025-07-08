import * as PIXI from 'pixi.js';

export interface BackgroundLayerOptions {
    onBackgroundTypeChange?: (newType: 'stars' | 'ftl') => void;
}

export class BackgroundLayer extends PIXI.Container {
    private backgroundLayer: PIXI.Container | null = null;
    private ftlStreaksLayer: PIXI.Container | null = null;
    private starfield: PIXI.Graphics | null = null;
    private currentBackgroundType: 'stars' | 'ftl' = 'stars';
    private ftlStreaks: PIXI.Graphics[] = [];
    private animationFrame: number = 0;
    private options: BackgroundLayerOptions;

    // Constants
    private static readonly STAR_COUNT = 200;
    private static readonly STAR_COLOR = 0xffffff;
    private static readonly STAR_RADIUS = 1.5;

    constructor(options: BackgroundLayerOptions = {}) {
        super();
        this.options = options;
        this.initialize();
    }

    private initialize(): void {
        // Create main background container
        this.backgroundLayer = new PIXI.Container();
        this.addChild(this.backgroundLayer);

        // Create and add starfield by default
        this.starfield = this.createStarfield();
        this.backgroundLayer.addChild(this.starfield);

        console.log('[BACKGROUND] Initialized with starfield');
    }

    private createStarfield(): PIXI.Graphics {
        const starfield = new PIXI.Graphics();
        
        // Create random stars
        for (let i = 0; i < BackgroundLayer.STAR_COUNT; i++) {
            const x = Math.random() * 4000 - 2000; // Spread across large area
            const y = Math.random() * 4000 - 2000;
            
            starfield.circle(x, y, BackgroundLayer.STAR_RADIUS).fill(BackgroundLayer.STAR_COLOR);
        }

        console.log(`[BACKGROUND] Created starfield with ${BackgroundLayer.STAR_COUNT} stars`);
        return starfield;
    }

    private createFTLStreaks(): PIXI.Container {
        const streaksContainer = new PIXI.Container();
        this.ftlStreaks = [];

        // Create 100 FTL streaks
        for (let i = 0; i < 100; i++) {
            const streak = new PIXI.Graphics();
            const length = 200 + Math.random() * 400; // Random length between 200-600px
            const y = Math.random() * 600 - 300; // Spread vertically
            const x = Math.random() * 1200 - 600; // Start position

            // Create gradient effect with multiple lines
            const baseAlpha = 0.3 + Math.random() * 0.4;
            
            // Main streak line
            streak.moveTo(x, y).lineTo(x + length, y).stroke({
                color: 0x4488ff,
                width: 2,
                alpha: baseAlpha
            });

            // Glow effect
            streak.moveTo(x, y).lineTo(x + length, y).stroke({
                color: 0x88aaff,
                width: 4,
                alpha: baseAlpha * 0.5
            });

            // Inner bright line
            streak.moveTo(x, y).lineTo(x + length, y).stroke({
                color: 0xffffff,
                width: 1,
                alpha: baseAlpha * 0.8
            });

            this.ftlStreaks.push(streak);
            streaksContainer.addChild(streak);
        }

        console.log('[BACKGROUND] Created FTL streaks layer with 100 streaks');
        return streaksContainer;
    }

    public setBackgroundType(type: 'stars' | 'ftl'): void {
        if (this.currentBackgroundType === type) {
            return; // No change needed
        }

        console.log(`[BACKGROUND] Switching background from ${this.currentBackgroundType} to ${type}`);
        this.currentBackgroundType = type;

        if (type === 'ftl') {
            // Hide starfield
            if (this.starfield) {
                this.starfield.visible = false;
            }

            // Create FTL streaks layer if it doesn't exist
            if (!this.ftlStreaksLayer) {
                this.ftlStreaksLayer = this.createFTLStreaks();
                // Add at index 0 to ensure it's at the bottom
                this.addChildAt(this.ftlStreaksLayer, 0);
            }

            // Show FTL streaks
            this.ftlStreaksLayer.visible = true;
            this.animationFrame = 0; // Reset animation
        } else {
            // Show starfield
            if (this.starfield) {
                this.starfield.visible = true;
            }

            // Hide FTL streaks
            if (this.ftlStreaksLayer) {
                this.ftlStreaksLayer.visible = false;
            }
        }

        // Notify callback if provided
        if (this.options.onBackgroundTypeChange) {
            this.options.onBackgroundTypeChange(type);
        }
    }

    public updateFTLStatus(ftlStatus: string): void {
        const backgroundType = ftlStatus === 'active' ? 'ftl' : 'stars';
        this.setBackgroundType(backgroundType);
    }

    public getCurrentBackgroundType(): 'stars' | 'ftl' {
        return this.currentBackgroundType;
    }

    public setStarfieldVisible(visible: boolean): void {
        if (this.starfield) {
            this.starfield.visible = visible;
        }
    }

    public update(): void {
        // Only animate if FTL is active and visible
        if (this.currentBackgroundType === 'ftl' && this.ftlStreaksLayer && this.ftlStreaksLayer.visible) {
            this.animateFTLStreaks();
        }
    }

    private animateFTLStreaks(): void {
        if (!this.ftlStreaksLayer || this.ftlStreaks.length === 0) {
            return;
        }

        this.animationFrame++;

        // Animate each FTL streak
        this.ftlStreaks.forEach((streak, index) => {
            const speed = 8 + (index % 3); // Variable speed for depth effect
            streak.x += speed;

            // Reset position when streak goes off-screen
            if (streak.x > 800) {
                streak.x = -600 - Math.random() * 200; // Reset with some randomness
                streak.y = Math.random() * 600 - 300; // Randomize vertical position
            }
        });
    }

    public destroy(): void {
        // Clean up FTL streaks
        if (this.ftlStreaksLayer) {
            this.ftlStreaksLayer.destroy();
            this.ftlStreaksLayer = null;
        }

        // Clean up starfield
        if (this.starfield) {
            this.starfield.destroy();
            this.starfield = null;
        }

        // Clean up background layer
        if (this.backgroundLayer) {
            this.backgroundLayer.destroy();
            this.backgroundLayer = null;
        }

        // Clear arrays
        this.ftlStreaks = [];
        this.animationFrame = 0;

        console.log('[BACKGROUND] Background layer destroyed');
        super.destroy();
    }

    // Development utilities
    public getDebugInfo(): object {
        return {
            currentBackgroundType: this.currentBackgroundType,
            animationFrame: this.animationFrame,
            ftlStreakCount: this.ftlStreaks.length,
            starfieldVisible: this.starfield?.visible || false,
            ftlStreaksVisible: this.ftlStreaksLayer?.visible || false
        };
    }
}