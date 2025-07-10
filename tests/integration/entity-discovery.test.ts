import { App, TFile } from '../mocks/obsidian-api';
import EntitySchemaPlugin from '../../main';
import { SchemaManager } from '../../src/schema-manager';
import { EntityScanner } from '../../src/entity-scanner';
import { BulkOperations } from '../../src/bulk-operations';
import { testSchemas, testFrontmatter } from '../fixtures/test-schemas';

describe('Entity Discovery Integration', () => {
	let app: App;
	let plugin: EntitySchemaPlugin;

	beforeEach(async () => {
		app = new App();
		plugin = new EntitySchemaPlugin(app, {} as any);
		plugin.settings = {
			schemas: testSchemas,
			backupBeforeOperations: true,
			showValidationIndicators: true
		};
		// Initialize components manually instead of using initializeForTesting
		plugin.schemaManager = new SchemaManager(app);
		plugin.entityScanner = new EntityScanner(app);
		plugin.bulkOperations = new BulkOperations(app, () => plugin.settings);
	});

	describe('scanEntities', () => {
		test('should discover all matching entities', async () => {
			// Set up mock files
			const personFile = new TFile('atlas/notes/john.md');
			const teamFile = new TFile('atlas/notes/team.md');
			const nonMatchingFile = new TFile('other/note.md');

			app.vault.addFile(personFile);
			app.vault.addFile(teamFile);
			app.vault.addFile(nonMatchingFile);

			// Set up metadata cache
			app.metadataCache.setFileCache(personFile, {
				frontmatter: testFrontmatter.validPersonEntity
			});
			app.metadataCache.setFileCache(teamFile, {
				frontmatter: testFrontmatter.validTeamEntity
			});
			app.metadataCache.setFileCache(nonMatchingFile, {
				frontmatter: testFrontmatter.nonMatchingEntity
			});

			await plugin.scanEntities();

			const entityInstances = plugin.entityScanner.getEntityInstances();
			expect(entityInstances).toHaveLength(2);
			expect(entityInstances.some(e => e.entityType === 'Person')).toBe(true);
			expect(entityInstances.some(e => e.entityType === 'Team')).toBe(true);
			expect(entityInstances.some(e => e.file.path === 'atlas/notes/john.md')).toBe(true);
			expect(entityInstances.some(e => e.file.path === 'atlas/notes/team.md')).toBe(true);
		});

		test('should identify missing properties', async () => {
			const file = new TFile('atlas/notes/incomplete.md');
			app.vault.addFile(file);

			// Person entity missing required 'is' property
			app.metadataCache.setFileCache(file, {
				frontmatter: {
					name: 'John Doe',
					role: 'Engineer'
					// Missing 'is' property
				}
			});

			await plugin.scanEntities();

			// Should not match any schema due to missing required property
			expect(plugin.entityScanner.getEntityInstances()).toHaveLength(0);
		});

		test('should handle files without frontmatter', async () => {
			const file = new TFile('atlas/notes/no-frontmatter.md');
			app.vault.addFile(file);

			// No frontmatter cache entry
			app.metadataCache.setFileCache(file, null);

			await plugin.scanEntities();

			expect(plugin.entityScanner.getEntityInstances()).toHaveLength(0);
		});

		test('should handle files with empty frontmatter', async () => {
			const file = new TFile('atlas/notes/empty-frontmatter.md');
			app.vault.addFile(file);

			app.metadataCache.setFileCache(file, {
				frontmatter: {}
			});

			await plugin.scanEntities();

			expect(plugin.entityScanner.getEntityInstances()).toHaveLength(0);
		});

		test('should match only first applicable schema', async () => {
			// Create a file that could match multiple schemas
			const file = new TFile('atlas/notes/multi-match.md');
			app.vault.addFile(file);

			app.metadataCache.setFileCache(file, {
				frontmatter: {
					name: 'Test Entity',
					is: 'atlas/entities/person',
					type: 'project' // This would also match Project schema if it were in the right folder
				}
			});

			await plugin.scanEntities();

			// Should only match the first schema (Person)
			const entityInstances = plugin.entityScanner.getEntityInstances();
			expect(entityInstances).toHaveLength(1);
			expect(entityInstances[0].entityType).toBe('Person');
		});

		test('should handle large numbers of files efficiently', async () => {
			// Create many files to test performance
			const fileCount = 100;
			const files = [];

			for (let i = 0; i < fileCount; i++) {
				const file = new TFile(`atlas/notes/person-${i}.md`);
				app.vault.addFile(file);
				files.push(file);

				app.metadataCache.setFileCache(file, {
					frontmatter: {
						name: `Person ${i}`,
						is: 'atlas/entities/person',
						role: 'Test Role'
					}
				});
			}

			const startTime = Date.now();
			await plugin.scanEntities();
			const endTime = Date.now();

			expect(plugin.entityScanner.getEntityInstances()).toHaveLength(fileCount);
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});
	});

	describe('Entity Type Assignment', () => {
		test('should assign correct entity types based on schemas', async () => {
			const personFile = new TFile('atlas/notes/person.md');
			const teamFile = new TFile('atlas/notes/team.md');

			app.vault.addFile(personFile);
			app.vault.addFile(teamFile);

			app.metadataCache.setFileCache(personFile, {
				frontmatter: testFrontmatter.validPersonEntity
			});
			app.metadataCache.setFileCache(teamFile, {
				frontmatter: testFrontmatter.validTeamEntity
			});

			await plugin.scanEntities();

			const entityInstances = plugin.entityScanner.getEntityInstances();
			const personEntity = entityInstances.find(e => e.file.path === 'atlas/notes/person.md');
			const teamEntity = entityInstances.find(e => e.file.path === 'atlas/notes/team.md');

			expect(personEntity?.entityType).toBe('Person');
			expect(teamEntity?.entityType).toBe('Team');
		});

		test('should detect missing properties correctly', async () => {
			const file = new TFile('atlas/notes/person-missing-email.md');
			app.vault.addFile(file);

			app.metadataCache.setFileCache(file, {
				frontmatter: {
					name: 'John Doe',
					is: 'atlas/entities/person'
					// Missing optional email property - should still match
				}
			});

			await plugin.scanEntities();

			const entityInstances = plugin.entityScanner.getEntityInstances();
			expect(entityInstances).toHaveLength(1);
			expect(entityInstances[0].missingProperties).toEqual([]);
		});
	});

	describe('Schema Matching Priority', () => {
		test('should match schemas in order of definition', async () => {
			// Create a schema that could match multiple types
			const ambiguousSchema = {
				name: 'Ambiguous',
				properties: {
					name: { type: 'string' as const, required: true }
				},
				matchCriteria: {
					requiredProperties: ['name'],
					folderPath: 'atlas/notes'
				}
			};

			// Add the ambiguous schema first
			plugin.settings.schemas = [ambiguousSchema, ...testSchemas];

			const file = new TFile('atlas/notes/ambiguous.md');
			app.vault.addFile(file);

			app.metadataCache.setFileCache(file, {
				frontmatter: {
					name: 'Test Entity',
					is: 'atlas/entities/person'
				}
			});

			await plugin.scanEntities();

			// Should match the first schema (Ambiguous) not Person
			const entityInstances = plugin.entityScanner.getEntityInstances();
			expect(entityInstances).toHaveLength(1);
			expect(entityInstances[0].entityType).toBe('Ambiguous');
		});
	});
});
