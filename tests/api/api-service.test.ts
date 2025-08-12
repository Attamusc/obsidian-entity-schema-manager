import { EntitySchemaAPIService } from '../../src/api-service';
import { EntityScanner } from '../../src/entity-scanner';
import { SchemaManager } from '../../src/schema-manager';
import { MockApp } from '../mocks/obsidian-api';
import { testSchemas, createMockTFile } from '../fixtures/test-schemas';

describe('EntitySchemaAPIService', () => {
	let apiService: EntitySchemaAPIService;
	let entityScanner: EntityScanner;
	let schemaManager: SchemaManager;
	let mockApp: MockApp;

	beforeEach(() => {
		mockApp = new MockApp();
		entityScanner = new EntityScanner(mockApp as unknown as App);
		schemaManager = new SchemaManager(mockApp as unknown as App);
		apiService = new EntitySchemaAPIService(entityScanner, schemaManager);
		
		// Update with test schemas
		apiService.updateSchemas(testSchemas);
	});

	describe('getEntitySchemas', () => {
		it('should return readonly copies of schemas', () => {
			const schemas = apiService.getEntitySchemas();
			
			expect(schemas).toHaveLength(testSchemas.length);
			expect(schemas[0].name).toBe('Person');
			
			// Test that returned schemas are defensive copies
			const originalSchema = schemas[0];
			(originalSchema as unknown as { name: string }).name = 'Modified';
			
			const schemasAgain = apiService.getEntitySchemas();
			expect(schemasAgain[0].name).toBe('Person');
		});

		it('should include all schema properties', () => {
			const schemas = apiService.getEntitySchemas();
			const personSchema = schemas.find(s => s.name === 'Person');
			
			expect(personSchema).toBeDefined();
			expect(personSchema!.properties).toBeDefined();
			expect(personSchema!.matchCriteria).toBeDefined();
			expect(personSchema!.description).toBeDefined();
		});
	});

	describe('getEntityTypeNames', () => {
		it('should return array of entity type names', () => {
			const names = apiService.getEntityTypeNames();
			
			expect(names).toEqual(['Person', 'Team', 'Project']);
		});

		it('should return empty array when no schemas configured', () => {
			apiService.updateSchemas([]);
			const names = apiService.getEntityTypeNames();
			
			expect(names).toEqual([]);
		});
	});

	describe('hasEntityType', () => {
		it('should return true for existing entity types', () => {
			expect(apiService.hasEntityType('Person')).toBe(true);
			expect(apiService.hasEntityType('Team')).toBe(true);
			expect(apiService.hasEntityType('Project')).toBe(true);
		});

		it('should return false for non-existing entity types', () => {
			expect(apiService.hasEntityType('NonExistent')).toBe(false);
			expect(apiService.hasEntityType('')).toBe(false);
		});

		it('should handle invalid input gracefully', () => {
			expect(apiService.hasEntityType(null as unknown as string)).toBe(false);
			expect(apiService.hasEntityType(undefined as unknown as string)).toBe(false);
		});
	});

	describe('getEntityTemplate', () => {
		it('should return template with default values for Person', () => {
			const template = apiService.getEntityTemplate('Person');
			
			expect(template).toEqual({
				name: '',
				role: '',
				team: '',
				email: '',
				is: 'atlas/entities/person'
			});
		});

		it('should return template with default values for Team', () => {
			const template = apiService.getEntityTemplate('Team');
			
			expect(template).toEqual({
				name: '',
				members: [],
				lead: '',
				is: 'atlas/entities/team'
			});
		});

		it('should return template with default values for Project', () => {
			const template = apiService.getEntityTemplate('Project');
			
			expect(template).toEqual({
				name: '',
				status: '',
				team: '',
				deadline: '',
				type: 'project'
			});
		});

		it('should return empty object for non-existing entity type', () => {
			const template = apiService.getEntityTemplate('NonExistent');
			
			expect(template).toEqual({});
		});

		it('should handle invalid input gracefully', () => {
			expect(apiService.getEntityTemplate('')).toEqual({});
			expect(apiService.getEntityTemplate(null as unknown as string)).toEqual({});
		});
	});

	describe('getEntitiesByType', () => {
		beforeEach(() => {
			// Setup mock entities
			const mockFiles = [
				createMockTFile('atlas/notes/john.md', { 
					name: 'John Doe', 
					role: 'Developer', 
					is: 'atlas/entities/person' 
				}),
				createMockTFile('atlas/notes/jane.md', { 
					name: 'Jane Smith', 
					role: 'Designer', 
					is: 'atlas/entities/person' 
				}),
				createMockTFile('atlas/notes/backend-team.md', { 
					name: 'Backend Team', 
					members: ['John Doe'], 
					is: 'atlas/entities/team' 
				})
			];

			mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
			
			// Setup metadata cache for each file
			mockFiles.forEach(file => {
				const metadata = (file as any).mockMetadata;
				mockApp.metadataCache.setFileCache(file, metadata);
			});
		});

		it('should return entities filtered by type', async () => {
			await entityScanner.scanEntities(testSchemas);
			
			const personEntities = apiService.getEntitiesByType('Person');
			const teamEntities = apiService.getEntitiesByType('Team');
			
			expect(personEntities).toHaveLength(2);
			expect(teamEntities).toHaveLength(1);
			
			expect(personEntities[0].properties.name).toBe('John Doe');
			expect(teamEntities[0].properties.name).toBe('Backend Team');
		});

		it('should return defensive copies of entities', async () => {
			await entityScanner.scanEntities(testSchemas);
			
			const entities = apiService.getEntitiesByType('Person');
			const originalEntity = entities[0];
			
			// Attempt to modify
			(originalEntity.properties as { name: string }).name = 'Modified';
			
			const entitiesAgain = apiService.getEntitiesByType('Person');
			expect(entitiesAgain[0].properties.name).toBe('John Doe');
		});

		it('should return empty array for non-existing type', async () => {
			await entityScanner.scanEntities(testSchemas);
			
			const entities = apiService.getEntitiesByType('NonExistent');
			expect(entities).toEqual([]);
		});

		it('should handle invalid input gracefully', () => {
			const entities1 = apiService.getEntitiesByType('');
			const entities2 = apiService.getEntitiesByType(null as unknown as string);
			
			expect(entities1).toEqual([]);
			expect(entities2).toEqual([]);
		});
	});

	describe('getEntityCount', () => {
		beforeEach(async () => {
			const mockFiles = [
				createMockTFile('atlas/notes/john.md', { 
					name: 'John Doe', 
					is: 'atlas/entities/person' 
				}),
				createMockTFile('atlas/notes/jane.md', { 
					name: 'Jane Smith', 
					is: 'atlas/entities/person' 
				})
			];

			mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
			mockFiles.forEach(file => {
				const metadata = (file as any).mockMetadata;
				mockApp.metadataCache.setFileCache(file, metadata);
			});

			await entityScanner.scanEntities(testSchemas);
		});

		it('should return correct count for existing entity types', () => {
			expect(apiService.getEntityCount('Person')).toBe(2);
			expect(apiService.getEntityCount('Team')).toBe(0);
		});

		it('should return 0 for non-existing entity types', () => {
			expect(apiService.getEntityCount('NonExistent')).toBe(0);
		});
	});

	describe('getEntitySummary', () => {
		beforeEach(async () => {
			const mockFiles = [
				createMockTFile('atlas/notes/john.md', { 
					name: 'John Doe', 
					is: 'atlas/entities/person' 
				}),
				createMockTFile('atlas/notes/backend.md', { 
					name: 'Backend Team', 
					is: 'atlas/entities/team' 
				})
			];

			mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
			mockFiles.forEach(file => {
				const metadata = (file as any).mockMetadata;
				mockApp.metadataCache.setFileCache(file, metadata);
			});

			await entityScanner.scanEntities(testSchemas);
		});

		it('should return summary with all entity types', () => {
			const summary = apiService.getEntitySummary();
			
			expect(summary).toEqual({
				'Person': 1,
				'Team': 1,
				'Project': 0
			});
		});

		it('should include zero counts for types with no entities', () => {
			apiService.updateSchemas([
				...testSchemas,
				{
					name: 'Project',
					properties: { name: { type: 'string', required: true } },
					matchCriteria: { requiredProperties: ['name'] }
				}
			]);

			const summary = apiService.getEntitySummary();
			
			expect(summary.Project).toBe(0);
		});
	});

	describe('getEntityValidation', () => {
		beforeEach(async () => {
			const mockFiles = [
				createMockTFile('atlas/notes/complete.md', { 
					name: 'Complete Person',
					role: 'Developer',
					is: 'atlas/entities/person' 
				}),
				createMockTFile('atlas/notes/incomplete.md', { 
					name: 'Incomplete Person',
					is: 'atlas/entities/person'
					// Missing required 'role' property
				})
			];

			mockApp.vault.getMarkdownFiles.mockReturnValue(mockFiles);
			mockFiles.forEach(file => {
				const metadata = (file as any).mockMetadata;
				mockApp.metadataCache.setFileCache(file, metadata);
			});

			await entityScanner.scanEntities(testSchemas);
		});

		it('should return validation statistics', () => {
			const validation = apiService.getEntityValidation('Person');
			
			expect(validation.total).toBe(2);
			expect(validation.valid).toBe(2); // Both should be valid since role is not required
			expect(validation.withIssues).toBe(0);
			expect(validation.issues).toHaveLength(0);
		});

		it('should return empty stats for non-existing entity type', () => {
			const validation = apiService.getEntityValidation('NonExistent');
			
			expect(validation).toEqual({
				total: 0,
				valid: 0,
				withIssues: 0,
				issues: []
			});
		});
	});

	describe('updateSchemas', () => {
		it('should update internal schemas cache', () => {
			const newSchemas = [{
				name: 'Project',
				properties: { name: { type: 'string', required: true } },
				matchCriteria: { requiredProperties: ['name'] }
			}];

			apiService.updateSchemas(newSchemas);
			
			const entityTypes = apiService.getEntityTypeNames();
			expect(entityTypes).toEqual(['Project']);
		});

		it('should create defensive copy of schemas', () => {
			const newSchemas = [{
				name: 'TestSchema',
				properties: { name: { type: 'string', required: true } },
				matchCriteria: { requiredProperties: ['name'] }
			}];

			apiService.updateSchemas(newSchemas);
			
			// Modify original array
			newSchemas[0].name = 'Modified';
			
			const entityTypes = apiService.getEntityTypeNames();
			expect(entityTypes).toEqual(['TestSchema']);
		});
	});
});