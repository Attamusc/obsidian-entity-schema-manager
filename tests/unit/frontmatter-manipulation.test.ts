import { App } from '../mocks/obsidian-api';
import EntitySchemaPlugin from '../../main';
import { testFileContents } from '../fixtures/test-schemas';

describe('Frontmatter Manipulation', () => {
  let app: App;
  let plugin: EntitySchemaPlugin;

  beforeEach(() => {
    app = new App();
    plugin = new EntitySchemaPlugin(app, {} as any);
  });

  describe('addPropertyToFrontmatter', () => {
    test('should add property to existing frontmatter', () => {
      const content = testFileContents.withFrontmatter;
      const result = (plugin as any).addPropertyToFrontmatter(content, 'level', 'senior');

      expect(result).toContain('level: "senior"');
      expect(result).toContain('name: "John Doe"');
      expect(result).toContain('is: "[[person]]"');
      expect(result).toContain('role: "Software Engineer"');
    });

    test('should create frontmatter when none exists', () => {
      const content = testFileContents.withoutFrontmatter;
      const result = (plugin as any).addPropertyToFrontmatter(content, 'level', 'senior');

      expect(result).toMatch(/^---\nlevel: "senior"\n---\n\n/);
      expect(result).toContain('# John Doe');
      expect(result).toContain('Some content about John without frontmatter.');
    });

    test('should add property to empty frontmatter', () => {
      const content = testFileContents.emptyFrontmatter;
      const result = (plugin as any).addPropertyToFrontmatter(content, 'level', 'senior');

      expect(result).toContain('level: "senior"');
      expect(result).toContain('# Empty Frontmatter');
    });

    test('should handle different value types', () => {
      const content = testFileContents.withFrontmatter;
      
      // String value
      let result = (plugin as any).addPropertyToFrontmatter(content, 'department', 'Engineering');
      expect(result).toContain('department: "Engineering"');

      // Number value
      result = (plugin as any).addPropertyToFrontmatter(content, 'age', 30);
      expect(result).toContain('age: 30');

      // Boolean value
      result = (plugin as any).addPropertyToFrontmatter(content, 'active', true);
      expect(result).toContain('active: true');

      // Array value
      result = (plugin as any).addPropertyToFrontmatter(content, 'tags', ['person', 'employee']);
      expect(result).toContain('tags: ["person", "employee"]');
    });
  });

  describe('formatValue', () => {
    test('should format string values with quotes', () => {
      const result = (plugin as any).formatValue('test string');
      expect(result).toBe('"test string"');
    });

    test('should format array values', () => {
      const result = (plugin as any).formatValue(['tag1', 'tag2', 'tag3']);
      expect(result).toBe('["tag1", "tag2", "tag3"]');
    });

    test('should format number values without quotes', () => {
      const result = (plugin as any).formatValue(42);
      expect(result).toBe('42');
    });

    test('should format boolean values without quotes', () => {
      expect((plugin as any).formatValue(true)).toBe('true');
      expect((plugin as any).formatValue(false)).toBe('false');
    });

    test('should format null/undefined values', () => {
      expect((plugin as any).formatValue(null)).toBe('null');
      expect((plugin as any).formatValue(undefined)).toBe('undefined');
    });

    test('should format object values as strings', () => {
      const obj = { key: 'value' };
      const result = (plugin as any).formatValue(obj);
      expect(result).toBe('[object Object]');
    });
  });

  describe('Frontmatter Preservation', () => {
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

      const result = (plugin as any).addPropertyToFrontmatter(originalContent, 'new_property', 'new_value');

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

      const result = (plugin as any).addPropertyToFrontmatter(content, 'simple_prop', 'simple_value');
      
      expect(result).toContain('simple_prop: "simple_value"');
      expect(result).toContain('complex_object:');
      expect(result).toContain('nested_key: "nested_value"');
      expect(result).toContain('multi_line_string: |');
    });
  });
});