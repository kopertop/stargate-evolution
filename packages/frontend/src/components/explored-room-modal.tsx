import React from 'react';
import { Modal, Alert } from 'react-bootstrap';

// Explored room modal component removed - focusing on Admin functionality only
// If room functionality is needed later, it should use direct API calls instead of LiveStore

interface ExploredRoomModalProps {
	showModal: boolean;
	onClose: () => void;
}

export const ExploredRoomModal: React.FC<ExploredRoomModalProps> = ({ showModal, onClose }) => {
	return (
		<Modal show={showModal} onHide={onClose} centered>
			<Modal.Header closeButton>
				<Modal.Title>Explored Room</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Alert variant="info">
					<h6>Explored Room Details Unavailable</h6>
					<p>Explored room functionality has been removed to focus on Admin components.</p>
				</Alert>
			</Modal.Body>
		</Modal>
	);
};
