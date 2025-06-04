import { useQuery } from '@livestore/react';
import { RoomTemplate, TechnologyTemplate, RoomTechnology } from '@stargate/common';
import { title as titleCase } from 'case';
import React, { useState, useEffect } from 'react';
import { Modal, Alert, Badge, Button, Row, Col, Card } from 'react-bootstrap';
import { GiCog, GiTechnoHeart, GiStarGate } from 'react-icons/gi';

import { apiService } from '../services/api-service';
import { useGameService } from '../services/game-service';

interface ExploredRoomModalProps {
	room: RoomTemplate | null;
	showModal: boolean;
	onClose: () => void;
}

export const ExploredRoomModal: React.FC<ExploredRoomModalProps> = ({
	room,
	showModal,
	onClose,
}) => {
	const [technologies, setTechnologies] = useState<RoomTechnology[]>([]);
	const [technologyTemplates, setTechnologyTemplates] = useState<Record<string, TechnologyTemplate>>({});
	const [isLoading, setIsLoading] = useState(false);

	const gameService = useGameService();

	// Fetch room technology when modal opens
	useEffect(() => {
		if (showModal && room) {
			fetchRoomTechnology();
		}
	}, [showModal, room]);

	const fetchRoomTechnology = async () => {
		if (!room) return;

		setIsLoading(true);
		try {
			// Fetch technologies for this room type
			const roomTech = await apiService.getTechnologyForRoom(room.type);
			setTechnologies(roomTech);

			// Fetch technology template details
			const templateIds = [...new Set(roomTech.map(t => t.technology_template_id))];
			const templates: Record<string, TechnologyTemplate> = {};

			await Promise.all(
				templateIds.map(async (id) => {
					try {
						const allTemplates = await apiService.getAllTechnologyTemplates();
						const template = allTemplates.find(t => t.id === id);
						if (template) {
							templates[id] = template;
						}
					} catch (error) {
						console.warn(`Failed to fetch technology template ${id}:`, error);
					}
				}),
			);

			setTechnologyTemplates(templates);
		} catch (error) {
			console.error('Failed to fetch room technology:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const renderRoomActions = () => {
		if (!room) return null;

		// Room-specific actions
		switch (room.type) {
		case 'gate_room':
			return (
				<Card className="mt-3">
					<Card.Header>
						<GiStarGate className="me-2" />
							Stargate Operations
					</Card.Header>
					<Card.Body>
						<Alert variant="info">
							<strong>Stargate Status:</strong> {room.status === 'ok' ? 'Online' : 'Offline'}
						</Alert>
						<Button variant="primary" disabled>
							<GiStarGate className="me-2" />
								Send Expedition (Coming Soon)
						</Button>
						<div className="mt-2">
							<small className="text-muted">
									Future feature: Send expeditions to discovered planets and star systems
							</small>
						</div>
					</Card.Body>
				</Card>
			);

		case 'laboratory':
			return (
				<Card className="mt-3">
					<Card.Header>
						<GiCog className="me-2" />
							Laboratory Operations
					</Card.Header>
					<Card.Body>
						<Button variant="primary" disabled>
							<GiTechnoHeart className="me-2" />
								Research Technology (Coming Soon)
						</Button>
						<div className="mt-2">
							<small className="text-muted">
									Future feature: Research new technologies and upgrades
							</small>
						</div>
					</Card.Body>
				</Card>
			);

		default:
			return null;
		}
	};

	if (!room) return null;

	const roomName = room.name || titleCase(room.type);

	return (
		<Modal show={showModal} onHide={onClose} size="lg">
			<Modal.Header closeButton>
				<Modal.Title>
					<GiTechnoHeart className="me-2" />
					{roomName} - Explored
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Row>
					<Col md={12}>
						<Alert variant="success">
							<strong>✅ Room Status:</strong> Fully Explored
						</Alert>

						<h5>
							<GiTechnoHeart className="me-2" />
							Technology Discovered
						</h5>

						{isLoading ? (
							<Alert variant="info">Loading technology data...</Alert>
						) : technologies.length > 0 ? (
							<div className="mb-3">
								{technologies.map((tech, index) => {
									const template = technologyTemplates[tech.technology_template_id];
									return (
										<Card key={index} className="mb-2">
											<Card.Body className="py-2">
												<div className="d-flex justify-content-between align-items-center">
													<div>
														<strong>{template?.name || tech.technology_template_id}</strong>
														{tech.count > 1 && (
															<Badge bg="primary" className="ms-2">
																×{tech.count}
															</Badge>
														)}
														<div className="text-muted small">
															{tech.description || template?.description || 'No description available'}
														</div>
													</div>
													<Badge bg="success">Discovered</Badge>
												</div>
											</Card.Body>
										</Card>
									);
								})}
							</div>
						) : (
							<Alert variant="warning">
								No technology discovered in this room.
							</Alert>
						)}

						{/* Room-specific actions */}
						{renderRoomActions()}
					</Col>
				</Row>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="secondary" onClick={onClose}>
					Close
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
