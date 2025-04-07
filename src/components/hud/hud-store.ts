import { create } from 'zustand';

interface HUDState {
	showTutorial: boolean;
	showHelp: boolean;
	showHint: boolean;
	hintText: string;
	setShowTutorial: (show: boolean) => void;
	setShowHelp: (show: boolean) => void;
	setHint: (text: string, show: boolean) => void;
}

export const useHUDStore = create<HUDState>((set) => ({
	showTutorial: true,
	showHelp: false,
	showHint: false,
	hintText: '',

	setShowTutorial: (show: boolean) => set({ showTutorial: show }),

	setShowHelp: (show: boolean) => set({ showHelp: show }),

	setHint: (text: string, show: boolean) =>
		set({ hintText: text, showHint: show }),
}));
