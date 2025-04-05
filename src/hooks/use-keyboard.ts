import { useEffect, useState } from 'react';

export function useKeyboard() {
	const [keys, setKeys] = useState<Set<string>>(new Set());

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			setKeys(prev => {
				const newKeys = new Set(prev);
				newKeys.add(e.code);
				return newKeys;
			});
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			setKeys(prev => {
				const newKeys = new Set(prev);
				newKeys.delete(e.code);
				return newKeys;
			});
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	return { keys };
}
