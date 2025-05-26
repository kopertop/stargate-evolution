import DB from '@stargate/db/index';
import Game from '@stargate/db/models/game';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useEffect,
} from 'react';

interface GameStateContextType {
	isPaused: boolean;
	timeSpeed: number;
	currentTime: number;
	togglePause: () => void;
	setTimeSpeed: (speed: number) => void;
	resumeGame: () => void;
	pauseGame: () => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

interface GameStateProviderProps {
	gameId: string;
	children: ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({ gameId, children }) => {
	// Start at normal speed
	const [timeSpeed, setTimeSpeed] = useState(1);
	const [currentTime, setCurrentTime] = useState(0);
	const [game, setGame] = useState<Game | null>(null);

	useEffect(() => {
		DB.get<Game>('games').find(gameId).then((g) => {
			setGame(g);
			setCurrentTime(g.totalTimeProgressed);
		});
	}, [gameId]);

	useEffect(() => {
		if (game && timeSpeed > 0) {
			const interval = setInterval(() => {
				setCurrentTime((prev) => {
					const t = prev + timeSpeed;
					DB.write(async () => {
						await game.update((record) => {
							record.totalTimeProgressed = t;
							record.lastPlayed = new Date();
						});
					});
					return t;
				});
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [game, timeSpeed]);

	const togglePause = useCallback(() => {
		setTimeSpeed(prev => prev === 1 ? 0 : 1);
	}, []);

	const resumeGame = useCallback(() => {
		setTimeSpeed(1);
	}, []);

	const pauseGame = useCallback(() => {
		setTimeSpeed(0);
	}, []);

	const handleSetTimeSpeed = useCallback((speed: number) => {
		setTimeSpeed(speed);
	}, []);

	const value: GameStateContextType = {
		isPaused: timeSpeed === 0,
		currentTime,
		timeSpeed,
		togglePause,
		setTimeSpeed: handleSetTimeSpeed,
		resumeGame,
		pauseGame,
	};

	return (
		<GameStateContext.Provider value={value}>
			{children}
		</GameStateContext.Provider>
	);
};

export const useGameState = (): GameStateContextType => {
	const context = useContext(GameStateContext);
	if (context === undefined) {
		throw new Error('useGameState must be used within a GameStateProvider');
	}
	return context;
};
