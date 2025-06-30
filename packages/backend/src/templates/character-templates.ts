import { D1Database } from '@cloudflare/workers-types';
import { Character, CharacterSchema } from '@stargate/common';

export async function getCharacterTemplateById(db: D1Database, characterId: string): Promise<Character | null> {
	const result = await db.prepare('SELECT * FROM characters WHERE id = ?').bind(characterId).first();
	if (!result) return null;
    
	const validationResult = CharacterSchema.safeParse(result);
	if (!validationResult.success) {
		console.error('Invalid character data:', validationResult.error);
		return null;
	}
	return validationResult.data;
}

export async function createCharacterTemplate(db: D1Database, character: Character): Promise<void> {
	await db.prepare(`
        INSERT INTO characters (id, user_id, name, role, race_template_id, progression, description, image, current_room_id, health, hunger, thirst, fatigue, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
		character.id,
		character.user_id,
		character.name,
		character.role,
		character.race_template_id,
		JSON.stringify(character.progression),
		character.description,
		character.image,
		character.current_room_id,
		character.health,
		character.hunger,
		character.thirst,
		character.fatigue,
		character.created_at,
		character.updated_at,
	).run();
}

export async function updateCharacterTemplate(db: D1Database, characterId: string, updates: Partial<Character>): Promise<void> {
	const setParts: string[] = [];
	const values: any[] = [];
    
	if (updates.progression !== undefined) {
		setParts.push('progression = ?');
		values.push(JSON.stringify(updates.progression));
	}
	if (updates.health !== undefined) {
		setParts.push('health = ?');
		values.push(updates.health);
	}
	if (updates.hunger !== undefined) {
		setParts.push('hunger = ?');
		values.push(updates.hunger);
	}
	if (updates.thirst !== undefined) {
		setParts.push('thirst = ?');
		values.push(updates.thirst);
	}
	if (updates.fatigue !== undefined) {
		setParts.push('fatigue = ?');
		values.push(updates.fatigue);
	}
	if (updates.current_room_id !== undefined) {
		setParts.push('current_room_id = ?');
		values.push(updates.current_room_id);
	}
    
	if (setParts.length === 0) return;
    
	setParts.push('updated_at = ?');
	values.push(Date.now());
	values.push(characterId);
    
	await db.prepare(`UPDATE characters SET ${setParts.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function gainExperience(db: D1Database, characterId: string, xp: number): Promise<Character | null> {
	const character = await getCharacterTemplateById(db, characterId);
	if (!character) {
		return null;
	}

	const progression = character.progression;
	progression.total_experience += xp;

	// Simple leveling system: 100 XP per level
	const newLevel = Math.floor(progression.total_experience / 100);
	if (newLevel > progression.current_level) {
		progression.current_level = newLevel;
		// Optionally add logic for skill points or other level-up bonuses here
	}

	await updateCharacterTemplate(db, characterId, { progression });
	return getCharacterTemplateById(db, characterId); // Return updated character
}

export async function updateCharacterSkill(db: D1Database, characterId: string, skillName: string, levelChange: number, experienceChange: number): Promise<Character | null> {
	const character = await getCharacterTemplateById(db, characterId);
	if (!character) {
		return null;
	}

	const progression = character.progression;
	const skill = progression.skills.find(s => s.name === skillName);

	if (skill) {
		skill.level += levelChange;
		skill.experience += experienceChange;
	} else {
		progression.skills.push({ name: skillName, level: levelChange, experience: experienceChange });
	}

	await updateCharacterTemplate(db, characterId, { progression });
	return getCharacterTemplateById(db, characterId); // Return updated character
}