# The AgencyIQ Data Retention & Cleanup Policy

## Overview
Automated data retention and cleanup system ensuring compliance with data protection regulations while maintaining operational efficiency.

## Data Retention Schedules

### User Content Data
- **Published Posts**: 365 days (1 year)
- **Failed Posts**: 90 days (3 months)
- **Draft Posts**: Indefinite (until user deletion)

### Authentication & Security Data
- **Expired Verification Codes**: 7 days
- **Used Gift Certificates**: 90 days (3 months)
- **Security Breach Incidents**: 2,555 days (7 years) - Compliance requirement
- **Platform Connection Logs**: 180 days (6 months for inactive)

### User Account Data
- **Active User Accounts**: Indefinite (until cancellation)
- **Inactive Platform Connections**: 180 days (6 months)
- **Session Data**: 30 days (automatic browser cleanup)

## Automated Cleanup Schedule

### Daily Cleanup (2:00 AM AEST)
- Remove expired verification codes older than 7 days
- Archive used gift certificates older than 90 days
- Clean up published posts older than 1 year
- Remove inactive platform connections older than 6 months
- Archive resolved security incidents older than 7 years

### Real-time Cleanup
- Session cleanup on browser close
- Temporary file cleanup after upload processing
- Failed authentication attempt logs after 24 hours

## Admin Notifications

### Successful Cleanup Report
**Sent to**: admin@theagencyiq.ai  
**Schedule**: Daily after cleanup completion  
**Includes**:
- Total items deleted and retained
- Breakdown by data type
- Any errors encountered
- Next scheduled cleanup time

### Cleanup Failure Alert
**Sent to**: admin@theagencyiq.ai  
**Trigger**: Any cleanup process failure  
**Priority**: URGENT  
**Includes**:
- Error details and stack trace
- Partial completion status
- Immediate action requirements
- Manual cleanup recommendations

## Data Protection Compliance

### Legal Requirements
- **GDPR**: User data deletion within 30 days of request
- **CCPA**: Consumer data deletion within 45 days of verified request
- **Australian Privacy Act**: Reasonable steps to destroy personal information

### Security Incident Retention
- Critical incidents: 7 years (compliance requirement)
- Forensic data: Indefinite retention for unresolved incidents
- Admin notifications: Immediate for critical, 15 minutes for high severity

## Manual Override Capabilities

### Admin Controls
- **Manual Cleanup Trigger**: `/api/admin/data-cleanup/trigger`
- **Cleanup Status Check**: `/api/admin/data-cleanup/status`
- **Retention Policy Review**: Real-time policy configuration

### Emergency Procedures
- Immediate cleanup for data breach incidents
- Expedited user data deletion for legal requests
- Selective retention extension for ongoing investigations

## Monitoring & Audit Trail

### Cleanup Metrics
- Items processed per cleanup cycle
- Success/failure rates
- Processing time per data type
- Storage space recovered

### Audit Logging
- All cleanup operations logged with timestamps
- Admin actions tracked and reported
- Retention policy changes documented
- Compliance verification records maintained

## System Architecture

### Automated Services
- **DataCleanupService**: Core cleanup orchestration
- **BreachNotificationService**: Security incident management
- **Admin Notification System**: Real-time alerts and reports

### Database Integration
- PostgreSQL cleanup procedures
- Drizzle ORM automated migrations
- Backup verification before large deletions
- Rollback capabilities for accidental deletions

## Best Practices Implementation

### Data Minimization
- Collect only necessary user data
- Automatic expiration for temporary data
- Regular review of retention requirements

### Security First
- Encrypted deletion of sensitive data
- Secure backup before cleanup operations
- Admin-only access to cleanup controls
- Comprehensive audit trails

### Performance Optimization
- Off-peak cleanup scheduling (2 AM)
- Batch processing for large datasets
- Index optimization post-cleanup
- Real-time monitoring during operations

## Contact Information
**System Administrator**: admin@theagencyiq.ai  
**Emergency Contact**: Same as above  
**Compliance Officer**: admin@theagencyiq.ai  

---
*This policy is automatically enforced by The AgencyIQ Data Management System and updated as of June 2025.*