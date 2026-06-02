import { cpSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, 'dist');
const srcDir = resolve(__dirname, 'src');

// Copy manifest.json
cpSync(resolve(srcDir, 'manifest.json'), resolve(distDir, 'manifest.json'));

// Copy icons
mkdirSync(resolve(distDir, 'icons'), { recursive: true });
cpSync(resolve(srcDir, 'icons', 'icon16.png'), resolve(distDir, 'icons', 'icon16.png'));
cpSync(resolve(srcDir, 'icons', 'icon48.png'), resolve(distDir, 'icons', 'icon48.png'));
cpSync(resolve(srcDir, 'icons', 'icon128.png'), resolve(distDir, 'icons', 'icon128.png'));

console.log('✅ Assets copied to dist/');
