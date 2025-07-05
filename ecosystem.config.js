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
        PROXY_SERVER: "77.47.240.226:50100",
        PROXY_AUTH: "kamzza:bJXwSnBLy9",

        // Instagram account 1
        INSTAGRAM_USERNAME: "ladymcbeth.rells",
        INSTAGRAM_PASSWORD: "Randki123",
        INSTAGRAM_SESSIONID:
          "75037996132%3Am8F50NFVpyIUct%3A1%3AAYdk982CSoZYoDzPwBhjjk8akRt3FXBe63Lb7KzuTw",

        // Rate limits
        MAX_FOLLOWS_PER_HOUR: "20",
        MAX_FOLLOWS_PER_DAY: "150",
        MAX_LIKES_PER_DAY: "30",

        // Enable/disable likes
        ENABLE_LIKES: "false",

        // Follow filters - konkretne liczby followersów i following dasdadsadsad22
        FOLLOW_USER_MIN_FOLLOWERS: "50",     // Minimum 50 obserwujących
        FOLLOW_USER_MAX_FOLLOWERS: "5000",   // Maksimum 5000 obserwujących
        FOLLOW_USER_MIN_FOLLOWING: "50",     // Minimum 50 obserwowanych
        FOLLOW_USER_MAX_FOLLOWING: "2000",   // Maksimum 2000 obserwowanych

        // Target users to follow their followers
        USERS_TO_FOLLOW: "msliababy,grungeeaesth,grungeaesthetico,cyber.rue,non_nonsummerjack,luna.amemiya",
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
        PROXY_SERVER: "82.163.175.153:50100",
        PROXY_AUTH: "kamzza:bJXwSnBLy9",

        // Instagram account 2 (RÓŻNE KONTO!)
        INSTAGRAM_USERNAME: "lariberrys",
        INSTAGRAM_PASSWORD: "Randki123",
        INSTAGRAM_SESSIONID:
          "74377058585%3ACmMPVEEHkoouaw%3A12%3AAYeo-wD-JwyDJaBoMR5OOp63XWH62Z3tZYiO274xhQ",

        // Rate limits
        MAX_FOLLOWS_PER_HOUR: "20",
        MAX_FOLLOWS_PER_DAY: "150",
        MAX_LIKES_PER_DAY: "30",

        // Enable/disable likes
        ENABLE_LIKES: "false",

        // Follow filters - konkretne liczby followersów i following dsadsad
        FOLLOW_USER_MIN_FOLLOWERS: "50",     // Minimum 50 obserwujących
        FOLLOW_USER_MAX_FOLLOWERS: "5000",   // Maksimum 5000 obserwujących
        FOLLOW_USER_MIN_FOLLOWING: "50",     // Minimum 50 obserwowanych
        FOLLOW_USER_MAX_FOLLOWING: "2000",   // Maksimum 2000 obserwowanych

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
