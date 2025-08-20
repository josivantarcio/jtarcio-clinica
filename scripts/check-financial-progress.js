#!/usr/bin/env node

/**
 * 📊 EO Clínica - Financial Module Progress Checker
 * Automated progress tracking for financial module implementation
 * Usage: node scripts/check-financial-progress.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
};

const PROJECT_ROOT = path.resolve(__dirname, '..');

// File/directory existence checks
const checks = [
  // Phase 1: Foundation
  {
    phase: 1,
    name: 'Financial types',
    type: 'file',
    path: 'src/types/financial/index.ts',
    critical: true
  },
  {
    phase: 1,
    name: 'Financial service',
    type: 'file',
    path: 'src/services/financial/financial.service.ts',
    critical: true
  },
  {
    phase: 1,
    name: 'Financial middleware',
    type: 'file',
    path: 'src/middleware/financial/auth.middleware.ts',
    critical: true
  },
  {
    phase: 1,
    name: 'Financial routes',
    type: 'file',
    path: 'src/routes/financial/index.ts',
    critical: true
  },
  {
    phase: 1,
    name: 'Transactions routes',
    type: 'file',
    path: 'src/routes/financial/transactions.ts',
    critical: false
  },
  {
    phase: 1,
    name: 'Receivables routes',
    type: 'file',
    path: 'src/routes/financial/receivables.ts',
    critical: false
  },
  {
    phase: 1,
    name: 'Payables routes',
    type: 'file',
    path: 'src/routes/financial/payables.ts',
    critical: false
  },
  
  // Phase 2: Frontend
  {
    phase: 2,
    name: 'Financial main page',
    type: 'file',
    path: 'frontend/src/app/financial/page.tsx',
    critical: true
  },
  {
    phase: 2,
    name: 'Financial components directory',
    type: 'directory',
    path: 'frontend/src/components/financial',
    critical: true
  },
  {
    phase: 2,
    name: 'Dashboard components',
    type: 'directory',
    path: 'frontend/src/components/financial/dashboard',
    critical: false
  },
  {
    phase: 2,
    name: 'Receivables page',
    type: 'file',
    path: 'frontend/src/app/financial/receivables/page.tsx',
    critical: false
  },
  
  // Phase 3: Advanced features
  {
    phase: 3,
    name: 'Payables page',
    type: 'file',
    path: 'frontend/src/app/financial/payables/page.tsx',
    critical: false
  },
  {
    phase: 3,
    name: 'Suppliers page',
    type: 'file',
    path: 'frontend/src/app/financial/suppliers/page.tsx',
    critical: false
  },
  
  // Phase 4: Reports
  {
    phase: 4,
    name: 'Reports page',
    type: 'file',
    path: 'frontend/src/app/financial/reports/page.tsx',
    critical: false
  },
  {
    phase: 4,
    name: 'Insurance page',
    type: 'file',
    path: 'frontend/src/app/financial/insurance/page.tsx',
    critical: false
  }
];

function checkExists(filePath, type) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  try {
    const stats = fs.statSync(fullPath);
    if (type === 'file') {
      return stats.isFile();
    } else if (type === 'directory') {
      return stats.isDirectory();
    }
  } catch (error) {
    return false;
  }
  return false;
}

function getProgressBar(completed, total, width = 20) {
  const filled = Math.floor((completed / total) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function analyzeProgress() {
  console.log(`${colors.blue}${colors.bright}💰 EO Clínica - Financial Module Progress Report${colors.reset}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`${colors.cyan}📅 Generated: ${new Date().toLocaleString('pt-BR')}${colors.reset}\n`);

  const phases = {};
  let totalCompleted = 0;
  let totalItems = checks.length;
  let criticalCompleted = 0;
  let totalCritical = 0;

  // Group by phases and check each item
  checks.forEach(check => {
    if (!phases[check.phase]) {
      phases[check.phase] = {
        name: `Phase ${check.phase}`,
        items: [],
        completed: 0,
        total: 0,
        criticalCompleted: 0,
        totalCritical: 0
      };
    }

    const exists = checkExists(check.path, check.type);
    const status = exists ? '✅' : '❌';
    const priority = check.critical ? '🔴' : '🟡';
    
    phases[check.phase].items.push({
      ...check,
      exists,
      status,
      priority
    });

    phases[check.phase].total++;
    if (exists) {
      phases[check.phase].completed++;
      totalCompleted++;
    }

    if (check.critical) {
      phases[check.phase].totalCritical++;
      totalCritical++;
      if (exists) {
        phases[check.phase].criticalCompleted++;
        criticalCompleted++;
      }
    }
  });

  // Overall progress
  const overallProgress = (totalCompleted / totalItems) * 100;
  const criticalProgress = totalCritical > 0 ? (criticalCompleted / totalCritical) * 100 : 100;
  
  console.log(`${colors.bright}📊 OVERALL PROGRESS${colors.reset}`);
  console.log(`${getProgressBar(totalCompleted, totalItems)} ${overallProgress.toFixed(1)}% (${totalCompleted}/${totalItems})`);
  console.log(`${colors.red}🔴 Critical:${colors.reset} ${getProgressBar(criticalCompleted, totalCritical)} ${criticalProgress.toFixed(1)}% (${criticalCompleted}/${totalCritical})`);
  console.log('');

  // Phase-by-phase breakdown
  Object.keys(phases).forEach(phaseNum => {
    const phase = phases[phaseNum];
    const phaseProgress = (phase.completed / phase.total) * 100;
    const phaseCriticalProgress = phase.totalCritical > 0 ? (phase.criticalCompleted / phase.totalCritical) * 100 : 100;
    
    console.log(`${colors.bright}${colors.blue}📋 PHASE ${phaseNum}${colors.reset}`);
    console.log(`${getProgressBar(phase.completed, phase.total)} ${phaseProgress.toFixed(1)}% (${phase.completed}/${phase.total})`);
    
    if (phase.totalCritical > 0) {
      console.log(`${colors.red}Critical:${colors.reset} ${getProgressBar(phase.criticalCompleted, phase.totalCritical)} ${phaseCriticalProgress.toFixed(1)}% (${phase.criticalCompleted}/${phase.totalCritical})`);
    }
    
    console.log('');
    
    // Show items
    phase.items.forEach(item => {
      const pathColor = item.exists ? colors.green : colors.yellow;
      console.log(`  ${item.status} ${item.priority} ${item.name}`);
      console.log(`      ${pathColor}${item.path}${colors.reset}`);
    });
    
    console.log('');
  });

  // Recommendations
  console.log(`${colors.bright}${colors.magenta}🎯 RECOMMENDATIONS${colors.reset}`);
  
  if (overallProgress < 25) {
    console.log(`${colors.yellow}• Run: ./scripts/financial-setup.sh 1 to set up Phase 1 foundation${colors.reset}`);
  } else if (overallProgress < 50) {
    console.log(`${colors.yellow}• Run: ./scripts/financial-setup.sh 2 to set up Phase 2 frontend${colors.reset}`);
  } else if (overallProgress < 75) {
    console.log(`${colors.yellow}• Focus on implementing Phase 3 features (payables, suppliers)${colors.reset}`);
  } else {
    console.log(`${colors.green}• Great progress! Focus on Phase 4 advanced features${colors.reset}`);
  }

  if (criticalProgress < 100) {
    console.log(`${colors.red}• Priority: Complete all critical items marked with 🔴${colors.reset}`);
  }

  console.log(`${colors.cyan}• Check FINANCIAL_MODULE_CHECKLIST.md for detailed task tracking${colors.reset}`);
  console.log('');

  // Next steps
  const nextUncompleted = checks.find(check => !checkExists(check.path, check.type));
  if (nextUncompleted) {
    console.log(`${colors.bright}${colors.cyan}🚀 NEXT STEP${colors.reset}`);
    console.log(`Create: ${colors.yellow}${nextUncompleted.path}${colors.reset}`);
    console.log(`Type: ${nextUncompleted.type}`);
    console.log(`Critical: ${nextUncompleted.critical ? 'Yes' : 'No'}`);
  } else {
    console.log(`${colors.bright}${colors.green}🎉 ALL CHECKS COMPLETED!${colors.reset}`);
    console.log(`Financial module foundation is ready for implementation.`);
  }
}

// Check if package.json exists to ensure we're in the right directory
if (!fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
  console.error(`${colors.red}❌ Error: Must be run from project root directory${colors.reset}`);
  process.exit(1);
}

// Run the analysis
analyzeProgress();