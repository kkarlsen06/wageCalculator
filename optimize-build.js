#!/usr/bin/env node

/**
 * Simple build optimization script
 * Optimizes CSS and JS files for production
 */

const fs = require('fs');
const path = require('path');

// Simple CSS minifier
function minifyCSS(css) {
    return css
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around special characters
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        // Remove trailing semicolons
        .replace(/;}/g, '}')
        // Remove leading/trailing whitespace
        .trim();
}

// Simple JS minifier (basic)
function minifyJS(js) {
    return js
        // Remove single-line comments (but preserve URLs)
        .replace(/(?<!:)\/\/.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove console.log statements (production optimization)
        .replace(/console\.(log|debug|info|warn|error)\([^)]*\);?\s*/g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around operators
        .replace(/\s*([=+\-*/%!<>&|{}();,])\s*/g, '$1')
        .trim();
}

// Get file size in KB
function getFileSizeKB(filepath) {
    try {
        const stats = fs.statSync(filepath);
        return (stats.size / 1024).toFixed(2);
    } catch (e) {
        return '0.00';
    }
}

// Optimize file
function optimizeFile(inputPath, outputPath, minifier) {
    try {
        const originalContent = fs.readFileSync(inputPath, 'utf8');
        const minifiedContent = minifier(originalContent);
        
        fs.writeFileSync(outputPath, minifiedContent);
        
        const originalSize = getFileSizeKB(inputPath);
        const minifiedSize = getFileSizeKB(outputPath);
        const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        
        console.log(`✓ ${path.basename(inputPath)}: ${originalSize}KB → ${minifiedSize}KB (${savings}% smaller)`);
        
        return {
            original: parseFloat(originalSize),
            minified: parseFloat(minifiedSize),
            savings: parseFloat(savings)
        };
    } catch (error) {
        console.error(`✗ Error optimizing ${inputPath}:`, error.message);
        return null;
    }
}

// Main optimization function
function optimizeBuild() {
    console.log('🚀 Starting build optimization...\n');
    
    const results = {
        css: [],
        js: [],
        totalOriginal: 0,
        totalMinified: 0
    };
    
    // CSS files to optimize
    const cssFiles = [
        { input: 'kalkulator/css/style.css', output: 'kalkulator/css/style.min.css' },
        { input: 'css/style.css', output: 'css/style.min.css' },
        { input: 'kalkulator/css/performance-critical.css', output: 'kalkulator/css/performance-critical.min.css' }
    ];
    
    // JS files to optimize
    const jsFiles = [
        { input: 'kalkulator/js/appLogic.js', output: 'kalkulator/js/appLogic.min.js' },
        { input: 'kalkulator/js/auth.js', output: 'kalkulator/js/auth.min.js' },
        { input: 'kalkulator/js/app.js', output: 'kalkulator/js/app.min.js' },
        { input: 'kalkulator/js/logger.js', output: 'kalkulator/js/logger.min.js' },
        { input: 'kalkulator/js/performance-monitor.js', output: 'kalkulator/js/performance-monitor.min.js' },
        { input: 'kalkulator/js/dom-cache.js', output: 'kalkulator/js/dom-cache.min.js' },
        { input: 'js/animations.js', output: 'js/animations.min.js' },
        { input: 'js/loading-helpers.js', output: 'js/loading-helpers.min.js' },
        { input: 'js/error-handling.js', output: 'js/error-handling.min.js' }
    ];
    
    console.log('📦 Optimizing CSS files:');
    cssFiles.forEach(file => {
        if (fs.existsSync(file.input)) {
            const result = optimizeFile(file.input, file.output, minifyCSS);
            if (result) {
                results.css.push(result);
                results.totalOriginal += result.original;
                results.totalMinified += result.minified;
            }
        } else {
            console.log(`⚠ Skipping ${file.input} (not found)`);
        }
    });
    
    console.log('\n📦 Optimizing JS files:');
    jsFiles.forEach(file => {
        if (fs.existsSync(file.input)) {
            const result = optimizeFile(file.input, file.output, minifyJS);
            if (result) {
                results.js.push(result);
                results.totalOriginal += result.original;
                results.totalMinified += result.minified;
            }
        } else {
            console.log(`⚠ Skipping ${file.input} (not found)`);
        }
    });
    
    // Generate optimization report
    console.log('\n📊 Optimization Summary:');
    console.log('========================');
    
    const cssOriginal = results.css.reduce((sum, r) => sum + r.original, 0);
    const cssMinified = results.css.reduce((sum, r) => sum + r.minified, 0);
    const cssSavings = cssOriginal > 0 ? ((cssOriginal - cssMinified) / cssOriginal * 100) : 0;
    
    const jsOriginal = results.js.reduce((sum, r) => sum + r.original, 0);
    const jsMinified = results.js.reduce((sum, r) => sum + r.minified, 0);
    const jsSavings = jsOriginal > 0 ? ((jsOriginal - jsMinified) / jsOriginal * 100) : 0;
    
    const totalSavings = results.totalOriginal > 0 ? 
        ((results.totalOriginal - results.totalMinified) / results.totalOriginal * 100) : 0;
    
    console.log(`CSS: ${cssOriginal.toFixed(2)}KB → ${cssMinified.toFixed(2)}KB (${cssSavings.toFixed(1)}% smaller)`);
    console.log(`JS:  ${jsOriginal.toFixed(2)}KB → ${jsMinified.toFixed(2)}KB (${jsSavings.toFixed(1)}% smaller)`);
    console.log(`Total: ${results.totalOriginal.toFixed(2)}KB → ${results.totalMinified.toFixed(2)}KB (${totalSavings.toFixed(1)}% smaller)`);
    
    // Create production HTML files
    console.log('\n🔧 Creating production HTML files...');
    createProductionHTML();
    
    console.log('\n✅ Build optimization complete!');
    console.log('\n💡 Next steps:');
    console.log('   • Enable gzip compression on your server');
    console.log('   • Set up proper cache headers');
    console.log('   • Consider implementing a service worker');
    console.log('   • Monitor Core Web Vitals');
}

// Create production HTML files with minified assets
function createProductionHTML() {
    try {
        // Production version of app.html
        let appHtml = fs.readFileSync('kalkulator/app.html', 'utf8');
        
        // Replace with minified versions
        appHtml = appHtml
            .replace('css/performance-critical.css', 'css/performance-critical.min.css')
            .replace('css/style.css', 'css/style.min.css')
            .replace('js/logger.js', 'js/logger.min.js')
            .replace('js/performance-monitor.js', 'js/performance-monitor.min.js')
            .replace('js/dom-cache.js', 'js/dom-cache.min.js')
            .replace('js/app.js?v=7', 'js/app.min.js?v=7');
        
        fs.writeFileSync('kalkulator/app.prod.html', appHtml);
        console.log('✓ Created kalkulator/app.prod.html');
        
        // Production version of index.html if it exists
        if (fs.existsSync('index.html')) {
            let indexHtml = fs.readFileSync('index.html', 'utf8');
            indexHtml = indexHtml
                .replace('css/style.css', 'css/style.min.css')
                .replace('js/animations.js', 'js/animations.min.js')
                .replace('js/loading-helpers.js', 'js/loading-helpers.min.js')
                .replace('js/error-handling.js', 'js/error-handling.min.js');
            
            fs.writeFileSync('index.prod.html', indexHtml);
            console.log('✓ Created index.prod.html');
        }
        
    } catch (error) {
        console.error('✗ Error creating production HTML files:', error.message);
    }
}

// Run optimization if called directly
if (require.main === module) {
    optimizeBuild();
}

module.exports = { optimizeBuild, minifyCSS, minifyJS };