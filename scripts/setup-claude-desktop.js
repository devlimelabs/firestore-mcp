#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
const CONFIG_FILE = path.join(CONFIG_DIR, 'claude_desktop_config.json');

function setupClaudeDesktop() {
  console.log('Setting up Firestore MCP for Claude Desktop...\n');

  // Check if config directory exists
  if (!fs.existsSync(CONFIG_DIR)) {
    console.log(`Creating config directory: ${CONFIG_DIR}`);
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Read existing config or create new one
  let config = { mcpServers: {} };
  if (fs.existsSync(CONFIG_FILE)) {
    console.log('Reading existing Claude Desktop config...');
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }

  // Get the path to this package
  const packagePath = path.resolve(process.cwd());
  const distPath = path.join(packagePath, 'dist', 'index.js');

  // Check if built
  if (!fs.existsSync(distPath)) {
    console.log('Building Firestore MCP...');
    execSync('pnpm build', { cwd: packagePath, stdio: 'inherit' });
  }

  // Prompt for configuration
  console.log('\nConfiguring Firestore MCP:');
  console.log('1. Using environment variables (recommended)');
  console.log('2. Using hardcoded values');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\nChoose option (1 or 2): ', (choice) => {
    const firestoreConfig = {
      command: 'node',
      args: [distPath],
      env: {}
    };

    if (choice === '2') {
      readline.question('Enter Firestore Project ID: ', (projectId) => {
        firestoreConfig.env.FIRESTORE_PROJECT_ID = projectId;
        
        readline.question('Enter path to service account JSON (optional): ', (credPath) => {
          if (credPath) {
            firestoreConfig.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
          }
          
          completeSetup(config, firestoreConfig);
          readline.close();
        });
      });
    } else {
      console.log('\nUsing environment variables.');
      console.log('Make sure to set these in your shell:');
      console.log('  export FIRESTORE_PROJECT_ID=your-project-id');
      console.log('  export GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json\n');
      
      completeSetup(config, firestoreConfig);
      readline.close();
    }
  });
}

function completeSetup(config, firestoreConfig) {
  // Add permission configuration
  const permissionPath = path.join(process.cwd(), 'permissions.json');
  
  if (fs.existsSync(permissionPath)) {
    console.log('Found permissions.json, adding to configuration...');
    firestoreConfig.args.push('--config', permissionPath);
  } else {
    console.log('\nNo permissions.json found. Creating default configuration...');
    const defaultPermissions = {
      collections: [
        {
          collectionId: "users",
          operations: ["read", "write", "query"]
        },
        {
          collectionId: "posts",
          operations: ["read", "query"]
        }
      ],
      defaultAllow: false
    };
    
    fs.writeFileSync(permissionPath, JSON.stringify(defaultPermissions, null, 2));
    firestoreConfig.args.push('--config', permissionPath);
  }

  // Add to config
  config.mcpServers = config.mcpServers || {};
  config.mcpServers.firestore = firestoreConfig;

  // Write config
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  
  console.log('\n✅ Setup complete!');
  console.log(`Configuration written to: ${CONFIG_FILE}`);
  console.log('\nTo use in Claude Desktop:');
  console.log('1. Restart Claude Desktop');
  console.log('2. Look for "firestore" in the MCP tools menu');
  console.log('\nTo modify permissions, edit: permissions.json');
}

// Run setup
setupClaudeDesktop();