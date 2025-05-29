import type { RoomTechnology } from '@stargate/common/src/models/room-technology';
import type { TechnologyTemplate } from '@stargate/common/src/models/technology-template';
import { title as titleCase } from 'case';
import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Card, Badge, Row, Col } from 'react-bootstrap';
import { GiCog, GiPerson, GiCube, GiEyeball, GiStarGate } from 'react-icons/gi';
import { GrTechnology } from 'react-icons/gr';


import type { RoomType } from '../types/model-types';
import { ApiService } from '../utils/api-service';

interface RoomDetailsModalProps {
	show: boolean;
	onHide: () => void;
	room: RoomType | null;
	gameId: string;
}

interface TechnologyWithTemplate {
	roomTechnology: RoomTechnology;
	template: TechnologyTemplate;
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
	show,
	onHide,
	room,
	gameId,
}) => {
	const [technologies, setTechnologies] = useState<TechnologyWithTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch room technology when modal opens
	useEffect(() => {
		if (show && room?.templateId) {
			fetchRoomTechnology();
		}
	}, [show, room?.templateId]);

	const fetchRoomTechnology = async () => {
		if (!room?.templateId) return;

		setIsLoading(true);
		setError(null);

		try {
			// Fetch room technology from backend using template ID
			const roomTech = await ApiService.getRoomTechnology(room.templateId);

			// Fetch technology templates for each technology
			const techWithTemplates: TechnologyWithTemplate[] = [];

			for (const tech of roomTech) {
				try {
					const template = await ApiService.getTechnologyTemplate(tech.technology_template_id);
					techWithTemplates.push({
						roomTechnology: tech,
						template,
					});
				} catch (templateError) {
					console.warn(`Failed to fetch template for technology ${tech.technology_template_id}:`, templateError);
				}
			}

			setTechnologies(techWithTemplates);
		} catch (err: any) {
			console.error('Failed to fetch room technology:', err);
			setError(`Failed to load room technology: ${err.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	// Helper function to get technology category color
	const getCategoryColor = (category: string) => {
		const colors: Record<string, string> = {
			'ship_systems': 'primary',
			'exploration': 'info',
			'medical': 'success',
			'weapons': 'danger',
			'defense': 'warning',
			'research': 'secondary',
			'reconnaissance': 'dark',
		};
		return colors[category] || 'light';
	};
	const getCategoryTextColor = (category: string) => {
		const colors: Record<string, string> = {
			'ship_systems': 'dark',
			'exploration': 'dark',
			'medical': 'dark',
			'weapons': 'dark',
			'defense': 'dark',
			'research': 'dark',
			'reconnaissance': 'light',
		};
		return colors[category] || 'dark';
	};

	// Helper function to get technology category icon
	const getCategoryIcon = (category: string) => {
		switch (category) {
		case 'ship_systems':
			return <GiCog />;
		case 'exploration':
			return <GiCube />;
		case 'reconnaissance':
			return <GiEyeball />;
		case 'stargate':
			return <GiStarGate />;
		default:
			return <GiCog />;
		}
	};

	if (!room) return null;

	const roomName = room.name || titleCase(room.type);

	return (
		<Modal show={show} onHide={onHide} size="lg" centered>
			<Modal.Header closeButton>
				<Modal.Title>
					<GiCube className="me-2" />
					{roomName}
				</Modal.Title>
			</Modal.Header>

			<Modal.Body>
				{/* Room Information */}
				<div className="mb-4">
					<h5>Room Information</h5>
					<p className="text-muted">Room ID: {room.id}</p>
					<div className="d-flex gap-2">
						<Badge bg={room.status === 'ok' ? 'success' : room.status === 'damaged' ? 'warning' : 'danger'}>
							Status: {titleCase(room.status)}
						</Badge>
						{room.explored && <Badge bg="info">Explored</Badge>}
						{room.locked && <Badge bg="secondary">Locked</Badge>}
					</div>
				</div>

				{/* Technology Section */}
				<div className="mb-4">
					<h5>
						<GrTechnology className="me-2" />
						Technology
					</h5>

					{isLoading && (
						<div className="text-center py-3">
							<div className="spinner-border text-primary" role="status">
								<span className="visually-hidden">Loading...</span>
							</div>
							<p className="mt-2">Loading room technology...</p>
						</div>
					)}

					{error && (
						<Alert variant="danger">
							{error}
						</Alert>
					)}

					{!isLoading && !error && technologies.length === 0 && (
						<Alert variant="info">
							No technology found in this room.
						</Alert>
					)}

					{!isLoading && !error && technologies.length > 0 && (
						<Row>
							{technologies.map((tech, index) => (
								<Col md={6} key={index} className="mb-3">
									<Card className="h-100">
										<Card.Body>
											<div className="d-flex justify-content-between align-items-start mb-2">
												<Card.Title className="h6 mb-0">
													{getCategoryIcon(tech.template.category || 'ship_systems')}
													<span className="ms-2">{tech.template.name}</span>
												</Card.Title>
												<Badge
													bg={getCategoryColor(tech.template.category || 'ship_systems')}
													text={getCategoryTextColor(tech.template.category || 'ship_systems')}
												>
													{tech.roomTechnology.count}x
												</Badge>
											</div>
											<Card.Text className="small text-muted">
												{tech.template.description}
											</Card.Text>
											{tech.template.category && (
												<Badge
													bg={getCategoryColor(tech.template.category)}
													text={getCategoryTextColor(tech.template.category)}
													className="small"
												>
													{titleCase(tech.template.category.replace('_', ' '))}
												</Badge>
											)}
										</Card.Body>
									</Card>
								</Col>
							))}
						</Row>
					)}
				</div>

				{/* Crew Section (placeholder for future implementation) */}
				<div className="mb-3">
					<h5>
						<GiPerson className="me-2" />
						Assigned Crew
					</h5>
					<Alert variant="info">
						Crew assignment system coming soon...
					</Alert>
				</div>
			</Modal.Body>

			<Modal.Footer>
				<Button variant="secondary" onClick={onHide}>
					Close
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
