import { getEntitySchemaAPI, isEntitySchemaAPIAvailable, waitForEntitySchemaAPI } from '../../src/api';

describe('API Integration', () => {
	beforeEach(() => {
		// Clean up global namespace before each test
		delete (window as unknown as { 'entity-schema-manager.api.v1'?: unknown })['entity-schema-manager.api.v1'];
	});

	describe('getEntitySchemaAPI', () => {
		it('should return undefined when API is not available', () => {
			const api = getEntitySchemaAPI();
			expect(api).toBeUndefined();
		});

		it('should return API when available in global namespace', () => {
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

			(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;

			const api = getEntitySchemaAPI();
			expect(api).toBe(mockAPI);
		});
	});

	describe('isEntitySchemaAPIAvailable', () => {
		it('should return false when API is not available', () => {
			expect(isEntitySchemaAPIAvailable()).toBe(false);
		});

		it('should return true when API is available', () => {
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

			(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;

			expect(isEntitySchemaAPIAvailable()).toBe(true);
		});
	});

	describe('waitForEntitySchemaAPI', () => {
		it('should resolve immediately if API is already available', async () => {
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

			(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;

			const api = await waitForEntitySchemaAPI(1000);
			expect(api).toBe(mockAPI);
		});

		it('should wait for API to become available', async () => {
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

			// API becomes available after 200ms
			setTimeout(() => {
				(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;
			}, 200);

			const api = await waitForEntitySchemaAPI(1000);
			expect(api).toBe(mockAPI);
		});

		it('should reject after timeout if API never becomes available', async () => {
			await expect(waitForEntitySchemaAPI(100)).rejects.toThrow(
				'Entity Schema Manager API not available after timeout'
			);
		});

		it('should use default timeout of 5000ms', async () => {
			const startTime = Date.now();
			
			try {
				await waitForEntitySchemaAPI();
			} catch (error) {
				const elapsed = Date.now() - startTime;
				// Allow some tolerance for timing
				expect(elapsed).toBeGreaterThan(4900);
				expect(elapsed).toBeLessThan(5200);
			}
		}, 6000); // Increase Jest timeout to 6 seconds to accommodate the 5 second API timeout
	});

	describe('Global namespace pollution prevention', () => {
		it('should use namespaced API key', () => {
			const mockAPI = {};
			(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;

			// Verify the specific namespace is used
			expect((window as unknown as { 'entity-schema-manager.api.v1'?: unknown })['entity-schema-manager.api.v1']).toBe(mockAPI);
			
			// Verify other common namespace patterns are not polluted
			expect((window as unknown as { api?: unknown }).api).toBeUndefined();
			expect((window as unknown as { entityAPI?: unknown }).entityAPI).toBeUndefined();
			expect((window as unknown as { 'entity-api'?: unknown })['entity-api']).toBeUndefined();
		});
	});

	describe('Type safety', () => {
		it('should maintain type safety through utility functions', () => {
			const mockAPI = {
				getEntitySchemas: jest.fn().mockReturnValue([]),
				getEntityTypeNames: jest.fn().mockReturnValue(['Person']),
				getEntitiesByType: jest.fn().mockReturnValue([]),
				getEntityTemplate: jest.fn().mockReturnValue({}),
				hasEntityType: jest.fn().mockReturnValue(true),
				getEntityCount: jest.fn().mockReturnValue(0),
				getEntitySummary: jest.fn().mockReturnValue({}),
				getEntityValidation: jest.fn().mockReturnValue({
					total: 0,
					valid: 0,
					withIssues: 0,
					issues: []
				})
			};

			(window as unknown as { 'entity-schema-manager.api.v1': typeof mockAPI })['entity-schema-manager.api.v1'] = mockAPI;

			const api = getEntitySchemaAPI();
			
			// These should all be properly typed
			if (api) {
				const schemas = api.getEntitySchemas();
				const names = api.getEntityTypeNames();
				const entities = api.getEntitiesByType('Person');
				const template = api.getEntityTemplate('Person');
				const hasType = api.hasEntityType('Person');
				const count = api.getEntityCount('Person');
				const summary = api.getEntitySummary();
				const validation = api.getEntityValidation('Person');

				expect(Array.isArray(schemas)).toBe(true);
				expect(Array.isArray(names)).toBe(true);
				expect(Array.isArray(entities)).toBe(true);
				expect(typeof template).toBe('object');
				expect(typeof hasType).toBe('boolean');
				expect(typeof count).toBe('number');
				expect(typeof summary).toBe('object');
				expect(typeof validation).toBe('object');
			}
		});
	});
});