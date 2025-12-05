#!/usr/bin/env node

/**
 * Basic verification script to check if the extension compiles and has correct structure
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Auto TODO Manager Extension...\n');

let errors = [];
let warnings = [];

// Check if dist files exist
const distFiles = [
  'dist/extension.js',
  'dist/todoTree.js',
  'dist/extension.js.map',
  'dist/todoTree.js.map'
];

console.log('📦 Checking compiled files...');
distFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    errors.push(`Missing file: ${file}`);
    console.log(`  ❌ ${file} - MISSING`);
  }
});

// Check package.json
console.log('\n📋 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check version
  console.log(`  ✅ Version: ${packageJson.version}`);
  
  // Check main entry
  if (packageJson.main === './dist/extension.js') {
    console.log(`  ✅ Main entry: ${packageJson.main}`);
  } else {
    errors.push('Main entry point incorrect');
  }
  
  // Check commands
  const commands = packageJson.contributes?.commands || [];
  console.log(`  ✅ Commands defined: ${commands.length}`);
  
  // Check configuration
  const config = packageJson.contributes?.configuration?.properties || {};
  const configKeys = Object.keys(config);
  console.log(`  ✅ Configuration options: ${configKeys.length}`);
  
  // Check required commands
  const requiredCommands = [
    'autoTodoManager.refresh',
    'autoTodoManager.filterByType',
    'autoTodoManager.searchText',
    'autoTodoManager.markAsDone'
  ];
  
  const definedCommands = commands.map(c => c.command);
  requiredCommands.forEach(cmd => {
    if (definedCommands.includes(cmd)) {
      console.log(`  ✅ Command: ${cmd}`);
    } else {
      warnings.push(`Command not found: ${cmd}`);
      console.log(`  ⚠️  Command: ${cmd} - NOT FOUND`);
    }
  });
  
} catch (err) {
  errors.push(`Error reading package.json: ${err.message}`);
}

// Check source files
console.log('\n📝 Checking source files...');
const sourceFiles = [
  'src/extension.ts',
  'src/todoTree.ts'
];

sourceFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    console.log(`  ✅ ${file} (${lines} lines)`);
    
    // Check for exports
    if (file === 'src/extension.ts') {
      if (content.includes('export function activate')) {
        console.log(`    ✅ activate function exported`);
      } else {
        errors.push('activate function not exported');
      }
      
      if (content.includes('export function matchLine')) {
        console.log(`    ✅ matchLine function exported`);
      } else {
        warnings.push('matchLine function not exported (may break tests)');
      }
    }
    
    if (file === 'src/todoTree.ts') {
      if (content.includes('export class TodoTreeDataProvider')) {
        console.log(`    ✅ TodoTreeDataProvider exported`);
      } else {
        errors.push('TodoTreeDataProvider not exported');
      }
    }
  } else {
    errors.push(`Missing source file: ${file}`);
  }
});

// Summary
console.log('\n📊 Summary:');
if (errors.length === 0 && warnings.length === 0) {
  console.log('  ✅ All checks passed!');
  process.exit(0);
} else {
  if (warnings.length > 0) {
    console.log(`  ⚠️  Warnings: ${warnings.length}`);
    warnings.forEach(w => console.log(`    - ${w}`));
  }
  if (errors.length > 0) {
    console.log(`  ❌ Errors: ${errors.length}`);
    errors.forEach(e => console.log(`    - ${e}`));
    process.exit(1);
  }
  process.exit(0);
}

