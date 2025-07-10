import { App, TFile } from '../mocks/obsidian-api';
import { EntityScanner } from '../../src/entity-scanner';
import { testSchemas, testFrontmatter } from '../fixtures/test-schemas';

describe('EntityScanner Private Methods', () => {
  let app: App;
  let scanner: EntityScanner;

  beforeEach(() => {
    app = new App();
    scanner = new EntityScanner(app);
  });

  describe('matchesSchema', () => {
    test('should match valid person entity', () => {
      const file = new TFile('atlas/notes/john.md');
      const schema = testSchemas[0]; // Person schema

      const result = (scanner as any).matchesSchema(file, testFrontmatter.validPersonEntity, schema);

      expect(result).toBe(true);
    });

    test('should match person entity with simple link format', () => {
      const file = new TFile('atlas/notes/jane.md');
      const schema = testSchemas[0]; // Person schema

      const result = (scanner as any).matchesSchema(file, testFrontmatter.validPersonEntitySimpleLink, schema);

      expect(result).toBe(true);
    });

    test('should not match person entity missing required name property', () => {
      const file = new TFile('atlas/notes/invalid.md');
      const schema = testSchemas[0]; // Person schema

      const result = (scanner as any).matchesSchema(file, testFrontmatter.invalidPersonMissingName, schema);

      expect(result).toBe(false);
    });

    test('should not match person entity missing required "is" property', () => {
      const file = new TFile('atlas/notes/invalid.md');
      const schema = testSchemas[0]; // Person schema

      const result = (scanner as any).matchesSchema(file, testFrontmatter.invalidPersonMissingIs, schema);

      expect(result).toBe(false);
    });

    test('should not match person entity in wrong folder', () => {
      const file = new TFile('wrong-folder/alice.md');
      const schema = testSchemas[0]; // Person schema

      const result = (scanner as any).matchesSchema(file, testFrontmatter.validPersonEntity, schema);

      expect(result).toBe(false);
    });

    test('should match team entity', () => {
      const file = new TFile('atlas/notes/backend-team.md');
      const schema = testSchemas[1]; // Team schema

      const result = (scanner as any).matchesSchema(file, testFrontmatter.validTeamEntity, schema);

      expect(result).toBe(true);
    });

    test('should not match entity with non-matching property values', () => {
      const file = new TFile('atlas/notes/note.md');
      const schema = testSchemas[0]; // Person schema

      const result = (scanner as any).matchesSchema(file, testFrontmatter.nonMatchingEntity, schema);

      expect(result).toBe(false);
    });
  });

  describe('comparePropertyValues', () => {
    test('should match exact string values case-insensitively', () => {
      const result = (scanner as any).comparePropertyValues('GitHub', 'github');
      expect(result).toBe(true);
    });

    test('should match exact numeric values', () => {
      const result = (scanner as any).comparePropertyValues(42, 42);
      expect(result).toBe(true);
    });

    test('should not match different numeric values', () => {
      const result = (scanner as any).comparePropertyValues(42, 43);
      expect(result).toBe(false);
    });

    test('should match boolean values', () => {
      expect((scanner as any).comparePropertyValues(true, true)).toBe(true);
      expect((scanner as any).comparePropertyValues(false, false)).toBe(true);
      expect((scanner as any).comparePropertyValues(true, false)).toBe(false);
    });

    test('should handle null/undefined values', () => {
      expect((scanner as any).comparePropertyValues(null, null)).toBe(true);
      expect((scanner as any).comparePropertyValues(undefined, undefined)).toBe(true);
      expect((scanner as any).comparePropertyValues(null, undefined)).toBe(false);
      expect((scanner as any).comparePropertyValues('value', null)).toBe(false);
    });

    test('should match against array of expected values (OR logic)', () => {
      const result = (scanner as any).comparePropertyValues('Engineering', ['Engineering', 'Product', 'Design']);
      expect(result).toBe(true);
    });

    test('should not match if value not in array', () => {
      const result = (scanner as any).comparePropertyValues('Marketing', ['Engineering', 'Product', 'Design']);
      expect(result).toBe(false);
    });
  });

  describe('isObsidianLink', () => {
    test('should identify Obsidian links correctly', () => {
      expect((scanner as any).isObsidianLink('[[person]]')).toBe(true);
      expect((scanner as any).isObsidianLink('[[atlas/entities/person.md|person]]')).toBe(true);
      expect((scanner as any).isObsidianLink('regular text')).toBe(false);
      expect((scanner as any).isObsidianLink('[regular markdown link](url)')).toBe(false);
    });
  });

  describe('extractLinkPath', () => {
    test('should extract link paths correctly', () => {
      expect((scanner as any).extractLinkPath('[[person]]')).toBe('person');
      expect((scanner as any).extractLinkPath('[[atlas/entities/person.md|person]]')).toBe('atlas/entities/person.md');
      expect((scanner as any).extractLinkPath('regular text')).toBe('regular text');
    });
  });

  describe('compareLinksUsingAPI', () => {
    test('should match links that resolve to same file', () => {
      const result = (scanner as any).compareLinksUsingAPI('[[person]]', '[[atlas/entities/person.md|person]]');
      expect(result).toBe(true);
    });
  });

  describe('compareFilePathWithString', () => {
    test('should match link variations', () => {
      const file = new TFile('atlas/entities/person.md');
      
      expect((scanner as any).compareFilePathWithString(file, 'person')).toBe(true);
      expect((scanner as any).compareFilePathWithString(file, 'person.md')).toBe(true);
      expect((scanner as any).compareFilePathWithString(file, 'atlas/entities/person')).toBe(true);
      expect((scanner as any).compareFilePathWithString(file, 'atlas/entities/person.md')).toBe(true);
    });
  });

  describe('getMissingProperties', () => {
    test('should identify missing required properties', () => {
      const schema = testSchemas[0]; // Person schema
      const frontmatter = { name: 'John Doe' }; // Missing 'is' property
      
      const missing = (scanner as any).getMissingProperties(frontmatter, schema);
      
      expect(missing).toContain('is');
      expect(missing).not.toContain('name');
      expect(missing).not.toContain('role'); // Not required
    });

    test('should return empty array when all required properties present', () => {
      const schema = testSchemas[0]; // Person schema
      const frontmatter = testFrontmatter.validPersonEntity;
      
      const missing = (scanner as any).getMissingProperties(frontmatter, schema);
      
      expect(missing).toEqual([]);
    });

    test('should only check required properties', () => {
      const schema = testSchemas[0]; // Person schema
      const frontmatter = {
        name: 'John Doe',
        is: '[[person]]'
        // Missing optional properties: role, team, email
      };
      
      const missing = (scanner as any).getMissingProperties(frontmatter, schema);
      
      expect(missing).toEqual([]);
    });
  });
});