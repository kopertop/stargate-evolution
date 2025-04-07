import React from 'react';
import { useInteractionStore } from '../stargate/interaction-store';

export const InteractionHint: React.FC = () => {
	const { interactionHint } = useInteractionStore();

	if (!interactionHint) return null;

	return (
		<div className="interaction-hint">
			{interactionHint}
		</div>
	);
};
