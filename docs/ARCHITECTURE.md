# Architecture Documentation

## Overview

The Entity Schema Manager follows a modular architecture with clear separation of concerns. The plugin is built using TypeScript with strict typing and follows Obsidian plugin conventions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Entry Point                       │
│                      (main.ts)                             │
├─────────────────────────────────────────────────────────────┤
│  Commands    │  Ribbon UI   │  Settings Tab  │  Event Loop  │
└─────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Core Services Layer                       │
├──────────────────┬──────────────────┬──────────────────────┤
│  EntityScanner   │  SchemaManager   │   BulkOperations     │
│                  │                  │                      │
│ • Entity Discovery│ • Schema Loading │ • Property Addition  │
│ • Validation     │ • File I/O       │ • Backup Management  │
│ • Filtering      │ • Validation     │ • Batch Processing   │
└──────────────────┴──────────────────┴──────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                     UI Components                           │
├──────────────────┬──────────────────┬──────────────────────┤
│   Modals         │  Settings UI     │   Dashboard          │
│                  │                  │                      │
│ • Add Property   │ • Schema Config  │ • Entity Overview    │
│ • Bulk Preview   │ • General Opts   │ • Validation Status  │
│ • Validation     │ • Entity Display │ • Type Grouping      │
│ • Schema Drift   │                  │                      │
└──────────────────┴──────────────────┴──────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
├──────────────────┬──────────────────┬──────────────────────┤
│   Type System    │   File System    │   Obsidian API      │
│                  │                  │                      │
│ • EntitySchema   │ • Schema Files   │ • Vault Access      │
│ • EntityInstance │ • Backup Files   │ • Metadata Cache    │
│ • Settings       │ • YAML Parser    │ • File Operations   │
└──────────────────┴──────────────────┴──────────────────────┘
```

## Core Components

### Main Plugin (`main.ts`)

**Responsibilities:**
- Plugin lifecycle management (load/unload)
- Command registration and routing
- Service initialization and dependency injection
- Settings persistence and loading
- UI element creation (ribbon, commands)

**Key Patterns:**
- **Plugin Factory**: Creates and configures service instances
- **Command Router**: Maps user commands to service methods
- **Settings Manager**: Handles configuration persistence

```typescript
class EntitySchemaPlugin extends Plugin {
  // Service instances
  schemaManager: SchemaManager;
  entityScanner: EntityScanner;
  bulkOperations: BulkOperations;
  
  // Plugin lifecycle
  async onload() { /* initialization */ }
  
  // Command handlers
  async scanEntities() { /* delegates to entityScanner */ }
  async validateEntities() { /* coordination logic */ }
}
```

### Entity Scanner (`src/entity-scanner.ts`)

**Responsibilities:**
- Entity discovery across vault files
- Schema matching and validation
- Link resolution and property comparison
- Caching and state management

**Key Algorithms:**

**Entity Matching Pipeline:**
```
File → Has Frontmatter? → Match Criteria Check → Property Validation → EntityInstance
```

**Link Resolution Strategy:**
1. Extract link path from Obsidian format
2. Resolve using MetadataCache API
3. Compare resolved files or fall back to string comparison
4. Support multiple link formats (full path, basename, display text)

**Performance Considerations:**
- Sequential file processing (O(n) vault size)
- Regex-based link parsing
- Metadata cache dependency for link resolution

### Schema Manager (`src/schema-manager.ts`)

**Responsibilities:**
- Schema loading with fallback hierarchy
- Schema validation and type checking
- File-based configuration management
- Default schema provision

**Loading Strategy:**
```
entity-schemas.json → Validation → Success
        ↓ (if fails)
   Default Schemas → Return
```

**Validation Layers:**
1. **Structure Validation**: Required fields, correct types
2. **Property Validation**: Valid property definitions
3. **Criteria Validation**: Well-formed match criteria
4. **Semantic Validation**: Logical consistency

### Bulk Operations (`src/bulk-operations.ts`)

**Responsibilities:**
- Safe bulk property modifications
- Backup creation and management
- YAML frontmatter manipulation
- Error handling and rollback

**Operation Flow:**
```
Entities → Backup (if enabled) → Property Addition → File Update → Result Summary
```

**Safety Mechanisms:**
- Pre-operation backups with timestamps
- Individual file error isolation
- Operation result tracking
- User confirmation through preview modal

## UI Architecture

### Modal System

**Base Pattern:**
```typescript
class BaseModal extends Modal {
  constructor(app: App, data: T) { /* setup */ }
  onOpen() { /* create UI */ }
  onClose() { /* cleanup */ }
}
```

**Modal Types:**
- **AddPropertyModal**: Property addition workflow
- **BulkOperationPreviewModal**: Operation confirmation with selection
- **ValidationResultModal**: Validation results display
- **SchemaDriftModal**: Missing property identification
- **EntityDashboardModal**: Comprehensive entity overview

### Settings Integration

**Obsidian Settings Pattern:**
```typescript
class EntitySchemaSettingTab extends PluginSettingTab {
  display() {
    // Dynamic UI generation based on current state
    // Schema management section
    // General configuration options
    // Entity discovery preview
  }
}
```

**Dynamic UI Features:**
- Real-time schema source indication
- Collapsible entity type sections
- Interactive entity navigation
- Refresh capabilities

## Data Flow

### Entity Discovery Flow

```
User Command → EntityScanner.scanEntities() → File Iteration → Schema Matching → EntityInstance Creation → Cache Update → UI Notification
```

### Bulk Operation Flow

```
User Input → Target Selection → BulkOperationPreviewModal → User Confirmation → BulkOperations.performBulkPropertyAddition() → File Updates → Result Display
```

### Schema Management Flow

```
Plugin Load → SchemaManager.loadSchemas() → File Check → Validation → Schema Cache → UI Update
```

## Type System

### Core Domain Types

**EntitySchema**: Configuration for entity type
**PropertyDefinition**: Property structure and validation
**MatchCriteria**: Rules for entity identification
**EntityInstance**: Discovered entity with validation state
**ValidationResults**: Validation summary and issues

### Settings and Configuration

**EntitySchemaSettings**: Plugin configuration state
**SchemaSource**: Schema loading source tracking

### Utility Types

TypeScript utility types used throughout:
- `Record<string, T>`: Property dictionaries
- `Promise<T>`: Async operation results
- Optional properties with `?` operator
- Union types for enums and options

## File System Integration

### Schema File Management

**Location**: `entity-schemas.json` at vault root
**Format**: Human-readable JSON with 2-space indentation
**Versioning**: No explicit versioning (future enhancement)

### Backup System

**Location**: `entity-schema-backups/` folder
**Naming**: `{original-name}.backup.{timestamp}.md`
**Cleanup**: Manual (no automatic cleanup)

### YAML Frontmatter Handling

**Strategy**: Regex-based parsing and modification
**Safety**: Preserves existing structure and formatting
**Limitations**: Basic YAML support (no complex structures)

## Error Handling Strategy

### Error Categories

1. **User Errors**: Invalid input, missing files
2. **System Errors**: File permissions, vault unavailable
3. **Data Errors**: Corrupted schemas, invalid YAML
4. **Logic Errors**: Programming mistakes, edge cases

### Recovery Patterns

**Graceful Degradation**: Continue operation with partial failure
**Fallback Strategies**: Default schemas, skip invalid entities
**User Notification**: Clear error messages with context
**Error Boundaries**: Isolate failures to prevent cascade

### Validation Pipeline

```
Input → Structural Validation → Semantic Validation → Type Checking → Success/Error
```

## Performance Characteristics

### Scalability Limits

**Entity Count**: Tested up to ~1000 entities
**File Size**: No explicit limits, depends on Obsidian
**Schema Complexity**: Limited by matching algorithm complexity

### Bottlenecks

1. **Sequential File Processing**: O(n) with vault size
2. **Regex Operations**: Pattern matching overhead
3. **File I/O**: Disk access for each operation
4. **Link Resolution**: MetadataCache API calls

### Optimization Strategies

**Caching**: Entity instances cached between operations
**Batch Processing**: Group file operations where possible
**Lazy Loading**: Load schemas only when needed
**Selective Updates**: Target specific entity types

## Extension Points

### Adding New Property Types

1. Extend `PropertyDefinition.type` union
2. Add validation logic in `SchemaManager`
3. Update UI input handling in modals
4. Implement default value formatting

### Custom Match Criteria

1. Extend `MatchCriteria` interface
2. Add matching logic in `EntityScanner.matchesSchema()`
3. Update schema validation
4. Add settings UI components

### New Bulk Operations

1. Create operation class following `BulkOperations` pattern
2. Add command registration in `main.ts`
3. Create preview modal for operation
4. Implement backup and error handling

## Testing Architecture

### Test Structure

```
tests/
├── unit/           # Isolated component testing
├── integration/    # Multi-component workflows
├── fixtures/       # Test data and schemas
└── mocks/         # Obsidian API mocking
```

### Testing Patterns

**Mock Strategy**: Full Obsidian API mocking for isolation
**Test Data**: Realistic entity schemas and frontmatter
**Coverage Goals**: Core logic and error paths
**Integration Focus**: End-to-end workflows

### Test Categories

1. **Unit Tests**: Individual methods and functions
2. **Integration Tests**: Component interaction
3. **Schema Validation**: Edge cases and error conditions
4. **File Operations**: Backup and modification safety

## Future Architectural Considerations

### Scalability Improvements

- **Incremental Scanning**: Only process changed files
- **Background Processing**: Use web workers for large operations
- **Indexing**: Build entity index for faster queries
- **Pagination**: Handle large entity sets in UI

### Modularity Enhancements

- **Plugin System**: Allow third-party extensions
- **Event System**: Pub/sub for loose coupling
- **Service Registry**: Dynamic service discovery
- **Configuration Schema**: Versioned configuration format

### Performance Optimization

- **Parallel Processing**: Concurrent file operations
- **Caching Layers**: Multi-level caching strategy
- **Lazy Evaluation**: Defer expensive operations
- **Memory Management**: Cleanup strategies for large vaults