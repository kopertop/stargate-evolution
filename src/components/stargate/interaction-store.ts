import { create } from 'zustand';

export interface InteractionState {
	interactableObject: string | null;
	interactionHint: string;
	isNearDHD: boolean;
	isNearStargate: boolean;
	setInteractableObject: (object: string | null) => void;
	setInteractionHint: (hint: string) => void;
	setIsNearDHD: (isNear: boolean) => void;
	setIsNearStargate: (isNear: boolean) => void;
	clearInteractions: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
	interactableObject: null,
	interactionHint: '',
	isNearDHD: false,
	isNearStargate: false,
	setInteractableObject: (object) => set({ interactableObject: object }),
	setInteractionHint: (hint) => set({ interactionHint: hint }),
	setIsNearDHD: (isNear) => set({ isNearDHD: isNear }),
	setIsNearStargate: (isNear) => set({ isNearStargate: isNear }),
	clearInteractions: () => set({
		interactableObject: null,
		interactionHint: '',
		isNearDHD: false,
		isNearStargate: false
	})
}));
