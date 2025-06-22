import React from 'react';
import { Modal, Alert } from 'react-bootstrap';

// Room exploration component removed - focusing on Admin functionality only
// If room exploration functionality is needed later, it should use direct API calls instead of LiveStore

interface RoomExplorationProps {
	showModal: boolean;
	onClose: () => void;
}

export const RoomExploration: React.FC<RoomExplorationProps> = ({ showModal, onClose }) => {
	return (
		<Modal show={showModal} onHide={onClose} centered>
			<Modal.Header closeButton>
				<Modal.Title>Room Exploration</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Alert variant="info">
					<h6>Room Exploration Unavailable</h6>
					<p>Room exploration functionality has been removed to focus on Admin components.</p>
				</Alert>
			</Modal.Body>
		</Modal>
	);
};
