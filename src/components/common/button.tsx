import React from 'react';

interface ButtonProps {
	onClick: () => void;
	label: string;
	disabled?: boolean;
	className?: string;
	primary?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
	onClick,
	label,
	disabled = false,
	className = '',
	primary = false,
}) => {
	const baseStyles = 'px-4 py-2 rounded focus:outline-none transition-colors';
	const primaryStyles = primary
		? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300'
		: 'bg-gray-300 text-gray-800 hover:bg-gray-400 disabled:bg-gray-200';

	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`${baseStyles} ${primaryStyles} ${className}`}
		>
			{label}
		</button>
	);
};
