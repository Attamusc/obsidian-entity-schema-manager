import { App, TFile } from '../mocks/obsidian-api';
import { EntityScanner } from '../../src/entity-scanner';
import { testSchemas, testFrontmatter } from '../fixtures/test-schemas';

describe('EntityScanner', () => {
  let app: App;
  let scanner: EntityScanner;

  beforeEach(() => {
    app = new App();
    scanner = new EntityScanner(app);
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
      
      const instances = await scanner.scanEntities(testSchemas);
      
      expect(instances).toHaveLength(2);
      expect(instances.some(e => e.entityType === 'Person')).toBe(true);
      expect(instances.some(e => e.entityType === 'Team')).toBe(true);
      expect(instances.some(e => e.file.path === 'atlas/notes/john.md')).toBe(true);
      expect(instances.some(e => e.file.path === 'atlas/notes/team.md')).toBe(true);
    });

    test('should skip files without frontmatter', async () => {
      const file = new TFile('atlas/notes/no-frontmatter.md');
      app.vault.addFile(file);
      
      // No frontmatter cache entry
      app.metadataCache.setFileCache(file, null);
      
      const instances = await scanner.scanEntities(testSchemas);
      
      expect(instances).toHaveLength(0);
    });

    test('should skip files with empty frontmatter', async () => {
      const file = new TFile('atlas/notes/empty-frontmatter.md');
      app.vault.addFile(file);
      
      app.metadataCache.setFileCache(file, {
        frontmatter: {}
      });
      
      const instances = await scanner.scanEntities(testSchemas);
      
      expect(instances).toHaveLength(0);
    });

    test('should match only first applicable schema', async () => {
      const file = new TFile('atlas/notes/multi-match.md');
      app.vault.addFile(file);
      
      app.metadataCache.setFileCache(file, {
        frontmatter: {
          name: 'Test Entity',
          is: 'atlas/entities/person'
        }
      });
      
      const instances = await scanner.scanEntities(testSchemas);
      
      expect(instances).toHaveLength(1);
      expect(instances[0].entityType).toBe('Person');
    });
  });

  describe('getEntityInstances', () => {
    test('should return current entity instances', async () => {
      const personFile = new TFile('atlas/notes/john.md');
      app.vault.addFile(personFile);
      
      app.metadataCache.setFileCache(personFile, {
        frontmatter: testFrontmatter.validPersonEntity
      });
      
      await scanner.scanEntities(testSchemas);
      
      const instances = scanner.getEntityInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].entityType).toBe('Person');
    });
  });

  describe('getValidationSummary', () => {
    test('should return validation summary', async () => {
      const validFile = new TFile('atlas/notes/valid.md');
      const invalidFile = new TFile('atlas/notes/invalid.md');
      
      app.vault.addFile(validFile);
      app.vault.addFile(invalidFile);
      
      app.metadataCache.setFileCache(validFile, {
        frontmatter: testFrontmatter.validPersonEntity
      });
      app.metadataCache.setFileCache(invalidFile, {
        frontmatter: { name: 'Invalid Person' } // Missing required 'is' property
      });
      
      await scanner.scanEntities(testSchemas);
      
      const summary = scanner.getValidationSummary();
      
      expect(summary.total).toBe(1); // Only valid file matches schema
      expect(summary.valid).toBe(1);
      expect(summary.issues).toHaveLength(0);
    });
  });

  describe('getEntitiesWithDrift', () => {
    test('should return entities with missing properties', async () => {
      const file = new TFile('atlas/notes/person.md');
      app.vault.addFile(file);
      
      // Create entity with missing required property
      const modifiedSchema = {
        ...testSchemas[0],
        properties: {
          ...testSchemas[0].properties,
          required_new_prop: { type: 'string' as const, required: true }
        }
      };
      
      app.metadataCache.setFileCache(file, {
        frontmatter: testFrontmatter.validPersonEntity
      });
      
      await scanner.scanEntities([modifiedSchema]);
      
      const driftEntities = scanner.getEntitiesWithDrift();
      expect(driftEntities).toHaveLength(1);
      expect(driftEntities[0].missingProperties).toContain('required_new_prop');
    });
  });

  describe('getEntitiesByType', () => {
    test('should return entities of specified type', async () => {
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
      
      await scanner.scanEntities(testSchemas);
      
      const personEntities = scanner.getEntitiesByType('Person');
      const teamEntities = scanner.getEntitiesByType('Team');
      
      expect(personEntities).toHaveLength(1);
      expect(teamEntities).toHaveLength(1);
      expect(personEntities[0].entityType).toBe('Person');
      expect(teamEntities[0].entityType).toBe('Team');
    });
  });
});