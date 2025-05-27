export function displayTimeRemaining(timeRemaining: number): string {
	if (timeRemaining < 1) {
		return `${Math.round(timeRemaining * 60)} minutes`;
	}
	return `${timeRemaining.toFixed(1)} hours`;
}