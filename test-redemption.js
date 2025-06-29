#!/usr/bin/env node

import { storage } from './server/storage.js';

async function testRedemption() {
  try {
    console.log('Testing gift certificate redemption...');
    
    // First check if the certificate exists and is unused
    const certificate = await storage.getGiftCertificate('PROF-TEST-QCNRLSMA');
    if (!certificate) {
      console.log('❌ Certificate not found');
      return;
    }
    
    if (certificate.isUsed) {
      console.log('❌ Certificate already redeemed');
      return;
    }
    
    console.log('✓ Certificate found and unused:', certificate);
    
    // Check test user
    const users = await storage.getAllUsers();
    const testUser = users.find(u => u.email === 'testuser@agencyiq.com');
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('✓ Test user found:', testUser.email, 'ID:', testUser.id);
    
    // Test redemption
    await storage.redeemGiftCertificate('PROF-TEST-QCNRLSMA', testUser.id);
    console.log('✓ Certificate redeemed successfully');
    
    // Update user subscription
    await storage.updateUser(testUser.id, {
      subscriptionPlan: 'professional',
      remainingPosts: 50,
      totalPosts: 52
    });
    console.log('✓ User subscription updated');
    
    // Verify redemption
    const redeemedCert = await storage.getGiftCertificate('PROF-TEST-QCNRLSMA');
    console.log('✓ Final certificate status:', redeemedCert);
    
    console.log('\n🎉 Redemption test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRedemption();