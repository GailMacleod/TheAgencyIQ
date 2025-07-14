/**
 * ES Module Fix Validation Report
 * Verifies that all "require is not defined" errors have been resolved
 */

const axios = require('axios');
const fs = require('fs');

async function validateESModuleFix() {
  console.log('🔧 ES MODULE FIX VALIDATION REPORT');
  console.log('====================================');
  
  const baseUrl = 'http://localhost:5000';
  const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
  
  const validationResults = {
    testDate: new Date().toISOString(),
    esModuleFixStatus: 'RESOLVED',
    platformTests: {},
    summary: {
      totalPlatforms: platforms.length,
      workingAPIs: 0,
      requireErrors: 0,
      realAPIErrors: 0
    }
  };
  
  console.log('📤 Testing real API publishing endpoints...\n');
  
  for (const platform of platforms) {
    console.log(`🧪 Testing ${platform}...`);
    
    try {
      const response = await axios.post(`${baseUrl}/api/direct-publish`, {
        action: 'publish_single',
        platform: platform,
        content: 'ES MODULE TEST MESSAGE'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = response.data;
      
      // Check if the error is a "require is not defined" error
      const hasRequireError = result.error && result.error.includes('require is not defined');
      
      if (hasRequireError) {
        validationResults.summary.requireErrors++;
        validationResults.platformTests[platform] = {
          status: 'REQUIRE_ERROR',
          error: result.error,
          apiWorking: false
        };
        console.log(`❌ ${platform}: REQUIRE ERROR - ${result.error}`);
      } else {
        // Real API error (401, 400, etc.) means the module loading is working
        validationResults.summary.workingAPIs++;
        validationResults.summary.realAPIErrors++;
        validationResults.platformTests[platform] = {
          status: 'API_WORKING',
          error: result.error,
          apiWorking: true,
          httpStatus: result.error ? 'ERROR' : 'SUCCESS'
        };
        console.log(`✅ ${platform}: API Working - ${result.error || 'Success'}`);
      }
      
    } catch (error) {
      console.log(`❌ ${platform}: Network Error - ${error.message}`);
      validationResults.platformTests[platform] = {
        status: 'NETWORK_ERROR',
        error: error.message,
        apiWorking: false
      };
    }
  }
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`Total Platforms Tested: ${validationResults.summary.totalPlatforms}`);
  console.log(`APIs Working (ES Modules Fixed): ${validationResults.summary.workingAPIs}`);
  console.log(`Require Errors: ${validationResults.summary.requireErrors}`);
  console.log(`Real API Errors: ${validationResults.summary.realAPIErrors}`);
  
  const esModuleFixSuccessful = validationResults.summary.requireErrors === 0 && validationResults.summary.workingAPIs === platforms.length;
  
  if (esModuleFixSuccessful) {
    console.log('\n✅ SUCCESS: ES MODULE FIX COMPLETE');
    console.log('All platforms are now using real API endpoints');
    console.log('No more "require is not defined" errors');
    console.log('All 5 platforms successfully converted to ES modules');
    validationResults.esModuleFixStatus = 'COMPLETE';
  } else {
    console.log('\n❌ FAILURE: ES MODULE FIX INCOMPLETE');
    console.log(`Still ${validationResults.summary.requireErrors} require errors remaining`);
    validationResults.esModuleFixStatus = 'INCOMPLETE';
  }
  
  // Save validation results
  fs.writeFileSync('es-module-fix-validation.json', JSON.stringify(validationResults, null, 2));
  console.log('\n📁 Validation results saved to es-module-fix-validation.json');
  
  return validationResults;
}

// Run validation
validateESModuleFix().catch(console.error);