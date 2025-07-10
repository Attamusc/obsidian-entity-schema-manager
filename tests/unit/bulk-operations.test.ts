import { App, TFile } from '../mocks/obsidian-api';
import { BulkOperations } from '../../src/bulk-operations';
import { EntityInstance, EntitySchemaSettings } from '../../src/types';
import { testFileContents } from '../fixtures/test-schemas';

describe('BulkOperations', () => {
  let app: App;
  let bulkOperations: BulkOperations;
  let mockSettings: EntitySchemaSettings;

  beforeEach(() => {
    app = new App();
    mockSettings = {
      schemas: [],
      backupBeforeOperations: true,
      showValidationIndicators: true
    };
    bulkOperations = new BulkOperations(app, () => mockSettings);
  });

  describe('performBulkPropertyAddition', () => {
    test('should add property to all specified entities', async () => {
      const file1 = new TFile('atlas/notes/john.md');
      const file2 = new TFile('atlas/notes/jane.md');
      
      app.vault.addFile(file1, testFileContents.withFrontmatter);
      app.vault.addFile(file2, testFileContents.withFrontmatter);

      const entities: EntityInstance[] = [
        {
          file: file1,
          entityType: 'Person',
          properties: { name: 'John Doe' },
          missingProperties: []
        },
        {
          file: file2,
          entityType: 'Person',
          properties: { name: 'Jane Smith' },
          missingProperties: []
        }
      ];

      const result = await bulkOperations.performBulkPropertyAddition(entities, 'level', 'senior');

      expect(result.success).toBe(2);
      expect(result.errors).toBe(0);

      const johnContent = await app.vault.read(file1);
      const janeContent = await app.vault.read(file2);
      
      expect(johnContent).toContain('level: "senior"');
      expect(janeContent).toContain('level: "senior"');
    });

    test('should create backups when enabled', async () => {
      mockSettings.backupBeforeOperations = true;
      
      const file = new TFile('atlas/notes/test.md');
      app.vault.addFile(file, testFileContents.withFrontmatter);

      const entities: EntityInstance[] = [{
        file,
        entityType: 'Person',
        properties: { name: 'Test' },
        missingProperties: []
      }];

      await bulkOperations.performBulkPropertyAddition(entities, 'department', 'Engineering');

      expect(app.vault.adapter.exists).toHaveBeenCalledWith('entity-schema-backups');
    });

    test('should not create backups when disabled', async () => {
      mockSettings.backupBeforeOperations = false;
      
      const file = new TFile('atlas/notes/test.md');
      app.vault.addFile(file, testFileContents.withFrontmatter);

      const entities: EntityInstance[] = [{
        file,
        entityType: 'Person',
        properties: { name: 'Test' },
        missingProperties: []
      }];

      // Clear previous calls
      app.vault.adapter.exists = jest.fn().mockResolvedValue(false);

      await bulkOperations.performBulkPropertyAddition(entities, 'department', 'Engineering');

      expect(app.vault.adapter.exists).not.toHaveBeenCalled();
    });

    test('should handle errors gracefully', async () => {
      const file = new TFile('atlas/notes/test.md');
      app.vault.addFile(file, testFileContents.withFrontmatter);

      const entities: EntityInstance[] = [{
        file,
        entityType: 'Person',
        properties: { name: 'Test' },
        missingProperties: []
      }];

      // Mock an error during file modification
      const originalModify = app.vault.modify;
      app.vault.modify = jest.fn().mockRejectedValueOnce(new Error('File write error'));

      const result = await bulkOperations.performBulkPropertyAddition(entities, 'problematic_prop', 'value');

      expect(result.success).toBe(0);
      expect(result.errors).toBe(1);

      // Restore original method
      app.vault.modify = originalModify;
    });
  });

  describe('addPropertyToFrontmatter', () => {
    test('should add property to existing frontmatter', () => {
      const content = testFileContents.withFrontmatter;
      const result = bulkOperations.addPropertyToFrontmatter(content, 'level', 'senior');

      expect(result).toContain('level: "senior"');
      expect(result).toContain('name: "John Doe"');
      expect(result).toContain('is: "[[person]]"');
      expect(result).toContain('role: "Software Engineer"');
    });

    test('should create frontmatter when none exists', () => {
      const content = testFileContents.withoutFrontmatter;
      const result = bulkOperations.addPropertyToFrontmatter(content, 'level', 'senior');

      expect(result).toMatch(/^---\nlevel: "senior"\n---\n\n/);
      expect(result).toContain('# John Doe');
      expect(result).toContain('Some content about John without frontmatter.');
    });

    test('should add property to empty frontmatter', () => {
      const content = testFileContents.emptyFrontmatter;
      const result = bulkOperations.addPropertyToFrontmatter(content, 'level', 'senior');

      expect(result).toContain('level: "senior"');
      expect(result).toContain('# Empty Frontmatter');
    });

    test('should handle different value types', () => {
      const content = testFileContents.withFrontmatter;
      
      // String value
      let result = bulkOperations.addPropertyToFrontmatter(content, 'department', 'Engineering');
      expect(result).toContain('department: "Engineering"');

      // Number value
      result = bulkOperations.addPropertyToFrontmatter(content, 'age', 30);
      expect(result).toContain('age: 30');

      // Boolean value
      result = bulkOperations.addPropertyToFrontmatter(content, 'active', true);
      expect(result).toContain('active: true');

      // Array value
      result = bulkOperations.addPropertyToFrontmatter(content, 'tags', ['person', 'employee']);
      expect(result).toContain('tags: ["person", "employee"]');
    });

    test('should preserve existing frontmatter structure', () => {
      const originalContent = `---
name: "John Doe"
is: "[[person]]"
role: "Software Engineer"
existing_array: ["item1", "item2"]
existing_number: 42
existing_boolean: true
---

# Content

Some content here.`;

      const result = bulkOperations.addPropertyToFrontmatter(originalContent, 'new_property', 'new_value');

      // Check that all original properties are preserved
      expect(result).toContain('name: "John Doe"');
      expect(result).toContain('is: "[[person]]"');
      expect(result).toContain('role: "Software Engineer"');
      expect(result).toContain('existing_array: ["item1", "item2"]');
      expect(result).toContain('existing_number: 42');
      expect(result).toContain('existing_boolean: true');
      
      // Check that new property is added
      expect(result).toContain('new_property: "new_value"');
      
      // Check that content is preserved
      expect(result).toContain('# Content');
      expect(result).toContain('Some content here.');
    });

    test('should handle frontmatter with complex values', () => {
      const content = `---
name: "Test"
complex_object:
  nested_key: "nested_value"
  another_key: 123
multi_line_string: |
  This is a multi-line
  string in YAML
---

Content here.`;

      const result = bulkOperations.addPropertyToFrontmatter(content, 'simple_prop', 'simple_value');
      
      expect(result).toContain('simple_prop: "simple_value"');
      expect(result).toContain('complex_object:');
      expect(result).toContain('nested_key: "nested_value"');
      expect(result).toContain('multi_line_string: |');
    });
  });

  describe('formatValue', () => {
    test('should format string values with quotes', () => {
      const result = bulkOperations.formatValue('test string');
      expect(result).toBe('"test string"');
    });

    test('should format array values', () => {
      const result = bulkOperations.formatValue(['tag1', 'tag2', 'tag3']);
      expect(result).toBe('["tag1", "tag2", "tag3"]');
    });

    test('should format number values without quotes', () => {
      const result = bulkOperations.formatValue(42);
      expect(result).toBe('42');
    });

    test('should format boolean values without quotes', () => {
      expect(bulkOperations.formatValue(true)).toBe('true');
      expect(bulkOperations.formatValue(false)).toBe('false');
    });

    test('should format null/undefined values', () => {
      expect(bulkOperations.formatValue(null)).toBe('null');
      expect(bulkOperations.formatValue(undefined)).toBe('undefined');
    });

    test('should format object values as strings', () => {
      const obj = { key: 'value' };
      const result = bulkOperations.formatValue(obj);
      expect(result).toBe('[object Object]');
    });
  });
});