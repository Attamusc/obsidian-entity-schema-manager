# Entity Schema Manager - Documentation Index

## Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](../README.md) | User guide and setup | End users |
| [API.md](API.md) | Interface documentation | Developers |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design | Contributors |
| [CLAUDE.md](../CLAUDE.md) | Development guide | AI assistants |

## Project Overview

The **Entity Schema Manager** is an Obsidian plugin that helps users manage entity schemas and perform bulk operations on note properties. It's designed for maintaining consistent metadata across entity-based note-taking systems.

### Core Features
- Entity type management with flexible schemas
- Schema validation and drift detection
- Bulk property operations with safety features
- Smart link resolution and property matching
- Comprehensive UI with dashboard and settings

## File Structure

```
obsidian-entity-schema-manager/
├── 📄 main.ts                  # Plugin entry point
├── 📁 src/                     # Core source code
│   ├── 🔧 entity-scanner.ts    # Entity discovery and validation
│   ├── ⚙️ schema-manager.ts    # Schema loading and management
│   ├── 🔄 bulk-operations.ts   # Bulk property operations
│   ├── 🎛️ settings-tab.ts     # Settings UI component
│   ├── 📊 types.ts            # TypeScript interfaces
│   └── 📁 modals/             # UI dialog components
│       ├── add-property-modal.ts
│       ├── bulk-operation-preview-modal.ts
│       ├── entity-dashboard-modal.ts
│       ├── schema-drift-modal.ts
│       └── validation-result-modal.ts
├── 📁 tests/                  # Test suite
│   ├── 📁 unit/               # Component tests
│   ├── 📁 integration/        # Workflow tests
│   ├── 📁 fixtures/           # Test data
│   └── 📁 mocks/             # API mocks
├── 📁 docs/                  # Documentation
├── 📁 test-vault/            # Development vault
└── 📋 Configuration files    # Build, lint, test configs
```

## API Reference

### Core Interfaces

| Interface | File | Purpose |
|-----------|------|---------|
| `EntitySchema` | [types.ts](../src/types.ts) | Entity type definition |
| `PropertyDefinition` | [types.ts](../src/types.ts) | Property structure |
| `MatchCriteria` | [types.ts](../src/types.ts) | Entity matching rules |
| `EntityInstance` | [types.ts](../src/types.ts) | Discovered entity data |
| `EntitySchemaSettings` | [types.ts](../src/types.ts) | Plugin configuration |

### Core Classes

| Class | File | Responsibilities |
|-------|------|-----------------|
| `EntitySchemaPlugin` | [main.ts](../main.ts) | Plugin lifecycle, command routing |
| `EntityScanner` | [entity-scanner.ts](../src/entity-scanner.ts) | Entity discovery, validation |
| `SchemaManager` | [schema-manager.ts](../src/schema-manager.ts) | Schema loading, persistence |
| `BulkOperations` | [bulk-operations.ts](../src/bulk-operations.ts) | Property modifications |
| `EntitySchemaSettingTab` | [settings-tab.ts](../src/settings-tab.ts) | Settings UI |

## Feature Cross-Reference

### Entity Discovery
- **Implementation**: `EntityScanner.scanEntities()` ([entity-scanner.ts:16](../src/entity-scanner.ts#L16))
- **Matching Logic**: `EntityScanner.matchesSchema()` ([entity-scanner.ts:68](../src/entity-scanner.ts#L68))
- **Link Resolution**: `EntityScanner.compareLinksUsingAPI()` ([entity-scanner.ts:151](../src/entity-scanner.ts#L151))
- **UI**: Entity Dashboard Modal ([entity-dashboard-modal.ts](../src/modals/entity-dashboard-modal.ts))
- **Tests**: [entity-discovery.test.ts](../tests/integration/entity-discovery.test.ts)

### Schema Management
- **Loading**: `SchemaManager.loadSchemas()` ([schema-manager.ts:57](../src/schema-manager.ts#L57))
- **Validation**: `SchemaManager.validateSchemas()` ([schema-manager.ts:127](../src/schema-manager.ts#L127))
- **Persistence**: `SchemaManager.saveSchemas()` ([schema-manager.ts:94](../src/schema-manager.ts#L94))
- **UI**: Settings Tab Schema Section ([settings-tab.ts:35](../src/settings-tab.ts#L35))
- **Tests**: [settings.test.ts](../tests/unit/settings.test.ts)

### Bulk Operations
- **Property Addition**: `BulkOperations.performBulkPropertyAddition()` ([bulk-operations.ts:16](../src/bulk-operations.ts#L16))
- **Frontmatter Manipulation**: `BulkOperations.addPropertyToFrontmatter()` ([bulk-operations.ts:62](../src/bulk-operations.ts#L62))
- **Backup System**: Creates timestamped backups ([bulk-operations.ts:36](../src/bulk-operations.ts#L36))
- **UI**: Add Property Modal, Preview Modal
- **Tests**: [bulk-operations.test.ts](../tests/integration/bulk-operations.test.ts)

### Validation System
- **Entity Validation**: `EntityScanner.getValidationSummary()` ([entity-scanner.ts:248](../src/entity-scanner.ts#L248))
- **Schema Drift**: `EntityScanner.getEntitiesWithDrift()` ([entity-scanner.ts:272](../src/entity-scanner.ts#L272))
- **Missing Properties**: `EntityScanner.getMissingProperties()` ([entity-scanner.ts:223](../src/entity-scanner.ts#L223))
- **UI**: Validation Result Modal, Schema Drift Modal
- **Tests**: [schema-matching.test.ts](../tests/unit/schema-matching.test.ts)

## Command Reference

| Command ID | Display Name | Implementation | Description |
|------------|--------------|----------------|-------------|
| `scan-entities` | "Scan for entities" | `main.ts:99` | Discover entities in vault |
| `add-property-to-entity-type` | "Add property to entity type" | `main.ts:116` | Bulk add properties |
| `validate-entities` | "Validate all entities" | `main.ts:104` | Check schema compliance |
| `show-schema-drift` | "Show schema drift" | `main.ts:110` | Find missing properties |
| `reload-entity-schemas` | "Reload entity schemas" | `main.ts:155` | Refresh from file |
| `export-entity-schemas` | "Export entity schemas" | `main.ts:162` | Save to file |

## Testing Guide

### Test Categories

| Type | Location | Purpose | Coverage |
|------|----------|---------|----------|
| **Unit Tests** | `tests/unit/` | Individual functions | Core logic |
| **Integration Tests** | `tests/integration/` | Component interaction | Workflows |
| **Private Method Tests** | `tests/unit/entity-scanner-private-methods.test.ts` | Internal methods | Edge cases |

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch         # Development mode
npm run test:coverage      # Generate coverage report
```

### Test Files

| File | Focus Area | Key Tests |
|------|------------|-----------|
| [entity-scanner.test.ts](../tests/unit/entity-scanner.test.ts) | Entity discovery | Schema matching, validation |
| [schema-matching.test.ts](../tests/unit/schema-matching.test.ts) | Match criteria | Property comparison, link resolution |
| [bulk-operations.test.ts](../tests/unit/bulk-operations.test.ts) | Property operations | Frontmatter manipulation |
| [settings.test.ts](../tests/unit/settings.test.ts) | Configuration | Settings persistence |
| [entity-discovery.test.ts](../tests/integration/entity-discovery.test.ts) | End-to-end | Full discovery workflow |
| [bulk-operations.test.ts](../tests/integration/bulk-operations.test.ts) | End-to-end | Complete bulk operations |

## Configuration Reference

### Schema File Format

**Location**: `entity-schemas.json` (vault root)
**Format**: JSON array of EntitySchema objects

```json
[
  {
    "name": "Person",
    "description": "Individual person entity",
    "properties": {
      "name": { "type": "string", "required": true },
      "role": { "type": "string", "required": false }
    },
    "matchCriteria": {
      "requiredProperties": ["name", "is"],
      "folderPath": "atlas/notes",
      "propertyValues": { "is": "atlas/entities/person" }
    }
  }
]
```

### Plugin Settings

| Setting | Type | Default | Purpose |
|---------|------|---------|---------|
| `schemas` | `EntitySchema[]` | Default schemas | Entity type definitions |
| `backupBeforeOperations` | `boolean` | `true` | Create safety backups |
| `showValidationIndicators` | `boolean` | `true` | Show validation status |

### Build Configuration

| File | Purpose | Key Settings |
|------|---------|--------------|
| `esbuild.config.mjs` | Build system | Bundle, minify, watch mode |
| `tsconfig.json` | TypeScript | Strict null checks, ES6 target |
| `jest.config.js` | Testing | Coverage, mocks, setup |
| `.eslintrc` | Code quality | TypeScript rules, style guide |

## Troubleshooting Index

### Common Issues

| Issue | Symptoms | Solution | Reference |
|-------|----------|----------|-----------|
| **Entities not found** | Empty scan results | Check match criteria, folder paths | [README.md:224](../README.md#L224) |
| **Schema validation errors** | Red indicators, warnings | Verify frontmatter syntax | [README.md:239](../README.md#L239) |
| **Bulk operations fail** | Error notifications | Check file permissions, backup settings | [README.md:232](../README.md#L232) |
| **Schema file issues** | Default schemas used | Validate JSON format, check file location | [schema-manager.ts:80](../src/schema-manager.ts#L80) |

### Debug Information

| Component | Debug Output | Location |
|-----------|--------------|----------|
| Entity Scanner | Console logs with file processing | `entity-scanner.ts` |
| Schema Manager | Load/save operations | `schema-manager.ts` |
| Bulk Operations | Operation results | `bulk-operations.ts` |

## Development Guide

### Getting Started

1. **Setup**: Clone repository to `.obsidian/plugins/`
2. **Install**: `npm install`
3. **Build**: `npm run build`
4. **Test**: `npm test`
5. **Develop**: `npm run dev` (watch mode)

### Code Style

- **ESLint**: Configured with TypeScript rules
- **Type Safety**: Strict null checks enabled
- **Documentation**: Inline comments for complex logic
- **Testing**: High coverage required for new features

### Extension Points

| Area | How to Extend | Example |
|------|---------------|---------|
| **Property Types** | Add to type union, update validation | Custom date type |
| **Match Criteria** | Extend interface, add matching logic | Content-based matching |
| **Bulk Operations** | Create new operation class | Property removal |
| **UI Components** | Add modal, extend settings | Custom validation views |

## Related Resources

### Obsidian Plugin Development
- [Official Plugin API](https://docs.obsidian.md/plugins)
- [Plugin Development Guide](https://marcus.se.net/obsidian-plugin-docs/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)

### Entity-Based Note Taking
- [Johnny Decimal System](https://johnnydecimal.com/)
- [Zettelkasten Method](https://zettelkasten.de/)
- [PARA Method](https://fortelabs.co/blog/para/)

---

**Last Updated**: 2024 (Generated by Claude Code)
**Version**: Based on current codebase analysis
**Maintainer**: Development team