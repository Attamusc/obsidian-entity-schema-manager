import { 
	EntitySchemaUtils, 
	ENTITY_SCHEMA_CONSTANTS, 
	EntitySchemaTypeGuards, 
	TemplaterHelpers 
} from '../../index';

// Mock the API for testing utility functions
const mockAPI = {
	getEntitySchemas: jest.fn(),
	getEntityTypeNames: jest.fn(),
	getEntitiesByType: jest.fn(),
	getEntityTemplate: jest.fn(),
	hasEntityType: jest.fn(),
	getEntityCount: jest.fn(),
	getEntitySummary: jest.fn(),
	getEntityValidation: jest.fn()
};

describe('Index Exports', () => {
	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();
		
		// Clean up global namespace
		delete (window as unknown as { 'entity-schema-manager.api.v1'?: unknown })['entity-schema-manager.api.v1'];
		
		// Reset EntitySchemaUtils internal state
		(EntitySchemaUtils as any).api = null;
	});

	describe('EntitySchemaUtils', () => {
		describe('initialize', () => {
			it('should initialize successfully when API is available', async () => {
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				const result = await EntitySchemaUtils.initialize(100);
				expect(result).toBe(true);
			});

			it('should fail to initialize when API is not available', async () => {
				const result = await EntitySchemaUtils.initialize(100);
				expect(result).toBe(false);
			});
		});

		describe('getEntityTypesForPicker', () => {
			it('should return entity types when API is available', async () => {
				mockAPI.getEntityTypeNames.mockReturnValue(['Person', 'Team']);
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				await EntitySchemaUtils.initialize();
				const types = EntitySchemaUtils.getEntityTypesForPicker();
				
				expect(types).toEqual(['Person', 'Team']);
			});

			it('should return empty array when API is not available', () => {
				const types = EntitySchemaUtils.getEntityTypesForPicker();
				expect(types).toEqual([]);
			});
		});

		describe('getTemplateForEntityType', () => {
			it('should return template when entity type exists', async () => {
				mockAPI.getEntityTemplate.mockReturnValue({ name: '', role: '' });
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				await EntitySchemaUtils.initialize();
				const template = EntitySchemaUtils.getTemplateForEntityType('Person');
				
				expect(template).toEqual({ name: '', role: '' });
			});

			it('should return null when entity type does not exist', async () => {
				mockAPI.getEntityTemplate.mockReturnValue({});
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				await EntitySchemaUtils.initialize();
				const template = EntitySchemaUtils.getTemplateForEntityType('NonExistent');
				
				expect(template).toBeNull();
			});

			it('should return null when API is not available', () => {
				const template = EntitySchemaUtils.getTemplateForEntityType('Person');
				expect(template).toBeNull();
			});
		});

		describe('getEntityFilesForLinking', () => {
			it('should return file paths for linking', async () => {
				const mockEntities = [
					{ file: { path: 'notes/john.md' } },
					{ file: { path: 'notes/jane.md' } }
				];
				mockAPI.getEntitiesByType.mockReturnValue(mockEntities);
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				await EntitySchemaUtils.initialize();
				const files = EntitySchemaUtils.getEntityFilesForLinking('Person');
				
				expect(files).toEqual(['notes/john.md', 'notes/jane.md']);
			});

			it('should return empty array when no entities found', async () => {
				mockAPI.getEntitiesByType.mockReturnValue([]);
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				await EntitySchemaUtils.initialize();
				const files = EntitySchemaUtils.getEntityFilesForLinking('Person');
				
				expect(files).toEqual([]);
			});
		});

		describe('getEntityNamesForDisplay', () => {
			it('should return display names and paths', async () => {
				const mockEntities = [
					{ 
						file: { path: 'notes/john.md', basename: 'john' },
						properties: { name: 'John Doe' }
					},
					{ 
						file: { path: 'notes/jane.md', basename: 'jane' },
						properties: { name: 'Jane Smith' }
					}
				];
				mockAPI.getEntitiesByType.mockReturnValue(mockEntities);
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				await EntitySchemaUtils.initialize();
				const names = EntitySchemaUtils.getEntityNamesForDisplay('Person');
				
				expect(names).toEqual([
					{ name: 'John Doe', path: 'notes/john.md' },
					{ name: 'Jane Smith', path: 'notes/jane.md' }
				]);
			});

			it('should fallback to basename when name property is missing', async () => {
				const mockEntities = [
					{ 
						file: { path: 'notes/john.md', basename: 'john' },
						properties: {}
					}
				];
				mockAPI.getEntitiesByType.mockReturnValue(mockEntities);
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				await EntitySchemaUtils.initialize();
				const names = EntitySchemaUtils.getEntityNamesForDisplay('Person');
				
				expect(names).toEqual([
					{ name: 'john', path: 'notes/john.md' }
				]);
			});
		});
	});

	describe('ENTITY_SCHEMA_CONSTANTS', () => {
		it('should export expected constants', () => {
			expect(ENTITY_SCHEMA_CONSTANTS.API_VERSION).toBe('v1');
			expect(ENTITY_SCHEMA_CONSTANTS.NAMESPACE).toBe('entity-schema-manager.api.v1');
			expect(ENTITY_SCHEMA_CONSTANTS.PLUGIN_ID).toBe('entity-schema-manager');
			expect(ENTITY_SCHEMA_CONSTANTS.DEFAULT_TIMEOUT).toBe(5000);
		});

		it('should export property types', () => {
			expect(ENTITY_SCHEMA_CONSTANTS.PROPERTY_TYPES.STRING).toBe('string');
			expect(ENTITY_SCHEMA_CONSTANTS.PROPERTY_TYPES.NUMBER).toBe('number');
			expect(ENTITY_SCHEMA_CONSTANTS.PROPERTY_TYPES.BOOLEAN).toBe('boolean');
			expect(ENTITY_SCHEMA_CONSTANTS.PROPERTY_TYPES.ARRAY).toBe('array');
			expect(ENTITY_SCHEMA_CONSTANTS.PROPERTY_TYPES.OBJECT).toBe('object');
		});
	});

	describe('EntitySchemaTypeGuards', () => {
		describe('isEntitySchema', () => {
			it('should return true for valid entity schema', () => {
				const validSchema = {
					name: 'Person',
					properties: { name: { type: 'string' } },
					matchCriteria: { requiredProperties: ['name'] }
				};
				
				expect(EntitySchemaTypeGuards.isEntitySchema(validSchema)).toBe(true);
			});

			it('should return false for invalid entity schema', () => {
				expect(EntitySchemaTypeGuards.isEntitySchema(null)).toBe(false);
				expect(EntitySchemaTypeGuards.isEntitySchema({})).toBe(false);
				expect(EntitySchemaTypeGuards.isEntitySchema({ name: 'Test' })).toBe(false);
			});
		});

		describe('isEntityInstance', () => {
			it('should return true for valid entity instance', () => {
				const validInstance = {
					entityType: 'Person',
					properties: { name: 'John' },
					missingProperties: []
				};
				
				expect(EntitySchemaTypeGuards.isEntityInstance(validInstance)).toBe(true);
			});

			it('should return false for invalid entity instance', () => {
				expect(EntitySchemaTypeGuards.isEntityInstance(null)).toBe(false);
				expect(EntitySchemaTypeGuards.isEntityInstance({})).toBe(false);
				expect(EntitySchemaTypeGuards.isEntityInstance({ entityType: 'Person' })).toBe(false);
			});
		});

		describe('isValidAPIResponse', () => {
			it('should return true for valid responses', () => {
				expect(EntitySchemaTypeGuards.isValidAPIResponse([])).toBe(true);
				expect(EntitySchemaTypeGuards.isValidAPIResponse({})).toBe(true);
				expect(EntitySchemaTypeGuards.isValidAPIResponse('test')).toBe(true);
				expect(EntitySchemaTypeGuards.isValidAPIResponse(0)).toBe(true);
				expect(EntitySchemaTypeGuards.isValidAPIResponse(false)).toBe(true);
			});

			it('should return false for invalid responses', () => {
				expect(EntitySchemaTypeGuards.isValidAPIResponse(null)).toBe(false);
				expect(EntitySchemaTypeGuards.isValidAPIResponse(undefined)).toBe(false);
			});
		});
	});

	describe('TemplaterHelpers', () => {
		describe('getEntityTypeSuggesterData', () => {
			it('should return suggester data for entity types', () => {
				mockAPI.getEntityTypeNames.mockReturnValue(['Person', 'Team']);
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				const data = TemplaterHelpers.getEntityTypeSuggesterData();
				
				expect(data).toEqual({
					names: ['Person', 'Team'],
					values: ['Person', 'Team']
				});
			});

			it('should return empty data when API is not available', () => {
				const data = TemplaterHelpers.getEntityTypeSuggesterData();
				
				expect(data).toEqual({
					names: [],
					values: []
				});
			});
		});

		describe('getEntitySuggesterData', () => {
			it('should return suggester data for entities', () => {
				const mockEntities = [
					{ 
						file: { path: 'notes/john.md' },
						properties: { name: 'John Doe' }
					},
					{ 
						file: { path: 'notes/jane.md', basename: 'jane' },
						properties: {}
					}
				];
				mockAPI.getEntitiesByType.mockReturnValue(mockEntities);
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				const data = TemplaterHelpers.getEntitySuggesterData('Person');
				
				expect(data).toEqual({
					names: ['John Doe', 'jane'],
					values: ['notes/john.md', 'notes/jane.md']
				});
			});
		});

		describe('generateFrontmatterYAML', () => {
			it('should generate YAML frontmatter', () => {
				mockAPI.getEntityTemplate.mockReturnValue({
					name: '',
					role: 'Developer',
					tags: [],
					config: {}
				});
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
				
				const yaml = TemplaterHelpers.generateFrontmatterYAML('Person');
				
				expect(yaml).toContain('---');
				expect(yaml).toContain('name: ""');
				expect(yaml).toContain('role: "Developer"');
				expect(yaml).toContain('tags: []');
				expect(yaml).toContain('config: {}');
			});

			it('should return empty frontmatter when API is not available', () => {
				const yaml = TemplaterHelpers.generateFrontmatterYAML('Person');
				expect(yaml).toBe('---\n---\n');
			});
		});
	});
});