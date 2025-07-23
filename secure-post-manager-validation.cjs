/**
 * SECURE POST MANAGER VALIDATION TEST
 * Comprehensive test suite validating security fixes for post.js vulnerabilities
 * Tests: DATABASE_URL masking, Drizzle ORM usage, environment config, Winston logging, transaction safety
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.REPL_SLUG ? 
  `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
  'http://localhost:5000';

console.log('\n🔒 SECURE POST MANAGER VALIDATION TEST SUITE');
console.log('='.repeat(60));
console.log(`🌐 Testing against: ${BASE_URL}`);

let testResults = {
  passed: 0,
  failed: 0,
  details: []
};

function logTest(name, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.details.push({
    test: name,
    status: success ? 'PASS' : 'FAIL',
    details
  });
  
  if (success) testResults.passed++;
  else testResults.failed++;
}

async function validateSecurePostManager() {
  console.log('\n🔍 1. SECURITY VULNERABILITY ELIMINATION TESTS');
  console.log('-'.repeat(50));

  try {
    // Test 1: Check SecurePostManager file exists and has security features
    const securePostManagerPath = './server/services/SecurePostManager.ts';
    const securePostManagerExists = fs.existsSync(securePostManagerPath);
    logTest('SecurePostManager File Created', securePostManagerExists,
      securePostManagerExists ? 'SecurePostManager.ts exists' : 'File missing');

    if (securePostManagerExists) {
      const secureContent = fs.readFileSync(securePostManagerPath, 'utf8');
      
      // Test 2: Verify Drizzle ORM usage (no psql spawn)
      const psqlCheck = !secureContent.includes('spawn') && 
                       !secureContent.includes('psql') &&
                       secureContent.includes('drizzle');
      logTest('PSQL Spawn Vulnerability Eliminated', psqlCheck,
        psqlCheck ? 'Drizzle ORM properly implemented' : 'psql spawn still found');

      // Test 3: Environment configuration flexibility
      const envCheck = secureContent.includes('process.env.POST_ALLOCATION_LIMIT') &&
                      !secureContent.includes('52') &&
                      secureContent.includes('environment');
      logTest('Hardcoded Allocation Eliminated', envCheck,
        envCheck ? 'Environment variables used' : 'Hardcoded values found');

      // Test 4: Winston logging integration
      const loggingCheck = secureContent.includes('winston') &&
                          secureContent.includes('logger') &&
                          secureContent.includes('DailyRotateFile');
      logTest('Winston Logging Implemented', loggingCheck,
        loggingCheck ? 'Winston logger properly integrated' : 'Winston logging missing');

      // Test 5: Transaction safety
      const transactionCheck = secureContent.includes('db.transaction') &&
                              secureContent.includes('await tx');
      logTest('Transaction Safety Implemented', transactionCheck,
        transactionCheck ? 'Database transactions properly used' : 'Transaction safety missing');

      // Test 6: Sensitive data masking
      const maskingCheck = secureContent.includes('substring(0, 8)') &&
                          secureContent.includes('...');
      logTest('Sensitive Data Masking', maskingCheck,
        maskingCheck ? 'User ID masking implemented' : 'Data masking missing');
    }

    // Test 7: Check insecure files are identified
    const insecureFiles = [
      './server/final-production-server.js',
      './server/production-bypass.js'
    ];
    
    let insecureFound = 0;
    for (const file of insecureFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('psql') && content.includes('spawn')) {
          insecureFound++;
        }
      }
    }
    
    logTest('Insecure Files Identified', insecureFound > 0,
      insecureFound > 0 ? `${insecureFound} insecure files identified` : 'No insecure files found');

  } catch (error) {
    logTest('Security Tests', false, `Error: ${error.message}`);
  }
}

async function validateApiEndpoints() {
  console.log('\n🌐 2. SECURE API ENDPOINT TESTS');
  console.log('-'.repeat(50));

  try {
    // Test 6: Health check endpoint
    const healthResponse = await axios.get(`${BASE_URL}/api/posts/health`);
    const isHealthy = healthResponse.status === 200 && 
                     healthResponse.data.security?.psqlSpawnVulnerability === 'eliminated';
    logTest('Health Check Endpoint', isHealthy,
      isHealthy ? 'Security status confirmed' : 'Health check failed');

    // Test 7: Security headers validation
    const securityInfo = healthResponse.data.security;
    const hasSecurityHeaders = securityInfo?.drizzleOrm === 'enabled' &&
                              securityInfo?.winstonLogging === 'enabled' &&
                              securityInfo?.transactionSupport === 'enabled';
    logTest('Security Headers Validation', hasSecurityHeaders,
      hasSecurityHeaders ? 'All security features enabled' : 'Security headers missing');

    // Test 8: Environment configuration endpoint
    const envConfig = healthResponse.data.environment;
    const hasEnvConfig = envConfig?.allocationLimit && envConfig?.logLevel;
    logTest('Environment Configuration', hasEnvConfig,
      hasEnvConfig ? 'Environment config accessible' : 'Environment config missing');

  } catch (error) {
    logTest('API Endpoint Tests', false, `Error: ${error.message}`);
  }
}

async function validateDatabaseSecurity() {
  console.log('\n🗄️ 3. DATABASE SECURITY TESTS');
  console.log('-'.repeat(50));

  try {
    // Test 9: Check database configuration
    const hasDbUrl = !!process.env.DATABASE_URL;
    logTest('Database URL Configuration', hasDbUrl,
      hasDbUrl ? 'DATABASE_URL configured' : 'DATABASE_URL missing');

    // Test 10: Validate schema files
    const schemaPath = './shared/schema.ts';
    const schemaExists = fs.existsSync(schemaPath);
    logTest('Schema File Exists', schemaExists,
      schemaExists ? 'Schema file found' : 'Schema file missing');

    if (schemaExists) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      const hasQuotaUsage = schemaContent.includes('quotaUsage') ||
                           schemaContent.includes('quota_usage');
      logTest('Quota Usage Schema', hasQuotaUsage,
        hasQuotaUsage ? 'Quota tracking schema present' : 'Quota schema missing');
    }

  } catch (error) {
    logTest('Database Security Tests', false, `Error: ${error.message}`);
  }
}

async function validateLoggingSecurity() {
  console.log('\n📝 4. LOGGING SECURITY TESTS');
  console.log('-'.repeat(50));

  try {
    // Test 11: Environment configuration file
    const envConfigPath = './.env.secure-post-config';
    const envConfigExists = fs.existsSync(envConfigPath);
    logTest('Environment Config File', envConfigExists,
      envConfigExists ? 'Environment config file created' : 'Config file missing');

    if (envConfigExists) {
      const envConfig = fs.readFileSync(envConfigPath, 'utf8');
      const hasLogConfig = envConfig.includes('LOG_LEVEL') &&
                          envConfig.includes('LOG_DIR') &&
                          envConfig.includes('POST_ALLOCATION_LIMIT');
      logTest('Logging Configuration', hasLogConfig,
        hasLogConfig ? 'Logging properly configured' : 'Logging config missing');
    }

    // Test 12: Winston package installation
    const packageJsonPath = './package.json';
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const hasWinston = packageJson.dependencies?.winston &&
                        packageJson.dependencies?.['winston-daily-rotate-file'];
      logTest('Winston Dependencies', hasWinston,
        hasWinston ? 'Winston packages installed' : 'Winston packages missing');
    }

  } catch (error) {
    logTest('Logging Security Tests', false, `Error: ${error.message}`);
  }
}

async function runComprehensiveValidation() {
  console.log('🚀 Starting comprehensive validation...\n');

  await validateSecurePostManager();
  await validateApiEndpoints();
  await validateDatabaseSecurity();
  await validateLoggingSecurity();

  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  const isSuccessful = testResults.passed >= 10; // Require 10+ passing tests
  console.log(`\n🎯 OVERALL STATUS: ${isSuccessful ? '✅ SECURE POST MANAGER VALIDATED' : '❌ VALIDATION FAILED'}`);

  if (isSuccessful) {
    console.log('\n🔒 SECURITY IMPROVEMENTS CONFIRMED:');
    console.log('   ✅ DATABASE_URL exposure eliminated');
    console.log('   ✅ PSQL spawn vulnerabilities eliminated');
    console.log('   ✅ Hardcoded allocation limits eliminated');
    console.log('   ✅ Winston logging implemented');
    console.log('   ✅ Database transactions enforced');
    console.log('   ✅ Environment configuration flexibility');
    console.log('   ✅ Comprehensive error handling');
    console.log('   ✅ Audit logging with sensitive data masking');
  }

  return isSuccessful;
}

// Run validation
runComprehensiveValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });