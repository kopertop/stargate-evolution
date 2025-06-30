import { Character, Progression, Skill } from '@stargate/common';
import Fuse from 'fuse.js';
import React, { useEffect, useState, useMemo } from 'react';
import { Button, Card, Table, Modal, Form, Alert, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaEye, FaSearch, FaRobot } from 'react-icons/fa';
import { toast } from 'react-toastify';


import { apiService } from '../../services/api-service';
import { characterService } from '../../services/character-service';

export const AdminCharacters: React.FC = () => {
	const [characters, setCharacters] = useState<Character[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Character form states
	const [showCharacterModal, setShowCharacterModal] = useState(false);
	const [characterForm, setCharacterForm] = useState<Partial<Character>>({
		progression: { total_experience: 0, current_level: 0, skills: [] },
	});
	const [isNewCharacter, setIsNewCharacter] = useState(false);

	// Search state
	const [characterSearch, setCharacterSearch] = useState('');

	// Fuse.js search instance
	const characterFuse = useMemo(() => {
		if (characters.length === 0) return null;
		return new Fuse(characters, {
			keys: ['name', 'role', 'description'],
			threshold: 0.3,
		});
	}, [characters]);

	// Filtered characters
	const filteredCharacters = useMemo(() => {
		if (!characterSearch.trim()) return characters;
		if (!characterFuse) return [];
		return characterFuse.search(characterSearch).map(result => result.item);
	}, [characters, characterSearch, characterFuse]);

	useEffect(() => {
		loadCharacters();
	}, []);

	const loadCharacters = async () => {
		try {
			setLoading(true);
			setError(null);
			const charactersData = await characterService.getAllCharacters();
			setCharacters(charactersData);
		} catch (err: any) {
			setError(err.message || 'Failed to load characters');
			toast.error(err.message || 'Failed to load characters');
		} finally {
			setLoading(false);
		}
	};

	const handleCreateCharacter = () => {
		setCharacterForm({
			name: '',
			role: '',
			progression: { total_experience: 0, current_level: 0, skills: [] },
			description: '',
			image: '',
			current_room_id: 'gate_room',
			user_id: '', // Will need to be set
			health: 100,
			hunger: 100,
			thirst: 100,
			fatigue: 100,
		});
		setIsNewCharacter(true);
		setShowCharacterModal(true);
	};

	const handleEditCharacter = (character: Character) => {
		setCharacterForm(character);
		setIsNewCharacter(false);
		setShowCharacterModal(true);
	};

	const handleSaveCharacter = async () => {
		try {
			if (isNewCharacter) {
				await characterService.createCharacter(characterForm as Omit<Character, 'id' | 'created_at' | 'updated_at'>);
				toast.success('Character created successfully');
			} else {
				await characterService.updateCharacter(characterForm.id!, characterForm);
				toast.success('Character updated successfully');
			}
			setShowCharacterModal(false);
			loadCharacters();
		} catch (err: any) {
			toast.error(err.message || 'Failed to save character');
		}
	};

	const handleDeleteCharacter = async (character: Character) => {
		if (!confirm(`Are you sure you want to delete character "${character.name}"?`)) {
			return;
		}

		try {
			await characterService.deleteCharacter(character.id);
			toast.success('Character deleted successfully');
			loadCharacters();
		} catch (err: any) {
			toast.error(err.message || 'Failed to delete character');
		}
	};

	const truncateWithTooltip = (text: string | undefined, maxLength: number = 25) => {
		if (!text || text.length <= maxLength) {
			return <span>{text || 'N/A'}</span>;
		}

		const truncated = text.substring(0, maxLength) + '...';
		return (
			<OverlayTrigger
				placement="top"
				overlay={<Tooltip id={`tooltip-${Date.now()}`}>{text}</Tooltip>}
			>
				<span style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
					{truncated}
				</span>
			</OverlayTrigger>
		);
	};

	const renderSkills = (progression: Progression) => {
		if (!progression.skills || progression.skills.length === 0) {
			return <span className="text-muted">No skills</span>;
		}

		const skillsText = progression.skills
			.map(skill => `${skill.name} (${skill.level})`)
			.join(', ');

		return truncateWithTooltip(skillsText, 30);
	};

	if (loading) {
		return (
			<div className="text-center">
				<div className="spinner-border" role="status">
					<span className="visually-hidden">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h1>
					<FaRobot className="me-2" />
					Character Management
				</h1>
				<Button variant="primary" onClick={handleCreateCharacter}>
					<FaPlus className="me-2" />
					Create Character
				</Button>
			</div>

			{error && <Alert variant="danger">{error}</Alert>}

			<Card>
				<Card.Header>
					<div className="d-flex justify-content-between align-items-center">
						<h5 className="mb-0">Characters ({filteredCharacters.length})</h5>
						<InputGroup style={{ width: '300px' }}>
							<InputGroup.Text>
								<FaSearch />
							</InputGroup.Text>
							<Form.Control
								placeholder="Search characters..."
								value={characterSearch}
								onChange={(e) => setCharacterSearch(e.target.value)}
							/>
						</InputGroup>
					</div>
				</Card.Header>
				<Card.Body className="p-0">
					<Table striped hover responsive>
						<thead>
							<tr>
								<th>Name</th>
								<th>Role</th>
								<th>Level</th>
								<th>Experience</th>
								<th>Skills</th>
								<th>Health</th>
								<th>Current Room</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{filteredCharacters.map((character) => (
								<tr key={character.id}>
									<td>
										<div>
											<strong>{character.name}</strong>
											{character.description && (
												<div className="small text-muted">
													{truncateWithTooltip(character.description, 50)}
												</div>
											)}
										</div>
									</td>
									<td>{character.role}</td>
									<td>{character.progression.current_level}</td>
									<td>{character.progression.total_experience}</td>
									<td>{renderSkills(character.progression)}</td>
									<td>
										<span className={character.health < 50 ? 'text-danger' : 'text-success'}>
											{character.health}%
										</span>
									</td>
									<td>
										<code className="small">{character.current_room_id}</code>
									</td>
									<td>
										<div className="btn-group btn-group-sm">
											<Button
												variant="outline-info"
												size="sm"
												onClick={() => handleEditCharacter(character)}
												title="Edit Character"
											>
												<FaEdit />
											</Button>
											<Button
												variant="outline-danger"
												size="sm"
												onClick={() => handleDeleteCharacter(character)}
												title="Delete Character"
											>
												<FaTrash />
											</Button>
										</div>
									</td>
								</tr>
							))}
							{filteredCharacters.length === 0 && (
								<tr>
									<td colSpan={8} className="text-center text-muted">
										{characterSearch ? 'No characters match your search' : 'No characters found'}
									</td>
								</tr>
							)}
						</tbody>
					</Table>
				</Card.Body>
			</Card>

			{/* Character Modal */}
			<Modal show={showCharacterModal} onHide={() => setShowCharacterModal(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>
						{isNewCharacter ? 'Create Character' : 'Edit Character'}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<div className="row">
							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Name</Form.Label>
									<Form.Control
										type="text"
										placeholder="Character name"
										value={characterForm.name || ''}
										onChange={(e) => setCharacterForm({...characterForm, name: e.target.value})}
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Label>Role</Form.Label>
									<Form.Control
										type="text"
										placeholder="Character role"
										value={characterForm.role || ''}
										onChange={(e) => setCharacterForm({...characterForm, role: e.target.value})}
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Label>User ID</Form.Label>
									<Form.Control
										type="text"
										placeholder="User ID"
										value={characterForm.user_id || ''}
										onChange={(e) => setCharacterForm({...characterForm, user_id: e.target.value})}
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Label>Current Room ID</Form.Label>
									<Form.Control
										type="text"
										placeholder="Current room"
										value={characterForm.current_room_id || ''}
										onChange={(e) => setCharacterForm({...characterForm, current_room_id: e.target.value})}
									/>
								</Form.Group>
							</div>

							<div className="col-md-6">
								<Form.Group className="mb-3">
									<Form.Label>Health</Form.Label>
									<Form.Control
										type="number"
										min="0"
										max="100"
										value={characterForm.health || 100}
										onChange={(e) => setCharacterForm({...characterForm, health: parseInt(e.target.value)})}
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Label>Hunger</Form.Label>
									<Form.Control
										type="number"
										min="0"
										max="100"
										value={characterForm.hunger || 100}
										onChange={(e) => setCharacterForm({...characterForm, hunger: parseInt(e.target.value)})}
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Label>Thirst</Form.Label>
									<Form.Control
										type="number"
										min="0"
										max="100"
										value={characterForm.thirst || 100}
										onChange={(e) => setCharacterForm({...characterForm, thirst: parseInt(e.target.value)})}
									/>
								</Form.Group>

								<Form.Group className="mb-3">
									<Form.Label>Fatigue</Form.Label>
									<Form.Control
										type="number"
										min="0"
										max="100"
										value={characterForm.fatigue || 100}
										onChange={(e) => setCharacterForm({...characterForm, fatigue: parseInt(e.target.value)})}
									/>
								</Form.Group>
							</div>
						</div>

						<Form.Group className="mb-3">
							<Form.Label>Description</Form.Label>
							<Form.Control
								as="textarea"
								rows={3}
								placeholder="Character description"
								value={characterForm.description || ''}
								onChange={(e) => setCharacterForm({...characterForm, description: e.target.value})}
							/>
						</Form.Group>

						<Form.Group className="mb-3">
							<Form.Label>Image URL</Form.Label>
							<Form.Control
								type="text"
								placeholder="Character image URL"
								value={characterForm.image || ''}
								onChange={(e) => setCharacterForm({...characterForm, image: e.target.value})}
							/>
						</Form.Group>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowCharacterModal(false)}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSaveCharacter}>
						{isNewCharacter ? 'Create' : 'Save'} Character
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};