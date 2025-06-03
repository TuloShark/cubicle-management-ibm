# 🔔 Slack & Monday.com Integration Guide

This guide explains how to set up automated notifications for the Space Optimization Demo using Slack and Monday.com integrations.

## 📋 Overview

The notification system provides:
- **Slack notifications** for report generation alerts
- **Monday.com task creation** for action items based on utilization metrics
- **System health monitoring** with automated alerts
- **Smart notifications** based on utilization thresholds

## 🚀 Features

### Slack Notifications Include:
- ✅ **Report Generation Alerts** with key metrics
- 📊 **Utilization Status** with visual indicators
- 🎯 **Action Recommendations** based on usage patterns
- 🔗 **Direct Links** to dashboard and Excel downloads
- ⚠️ **System Health Alerts** for critical issues

### Monday.com Integration:
- 📋 **Automated Task Creation** for high/low utilization periods
- 🎯 **Smart Prioritization** based on urgency levels
- 📈 **Action Plans** with recommended next steps
- 🔄 **Follow-up Tracking** for space optimization initiatives

## 🛠️ Setup Instructions

### 1. Slack Integration Setup

#### Create Slack Webhook
1. Go to https://api.slack.com/incoming-webhooks
2. Click "Create your Slack app"
3. Choose "From scratch" and enter app details
4. Navigate to "Incoming Webhooks" and activate them
5. Click "Add New Webhook to Workspace"
6. Select the channel for notifications
7. Copy the webhook URL

#### Configure Environment
```env
# Backend .env
NOTIFICATIONS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
FRONTEND_URL=https://your-domain.com  # For dashboard links
```

### 2. Monday.com Integration Setup

#### Get API Credentials
1. Log into your Monday.com account
2. Go to Admin → Integrations → API
3. Generate a new API token
4. Copy the token

#### Create Project Board
1. Create a new board for "Space Utilization Tasks"
2. Add these columns:
   - **Status** (Status column type)
   - **Priority** (Priority column type)
   - **Description** (Long Text column type)
   - **Due Date** (Date column type)
   - **Utilization %** (Numbers column type)
3. Note the Board ID from the URL

#### Configure Environment
```env
# Backend .env
MONDAY_API_KEY=your_monday_api_token
MONDAY_BOARD_ID=your_board_id_number
```

### 3. Enable Notifications
```env
# Backend .env
NOTIFICATIONS_ENABLED=true
```

## 📊 Notification Triggers

### Automatic Slack Notifications
- ✅ **Every report generation** (weekly utilization reports)
- 🚨 **Critical utilization** (>90% capacity)
- ⚠️ **High utilization** (>75% capacity)
- 📉 **Low utilization** (<25% capacity)
- 🔧 **System health issues**

### Monday.com Task Creation
Tasks are automatically created when:
- **Critical capacity** (>90% utilization) → Urgent priority
- **High utilization** (>85% utilization) → High priority
- **Low utilization** (<25% with <10 reservations) → Medium priority
- **High variance** (peak >40% above average) → High priority

## 🎨 Notification Examples

### Slack Report Notification
```
📊 Weekly Utilization Report
🟠 Period: May 27 - June 2, 2025
📈 Average Utilization: 78% Steady usage
🔥 Peak Utilization: 95%
📋 Total Reservations: 342
👥 Active Users: 47

⚠️ High Usage: Monitor closely for potential capacity issues.

[📥 Download Excel Report] [📈 View Dashboard]
```

### Monday.com Task Example
```
Task: Space Utilization Review: May 27 - June 2, 2025
Priority: High
Status: Working on it

📊 Key Metrics:
- Average Utilization: 85%
- Peak Utilization: 95%
- Total Reservations: 342
- Active Users: 47

🎯 Action Required:
High utilization or significant peak variance detected

📋 Recommended Actions:
- Monitor capacity trends daily
- Plan for potential expansion
- Optimize peak hour management
- Review user booking patterns
```

## ⚙️ Configuration Options

### Notification Thresholds
Customize in `api/services/NotificationService.js`:

```javascript
// Alert levels based on utilization percentage
getAlertLevel(utilization) {
  if (utilization >= 90) return 'critical';  // 🔴 Red
  if (utilization >= 75) return 'high';      // 🟠 Orange
  if (utilization >= 50) return 'medium';    // 🟡 Yellow
  if (utilization >= 25) return 'low';       // 🟢 Green
  return 'minimal';                          // 🔵 Blue
}
```

### Monday.com Task Triggers
```javascript
// Customize when tasks are created
determineActionNeeded(summary) {
  const { avgUtilization, peakUtilization } = summary;
  
  if (avgUtilization >= 90) return { required: true, urgency: 'urgent' };
  if (avgUtilization >= 85) return { required: true, urgency: 'high' };
  if (avgUtilization < 25) return { required: true, urgency: 'medium' };
  
  return { required: false };
}
```

## 🧪 Testing the Integration

### Test Slack Notifications
```bash
# Generate a test report to trigger notifications
curl -X POST "http://localhost:3000/api/utilization-reports/generate-current" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test System Health Alert
```bash
# Trigger a health check notification
curl -X POST "http://localhost:3000/api/test/health-notification" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Verify Monday.com Integration
1. Generate a report with high utilization
2. Check your Monday.com board for new tasks
3. Verify task details and priority assignment

## 🔧 Troubleshooting

### Common Issues

**Slack notifications not sending:**
- ✅ Verify webhook URL is correct
- ✅ Check `NOTIFICATIONS_ENABLED=true`
- ✅ Ensure Slack app has proper permissions
- ✅ Check API logs for error messages

**Monday.com tasks not creating:**
- ✅ Verify API key has proper permissions
- ✅ Check board ID is correct
- ✅ Ensure board has required columns
- ✅ Test API connection manually

**Environment variables not loading:**
- ✅ Restart the backend server after .env changes
- ✅ Check for typos in variable names
- ✅ Verify .env file is in correct directory

### Debug Logging
Enable debug logging to troubleshoot:
```env
LOG_LEVEL=debug
```

Check API logs:
```bash
tail -f api/api.log | grep -i notification
```

## 🔐 Security Considerations

- 🔒 **Never commit** `.env` files with real credentials
- 🔑 **Rotate API keys** regularly
- 🛡️ **Use environment-specific** webhook URLs
- 📋 **Monitor API usage** in Monday.com dashboard
- 🔍 **Review Slack app permissions** periodically

## 📈 Advanced Configuration

### Custom Notification Templates
Modify `NotificationService.js` to customize:
- Message formatting
- Alert thresholds
- Task descriptions
- Priority assignments

### Webhook Security
Add webhook signature verification:
```javascript
// Verify Slack webhook signatures
const crypto = require('crypto');
const signature = req.headers['x-slack-signature'];
// Implement signature verification
```

### Rate Limiting
Prevent notification spam:
```javascript
// Add rate limiting for notifications
const lastNotification = new Map();
// Implement time-based throttling
```

## 🚀 Future Enhancements

- [ ] **Multi-channel Slack** support
- [ ] **Email notifications** backup
- [ ] **Teams integration** 
- [ ] **Custom webhook** endpoints
- [ ] **Notification templates** management
- [ ] **A/B testing** for message formats

---

🎯 **Need Help?** Check the [main README](../README.md) or create an issue in the repository.
