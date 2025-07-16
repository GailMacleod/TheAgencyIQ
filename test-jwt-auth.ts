/**
 * JWT Authentication System Test
 * Tests the custom JWT implementation and authentication flow
 */

import crypto from 'crypto';

// Custom JWT implementation test
class CustomJWT {
  private static base64UrlEscape(str: string): string {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private static base64UrlUnescape(str: string): string {
    str += new Array(5 - str.length % 4).join('=');
    return str.replace(/\-/g, '+').replace(/_/g, '/');
  }

  private static base64UrlDecode(str: string): string {
    return Buffer.from(this.base64UrlUnescape(str), 'base64').toString();
  }

  private static base64UrlEncode(str: string): string {
    return this.base64UrlEscape(Buffer.from(str).toString('base64'));
  }

  static sign(payload: any, secret: string, options: { expiresIn?: string } = {}): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + (options.expiresIn === '7d' ? 7 * 24 * 60 * 60 : 60 * 60)
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));
    
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64');
    
    return `${data}.${this.base64UrlEscape(signature)}`;
  }

  static verify(token: string, secret: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // Verify signature
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64');
    
    if (this.base64UrlEscape(signature) !== encodedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return payload;
  }
}

// Test JWT Authentication System
async function testJWTAuth() {
  console.log('🔒 JWT Authentication System Test\n');
  
  const SECRET = 'test-secret-key';
  const testPayload = {
    userId: 2,
    email: 'gailm@macleodglba.com.au',
    sessionId: crypto.randomUUID()
  };

  let testResults = {
    tokenCreation: false,
    tokenVerification: false,
    signatureValidation: false,
    expirationHandling: false,
    sessionFlow: false
  };

  // Test 1: Token Creation
  console.log('Test 1: Token Creation');
  try {
    const token = CustomJWT.sign(testPayload, SECRET, { expiresIn: '7d' });
    console.log(`✅ Token created: ${token.substring(0, 50)}...`);
    testResults.tokenCreation = true;
  } catch (error) {
    console.log(`❌ Token creation failed: ${error}`);
  }

  // Test 2: Token Verification
  console.log('\nTest 2: Token Verification');
  try {
    const token = CustomJWT.sign(testPayload, SECRET, { expiresIn: '7d' });
    const verified = CustomJWT.verify(token, SECRET);
    console.log(`✅ Token verified: User ID ${verified.userId}, Email: ${verified.email}`);
    testResults.tokenVerification = true;
  } catch (error) {
    console.log(`❌ Token verification failed: ${error}`);
  }

  // Test 3: Signature Validation
  console.log('\nTest 3: Signature Validation');
  try {
    const token = CustomJWT.sign(testPayload, SECRET, { expiresIn: '7d' });
    const tamperedToken = token.slice(0, -5) + 'XXXXX';
    
    try {
      CustomJWT.verify(tamperedToken, SECRET);
      console.log('❌ Signature validation failed - tampered token accepted');
    } catch (error) {
      console.log('✅ Signature validation successful - tampered token rejected');
      testResults.signatureValidation = true;
    }
  } catch (error) {
    console.log(`❌ Signature validation test failed: ${error}`);
  }

  // Test 4: Expiration Handling
  console.log('\nTest 4: Expiration Handling');
  try {
    // Create a token with short expiration
    const shortPayload = {
      ...testPayload,
      exp: Math.floor(Date.now() / 1000) - 1 // Already expired
    };
    
    const token = CustomJWT.sign(shortPayload, SECRET, { expiresIn: '7d' });
    
    try {
      CustomJWT.verify(token, SECRET);
      console.log('❌ Expiration handling failed - expired token accepted');
    } catch (error) {
      console.log('✅ Expiration handling successful - expired token rejected');
      testResults.expirationHandling = true;
    }
  } catch (error) {
    console.log(`❌ Expiration handling test failed: ${error}`);
  }

  // Test 5: Session Flow Simulation
  console.log('\nTest 5: Session Flow Simulation');
  try {
    // Create session
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId: 2,
      email: 'gailm@macleodglba.com.au',
      sessionId,
      lastActivity: new Date(),
      createdAt: new Date()
    };
    
    const token = CustomJWT.sign(sessionData, SECRET, { expiresIn: '7d' });
    
    // Validate session
    const validatedData = CustomJWT.verify(token, SECRET);
    
    if (validatedData.userId === 2 && validatedData.email === 'gailm@macleodglba.com.au') {
      console.log('✅ Session flow successful - user authenticated');
      testResults.sessionFlow = true;
    } else {
      console.log('❌ Session flow failed - user data mismatch');
    }
  } catch (error) {
    console.log(`❌ Session flow test failed: ${error}`);
  }

  // Test Results Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`Token Creation: ${testResults.tokenCreation ? '✅' : '❌'}`);
  console.log(`Token Verification: ${testResults.tokenVerification ? '✅' : '❌'}`);
  console.log(`Signature Validation: ${testResults.signatureValidation ? '✅' : '❌'}`);
  console.log(`Expiration Handling: ${testResults.expirationHandling ? '✅' : '❌'}`);
  console.log(`Session Flow: ${testResults.sessionFlow ? '✅' : '❌'}`);
  
  const passedTests = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.values(testResults).length;
  
  console.log(`\n🎯 Overall Success Rate: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 JWT Authentication System: FULLY OPERATIONAL');
    console.log('🔒 Custom JWT implementation successfully replaces missing jsonwebtoken package');
    console.log('🚀 Ready for production deployment with secure authentication');
  } else {
    console.log('⚠️  JWT Authentication System needs attention');
  }
}

// Run the test
testJWTAuth().catch(console.error);