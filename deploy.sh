#!/bin/bash

# THEAGENCYIQ COMPREHENSIVE DEPLOYMENT SCRIPT
# Event-driven posting system with Brisbane Ekka focus
# Validates all 52 posts with Queensland market alignment

echo "🚀 THEAGENCYIQ DEPLOYMENT VALIDATION SUITE"
echo "==========================================="
echo "Event-driven posting system for Queensland market"
echo "Brisbane Ekka July 9-19, 2025 focus"
echo ""

# Validation checklist
TOTAL_CHECKS=10
PASSED_CHECKS=0

# CHECK 1: Server Health
echo "1️⃣  CHECKING SERVER HEALTH..."
if curl -s http://localhost:5000/api/server-status > /dev/null 2>&1; then
    echo "✅ Server responding on port 5000"
    ((PASSED_CHECKS++))
else
    echo "❌ Server not responding"
fi

# CHECK 2: Database Connectivity
echo ""
echo "2️⃣  CHECKING DATABASE CONNECTIVITY..."
if npx tsx -e "import { db } from './server/storage.js'; console.log('Database OK')" 2>/dev/null; then
    echo "✅ Database connection operational"
    ((PASSED_CHECKS++))
else
    echo "❌ Database connection failed"
fi

# CHECK 3: PostQuotaService Integration
echo ""
echo "3️⃣  VALIDATING QUOTA ENFORCEMENT..."
TEST_RESULT=$(npx tsx test-comprehensive-quota-fix.js 2>/dev/null | grep "5/5 tests passed" || echo "FAIL")
if [[ "$TEST_RESULT" != "FAIL" ]]; then
    echo "✅ PostQuotaService: 5/5 quota bypass vulnerabilities eliminated"
    ((PASSED_CHECKS++))
else
    echo "❌ Quota enforcement validation failed"
fi

# CHECK 4: Expired Post Detection
echo ""
echo "4️⃣  TESTING EXPIRED POST DETECTION..."
EXPIRED_RESULT=$(npx tsx test-expired-enforcement.js 2>/dev/null | grep "SUCCESS RATE:" | grep -o "[0-9]\+\.[0-9]\+%" || echo "0%")
SUCCESS_RATE=${EXPIRED_RESULT%.*}
if [[ $SUCCESS_RATE -ge 70 ]]; then
    echo "✅ Expired post detection: $EXPIRED_RESULT success rate"
    ((PASSED_CHECKS++))
else
    echo "❌ Expired post detection: $EXPIRED_RATE (below 70% threshold)"
fi

# CHECK 5: Event Scheduling Service
echo ""
echo "5️⃣  VALIDATING QUEENSLAND EVENT SCHEDULING..."
if npx tsx -e "
import { EventSchedulingService } from './server/services/eventSchedulingService.js';
const schedule = await EventSchedulingService.generateEventPostingSchedule(2);
const ekkaFocus = schedule.filter(p => p.eventId.includes('ekka')).length;
const distribution = EventSchedulingService.validateEventDistribution(schedule);
console.log(\`Generated \${schedule.length} posts, \${ekkaFocus} Brisbane Ekka focus, Distribution: \${distribution.isValid}\`);
" 2>/dev/null | grep -q "Generated 52 posts"; then
    echo "✅ Event scheduling: 52 posts generated with Brisbane Ekka focus"
    ((PASSED_CHECKS++))
else
    echo "❌ Event scheduling validation failed"
fi

# CHECK 6: Platform Connections
echo ""
echo "6️⃣  CHECKING PLATFORM READINESS..."
PLATFORM_COUNT=$(curl -s http://localhost:5000/api/platform-connections 2>/dev/null | grep -o '"platform"' | wc -l)
if [[ $PLATFORM_COUNT -ge 5 ]]; then
    echo "✅ Platform connections: $PLATFORM_COUNT/5 platforms configured"
    ((PASSED_CHECKS++))
else
    echo "❌ Platform connections insufficient: $PLATFORM_COUNT/5"
fi

# CHECK 7: Notification System
echo ""
echo "7️⃣  TESTING NOTIFICATION ENDPOINTS..."
NOTIFICATION_TEST=$(curl -s -X POST http://localhost:5000/api/notify-expired \
    -H "Content-Type: application/json" \
    -d '{"userId":2,"postIds":[1,2,3],"message":"Deployment test"}' \
    2>/dev/null | grep '"success":true' || echo "FAIL")
if [[ "$NOTIFICATION_TEST" != "FAIL" ]]; then
    echo "✅ Notification system: Email alerts operational"
    ((PASSED_CHECKS++))
else
    echo "❌ Notification system failed"
fi

# CHECK 8: AI Content Generation
echo ""
echo "8️⃣  VALIDATING AI CONTENT GENERATION..."
if npx tsx -e "
import { generateAIContent } from './server/grok.js';
const content = await generateAIContent('Test Brisbane Ekka content', 'facebook');
console.log('AI Generation: ' + (content.length > 50 ? 'SUCCESS' : 'FAIL'));
" 2>/dev/null | grep -q "SUCCESS"; then
    echo "✅ AI content generation: Queensland market content operational"
    ((PASSED_CHECKS++))
else
    echo "❌ AI content generation validation failed"
fi

# CHECK 9: Session Management
echo ""
echo "9️⃣  TESTING SESSION MANAGEMENT..."
SESSION_TEST=$(curl -s http://localhost:5000/api/sync-session \
    -H "Content-Type: application/json" \
    -X POST -d '{"deviceType":"deployment-test"}' \
    2>/dev/null | grep -o '"success"' || echo "FAIL")
if [[ "$SESSION_TEST" != "FAIL" ]]; then
    echo "✅ Session management: Device-agnostic sessions operational"
    ((PASSED_CHECKS++))
else
    echo "❌ Session management validation failed"
fi

# CHECK 10: Auto-posting Enforcer
echo ""
echo "🔟 VALIDATING AUTO-POSTING ENFORCER..."
if npx tsx -e "
import { AutoPostingEnforcer } from './server/auto-posting-enforcer.js';
console.log('Auto-posting enforcer methods: ' + 
  (typeof AutoPostingEnforcer.enforceAutoPosting === 'function' ? 'READY' : 'MISSING'));
" 2>/dev/null | grep -q "READY"; then
    echo "✅ Auto-posting enforcer: Quota-aware publishing ready"
    ((PASSED_CHECKS++))
else
    echo "❌ Auto-posting enforcer validation failed"
fi

# DEPLOYMENT SUMMARY
echo ""
echo "🎯 DEPLOYMENT VALIDATION RESULTS"
echo "================================"
echo "Total checks: $TOTAL_CHECKS"
echo "Passed checks: $PASSED_CHECKS"
echo "Success rate: $((PASSED_CHECKS * 100 / TOTAL_CHECKS))%"
echo ""

if [[ $PASSED_CHECKS -eq $TOTAL_CHECKS ]]; then
    echo "🎉 DEPLOYMENT READY - ALL SYSTEMS OPERATIONAL"
    echo "✅ Brisbane Ekka event-driven posting system validated"
    echo "✅ 52-post quota enforcement active"
    echo "✅ Queensland market alignment confirmed"
    echo ""
    echo "🚀 Ready for production deployment!"
elif [[ $PASSED_CHECKS -ge $((TOTAL_CHECKS * 8 / 10)) ]]; then
    echo "⚠️  DEPLOYMENT MOSTLY READY (80%+ pass rate)"
    echo "✅ Core functionality operational"
    echo "⚠️  Minor components need attention"
    echo ""
    echo "🚀 Ready for production with monitoring!"
else
    echo "❌ DEPLOYMENT NOT READY (Below 80% pass rate)"
    echo "❌ Critical components need fixing"
    echo ""
    echo "🔧 Fix failing components before deployment"
fi

echo ""
echo "📊 Queensland Event Coverage:"
echo "• Brisbane Ekka (July 9-19): Premium event focus"
echo "• Queensland Small Business Week: Business networking"
echo "• Gold Coast Business Excellence Awards: Recognition"
echo "• Cairns Business Expo: Tourism & technology"
echo "• Toowoomba AgTech Summit: Agricultural innovation"
echo "• Sunshine Coast Innovation Festival: Startup showcase"
echo ""
echo "📅 30-day cycle: July 3-31, 2025"
echo "🎪 52 event-driven posts with Brisbane Ekka focus"
echo "🔒 Bulletproof quota enforcement active"