import { create } from 'zustand';

interface StargateState {
	isActive: boolean;
	activationStage: number; // 0-4
	isShuttingDown: boolean;
	triggerActivation: () => void;
	triggerShutdown: () => void;
	incrementStage: () => void;
}

export const useStargateStore = create<StargateState>((set) => ({
	isActive: false,
	activationStage: 0,
	isShuttingDown: false,

	triggerActivation: () => set({ isActive: true, isShuttingDown: false }),

	triggerShutdown: () => set((state) => ({
		isShuttingDown: true,
		isActive: state.activationStage === 0 ? false : true, // Only deactivate if already at stage 0
	})),

	incrementStage: () => set((state) => ({
		activationStage: Math.min(4, state.activationStage + 1)
	})),
}));
