#!/usr/bin/env node
/**
 * Marvel's Basket — Centralized Docker Orchestration Script
 * Controls all Docker Compose lifecycle operations from repository root.
 */

const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '../..');
const dockerDir = path.join(rootDir, 'infrastructure/docker');
const composeBase = path.join(dockerDir, 'compose.yaml');
const composeOverride = path.join(dockerDir, 'compose.override.yaml');

// Determine env file to use
let envFile = path.join(rootDir, '.env');
if (!fs.existsSync(envFile)) {
  const localDockerEnv = path.join(dockerDir, '.env');
  if (fs.existsSync(localDockerEnv)) {
    envFile = localDockerEnv;
  } else {
    envFile = path.join(rootDir, '.env.example');
  }
}

// Build base arguments for docker compose
function getComposeArgs(extraArgs = []) {
  const args = ['compose', '--project-directory', dockerDir, '-f', composeBase];

  if (fs.existsSync(composeOverride)) {
    args.push('-f', composeOverride);
  }

  if (fs.existsSync(envFile)) {
    args.push('--env-file', envFile);
  }

  return args.concat(extraArgs);
}

// Run docker command synchronously with inherited stdio
function runDockerSync(extraArgs, options = {}) {
  const fullArgs = getComposeArgs(extraArgs);
  const result = spawnSync('docker', fullArgs, {
    cwd: rootDir,
    stdio: 'inherit',
    ...options,
  });
  return result.status === 0;
}

// Run docker command synchronously and capture output
function getDockerOutput(extraArgs) {
  const fullArgs = getComposeArgs(extraArgs);
  const result = spawnSync('docker', fullArgs, {
    cwd: rootDir,
    encoding: 'utf-8',
  });
  return {
    success: result.status === 0,
    stdout: result.stdout ? result.stdout.trim() : '',
    stderr: result.stderr ? result.stderr.trim() : '',
  };
}

// Check if Docker daemon is running
function checkDockerDaemon() {
  const check = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    encoding: 'utf-8',
  });
  if (check.status !== 0) {
    console.error('\n[Docker Error] Docker daemon is not running or not accessible.');
    console.error('Please ensure Docker Desktop or dockerd is running and try again.\n');
    process.exit(1);
  }
}

// Print header
function printHeader(action) {
  console.log(`\n============================================================`);
  console.log(` MARVEL'S BASKET — DOCKER ORCHESTRATION: ${action.toUpperCase()}`);
  console.log(`============================================================`);
  console.log(` Compose File:  infrastructure/docker/compose.yaml`);
  console.log(` Environment:   ${path.relative(rootDir, envFile)}`);
  console.log(` Working Dir:   ${rootDir}\n`);
}

// Command implementations
const commands = {
  up: () => {
    printHeader('up');
    checkDockerDaemon();
    console.log('[Docker] Starting PostgreSQL and Redis containers in detached mode...');
    const success = runDockerSync(['up', '-d', '--remove-orphans']);
    if (success) {
      console.log('\n[Docker] Services started. Running health check...');
      commands.health();
    }
  },

  down: () => {
    printHeader('down');
    checkDockerDaemon();
    console.log('[Docker] Stopping containers (named persistent volumes are preserved)...');
    runDockerSync(['down', '--remove-orphans']);
    console.log('[Docker] Stopped successfully. Data volumes remain intact.');
  },

  restart: () => {
    printHeader('restart');
    checkDockerDaemon();
    console.log('[Docker] Restarting development services...');
    runDockerSync(['down', '--remove-orphans']);
    runDockerSync(['up', '-d', '--remove-orphans']);
    console.log('[Docker] Services restarted.');
    commands.health();
  },

  ps: () => {
    checkDockerDaemon();
    runDockerSync(['ps']);
  },

  logs: (args) => {
    checkDockerDaemon();
    const service = args[0];
    const logArgs = ['logs', '-f', '--tail=100'];
    if (service) {
      logArgs.push(service);
    }
    const fullArgs = getComposeArgs(logArgs);
    const child = spawn('docker', fullArgs, {
      cwd: rootDir,
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  },

  build: () => {
    printHeader('build');
    checkDockerDaemon();
    runDockerSync(['build']);
  },

  pull: () => {
    printHeader('pull');
    checkDockerDaemon();
    runDockerSync(['pull']);
  },

  config: () => {
    checkDockerDaemon();
    runDockerSync(['config']);
  },

  health: () => {
    checkDockerDaemon();
    console.log('[Docker Health] Inspecting service health states...\n');
    const psRes = getDockerOutput(['ps', '--format', 'json']);
    if (!psRes.success || !psRes.stdout) {
      console.log('No running containers found.');
      return;
    }

    try {
      const lines = psRes.stdout.split('\n').filter(Boolean);
      for (const line of lines) {
        const item = JSON.parse(line);
        const name = item.Names || item.Name || item.Service;
        const state = item.State || item.Status;
        const health = item.Health || 'N/A';
        const ports = item.Ports || 'none';
        console.log(` Service:  ${item.Service || name}`);
        console.log(` Container: ${name}`);
        console.log(` Status:    ${state}`);
        console.log(` Health:    ${health}`);
        console.log(` Ports:     ${ports}`);
        console.log(' -----------------------------------------------------------');
      }
    } catch {
      // Fallback to table output
      runDockerSync(['ps']);
    }
  },

  clean: () => {
    printHeader('clean');
    checkDockerDaemon();
    console.log('[Docker Clean] Removing stopped containers and unused networks...');
    runDockerSync(['down', '--remove-orphans']);
    console.log('[Docker Clean] Containers stopped. Named volumes were NOT deleted.');
  },

  reset: async (args) => {
    printHeader('reset (DESTRUCTIVE)');
    checkDockerDaemon();

    const hasConfirmFlag = args.includes('--confirm') || args.includes('-y');

    console.warn('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.warn(' WARNING: DESTRUCTIVE ACTION REQUESTED');
    console.warn(' This command will STOP all containers and PERMANENTLY DELETE');
    console.warn(' all data in the following persistent volumes:');
    console.warn('   - marvels_basket_postgres_data');
    console.warn('   - marvels_basket_redis_data');
    console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');

    const executeReset = () => {
      console.log('[Docker Reset] Proceeding with volume deletion...');
      runDockerSync(['down', '-v', '--remove-orphans']);
      console.log('[Docker Reset] Completed. All volumes and containers removed.\n');
    };

    if (hasConfirmFlag) {
      executeReset();
      return;
    }

    if (!process.stdin.isTTY) {
      console.error(
        '[Error] Interactive confirmation not available. Pass --confirm to execute reset.',
      );
      process.exit(1);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      'Are you sure you want to delete all local development databases? (type "DELETE" to confirm): ',
      (answer) => {
        rl.close();
        if (answer.trim() === 'DELETE') {
          executeReset();
        } else {
          console.log('[Docker Reset] Operation cancelled. No data was deleted.');
        }
      },
    );
  },
};

// Dispatch action
const [, , action = 'ps', ...extraArgs] = process.argv;

if (commands[action]) {
  commands[action](extraArgs);
} else {
  console.error(`\nUnknown action: "${action}"`);
  console.log(
    `Available actions: up, down, restart, ps, logs, build, pull, config, health, clean, reset\n`,
  );
  process.exit(1);
}
