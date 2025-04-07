import { create } from 'zustand';
import { RoomTheme } from '../../types';

interface EnvironmentState {
	currentRoomId: string;
	currentRoomTheme: RoomTheme | null;
	isLoading: boolean;
	setCurrentRoom: (roomId: string, theme: RoomTheme) => void;
	setIsLoading: (isLoading: boolean) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
	currentRoomId: '',
	currentRoomTheme: null,
	isLoading: false,

	setCurrentRoom: (roomId, theme) => set({
		currentRoomId: roomId,
		currentRoomTheme: theme,
	}),

	setIsLoading: (isLoading) => set({ isLoading }),
}));
