/**
 * Entity Schema Manager - Public API Exports
 * 
 * This file provides the public interface for inter-plugin communication.
 * External plugins (like Templater) can import types and utility functions
 * to interact with the Entity Schema Manager.
 * 
 * @example
 * ```typescript
 * import { getEntitySchemaAPI, EntitySchemaAPI } from 'entity-schema-manager';
 * 
 * const api = getEntitySchemaAPI();
 * if (api) {
 *   const entityTypes = api.getEntityTypeNames();
 *   const template = api.getEntityTemplate('Person');
 * }
 * ```
 */

// Core API exports
export type { 
	EntitySchemaAPI, 
	EntityTemplate, 
	APIVersion 
} from './src/api';

export { 
	getEntitySchemaAPI, 
	isEntitySchemaAPIAvailable, 
	waitForEntitySchemaAPI 
} from './src/api';

// Core type exports for external plugins
export type { 
	EntitySchema, 
	EntityInstance, 
	PropertyDefinition, 
	MatchCriteria, 
	ValidationResults 
} from './src/types';

// Import types for use in the utility class
import type { EntitySchemaAPI } from './src/api';
import type { EntitySchema, EntityInstance } from './src/types';
import { getEntitySchemaAPI, waitForEntitySchemaAPI } from './src/api';

// Plugin class export (for advanced usage)
export { default as EntitySchemaPlugin } from './main';

/**
 * Utility class for simplified API access
 * Provides convenience methods for common inter-plugin operations
 */
export class EntitySchemaUtils {
	private static api: EntitySchemaAPI | null = null;

	/**
	 * Initialize the utility with API reference
	 * Call this once when your plugin loads
	 */
	static async initialize(timeout = 5000): Promise<boolean> {
		try {
			this.api = await waitForEntitySchemaAPI(timeout);
			return true;
		} catch (error) {
			console.warn('EntitySchemaUtils: Failed to initialize API:', error);
			return false;
		}
	}

	/**
	 * Get entity types for use in suggester/picker UIs
	 * @returns Array of entity type names, or empty array if API unavailable
	 */
	static getEntityTypesForPicker(): string[] {
		if (!this.api) return [];
		return this.api.getEntityTypeNames();
	}

	/**
	 * Get template data for creating new entity files
	 * @param entityType - The entity type to create template for
	 * @returns Template object with frontmatter, or null if type not found
	 */
	static getTemplateForEntityType(entityType: string): Record<string, unknown> | null {
		if (!this.api || !entityType) return null;
		
		const template = this.api.getEntityTemplate(entityType);
		return Object.keys(template).length > 0 ? template : null;
	}

	/**
	 * Get existing entities for linking/reference
	 * @param entityType - The entity type to filter by
	 * @returns Array of entity file paths for linking
	 */
	static getEntityFilesForLinking(entityType: string): string[] {
		if (!this.api || !entityType) return [];
		
		const entities = this.api.getEntitiesByType(entityType);
		return entities.map((entity: EntityInstance) => entity.file.path);
	}

	/**
	 * Get entity names for display in UIs
	 * @param entityType - The entity type to filter by
	 * @returns Array of entity display names
	 */
	static getEntityNamesForDisplay(entityType: string): { name: string; path: string }[] {
		if (!this.api || !entityType) return [];
		
		const entities = this.api.getEntitiesByType(entityType);
		return entities.map((entity: EntityInstance) => ({
			name: entity.properties.name as string || entity.file.basename,
			path: entity.file.path
		}));
	}

	/**
	 * Validate if an entity type exists
	 * @param entityType - The entity type to check
	 * @returns True if entity type exists
	 */
	static hasEntityType(entityType: string): boolean {
		if (!this.api) return false;
		return this.api.hasEntityType(entityType);
	}

	/**
	 * Get summary of all entity types and counts
	 * @returns Object with entity types as keys and counts as values
	 */
	static getEntitySummary(): Record<string, number> {
		if (!this.api) return {};
		return this.api.getEntitySummary();
	}
}

/**
 * Constants for common use cases
 */
export const ENTITY_SCHEMA_CONSTANTS = {
	API_VERSION: 'v1',
	NAMESPACE: 'entity-schema-manager.api.v1',
	PLUGIN_ID: 'entity-schema-manager',
	
	// Common property types
	PROPERTY_TYPES: {
		STRING: 'string',
		NUMBER: 'number',
		BOOLEAN: 'boolean',
		ARRAY: 'array',
		OBJECT: 'object'
	} as const,
	
	// Default timeout for API operations
	DEFAULT_TIMEOUT: 5000
} as const;

/**
 * Type guards for safe API usage
 */
export const EntitySchemaTypeGuards = {
	/**
	 * Check if value is a valid EntitySchema
	 */
	isEntitySchema(value: unknown): value is EntitySchema {
		return (
			typeof value === 'object' &&
			value !== null &&
			typeof (value as EntitySchema).name === 'string' &&
			typeof (value as EntitySchema).properties === 'object' &&
			typeof (value as EntitySchema).matchCriteria === 'object'
		);
	},

	/**
	 * Check if value is a valid EntityInstance
	 */
	isEntityInstance(value: unknown): value is EntityInstance {
		return (
			typeof value === 'object' &&
			value !== null &&
			typeof (value as EntityInstance).entityType === 'string' &&
			typeof (value as EntityInstance).properties === 'object' &&
			Array.isArray((value as EntityInstance).missingProperties)
		);
	},

	/**
	 * Check if value is a valid API response
	 */
	isValidAPIResponse(value: unknown): boolean {
		return value !== undefined && value !== null;
	}
};

/**
 * Helper functions for Templater integration
 */
export const TemplaterHelpers = {
	/**
	 * Create a suggester-friendly list of entity types
	 * @returns Object with display names and values for tp.system.suggester
	 */
	getEntityTypeSuggesterData(): { names: string[]; values: string[] } {
		const api = getEntitySchemaAPI();
		if (!api) return { names: [], values: [] };
		
		const entityTypes = api.getEntityTypeNames();
		return {
			names: entityTypes,
			values: entityTypes
		};
	},

	/**
	 * Create a suggester-friendly list of entities for a type
	 * @param entityType - The entity type to get entities for
	 * @returns Object with display names and file paths for tp.system.suggester
	 */
	getEntitySuggesterData(entityType: string): { names: string[]; values: string[] } {
		const api = getEntitySchemaAPI();
		if (!api || !entityType) return { names: [], values: [] };
		
		const entities = api.getEntitiesByType(entityType);
		const names = entities.map((e: EntityInstance) => e.properties.name as string || e.file.basename);
		const values = entities.map((e: EntityInstance) => e.file.path);
		
		return { names, values };
	},

	/**
	 * Generate YAML frontmatter string for new entity
	 * @param entityType - The entity type to create frontmatter for
	 * @returns YAML string ready for file creation
	 */
	generateFrontmatterYAML(entityType: string): string {
		const api = getEntitySchemaAPI();
		if (!api || !entityType) return '---\n---\n';
		
		const template = api.getEntityTemplate(entityType);
		const lines = ['---'];
		
		Object.entries(template).forEach(([key, value]) => {
			if (typeof value === 'string') {
				lines.push(`${key}: "${value}"`);
			} else if (Array.isArray(value)) {
				lines.push(`${key}: []`);
			} else if (typeof value === 'object' && value !== null) {
				lines.push(`${key}: {}`);
			} else {
				lines.push(`${key}: ${value}`);
			}
		});
		
		lines.push('---');
		return lines.join('\n');
	}
};

// Re-export the main utility function for convenience
export { waitForEntitySchemaAPI as waitForAPI } from './src/api';