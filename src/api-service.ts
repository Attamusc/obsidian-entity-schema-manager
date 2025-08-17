import { EntitySchemaAPI, EntityTemplate } from './api';
import { EntitySchema, EntityInstance, PropertyDefinition } from './types';
import { EntityScanner } from './entity-scanner';
import { SchemaManager } from './schema-manager';

/**
 * Implementation of the EntitySchemaAPI interface
 * Provides a stable, versioned API for inter-plugin communication
 */
export class EntitySchemaAPIService implements EntitySchemaAPI {
	private entityScanner: EntityScanner;
	private schemaManager: SchemaManager;
	private schemas: EntitySchema[] = [];

	constructor(entityScanner: EntityScanner, schemaManager: SchemaManager) {
		this.entityScanner = entityScanner;
		this.schemaManager = schemaManager;
	}

	/**
	 * Update the internal schemas cache
	 * Should be called whenever schemas are reloaded
	 */
	updateSchemas(schemas: EntitySchema[]): void {
		// Create deep defensive copies to prevent external modification
		this.schemas = schemas.map(schema => ({
			...schema,
			properties: { ...schema.properties },
			matchCriteria: { ...schema.matchCriteria }
		}));
	}

	/**
	 * Get all configured entity schemas
	 */
	getEntitySchemas(): Readonly<EntitySchema[]> {
		// Return defensive copy to prevent external modification
		return this.schemas.map(schema => ({
			...schema,
			properties: { ...schema.properties },
			matchCriteria: { ...schema.matchCriteria }
		}));
	}

	/**
	 * Get list of entity type names only
	 */
	getEntityTypeNames(): string[] {
		return this.schemas.map(schema => schema.name);
	}

	/**
	 * Get all entity instances of a specified type
	 */
	getEntitiesByType(entityType: string): Readonly<EntityInstance[]> {
		if (!entityType || typeof entityType !== 'string') {
			console.warn('EntitySchemaAPI: Invalid entity type provided:', entityType);
			return [];
		}

		const entities = this.entityScanner.getEntitiesByType(entityType);

		// Return defensive copies to prevent external modification
		return entities.map(entity => ({
			...entity,
			properties: { ...entity.properties },
			missingProperties: [...entity.missingProperties]
		}));
	}

	/**
	 * Get template frontmatter structure for creating new entity files
	 */
	getEntityTemplate(entityType: string): Record<string, unknown> {
		if (!entityType || typeof entityType !== 'string') {
			console.warn('EntitySchemaAPI: Invalid entity type provided:', entityType);
			return {};
		}

		const schema = this.schemas.find(s => s.name === entityType);
		if (!schema) {
			console.warn(`EntitySchemaAPI: Entity type "${entityType}" not found`);
			return {};
		}

		const template: Record<string, unknown> = {};

		// Add properties with default values
		for (const [propName, propDef] of Object.entries(schema.properties)) {
			template[propName] = this.getDefaultValueForProperty(propDef);
		}

		// Add required properties from match criteria if not already present
		if (schema.matchCriteria.requiredProperties) {
			for (const propName of schema.matchCriteria.requiredProperties) {
				if (!(propName in template)) {
					template[propName] = this.getDefaultValueForPropertyType('string');
				}
			}
		}

		// Add specific property values from match criteria
		if (schema.matchCriteria.propertyValues) {
			for (const [propName, value] of Object.entries(schema.matchCriteria.propertyValues)) {
				template[propName] = value;
			}
		}

		return template;
	}

	/**
	 * Check if an entity type exists in the configuration
	 */
	hasEntityType(entityType: string): boolean {
		if (!entityType || typeof entityType !== 'string') {
			return false;
		}
		return this.schemas.some(schema => schema.name === entityType);
	}

	/**
	 * Get count of entities for a specific type
	 */
	getEntityCount(entityType: string): number {
		if (!this.hasEntityType(entityType)) {
			return 0;
		}
		return this.entityScanner.getEntitiesByType(entityType).length;
	}

	/**
	 * Get summary statistics for all entity types
	 */
	getEntitySummary(): Record<string, number> {
		const summary: Record<string, number> = {};
		const groupedEntities = this.entityScanner.getEntitiesGroupedByType();

		// Initialize all known types with 0 count
		this.schemas.forEach(schema => {
			summary[schema.name] = 0;
		});

		// Update with actual counts
		Object.entries(groupedEntities).forEach(([entityType, entities]) => {
			summary[entityType] = entities.length;
		});

		return summary;
	}

	/**
	 * Get validation status for entities of a specific type
	 */
	getEntityValidation(entityType: string): {
		total: number;
		valid: number;
		withIssues: number;
		issues: string[];
	} {
		if (!this.hasEntityType(entityType)) {
			return {
				total: 0,
				valid: 0,
				withIssues: 0,
				issues: []
			};
		}

		const entities = this.entityScanner.getEntitiesByType(entityType);
		const issues: string[] = [];
		let validCount = 0;
		let withIssuesCount = 0;

		entities.forEach(entity => {
			if (entity.missingProperties.length === 0) {
				validCount++;
			} else {
				withIssuesCount++;
				issues.push(`${entity.file.name}: missing ${entity.missingProperties.join(', ')}`);
			}
		});

		return {
			total: entities.length,
			valid: validCount,
			withIssues: withIssuesCount,
			issues
		};
	}

	/**
	 * Get default value for a property definition
	 */
	private getDefaultValueForProperty(propDef: PropertyDefinition): unknown {
		// Use explicit default value if provided
		if (propDef.defaultValue !== undefined) {
			return propDef.defaultValue;
		}

		// Generate appropriate default based on type
		return this.getDefaultValueForPropertyType(propDef.type);
	}

	/**
	 * Get default value for a property type
	 */
	private getDefaultValueForPropertyType(type: string): unknown {
		switch (type) {
			case 'string':
				return '';
			case 'number':
				return 0;
			case 'boolean':
				return false;
			case 'array':
				return [];
			case 'object':
				return {};
			default:
				return null;
		}
	}

	/**
	 * Get detailed template information for entity creation
	 */
	getDetailedEntityTemplate(entityType: string): EntityTemplate | null {
		if (!this.hasEntityType(entityType)) {
			return null;
		}

		const schema = this.schemas.find(s => s.name === entityType);
		if (!schema) {
			return null;
		}
		const frontmatter = this.getEntityTemplate(entityType);

		const requiredProperties: string[] = [];
		const optionalProperties: string[] = [];

		// Categorize properties
		Object.entries(schema.properties).forEach(([propName, propDef]) => {
			if (propDef.required) {
				requiredProperties.push(propName);
			} else {
				optionalProperties.push(propName);
			}
		});

		// Add match criteria required properties
		if (schema.matchCriteria.requiredProperties) {
			schema.matchCriteria.requiredProperties.forEach(propName => {
				if (!requiredProperties.includes(propName)) {
					requiredProperties.push(propName);
				}
			});
		}

		return {
			entityType,
			frontmatter,
			requiredProperties,
			optionalProperties
		};
	}
}
