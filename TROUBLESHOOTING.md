# Instagram Bot Troubleshooting Guide

## Current Issues and Solutions

### 1. Telegram API 409 Conflict Error

**Problem**: Multiple bot instances trying to run simultaneously
```
error: [polling_error] {"code":"ETELEGRAM","message":"ETELEGRAM: 409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running"}
```

**Solutions**:
1. **Use the restart script**:
   ```bash
   npm run restart
   ```

2. **Manual restart**:
   - Stop all Node.js processes
   - Wait 30 seconds
   - Start the bot again: `npm run telegram`

3. **Use Telegram command** (if you're an admin):
   ```
   /kill_all
   ```

### 2. Instagram API Blocking

**Problem**: Bot can't fetch user data from Instagram profiles
```
[User 7647790288] ERROR: Failed to manually send request
[User 7647790288] WARN: Could not access profile ladymcbeth.rells, using fallback approach
```

**Solutions**:
1. **The bot now handles this automatically** - it will try to follow users directly even if it can't access their profile data
2. **Wait between follows** - The bot now waits 30 seconds between follows to avoid rate limiting
3. **Use private accounts** - Some public accounts might be blocked, try following private accounts

### 3. Username Detection Issues

**Problem**: Bot can't detect Instagram username
```
[User 7647790288] WARN: Could not detect username automatically
[User 7647790288] Using username: undefined
```

**Solutions**:
1. **Update your account** with the correct Instagram username:
   ```
   /update_account 7647790288 <cookie> <proxy> <instagram_username>
   ```
   
2. **Make sure the username is correct** - no extra quotes, no special characters

### 4. Profile Access Issues

**Problem**: Instagram profiles are private or inaccessible
```
[User 7647790288] WARN: Cannot find text "username" on page
```

**Solutions**:
1. **The bot now has fallback logic** - it will continue even if it can't access profile data
2. **Try different target users** - Some accounts might be private or blocked
3. **Use verified accounts** - Public verified accounts are usually more accessible

## How to Use the Updated Bot

### 1. Restart the Bot Cleanly
```bash
npm run restart
```

### 2. Check Your Account Status
```
/my_status
```

### 3. Add Target Users
```
/add_target @username
```

### 4. Start Your Bot
```
/start_my_bot
```

### 5. Monitor Progress
The bot will now show detailed progress:
- ✅ Successfully followed users
- ❌ Failed attempts
- 📊 Total statistics

## New Features

### Better Error Handling
- Bot continues even if it can't access Instagram profile data
- Individual user follow attempts don't stop the entire process
- Detailed success/error reporting

### Improved Rate Limiting
- 30-second wait between follows
- 10-second wait after errors
- Better throttling to avoid Instagram blocks

### Telegram API Conflict Resolution
- Automatic retry on 409 conflicts
- `/kill_all` command for admins
- Restart script for clean restarts

## Commands Reference

### User Commands
- `/start_my_bot` - Start your bot
- `/stop_my_bot` - Stop your bot
- `/my_status` - Check your bot status
- `/add_target @username` - Add target user
- `/remove_target @username` - Remove target user

### Limits Management
- `/set_limits <follows_per_hour> <follows_per_day> <likes_per_day> <ratio_min> <ratio_max>` - Set your limits
- `/my_limits` - Show your current limits
- `/reset_limits` - Reset to default limits

### Admin Commands
- `/status` - Check all bots
- `/kill_all` - Force restart all bots (fixes 409 conflicts)
- `/stop_all` - Stop all bots gracefully

## Troubleshooting Steps

1. **If you get 409 Conflict**:
   - Run `npm run restart`
   - Or use `/kill_all` (admin only)

2. **If bot can't follow users**:
   - Check your cookie is valid
   - Try different target users
   - Wait a few hours and try again

3. **If bot stops unexpectedly**:
   - Check logs for errors
   - Restart with `npm run restart`
   - Contact admin if issues persist

## Environment Variables

Make sure these are set:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ALLOWED_USERS=your_user_id
```

## Individual User Limits

Each user can now set their own limits using:
```
/set_limits <follows_per_hour> <follows_per_day> <likes_per_day> <ratio_min> <ratio_max>
```

Default limits (if not set):
- Follows per hour: 15
- Follows per day: 70
- Likes per day: 30
- Ratio min: 0.2
- Ratio max: 4.0 