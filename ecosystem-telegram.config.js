module.exports = {
  apps: [{
    name: 'instagram-bot-telegram',
    script: 'src/telegram-bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      TELEGRAM_BOT_TOKEN: '8096285619:AAH51QOUPqvx5SDAm6LMxom8IIDg5oBQP0U',
      TELEGRAM_ALLOWED_USERS: '7647790288',
      MAX_FOLLOWS_PER_HOUR: '15',
      MAX_FOLLOWS_PER_DAY: '70',
      MAX_LIKES_PER_DAY: '30',
      FOLLOW_USER_RATIO_MIN: '0.2',
      FOLLOW_USER_RATIO_MAX: '4.0',
      FOLLOW_USER_MIN_FOLLOWERS: '10',
      FOLLOW_USER_MAX_FOLLOWERS: '5000',
      FOLLOW_USER_MIN_FOLLOWING: '0',
      FOLLOW_USER_MAX_FOLLOWING: '7500',
      DRY_RUN: 'false'
    },
    env_production: {
      NODE_ENV: 'production',
      DRY_RUN: 'false'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}; 