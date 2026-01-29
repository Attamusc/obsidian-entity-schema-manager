# AGENTS.md

Guidelines for AI coding agents working in this Obsidian plugin repository.

## Build/Lint/Test Commands

### Build
```bash
npm run build          # Production build with TypeScript checking and linting
npm run dev            # Development mode with file watching
npm run dev:vault      # Build to test-vault with hot reload (recommended for testing)
```

### Linting
```bash
npm run lint           # Run ESLint on all TypeScript files
npm run lint:fix       # Auto-fix ESLint issues
```

### Testing
```bash
npm test                              # Run all tests
npm run test:watch                    # Watch mode for development
npm run test:coverage                 # Generate coverage report
npx jest path/to/file.test.ts         # Run a single test file
npx jest --testNamePattern="pattern"  # Run tests matching pattern
npx jest path/to/file.test.ts -t "should match"  # Single test by name
```

## Code Style Guidelines

### Imports
- Order: Obsidian imports first, then local imports
- Use single quotes for import strings
- Destructure when importing multiple items
- Use relative paths (`./`, `../`) for local imports
- Use `export type { }` for type re-exports

```typescript
import { App, Modal, Notice } from 'obsidian';

import { EntityInstance, EntitySchema } from './types';
import { SchemaManager } from './schema-manager';
```

### Formatting
- **Indentation**: Tabs (not spaces)
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: Keep reasonable, no strict limit
- **Template literals**: Use for string interpolation

### TypeScript Types
- **Use `unknown` instead of `any`** - This is enforced by ESLint
- Explicit return types on public methods
- Use type guards with `is` keyword
- `Readonly<T>` for immutable API returns
- Optional properties use `?` suffix

```typescript
async scanEntities(schemas: EntitySchema[]): Promise<EntityInstance[]>
private validateSchemas(schemas: unknown): schemas is EntitySchema[]
getEntitySchemas(): Readonly<EntitySchema[]>
```

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Classes | PascalCase | `EntitySchemaPlugin`, `SchemaManager` |
| Interfaces | PascalCase (no `I` prefix) | `EntitySchema`, `MatchCriteria` |
| Variables/Properties | camelCase | `entityInstances`, `lastScanTime` |
| Methods/Functions | camelCase | `scanEntities()`, `loadSchemas()` |
| Boolean methods | `is`/`has` prefix | `isObsidianLink()`, `hasEntityType()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_SETTINGS` |
| Files | kebab-case | `entity-scanner.ts`, `schema-manager.ts` |
| Test files | `*.test.ts` | `schema-matching.test.ts` |

### Error Handling
- Wrap async operations in try-catch
- Log errors with plugin prefix: `'Entity Schema Manager: ...'`
- Provide user feedback via `new Notice('...')`
- Use graceful degradation with fallbacks
- Validate inputs with early returns

```typescript
try {
    const content = await this.app.vault.adapter.read(path);
} catch (error) {
    console.error('Entity Schema Manager: Error loading file:', error);
    new Notice('Error loading file, using defaults');
}
```

### Class Structure
1. Private properties first
2. Constructor
3. Lifecycle methods (`onload()`, `onunload()`)
4. Public methods
5. Private helper methods

```typescript
export class EntityScanner {
    private app: App;
    private entityInstances: EntityInstance[] = [];

    constructor(app: App) { ... }

    async scanEntities(schemas: EntitySchema[]): Promise<EntityInstance[]> { ... }

    private matchesSchema(...): boolean { ... }
}
```

### Comments
- JSDoc for public API methods
- Inline comments for non-obvious logic
- Console logs include plugin prefix

```typescript
/**
 * Scan vault for entities matching schemas
 * @param schemas - Entity schemas to match against
 */
async scanEntities(schemas: EntitySchema[]): Promise<EntityInstance[]>
```

### Obsidian Plugin Patterns
- Modals extend `Modal` and implement `onOpen()` / `onClose()`
- Settings use `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())`
- Commands registered via `this.addCommand({ id, name, callback })`
- Use `contentEl.createEl()` for building UI

### Testing Patterns
- Test files in `tests/unit/` and `tests/integration/`
- Mocks in `tests/mocks/`
- Test names: `'should <expected behavior>'`
- Use Arrange-Act-Assert pattern
- Access private methods via `(instance as any).methodName()`

```typescript
describe('Schema Matching', () => {
    beforeEach(async () => { /* setup */ });

    test('should match valid person entity', () => {
        // Arrange
        const file = new TFile('atlas/notes/john.md');
        // Act
        const result = (scanner as any).matchesSchema(file, schema);
        // Assert
        expect(result).toBe(true);
    });
});
```

## ESLint Rules

Key rules from `.eslintrc`:
- `@typescript-eslint/no-explicit-any`: warn (use `unknown`)
- `@typescript-eslint/no-non-null-assertion`: warn
- `@typescript-eslint/no-unused-vars`: error (unused args allowed)
- `@typescript-eslint/ban-ts-comment`: off

## Project Architecture

### Core Components
- `main.ts` - Plugin entry point, commands, UI
- `src/` - Modular source code (if present)
- `tests/` - Jest test suite
- `test-vault/` - Development vault with sample data

### Key Interfaces
- `EntitySchema` - Defines entity type with properties and match criteria
- `EntityInstance` - Note matching a schema
- `MatchCriteria` - Folder paths, property values, link matching

### Atlas Organization
Default folder structure:
- `atlas/entities/` - Schema definition files
- `atlas/notes/` - Entity instance notes
