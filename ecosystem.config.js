module.exports = {
  "apps": [
    {
      "name": "lariberrys",
      "script": "./single_instance.js",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "INSTANCE_ID": "1",
        "PROXY_IP": "82.163.175.153",
        "PROXY_USERNAME": "kamzza",
        "PROXY_PASSWORD": "bJXwSnBLy9",
        "PROXY_PORT": "50101",
        "BACKUP_PROXY_IP": "77.47.240.226",
        "INSTAGRAM_SESSIONID": "74377058585%3A7gBhijBAe7qLvd%3A6%3AAYeiTK6JVYXn3Ej6A6yh3iyszU0EmV1aDXW-L1RUng",
        "INSTAGRAM_USERNAME": "lariberrys",
        "MAX_FOLLOWS_PER_HOUR": "35",
        "MAX_FOLLOWS_PER_DAY": "300",
        "MAX_LIKES_PER_DAY": "40",
        "FOLLOW_USER_RATIO_MIN": "1.2",
        "FOLLOW_USER_RATIO_MAX": "3.5",
        "MINIMUM_POST_COUNT": "2",
        "MAXIMUM_POST_COUNT": "300",
        "SHOULD_LIKE_POSTS": "true",
        "POSTS_TO_LIKE": "2",
        "FOLLOW_USER_MIN_FOLLOWERS": "500",
        "FOLLOW_USER_MAX_FOLLOWERS": "5000",
        "FOLLOW_USER_MIN_FOLLOWING": "200",
        "FOLLOW_USER_MAX_FOLLOWING": "1000",
        "USERS_TO_FOLLOW": "lelasohnabaka,vixeniaaa,gonkgonk666,zxeriascute,msliababy,grungeeaesth",
        "HEADLESS": "true"
      },
      "error_file": "./logs/lariberrys.log",
      "time": false,
      "autorestart": true,
      "max_restarts": 10,
      "restart_delay": 5000
    }
  ]
}
