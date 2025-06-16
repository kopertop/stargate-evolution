export function displayTimeRemaining(timeRemaining: number): string {
	if (!timeRemaining) return '0 minutes';
	if (timeRemaining < 1) {
		return `${Math.round(timeRemaining * 60)} minutes`;
	}
	return `${timeRemaining.toFixed(1)} hours`;
}
