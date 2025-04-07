import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
		};
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error('Error caught by ErrorBoundary:', error, errorInfo);

		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
					<h2 className="text-lg font-bold mb-2">Something went wrong</h2>
					<p className="mb-2">Please try reloading the page.</p>
					{this.state.error && (
						<details className="mt-2">
							<summary className="cursor-pointer font-medium">Error details</summary>
							<pre className="mt-2 p-2 bg-red-50 overflow-auto text-sm">
								{this.state.error.toString()}
							</pre>
						</details>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}
