/**
 * Simple performance timer utility for measuring execution time
 */
export class PerformanceTimer {
	private startTime: number = 0;
	private name: string;

	constructor(name: string = 'Operation') {
		this.name = name;
	}

	/**
	 * Start the timer
	 */
	start(): void {
		this.startTime = performance.now();
	}

	/**
	 * End the timer and optionally log the result
	 * @param log Whether to log the result to the console
	 * @returns The duration in milliseconds
	 */
	end(log: boolean = true): number {
		const endTime = performance.now();
		const duration = endTime - this.startTime;

		if (log) {
			console.log(`${this.name} took ${duration.toFixed(2)}ms`);
		}

		return duration;
	}
}

/**
 * Throttle a function to prevent it from being called too frequently
 * @param fn The function to throttle
 * @param delay The delay in milliseconds
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let lastCall = 0;

	return (...args: Parameters<T>) => {
		const now = Date.now();
		if (now - lastCall >= delay) {
			lastCall = now;
			fn(...args);
		}
	};
}
