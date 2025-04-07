import { create } from 'zustand';

export interface DHDState {
	isActive: boolean;
	isDHDHovered: boolean;
	setIsActive: (isActive: boolean) => void;
	setIsDHDHovered: (isHovered: boolean) => void;
	activateStargate: () => void;
	deactivateStargate: () => void;
}

export const useDHDStore = create<DHDState>((set) => ({
	isActive: false,
	isDHDHovered: false,
	setIsActive: (isActive) => set({ isActive }),
	setIsDHDHovered: (isHovered) => set({ isDHDHovered: isHovered }),
	activateStargate: () => set({ isActive: true }),
	deactivateStargate: () => set({ isActive: false }),
}));
