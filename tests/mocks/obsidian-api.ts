// Mock implementations for Obsidian API
export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.basename = this.name.replace(/\.[^/.]+$/, '');
    this.extension = this.name.split('.').pop() || '';
  }
}

export class MetadataCache {
  private cache: Map<string, any> = new Map();

  setFileCache(file: TFile, cache: any) {
    this.cache.set(file.path, cache);
  }

  getFileCache(file: TFile) {
    return this.cache.get(file.path) || null;
  }

  getFirstLinkpathDest(linkPath: string, sourcePath: string): TFile | null {
    // Mock implementation for link resolution
    // In real usage, this would resolve links to actual files
    const mockFiles = new Map([
      ['person', new TFile('atlas/entities/person.md')],
      ['team', new TFile('atlas/entities/team.md')],
      ['atlas/entities/person', new TFile('atlas/entities/person.md')],
      ['atlas/entities/team', new TFile('atlas/entities/team.md')],
      ['atlas/entities/person.md', new TFile('atlas/entities/person.md')],
      ['atlas/entities/team.md', new TFile('atlas/entities/team.md')],
    ]);

    return mockFiles.get(linkPath) || null;
  }
}

export class Vault {
  private files: TFile[] = [];
  private fileContents: Map<string, string> = new Map();

  addFile(file: TFile, content = '') {
    this.files.push(file);
    this.fileContents.set(file.path, content);
  }

  getMarkdownFiles(): TFile[] {
    return this.files.filter(f => f.extension === 'md');
  }

  async read(file: TFile): Promise<string> {
    return this.fileContents.get(file.path) || '';
  }

  async modify(file: TFile, content: string): Promise<void> {
    this.fileContents.set(file.path, content);
  }

  async create(path: string, content: string): Promise<TFile> {
    const file = new TFile(path);
    this.addFile(file, content);
    return file;
  }

  async createFolder(path: string): Promise<void> {
    // Mock implementation - in real Obsidian this creates a folder
  }

  adapter = {
    exists: jest.fn().mockResolvedValue(true),
  };
}

export class App {
  vault: Vault;
  metadataCache: MetadataCache;

  constructor() {
    this.vault = new Vault();
    this.metadataCache = new MetadataCache();
  }
}

export class Plugin {
  app: App;
  
  constructor(app: App) {
    this.app = app;
  }

  addRibbonIcon = jest.fn();
  addCommand = jest.fn();
  addSettingTab = jest.fn();
  loadData = jest.fn().mockResolvedValue({});
  saveData = jest.fn().mockResolvedValue(undefined);
}

export class PluginSettingTab {
  constructor(app: App, plugin: Plugin) {}
}

export class Setting {
  constructor(containerEl: any) {}
  setName = jest.fn().mockReturnThis();
  setDesc = jest.fn().mockReturnThis();
  addToggle = jest.fn().mockReturnThis();
  addText = jest.fn().mockReturnThis();
  addDropdown = jest.fn().mockReturnThis();
}

export class Modal {
  app: App;
  contentEl: any;

  constructor(app: App) {
    this.app = app;
    this.contentEl = {
      createEl: jest.fn().mockReturnValue({
        createEl: jest.fn().mockReturnValue({
          createEl: jest.fn().mockReturnValue({}),
          addEventListener: jest.fn(),
        }),
        addEventListener: jest.fn(),
      }),
      empty: jest.fn(),
    };
  }

  open = jest.fn();
  close = jest.fn();
  onOpen = jest.fn();
  onClose = jest.fn();
}

export const Notice = jest.fn().mockImplementation((message: string, timeout?: number) => {
  // Mock implementation - returns a mock object
  return {
    message,
    timeout
  };
});

export class ButtonComponent {
  constructor(containerEl: any) {}
  setButtonText = jest.fn().mockReturnThis();
  onClick = jest.fn().mockReturnThis();
}

export class DropdownComponent {
  private value = '';
  private options: Array<{ value: string; text: string }> = [];

  constructor(containerEl: any) {}

  addOption(value: string, text: string) {
    this.options.push({ value, text });
    if (this.options.length === 1) {
      this.value = value;
    }
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string) {
    this.value = value;
  }

  onChange = jest.fn().mockReturnThis();
}