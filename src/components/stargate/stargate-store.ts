import { create } from 'zustand';

export interface StargateState {
	isActive: boolean;
	activationStage: number;
	isShuttingDown: boolean;
	currentDestination: string;
	activationSound: HTMLAudioElement | null;
	setIsActive: (isActive: boolean) => void;
	setActivationStage: (stage: number) => void;
	setIsShuttingDown: (isShuttingDown: boolean) => void;
	setCurrentDestination: (destination: string) => void;
	triggerActivation: () => void;
	triggerShutdown: () => void;
	incrementStage: () => void;
}

export const useStargateStore = create<StargateState>((set) => {
	// Initialize the audio element if in browser
	let activationSound: HTMLAudioElement | null = null;

	if (typeof window !== 'undefined') {
		activationSound = new Audio('/sounds/stargate-activation.mp3');
		activationSound.volume = 0.5;
	}

	return {
		isActive: false,
		activationStage: 0,
		isShuttingDown: false,
		currentDestination: 'Unknown',
		activationSound,

		setIsActive: (isActive) => set({ isActive }),
		setActivationStage: (stage) => set({ activationStage: stage }),
		setIsShuttingDown: (isShuttingDown) => set({ isShuttingDown }),
		setCurrentDestination: (destination) => set({ currentDestination: destination }),

		triggerActivation: () => set({ isActive: true, isShuttingDown: false }),
		triggerShutdown: () => set({ isActive: false, isShuttingDown: true }),
		incrementStage: () => set((state) => ({ activationStage: Math.min(state.activationStage + 1, 9) })),
	};
});
