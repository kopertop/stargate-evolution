import { create } from 'zustand';

interface InteractionState {
	interactableObject: string | null;
	interactionHint: string;
	canInteract: boolean;
	setInteractable: (object: string | null, hint: string) => void;
	clearInteraction: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
	interactableObject: null,
	interactionHint: '',
	canInteract: false,

	setInteractable: (object, hint) => set({
		interactableObject: object,
		interactionHint: hint,
		canInteract: object !== null,
	}),

	clearInteraction: () => set({
		interactableObject: null,
		interactionHint: '',
		canInteract: false,
	}),
}));
