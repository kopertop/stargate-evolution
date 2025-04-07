import { z } from 'zod';

// HUD UI properties schema
export const HUDProperties = z.object({
	showControls: z.boolean().default(false),
	showStatus: z.boolean().default(true),
	showInteractionHints: z.boolean().default(true),
	opacity: z.number().min(0).max(1).default(0.8),
});

export type HUDProperties = z.infer<typeof HUDProperties>;

// Movement tutorial props
export interface MovementTutorialProps {
	visible: boolean;
	onDismiss: () => void;
}

// Help reminder props
export interface HelpReminderProps {
	visible: boolean;
	onDismiss: () => void;
}
