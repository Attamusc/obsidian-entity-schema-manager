import fs from 'fs';
import path from 'path';

const VAULT_PLUGIN_DIR = './test-vault/.obsidian/plugins/obsidian-entity-schema-manager';

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${src} to ${dest}`);
    }
}

// Ensure the plugin directory exists
ensureDir(VAULT_PLUGIN_DIR);

// Copy the required files
copyFile('./manifest.json', path.join(VAULT_PLUGIN_DIR, 'manifest.json'));
copyFile('./main.js', path.join(VAULT_PLUGIN_DIR, 'main.js'));

// Copy styles.css if it exists
if (fs.existsSync('./styles.css')) {
    copyFile('./styles.css', path.join(VAULT_PLUGIN_DIR, 'styles.css'));
}

// Ensure .hotreload file exists for hot-reload plugin detection
const hotreloadFile = path.join(VAULT_PLUGIN_DIR, '.hotreload');
if (!fs.existsSync(hotreloadFile)) {
    fs.writeFileSync(hotreloadFile, '');
    console.log('Created .hotreload file for hot-reload plugin detection');
}

console.log('Development vault setup complete!');