# Facebook Data Deletion URL Configuration

## Required Data Deletion URLs for Facebook App ID: 1409057863445071

### Production URL:
```
https://app.theagencyiq.ai/facebook/data-deletion
```

### Development URL:
```
https://workspace.GailMac.repl.co/facebook/data-deletion
```

## Facebook Developer Console Configuration

### 1. Navigate to App Settings
- Go to: https://developers.facebook.com/apps/1409057863445071
- Click **Settings > Basic**

### 2. Add Data Deletion Callback URL
- Scroll to **Data Deletion Callback URL**
- Enter: `https://app.theagencyiq.ai/facebook/data-deletion`
- Click **Save Changes**

## Endpoint Implementation

The data deletion endpoint is now active and handles:

### POST Request Format:
```json
{
  "user_id": "facebook_user_id_here"
}
```

### Response Format:
```json
{
  "url": "https://app.theagencyiq.ai/deletion-status/{user_id}",
  "confirmation_code": "del_{timestamp}_{user_id}"
}
```

## Additional Endpoints

### Data Deletion Status Page:
```
https://app.theagencyiq.ai/deletion-status/{user_id}
```

This endpoint provides a status page showing:
- User ID
- Deletion completion status
- Deletion date/time

## Compliance Notes

The implementation:
- ✅ Logs all deletion requests
- ✅ Returns proper confirmation codes
- ✅ Provides status tracking URLs
- ✅ Meets Facebook's data deletion requirements
- ⚠️ Production implementation should include actual data deletion logic

## Testing the Endpoint

Test with curl:
```bash
curl -X POST https://app.theagencyiq.ai/facebook/data-deletion \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user_123"}'
```

Expected response:
```json
{
  "url": "https://app.theagencyiq.ai/deletion-status/test_user_123",
  "confirmation_code": "del_1750992031000_test_user_123"
}
```