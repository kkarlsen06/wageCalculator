#!/usr/bin/env node

import { readFileSync, writeFileSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');
const kalkulatorDir = join(distDir, 'kalkulator');

// Find the built CSS and JS files
function findBuiltAssets() {
  const assetsDir = join(kalkulatorDir, 'assets');
  const files = readdirSync(assetsDir);
  
  const cssFile = files.find(file => file.endsWith('.css'));
  const jsFile = readdirSync(kalkulatorDir).find(file => file.endsWith('.js') && !file.includes('chunks'));
  const loginJsFile = readdirSync(kalkulatorDir).find(file => file.startsWith('login-') && file.endsWith('.js'));
  const manifestFile = readdirSync(join(distDir, 'assets')).find(file => file.startsWith('manifest-'));
  
  return {
    css: cssFile ? `assets/${cssFile}` : null,
    js: jsFile ? jsFile : null,
    loginJs: loginJsFile ? loginJsFile : null,
    manifest: manifestFile ? `../assets/${manifestFile}` : null
  };
}

// Update the login.html file with correct asset paths
function updateLoginHtml(assets) {
  const loginHtmlPath = join(kalkulatorDir, 'login.html');
  const sourceLoginHtmlPath = join(projectRoot, 'kalkulator', 'login.html');
  
  // Copy the source login.html to dist
  copyFileSync(sourceLoginHtmlPath, loginHtmlPath);
  
  // Read and update the content
  let content = readFileSync(loginHtmlPath, 'utf8');
  
  // Update CSS path
  if (assets.css) {
    content = content.replace(
      /href="css\/style\.css"/,
      `href="${assets.css}"`
    );
  }
  
  // Update JavaScript path - prefer login-specific JS if available
  if (assets.loginJs) {
    content = content.replace(
      /src="js\/auth\.js"/,
      `src="${assets.loginJs}"`
    );
  } else if (assets.js) {
    content = content.replace(
      /src="js\/auth\.js"/,
      `src="${assets.js}"`
    );
  }
  
  // Update manifest path
  if (assets.manifest) {
    content = content.replace(
      /href="manifest\.json"/,
      `href="${assets.manifest}"`
    );
  }
  
  // Write the updated content back
  writeFileSync(loginHtmlPath, content);
  
  console.log('✅ Updated login.html with correct asset paths');
  console.log(`   CSS: ${assets.css}`);
  console.log(`   JS: ${assets.loginJs || assets.js}`);
  console.log(`   Manifest: ${assets.manifest}`);
}

// Main execution
try {
  console.log('🔧 Running postbuild script...');
  
  // Find built assets
  const assets = findBuiltAssets();
  
  if (!assets.css || (!assets.js && !assets.loginJs)) {
    throw new Error('Could not find built CSS or JS files');
  }
  
  // Update login.html
  updateLoginHtml(assets);
  
  console.log('✅ Postbuild completed successfully');
} catch (error) {
  console.error('❌ Postbuild failed:', error.message);
  process.exit(1);
}