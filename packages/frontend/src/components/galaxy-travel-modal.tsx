import type { Galaxy } from '@stargate/common';
import React from 'react';
import { Modal, Button } from 'react-bootstrap';


interface GalaxyTravelModalProps {
	show: boolean;
	onHide: () => void;
	onConfirm: () => void;
	sourceGalaxy: Galaxy | null;
	targetGalaxy: Galaxy | null;
	travelCost: number;
	currentPower: number;
	distance: number;
}

export const GalaxyTravelModal: React.FC<GalaxyTravelModalProps> = ({
	show,
	onHide,
	onConfirm,
	sourceGalaxy,
	targetGalaxy,
	travelCost,
	currentPower,
	distance,
}) => {
	const canAfford = currentPower >= travelCost;

	return (
		<Modal show={show} onHide={onHide} centered size="lg">
			<Modal.Header closeButton style={{ background: '#1a1c2e', borderColor: '#333' }}>
				<Modal.Title className="text-light">
					Intergalactic Travel Confirmation
				</Modal.Title>
			</Modal.Header>
			<Modal.Body style={{ background: '#2a2c3e', color: '#fff' }}>
				<div className="mb-3">
					<h5>Travel Details</h5>
					<div className="row">
						<div className="col-6">
							<strong>From:</strong> {sourceGalaxy?.name || 'Unknown'}
						</div>
						<div className="col-6">
							<strong>To:</strong> {targetGalaxy?.name || 'Unknown'}
						</div>
					</div>
					<div className="row mt-2">
						<div className="col-6">
							<strong>Distance:</strong> {distance.toFixed(0)} light-years
						</div>
						{/*
						<div className="col-6">
							<strong>Systems:</strong> {targetGalaxy?.starSystems.length || 0}
						</div>
						*/}
					</div>
				</div>

				<div className="mb-3">
					<h5>Power Requirements</h5>
					<div className="row">
						<div className="col-6">
							<strong>Current Power:</strong> {currentPower}
						</div>
						<div className="col-6">
							<strong>Travel Cost:</strong>
							<span className={canAfford ? 'text-success' : 'text-danger'}>
								{' '}{travelCost}
							</span>
						</div>
					</div>
					<div className="row mt-2">
						<div className="col-12">
							<strong>Remaining After Travel:</strong>
							<span className={canAfford ? 'text-info' : 'text-danger'}>
								{' '}{canAfford ? currentPower - travelCost : 'INSUFFICIENT POWER'}
							</span>
						</div>
					</div>
				</div>

				{!canAfford && (
					<div className="alert alert-danger">
						<strong>Warning:</strong> Insufficient power for this journey.
						You need {travelCost - currentPower} more power units.
					</div>
				)}

				<div className="text-muted small">
					<p>
						⚠️ Intergalactic travel is dangerous and consumes significant power.
						Make sure you have enough resources before proceeding.
					</p>
				</div>
			</Modal.Body>
			<Modal.Footer style={{ background: '#1a1c2e', borderColor: '#333' }}>
				<Button variant="secondary" onClick={onHide}>
					Cancel
				</Button>
				<Button
					variant={canAfford ? 'primary' : 'danger'}
					onClick={onConfirm}
					disabled={!canAfford}
				>
					{canAfford ? 'Confirm Travel' : 'Insufficient Power'}
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
