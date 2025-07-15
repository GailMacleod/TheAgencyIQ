/**
 * Memory Optimizer for TheAgencyIQ
 * Implements memory optimization strategies
 */

import fs from 'fs';
import path from 'path';

class MemoryOptimizer {
  constructor() {
    this.optimizations = [];
  }

  // Analyze file for memory optimization opportunities
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const issues = [];
      
      // Check for potential memory leaks
      const patterns = [
        {
          pattern: /setInterval\(/g,
          issue: 'Potential memory leak: setInterval without clearInterval',
          severity: 'high'
        },
        {
          pattern: /setTimeout\(/g,
          issue: 'Potential memory leak: setTimeout without clearTimeout',
          severity: 'medium'
        },
        {
          pattern: /new\s+Array\(\d{4,}\)/g,
          issue: 'Large array allocation',
          severity: 'high'
        },
        {
          pattern: /\.push\(/g,
          issue: 'Array growth - consider size limits',
          severity: 'low'
        },
        {
          pattern: /require\(/g,
          issue: 'CommonJS require - consider ES modules',
          severity: 'low'
        },
        {
          pattern: /console\.log\(/g,
          issue: 'Console logging - remove in production',
          severity: 'low'
        },
        {
          pattern: /new\s+Map\(\)/g,
          issue: 'Map usage - consider size limits',
          severity: 'medium'
        },
        {
          pattern: /new\s+Set\(\)/g,
          issue: 'Set usage - consider size limits',
          severity: 'medium'
        },
        {
          pattern: /\.\w+Cache\s*=\s*\{/g,
          issue: 'Cache object - implement size limits',
          severity: 'medium'
        },
        {
          pattern: /EventEmitter/g,
          issue: 'EventEmitter - ensure listeners are removed',
          severity: 'medium'
        }
      ];
      
      patterns.forEach(({ pattern, issue, severity }) => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({
            file: filePath,
            issue,
            severity,
            count: matches.length,
            lines: this.findLineNumbers(content, pattern)
          });
        }
      });
      
      return issues;
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message);
      return [];
    }
  }

  // Find line numbers for pattern matches
  findLineNumbers(content, pattern) {
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push(index + 1);
      }
    });
    
    return matches.slice(0, 5); // Limit to first 5 matches
  }

  // Analyze all target files
  analyzeProject() {
    const targetFiles = [
      'server/index.ts',
      'server/routes.ts',
      'server/storage.ts',
      'server/middleware/authGuard.ts',
      'client/src/components/auto-posting-enforcer.tsx',
      'client/src/utils/session-manager.ts',
      'client/src/utils/api-client.ts'
    ];
    
    console.log('🔍 Analyzing project files for memory optimization...');
    
    const allIssues = [];
    targetFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const issues = this.analyzeFile(file);
        allIssues.push(...issues);
      }
    });
    
    return allIssues;
  }

  // Generate optimization recommendations
  generateOptimizations(issues) {
    const optimizations = [];
    
    // Group issues by severity
    const highSeverity = issues.filter(i => i.severity === 'high');
    const mediumSeverity = issues.filter(i => i.severity === 'medium');
    const lowSeverity = issues.filter(i => i.severity === 'low');
    
    // High priority optimizations
    if (highSeverity.length > 0) {
      optimizations.push({
        priority: 'HIGH',
        title: 'Critical Memory Leaks',
        issues: highSeverity,
        fixes: [
          'Add clearInterval/clearTimeout for all timers',
          'Implement size limits for large arrays',
          'Use streaming for large data processing'
        ]
      });
    }
    
    // Medium priority optimizations
    if (mediumSeverity.length > 0) {
      optimizations.push({
        priority: 'MEDIUM',
        title: 'Memory Management',
        issues: mediumSeverity,
        fixes: [
          'Implement LRU cache with size limits',
          'Add cleanup for event listeners',
          'Use weak references where appropriate'
        ]
      });
    }
    
    // Low priority optimizations
    if (lowSeverity.length > 0) {
      optimizations.push({
        priority: 'LOW',
        title: 'General Optimizations',
        issues: lowSeverity,
        fixes: [
          'Remove debug console.log statements',
          'Convert to ES modules',
          'Implement object pooling'
        ]
      });
    }
    
    return optimizations;
  }

  // Generate optimization report
  generateReport() {
    const issues = this.analyzeProject();
    const optimizations = this.generateOptimizations(issues);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: issues.length,
        highSeverity: issues.filter(i => i.severity === 'high').length,
        mediumSeverity: issues.filter(i => i.severity === 'medium').length,
        lowSeverity: issues.filter(i => i.severity === 'low').length
      },
      issues,
      optimizations,
      recommendations: [
        'Implement session store cleanup (TTL)',
        'Add memory monitoring middleware',
        'Use streaming for large responses',
        'Implement connection pooling',
        'Add garbage collection hints',
        'Use worker threads for CPU-intensive tasks',
        'Implement request rate limiting',
        'Add memory-efficient logging'
      ]
    };
    
    console.log('\n📋 Memory Optimization Report');
    console.log('==============================');
    console.log(`Total Issues: ${report.summary.totalIssues}`);
    console.log(`High Severity: ${report.summary.highSeverity}`);
    console.log(`Medium Severity: ${report.summary.mediumSeverity}`);
    console.log(`Low Severity: ${report.summary.lowSeverity}`);
    
    optimizations.forEach(opt => {
      console.log(`\n[${opt.priority}] ${opt.title}`);
      opt.issues.forEach(issue => {
        console.log(`  - ${issue.issue} (${issue.file}:${issue.lines[0]})`);
      });
    });
    
    return report;
  }
}

// Run optimization analysis
const optimizer = new MemoryOptimizer();
const report = optimizer.generateReport();

// Save report
fs.writeFileSync('memory-optimization-report.json', JSON.stringify(report, null, 2));
console.log('\n✅ Memory optimization report saved to memory-optimization-report.json');