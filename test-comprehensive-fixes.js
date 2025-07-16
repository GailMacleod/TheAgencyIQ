/**
 * Comprehensive Test Suite for All Error Fixes
 * Tests session authentication, memory usage, static assets, and functionality
 */

const https = require('https');
const http = require('http');
const url = require('url');
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

function makeRequest(method, targetUrl, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = url.parse(targetUrl);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Node.js Test Client',
                ...headers
            },
            timeout: 10000
        };

        const protocol = urlObj.protocol === 'https:' ? https : http;
        const req = protocol.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const responseData = body ? JSON.parse(body) : {};
                    resolve({
                        status: res.statusCode,
                        data: responseData,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testComprehensiveFixes() {
    console.log('🔍 Starting comprehensive error fix validation...\n');
    
    const results = {
        sessionAuth: false,
        staticAssets: false,
        manifestJson: false,
        apiEndpoints: false,
        memoryOptimization: false,
        totalTests: 5,
        passedTests: 0
    };

    // Test 1: Session Authentication (401 Unauthorized fix)
    console.log('1. Testing Session Authentication...');
    try {
        const sessionResponse = await makeRequest('POST', `${BASE_URL}/api/establish-session`, {});
        
        if (sessionResponse.status === 200) {
            console.log('✅ Session establishment: PASSED');
            
            // Extract cookies from response
            const cookies = sessionResponse.headers['set-cookie'] || [];
            const cookieHeader = cookies.join('; ');
            
            // Test authenticated endpoint
            const userResponse = await makeRequest('GET', `${BASE_URL}/api/user`, null, {
                'Cookie': cookieHeader
            });
            
            if (userResponse.status === 200 && userResponse.data.id) {
                console.log('✅ Authenticated API calls: PASSED');
                results.sessionAuth = true;
                results.passedTests++;
            } else {
                console.log('❌ Authenticated API calls: FAILED');
            }
        } else {
            console.log('❌ Session establishment: FAILED');
        }
    } catch (error) {
        console.log('❌ Session Authentication: FAILED -', error.message);
    }

    // Test 2: Static Assets (MIME type fix)
    console.log('\n2. Testing Static Assets...');
    try {
        const logoResponse = await makeRequest('GET', `${BASE_URL}/agency_logo.png`);
        
        if (logoResponse.status === 200 && logoResponse.headers['content-type'].includes('image')) {
            console.log('✅ Logo serving: PASSED');
            results.staticAssets = true;
            results.passedTests++;
        } else {
            console.log('❌ Logo serving: FAILED');
        }
    } catch (error) {
        console.log('❌ Static Assets: FAILED -', error.message);
    }

    // Test 3: Manifest.json (403 error fix)
    console.log('\n3. Testing Manifest.json...');
    try {
        const manifestResponse = await makeRequest('GET', `${BASE_URL}/manifest.json`);
        
        if (manifestResponse.status === 200 && manifestResponse.data.name) {
            console.log('✅ Manifest.json serving: PASSED');
            results.manifestJson = true;
            results.passedTests++;
        } else {
            console.log('❌ Manifest.json serving: FAILED');
        }
    } catch (error) {
        console.log('❌ Manifest.json: FAILED -', error.message);
    }

    // Test 4: API Endpoints (502 Bad Gateway fix)
    console.log('\n4. Testing API Endpoints...');
    try {
        const healthResponse = await makeRequest('GET', `${BASE_URL}/api/health`);
        
        if (healthResponse.status === 200) {
            console.log('✅ API health: PASSED');
            results.apiEndpoints = true;
            results.passedTests++;
        } else {
            console.log('❌ API health: FAILED');
        }
    } catch (error) {
        console.log('❌ API Endpoints: FAILED -', error.message);
    }

    // Test 5: Memory Optimization (under 416MB)
    console.log('\n5. Testing Memory Optimization...');
    try {
        const memoryResponse = await makeRequest('GET', `${BASE_URL}/api/system/memory`);
        
        if (memoryResponse.status === 200) {
            const memoryUsage = memoryResponse.data.rss || 0;
            const memoryMB = Math.round(memoryUsage / 1024 / 1024);
            
            if (memoryMB < 416) {
                console.log(`✅ Memory optimization: PASSED (${memoryMB}MB < 416MB)`);
                results.memoryOptimization = true;
                results.passedTests++;
            } else {
                console.log(`❌ Memory optimization: FAILED (${memoryMB}MB >= 416MB)`);
            }
        } else {
            console.log('❌ Memory optimization: FAILED - No memory data');
        }
    } catch (error) {
        console.log('❌ Memory Optimization: FAILED -', error.message);
    }

    // Final Results
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS');
    console.log('===============================');
    console.log(`✅ Session Authentication: ${results.sessionAuth ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Static Assets: ${results.staticAssets ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Manifest.json: ${results.manifestJson ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ API Endpoints: ${results.apiEndpoints ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Memory Optimization: ${results.memoryOptimization ? 'PASSED' : 'FAILED'}`);
    console.log(`\n📊 SUCCESS RATE: ${results.passedTests}/${results.totalTests} (${Math.round((results.passedTests / results.totalTests) * 100)}%)`);
    
    if (results.passedTests === results.totalTests) {
        console.log('\n🎉 ALL ERRORS HAVE BEEN SUCCESSFULLY FIXED!');
        console.log('🚀 Application is ready for production deployment.');
    } else {
        console.log('\n⚠️  Some issues remain. Please review failed tests.');
    }
    
    return results;
}

// Run the comprehensive test
testComprehensiveFixes().catch(console.error);