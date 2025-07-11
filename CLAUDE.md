# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run dev` - Start development mode with file watching using esbuild
- `npm run build` - Build for production with TypeScript checking and minification
- `npm run version` - Update version numbers in manifest.json and versions.json

### Linting
- **ESLint** is configured with TypeScript support and modern rules
- Configuration in `.eslintrc` with TypeScript-specific rules and project-specific ignores
- **Commands:**
  - `npm run lint` - Run ESLint on all TypeScript files
  - `npm run lint:fix` - Auto-fix ESLint issues where possible
- **Integration:** Linting runs automatically as part of the build process
- **Standards:** Source files use `unknown` instead of `any` for type safety

## Architecture Overview

This is an **Obsidian plugin** for managing entity schemas and performing bulk operations on note properties. The plugin helps users maintain consistent metadata across entity-based note-taking systems.

### Core Components

**Entity Schema System** (`main.ts`):
- `EntitySchema` interface defines entity types with properties and match criteria
- `EntityInstance` represents discovered notes that match schema criteria
- `MatchCriteria` supports complex matching including folder paths, property values, and link matching
- Default schemas for Person and Team entities with atlas-based organization

**Property Management**:
- Bulk property addition across multiple entities
- Schema validation and drift detection
- Backup system for safe operations
- YAML frontmatter manipulation

**Discovery and Matching**:
- Smart link matching for Obsidian-style links (`[[path|display]]`)
- Folder-based entity discovery
- Property value matching with case-insensitive string and array support
- Tag pattern matching

### Key Features

1. **Entity Discovery**: Scans vault for notes matching defined schemas
2. **Schema Validation**: Identifies missing required properties
3. **Bulk Operations**: Add properties to multiple entities simultaneously
4. **Dashboard**: Visual overview of entity types and compliance
5. **Backup System**: Automatic backups before bulk operations

### Project Structure
- `main.ts` - Primary plugin code with all interfaces and logic
- `manifest.json` - Obsidian plugin manifest
- `test-vault/` - Development vault with sample entities
- `esbuild.config.mjs` - Build configuration with dev/prod modes
- `tsconfig.json` - TypeScript configuration with strict settings

### Atlas Organization Pattern
The default configuration expects an "atlas" folder structure:
- `atlas/entities/` - Entity definition files (person.md, team.md)
- `atlas/notes/` - Actual entity instances
- Property matching uses link resolution to connect instances to entity types

### Development Notes
- Uses Obsidian Plugin API extensively
- TypeScript with strict null checks enabled
- ESBuild for fast development builds with watching
- Plugin follows Obsidian's settings tab pattern for configuration
- Commands and ribbon integration for user interface

## Testing

### Test Framework
- **Jest** with TypeScript support via ts-jest
- **Coverage reporting** available via `npm run test:coverage`
- **Mock Obsidian API** for isolated testing

### Test Commands
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test:coverage` - Generate coverage report

### Test Structure
```
tests/
├── unit/                          # Unit tests for individual functions
│   ├── schema-matching.test.ts    # Entity schema matching logic
│   ├── frontmatter-manipulation.test.ts  # YAML frontmatter handling
│   └── settings.test.ts           # Settings management
├── integration/                   # Integration tests for complete workflows
│   ├── entity-discovery.test.ts   # End-to-end entity scanning
│   └── bulk-operations.test.ts    # Bulk property operations
├── fixtures/                     # Test data and sample entities
│   ├── test-schemas.ts           # Test entity schemas and frontmatter
│   └── sample-entities/          # Sample markdown files
└── mocks/                        # Mock implementations
    └── obsidian-api.ts           # Mock Obsidian App, Vault, etc.
```

### Key Test Areas
1. **Schema Matching**: Tests entity discovery based on folder paths, property values, and link resolution
2. **Property Comparison**: Tests link matching, case-insensitive strings, and array handling
3. **Frontmatter Manipulation**: Tests YAML property addition while preserving existing content
4. **Bulk Operations**: Tests mass property updates with backup creation and error handling
5. **Settings Management**: Tests configuration loading, saving, and validation

### Running Tests
Run the test suite before making changes to ensure core functionality remains stable:
```bash
npm test                    # Run all tests
npm run test:watch         # Development mode with file watching
npm run test:coverage      # Generate coverage report in coverage/
```