module.exports = {
  apps: [
    {
      name: "ladymcbeth.rells",
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

        // Rate limits
        MAX_FOLLOWS_PER_HOUR: "20",
        MAX_FOLLOWS_PER_DAY: "150",
        MAX_LIKES_PER_DAY: "30",

        // Follow filters
        FOLLOW_USER_RATIO_MIN: "0.2",
        FOLLOW_USER_RATIO_MAX: "4.0",

        // Target users to follow their followers
        USERS_TO_FOLLOW: "emilka_kk,jakis_influencer1",
      },
      out_file: "/dev/null", // Wyłączamy standardowe logi
      error_file: "./logs/ladymcbeth_rells-error.log", // Tylko błędy
      log_file: "/dev/null", // Wyłączamy combined logi
      time: true,
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

        // Rate limits
        MAX_FOLLOWS_PER_HOUR: "20",
        MAX_FOLLOWS_PER_DAY: "150",
        MAX_LIKES_PER_DAY: "30",

        // Follow filters
        FOLLOW_USER_RATIO_MIN: "0.2",
        FOLLOW_USER_RATIO_MAX: "4.0",

        // Target users to follow their followers
        USERS_TO_FOLLOW: "natgeo,sam_kolder",
      },
      out_file: "/dev/null", // Wyłączamy standardowe logi
      error_file: "./logs/lariberrys-error.log", // Tylko błędy
      log_file: "/dev/null", // Wyłączamy combined logi
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
