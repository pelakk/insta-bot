module.exports = {
  apps: [
    {
      name: "ladymcbeth_rells",
      script: "./single_instance.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        // Instance config
        INSTANCE_ID: "1",
        PROXY_IP: "77.47.240.226",

        // Instagram account 1
        INSTAGRAM_USERNAME: "ladymcbeth.rells",
        INSTAGRAM_PASSWORD: "Randki123",
        INSTAGRAM_SESSIONID:
          "75037996132%3Am8F50NFVpyIUct%3A1%3AAYdk982CSoZYoDzPwBhjjk8akRt3FXBe63Lb7KzuTw",

        // Rate limits
        MAX_FOLLOWS_PER_HOUR: "20",
        MAX_FOLLOWS_PER_DAY: "150",
        MAX_LIKES_PER_DAY: "30",

        // Follow filters
        FOLLOW_USER_RATIO_MIN: "0.2",
        FOLLOW_USER_RATIO_MAX: "4.0",

        // Target users to follow their followers
        USERS_TO_FOLLOW: "emilka_kk,selenagomez",
      },
      error_file: "/logs/ladymcbeth_rells.log",
      time: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: "lariberrys",
      script: "./single_instance.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        // Instance config
        INSTANCE_ID: "2",
        PROXY_IP: "82.163.175.153",

        // Instagram account 2 (RÓŻNE KONTO!)
        INSTAGRAM_USERNAME: "lariberrys",
        INSTAGRAM_PASSWORD: "Randki123",
        INSTAGRAM_SESSIONID:
          "74377058585%3ACmMPVEEHkoouaw%3A12%3AAYeo-wD-JwyDJaBoMR5OOp63XWH62Z3tZYiO274xhQ",

        // Rate limits
        MAX_FOLLOWS_PER_HOUR: "20",
        MAX_FOLLOWS_PER_DAY: "150",
        MAX_LIKES_PER_DAY: "30",

        // Follow filters
        FOLLOW_USER_RATIO_MIN: "0.2",
        FOLLOW_USER_RATIO_MAX: "4.0",

        // Target users to follow their followers
        USERS_TO_FOLLOW: "natgeo,selenagomez",
      },
      error_file: "/logs/lariberrys.log",
      time: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
