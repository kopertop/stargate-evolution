import React, { useState } from 'react';
import { Modal, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
import { BsArrowUp, BsArrowDown } from 'react-icons/bs';
import { GiElevator, GiStairs } from 'react-icons/gi';

export interface ElevatorConfig {
    accessibleFloors: number[];
    currentFloor: number;
    targetFloor?: number;
}

interface ElevatorConsoleModalProps {
    show: boolean;
    onHide: () => void;
    elevatorConfig: ElevatorConfig | null;
    onFloorSelect: (targetFloor: number) => void;
    focusedMenuItem?: number;
}

export const ElevatorConsoleModal: React.FC<ElevatorConsoleModalProps> = ({
	show,
	onHide,
	elevatorConfig,
	onFloorSelect,
	focusedMenuItem = 0,
}) => {
	const [isTransitioning, setIsTransitioning] = useState(false);
    
	if (!elevatorConfig) return null;

	const { accessibleFloors, currentFloor } = elevatorConfig;
	const sortedFloors = [...accessibleFloors].sort((a, b) => b - a); // Highest floor first

	const handleFloorSelect = async (targetFloor: number) => {
		if (targetFloor !== currentFloor && !isTransitioning) {
			setIsTransitioning(true);
            
			// Add a brief transition delay for visual feedback
			setTimeout(() => {
				onFloorSelect(targetFloor);
				setIsTransitioning(false);
			}, 500); // Half second transition delay
		}
	};

	const getFloorIcon = (floor: number) => {
		if (floor > currentFloor) {
			return <BsArrowUp className="text-success" />;
		} else if (floor < currentFloor) {
			return <BsArrowDown className="text-primary" />;
		} else {
			return <GiStairs className="text-warning" />;
		}
	};

	const getFloorName = (floor: number) => {
		const floorNames: Record<number, string> = {
			0: 'Ground Floor',
			1: 'Level 1',
			2: 'Level 2',
			3: 'Level 3',
			4: 'Level 4',
			5: 'Level 5',
			6: 'Level 6',
			7: 'Level 7',
			8: 'Level 8',
			9: 'Level 9',
			10: 'Level 10',
		};
		return floorNames[floor] || `Floor ${floor}`;
	};

	return (
		<Modal show={show} onHide={!isTransitioning ? onHide : undefined} size="sm" centered>
			<Modal.Header closeButton={!isTransitioning}>
				<Modal.Title>
					<GiElevator className="me-2" />
					{isTransitioning ? 'Transitioning...' : 'Elevator Console'}
				</Modal.Title>
			</Modal.Header>

			<Modal.Body>
				{isTransitioning ? (
					<div className="text-center py-4">
						<Spinner animation="border" variant="primary" className="mb-3" />
						<div>
							<strong>Moving between floors...</strong>
						</div>
						<small className="text-muted">Please wait</small>
					</div>
				) : (
					<>
						<div className="mb-3">
							<small className="text-muted">
                                Current Floor: <Badge bg="info">{getFloorName(currentFloor)}</Badge>
							</small>
						</div>

						<div className="mb-3">
							<h6>Select Destination:</h6>
							<ListGroup>
								{sortedFloors.map((floor, index) => {
									const isCurrentFloor = floor === currentFloor;
									const isFocused = index === focusedMenuItem;
                            
									return (
										<ListGroup.Item
											key={floor}
											action={!isCurrentFloor}
											disabled={isCurrentFloor}
											onClick={() => handleFloorSelect(floor)}
											className={`d-flex justify-content-between align-items-center ${
												isFocused && !isCurrentFloor ? 'list-group-item-primary' : ''
											}`}
											style={{
												cursor: isCurrentFloor ? 'not-allowed' : 'pointer',
												opacity: isCurrentFloor ? 0.6 : 1,
											}}
										>
											<div className="d-flex align-items-center">
												{getFloorIcon(floor)}
												<span className="ms-2">{getFloorName(floor)}</span>
											</div>
											<div>
												{isCurrentFloor && (
													<Badge bg="success" className="ms-2">
                                                Current
													</Badge>
												)}
											</div>
										</ListGroup.Item>
									);
								})}
							</ListGroup>
						</div>

						<div className="text-center">
							<small className="text-muted">
                                Press Enter/A to select • Press Escape/B to cancel
							</small>
						</div>
					</>
				)}
			</Modal.Body>

			{!isTransitioning && (
				<Modal.Footer>
					<Button variant="secondary" onClick={onHide}>
                        Cancel
					</Button>
				</Modal.Footer>
			)}
		</Modal>
	);
};