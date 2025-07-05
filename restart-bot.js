#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔄 Restarting Instagram Bot...');

// Kill any existing Node.js processes that might be running the bot
const killProcesses = () => {
  return new Promise((resolve) => {
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      // Windows
      command = spawn('taskkill', ['/f', '/im', 'node.exe'], { stdio: 'ignore' });
    } else {
      // Linux/Mac
      command = spawn('pkill', ['-f', 'telegram-bot'], { stdio: 'ignore' });
    }
    
    command.on('close', () => {
      console.log('✅ Killed existing processes');
      resolve();
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.log('⚠️ Timeout killing processes, continuing...');
      resolve();
    }, 5000);
  });
};

// Wait a moment for processes to fully terminate
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Start the bot
const startBot = () => {
  console.log('🚀 Starting bot...');
  
  const botProcess = spawn('npm', ['run', 'telegram'], {
    stdio: 'inherit',
    shell: true
  });
  
  botProcess.on('error', (error) => {
    console.error('❌ Failed to start bot:', error);
  });
  
  botProcess.on('close', (code) => {
    console.log(`Bot process exited with code ${code}`);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    botProcess.kill('SIGINT');
    process.exit(0);
  });
};

// Main restart sequence
const restart = async () => {
  try {
    await killProcesses();
    await wait(3000); // Wait 3 seconds
    startBot();
  } catch (error) {
    console.error('❌ Error during restart:', error);
    startBot(); // Try to start anyway
  }
};

restart(); 