/**
 * Touch control utilities for mobile gameplay
 */

import { isMobileDevice } from './mobile-utils';

export interface TouchState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

export interface TouchControlOptions {
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (deltaX: number, deltaY: number, state: TouchState) => void;
  onDragEnd?: (state: TouchState) => void;
  onTap?: (x: number, y: number) => void;
  deadZone?: number; // Minimum movement before drag starts
  tapThreshold?: number; // Maximum movement allowed for tap detection
  tapTimeThreshold?: number; // Maximum time for tap detection (ms)
}

export class TouchControlManager {
  private element: HTMLElement;
  private options: TouchControlOptions;
  private touchState: TouchState;
  private touchStartTime: number = 0;
  private isEnabled: boolean = true;

  constructor(element: HTMLElement, options: TouchControlOptions = {}) {
    this.element = element;
    this.options = {
      deadZone: 10,
      tapThreshold: 20,
      tapTimeThreshold: 300,
      ...options,
    };
    
    this.touchState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Prevent default touch behaviors that interfere with game controls
    this.element.style.touchAction = 'none';
    this.element.style.userSelect = 'none';
    this.element.style.webkitUserSelect = 'none';

    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

    // Mouse events for desktop testing
    if (!isMobileDevice()) {
      this.element.addEventListener('mousedown', this.handleMouseStart.bind(this));
      this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
      this.element.addEventListener('mouseup', this.handleMouseEnd.bind(this));
      this.element.addEventListener('mouseleave', this.handleMouseEnd.bind(this));
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.isEnabled || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    this.startTouch(touch.clientX, touch.clientY);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isEnabled || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    this.moveTouch(touch.clientX, touch.clientY);
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.isEnabled) return;
    
    e.preventDefault();
    this.endTouch();
  }

  private handleMouseStart(e: MouseEvent): void {
    if (!this.isEnabled) return;
    
    e.preventDefault();
    this.startTouch(e.clientX, e.clientY);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isEnabled || !this.touchState.isDragging) return;
    
    e.preventDefault();
    this.moveTouch(e.clientX, e.clientY);
  }

  private handleMouseEnd(e: MouseEvent): void {
    if (!this.isEnabled) return;
    
    e.preventDefault();
    this.endTouch();
  }

  private startTouch(clientX: number, clientY: number): void {
    this.touchStartTime = Date.now();
    this.touchState.startX = clientX;
    this.touchState.startY = clientY;
    this.touchState.currentX = clientX;
    this.touchState.currentY = clientY;
    this.touchState.deltaX = 0;
    this.touchState.deltaY = 0;
    this.touchState.isDragging = false;

    if (this.options.onDragStart) {
      this.options.onDragStart(clientX, clientY);
    }
  }

  private moveTouch(clientX: number, clientY: number): void {
    this.touchState.currentX = clientX;
    this.touchState.currentY = clientY;
    this.touchState.deltaX = clientX - this.touchState.startX;
    this.touchState.deltaY = clientY - this.touchState.startY;

    const distance = Math.sqrt(
      this.touchState.deltaX * this.touchState.deltaX + 
      this.touchState.deltaY * this.touchState.deltaY
    );

    // Start dragging if we've moved beyond the dead zone
    if (!this.touchState.isDragging && distance > (this.options.deadZone || 10)) {
      this.touchState.isDragging = true;
    }

    if (this.touchState.isDragging && this.options.onDragMove) {
      this.options.onDragMove(this.touchState.deltaX, this.touchState.deltaY, { ...this.touchState });
    }
  }

  private endTouch(): void {
    const touchDuration = Date.now() - this.touchStartTime;
    const distance = Math.sqrt(
      this.touchState.deltaX * this.touchState.deltaX + 
      this.touchState.deltaY * this.touchState.deltaY
    );

    // Detect tap vs drag
    const isTap = !this.touchState.isDragging && 
                  distance < (this.options.tapThreshold || 20) && 
                  touchDuration < (this.options.tapTimeThreshold || 300);
    
    console.log('[TOUCH] Touch end - isDragging:', this.touchState.isDragging, 'distance:', distance.toFixed(1), 'duration:', touchDuration, 'isTap:', isTap);
    
    if (isTap) {
      console.log('[TOUCH] Tap detected at:', this.touchState.startX, this.touchState.startY);
      if (this.options.onTap) {
        this.options.onTap(this.touchState.startX, this.touchState.startY);
      }
    } else if (this.touchState.isDragging && this.options.onDragEnd) {
      console.log('[TOUCH] Drag ended');
      this.options.onDragEnd({ ...this.touchState });
    }

    // Reset state
    this.touchState.isDragging = false;
    this.touchState.deltaX = 0;
    this.touchState.deltaY = 0;
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
    this.touchState.isDragging = false;
  }

  public destroy(): void {
    this.disable();
    // Event listeners will be cleaned up when the element is removed from DOM
  }

  public getTouchState(): TouchState {
    return { ...this.touchState };
  }
}

/**
 * Utility functions for touch control calculations
 */
export const TouchUtils = {
  /**
   * Convert touch delta to normalized movement vector
   */
  deltaToMovement(deltaX: number, deltaY: number, sensitivity: number = 1): { x: number; y: number } {
    const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (magnitude === 0) return { x: 0, y: 0 };
    
    const normalizedX = deltaX / magnitude;
    const normalizedY = deltaY / magnitude;
    
    // Apply sensitivity and clamp to [-1, 1]
    return {
      x: Math.max(-1, Math.min(1, normalizedX * sensitivity)),
      y: Math.max(-1, Math.min(1, normalizedY * sensitivity)),
    };
  },

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number, camera: { x: number; y: number; zoom: number }): { x: number; y: number } {
    return {
      x: (screenX - window.innerWidth / 2) / camera.zoom + camera.x,
      y: (screenY - window.innerHeight / 2) / camera.zoom + camera.y,
    };
  },

  /**
   * Check if a touch point is within a circular area
   */
  isWithinCircle(touchX: number, touchY: number, centerX: number, centerY: number, radius: number): boolean {
    const dx = touchX - centerX;
    const dy = touchY - centerY;
    return (dx * dx + dy * dy) <= (radius * radius);
  },

  /**
   * Check if a touch point is within a rectangular area
   */
  isWithinRect(touchX: number, touchY: number, x: number, y: number, width: number, height: number): boolean {
    return touchX >= x && touchX <= x + width && touchY >= y && touchY <= y + height;
  },
};