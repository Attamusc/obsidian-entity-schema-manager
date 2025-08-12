import { EntitySchema, EntityInstance } from './types';

/**
 * Public API interface for inter-plugin communication
 * Provides access to entity schemas and instances for external plugins like Templater
 */
export interface EntitySchemaAPI {
	/**
	 * Get all configured entity schemas
	 * @returns Array of entity schemas with complete configuration
	 */
	getEntitySchemas(): Readonly<EntitySchema[]>;

	/**
	 * Get list of entity type names only
	 * @returns Array of entity type names for UI selection
	 */
	getEntityTypeNames(): string[];

	/**
	 * Get all entity instances of a specified type
	 * @param entityType - The entity type name to filter by
	 * @returns Array of entity instances matching the type
	 */
	getEntitiesByType(entityType: string): Readonly<EntityInstance[]>;

	/**
	 * Get template frontmatter structure for creating new entity files
	 * @param entityType - The entity type to generate template for
	 * @returns Object with property names and default values for frontmatter
	 */
	getEntityTemplate(entityType: string): Record<string, unknown>;

	/**
	 * Check if an entity type exists in the configuration
	 * @param entityType - The entity type name to check
	 * @returns True if entity type exists, false otherwise
	 */
	hasEntityType(entityType: string): boolean;

	/**
	 * Get count of entities for a specific type
	 * @param entityType - The entity type name to count
	 * @returns Number of entities of the specified type
	 */
	getEntityCount(entityType: string): number;

	/**
	 * Get summary statistics for all entity types
	 * @returns Object with entity type names as keys and counts as values
	 */
	getEntitySummary(): Record<string, number>;

	/**
	 * Get validation status for entities of a specific type
	 * @param entityType - The entity type to validate
	 * @returns Object with validation statistics
	 */
	getEntityValidation(entityType: string): {
		total: number;
		valid: number;
		withIssues: number;
		issues: string[];
	};
}

/**
 * Template data structure for entity creation
 */
export interface EntityTemplate {
	entityType: string;
	frontmatter: Record<string, unknown>;
	requiredProperties: string[];
	optionalProperties: string[];
}

/**
 * API version information
 */
export interface APIVersion {
	version: string;
	pluginVersion: string;
	compatible: string[];
}

/**
 * Global window declaration for API exposure
 */
declare global {
	interface Window {
		'entity-schema-manager.api.v1'?: EntitySchemaAPI;
	}
}

/**
 * Utility function to access the Entity Schema Manager API
 * @returns EntitySchemaAPI instance if available, undefined otherwise
 */
export function getEntitySchemaAPI(): EntitySchemaAPI | undefined {
	return window['entity-schema-manager.api.v1'];
}

/**
 * Check if Entity Schema Manager API is available
 * @returns True if API is loaded and available
 */
export function isEntitySchemaAPIAvailable(): boolean {
	return window['entity-schema-manager.api.v1'] !== undefined;
}

/**
 * Wait for Entity Schema Manager API to become available
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves with API or rejects on timeout
 */
export function waitForEntitySchemaAPI(timeout = 5000): Promise<EntitySchemaAPI> {
	return new Promise((resolve, reject) => {
		if (isEntitySchemaAPIAvailable()) {
			const api = getEntitySchemaAPI();
			if (api) {
				resolve(api);
				return;
			}
		}

		let attempts = 0;
		const maxAttempts = timeout / 100;
		
		const checkInterval = setInterval(() => {
			attempts++;
			
			if (isEntitySchemaAPIAvailable()) {
				clearInterval(checkInterval);
				const api = getEntitySchemaAPI();
				if (api) {
					resolve(api);
				} else {
					reject(new Error('Entity Schema Manager API not available after timeout'));
				}
			} else if (attempts >= maxAttempts) {
				clearInterval(checkInterval);
				reject(new Error('Entity Schema Manager API not available after timeout'));
			}
		}, 100);
	});
}