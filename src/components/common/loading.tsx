import React from 'react';

interface LoadingProps {
	size?: 'small' | 'medium' | 'large';
	message?: string;
	fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
	size = 'medium',
	message = 'Loading...',
	fullScreen = false,
}) => {
	const sizes = {
		small: 'w-6 h-6',
		medium: 'w-10 h-10',
		large: 'w-16 h-16',
	};

	const containerClass = fullScreen
		? 'fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50'
		: 'flex flex-col items-center justify-center';

	return (
		<div className={containerClass}>
			<div className="flex flex-col items-center space-y-4">
				<div className={`${sizes[size]} border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin`} />
				{message && <p className="text-center font-medium">{message}</p>}
			</div>
		</div>
	);
};
