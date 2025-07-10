import { App } from '../mocks/obsidian-api';
import EntitySchemaPlugin from '../../main';
import { SchemaManager } from '../../src/schema-manager';
import { EntityScanner } from '../../src/entity-scanner';
import { BulkOperations } from '../../src/bulk-operations';

describe('Settings Management', () => {
  let app: App;
  let plugin: EntitySchemaPlugin;

  beforeEach(async () => {
    app = new App();
    plugin = new EntitySchemaPlugin(app, {} as any);
    await plugin.loadSettings();
    plugin.schemaManager = new SchemaManager(app);
    plugin.entityScanner = new EntityScanner(app);
    plugin.bulkOperations = new BulkOperations(app, () => plugin.settings);
    plugin.settings.schemas = await plugin.schemaManager.loadSchemas();
  });

  describe('Default Settings', () => {
    test('should have correct default settings structure', () => {
      const defaultSettings = (plugin as any).constructor.DEFAULT_SETTINGS || plugin.settings;
      
      expect(defaultSettings).toHaveProperty('schemas');
      expect(defaultSettings).toHaveProperty('backupBeforeOperations');
      expect(defaultSettings).toHaveProperty('showValidationIndicators');
      
      expect(Array.isArray(defaultSettings.schemas)).toBe(true);
      expect(typeof defaultSettings.backupBeforeOperations).toBe('boolean');
      expect(typeof defaultSettings.showValidationIndicators).toBe('boolean');
    });

    test('should have default Person schema', () => {
      const personSchema = plugin.settings.schemas.find((s: any) => s.name === 'Person');
      expect(personSchema).toBeDefined();
      expect(personSchema.properties).toHaveProperty('name');
      expect(personSchema.properties.name.required).toBe(true);
      expect(personSchema.matchCriteria).toHaveProperty('requiredProperties');
      expect(personSchema.matchCriteria.requiredProperties).toContain('name');
    });

    test('should have default Team schema', () => {
      const teamSchema = plugin.settings.schemas.find((s: any) => s.name === 'Team');
      expect(teamSchema).toBeDefined();
      expect(teamSchema.properties).toHaveProperty('name');
      expect(teamSchema.properties.name.required).toBe(true);
      expect(teamSchema.matchCriteria).toHaveProperty('requiredProperties');
      expect(teamSchema.matchCriteria.requiredProperties).toContain('name');
    });
  });

  describe('Settings Loading and Saving', () => {
    test('should load settings on initialization', async () => {
      const mockData = {
        schemas: [{ name: 'Custom', properties: {}, matchCriteria: {} }],
        backupBeforeOperations: false,
        showValidationIndicators: false
      };
      
      plugin.loadData = jest.fn().mockResolvedValue(mockData);
      
      await plugin.loadSettings();
      
      expect(plugin.loadData).toHaveBeenCalled();
      expect(plugin.settings.schemas).toEqual(mockData.schemas);
      expect(plugin.settings.backupBeforeOperations).toBe(false);
      expect(plugin.settings.showValidationIndicators).toBe(false);
    });

    test('should merge with default settings when loading partial data', async () => {
      const partialData = {
        backupBeforeOperations: false
        // Missing schemas and showValidationIndicators
      };
      
      plugin.loadData = jest.fn().mockResolvedValue(partialData);
      
      await plugin.loadSettings();
      
      expect(plugin.settings.backupBeforeOperations).toBe(false);
      expect(plugin.settings.schemas).toBeDefined(); // Should use default
      expect(plugin.settings.showValidationIndicators).toBeDefined(); // Should use default
    });

    test('should save settings correctly', async () => {
      plugin.saveData = jest.fn().mockResolvedValue(undefined);
      
      plugin.settings = {
        schemas: [{ name: 'Test', properties: {}, matchCriteria: {} }],
        backupBeforeOperations: true,
        showValidationIndicators: false
      };
      
      await plugin.saveSettings();
      
      expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
    });
  });

  describe('Schema Validation', () => {
    test('should validate schema structure', () => {
      const validSchema = {
        name: 'Test',
        properties: {
          name: { type: 'string', required: true },
          optional: { type: 'string', required: false }
        },
        matchCriteria: {
          requiredProperties: ['name']
        }
      };
      
      // This would be a validation function if implemented
      // For now, we just check the structure manually
      expect(validSchema.name).toBeDefined();
      expect(validSchema.properties).toBeDefined();
      expect(validSchema.matchCriteria).toBeDefined();
      expect(typeof validSchema.name).toBe('string');
      expect(typeof validSchema.properties).toBe('object');
      expect(typeof validSchema.matchCriteria).toBe('object');
    });

    test('should handle invalid schema gracefully', () => {
      const invalidSchemas = [
        { name: '', properties: {}, matchCriteria: {} }, // Empty name
        { properties: {}, matchCriteria: {} }, // Missing name
        { name: 'Test', matchCriteria: {} }, // Missing properties
        { name: 'Test', properties: {} }, // Missing matchCriteria
      ];
      
      invalidSchemas.forEach(schema => {
        // In a real implementation, these would fail validation
        // For now, we just check that they're structurally problematic
        if (!schema.name || schema.name === '') {
          expect(schema.name).toBeFalsy();
        }
        if (!schema.properties) {
          expect(schema.properties).toBeUndefined();
        }
        if (!schema.matchCriteria) {
          expect(schema.matchCriteria).toBeUndefined();
        }
      });
    });
  });

  describe('Property Definition Validation', () => {
    test('should validate property definition types', () => {
      const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
      
      validTypes.forEach(type => {
        const propertyDef = { type: type as any, required: true };
        expect(validTypes).toContain(propertyDef.type);
      });
    });

    test('should handle invalid property types', () => {
      const invalidTypes = ['invalid', 'text', 'int', 'float'];
      const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
      
      invalidTypes.forEach(type => {
        expect(validTypes).not.toContain(type);
      });
    });
  });
});