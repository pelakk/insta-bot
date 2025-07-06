"use strict";

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Mobile device configuration for iPhone 12
const mobileDevice = {
  name: "iPhone 12",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  viewport: {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  },
  screen: {
    width: 390,
    height: 844,
  },
  deviceMemory: 4,
  hardwareConcurrency: 6,
  platform: "iPhone",
  languages: ["en-US", "en"],
  plugins: [
    {
      name: "PDF Viewer",
      description: "Portable Document Format",
      filename: "internal-pdf-viewer",
      length: 1,
    },
    {
      name: "WebKit built-in PDF",
      description: "Portable Document Format",
      filename: "internal-pdf-viewer",
      length: 1,
    },
  ],
};

// Browser fingerprint spoofing configuration
const fingerprintConfig = {
  // Navigator properties
  userAgent: mobileDevice.userAgent,
  platform: mobileDevice.platform,
  language: mobileDevice.languages[0],
  languages: mobileDevice.languages,
  deviceMemory: mobileDevice.deviceMemory,
  hardwareConcurrency: mobileDevice.hardwareConcurrency,
  
  // Screen properties
  screenWidth: mobileDevice.screen.width,
  screenHeight: mobileDevice.screen.height,
  colorDepth: 32,
  pixelDepth: 32,
  
  // Timezone and locale
  timezone: "Europe/Warsaw",
  timezoneOffset: -120, // UTC+2 for Poland
  
  // WebGL fingerprint
  webglVendor: "Apple Inc.",
  webglRenderer: "Apple GPU",
  
  // Canvas fingerprint
  canvasNoise: 0.1, // Add slight noise to canvas fingerprint
  
  // Audio fingerprint
  audioContext: {
    sampleRate: 44100,
    channelCount: 2,
  },
  
  // Connection properties
  connection: {
    effectiveType: "4g",
    downlink: 10,
    rtt: 50,
  },
};

// Function to configure stealth settings for a page
async function configureStealthPage(page) {
  // Set mobile viewport and device
  await page.emulate(mobileDevice);
  
  // Enable touch emulation (mobile device emulation already includes touch)
  // Note: emulateTouchscreen is not available in current Puppeteer version
  
  // Set user agent
  await page.setUserAgent(mobileDevice.userAgent);
  
  // Inject stealth scripts
  await page.evaluateOnNewDocument(() => {
    // 1. WebDriver spoofing (najważniejsze)
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true
    });

    // 2. Plugins spoofing jako PluginArray
    function FakePluginArray(arr) {
      arr.forEach((v, i) => this[i] = v);
      this.length = arr.length;
    }
    FakePluginArray.prototype = PluginArray.prototype;
    Object.defineProperty(navigator, 'plugins', {
      get: () => new FakePluginArray([
        { name: "PDF Viewer", description: "Portable Document Format", filename: "internal-pdf-viewer", length: 1 },
        { name: "WebKit built-in PDF", description: "Portable Document Format", filename: "internal-pdf-viewer", length: 1 }
      ]),
      configurable: true
    });
    
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
      configurable: true
    });
    
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 4,
      configurable: true
    });
    
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 6,
      configurable: true
    });
    
    Object.defineProperty(navigator, 'platform', {
      get: () => 'iPhone',
      configurable: true
    });
    
    // Override screen properties
    Object.defineProperty(screen, 'width', {
      get: () => 390,
    });
    
    Object.defineProperty(screen, 'height', {
      get: () => 844,
    });
    
    Object.defineProperty(screen, 'colorDepth', {
      get: () => 32,
    });
    
    Object.defineProperty(screen, 'pixelDepth', {
      get: () => 32,
    });
    
    // Override window properties
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => 3,
    });
    
    // WebGL spoofing (wymuszony context)
    const getParameter = WebGLRenderingContext && WebGLRenderingContext.prototype.getParameter;
    if (getParameter) {
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Apple Inc.';
        }
        if (parameter === 37446) {
          return 'Apple GPU';
        }
        return getParameter.call(this, parameter);
      };
    }
    
    // Dodatkowe WebGL spoofing dla różnych kontekstów
    if (window.WebGL2RenderingContext) {
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      if (getParameter2) {
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) {
            return 'Apple Inc.';
          }
          if (parameter === 37446) {
            return 'Apple GPU';
          }
          return getParameter2.call(this, parameter);
        };
      }
    }
    
    // Spoofing dla getContext
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const context = originalGetContext.call(this, type, ...args);
      
      // Spoof WebGL context jeśli został utworzony
      if (context && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
        const originalGetParameter = context.getParameter;
        context.getParameter = function(parameter) {
          if (parameter === 37445) {
            return 'Apple Inc.';
          }
          if (parameter === 37446) {
            return 'Apple GPU';
          }
          return originalGetParameter.call(this, parameter);
        };
      }
      
      // Canvas fingerprinting protection
      if (type === '2d') {
        const originalFillText = context.fillText;
        context.fillText = function(...args) {
          // Add slight noise to text rendering
          const x = args[1] + (Math.random() - 0.5) * 0.1;
          const y = args[2] + (Math.random() - 0.5) * 0.1;
          return originalFillText.call(this, args[0], x, y);
        };
      }
      
      return context;
    };
    
    // Override AudioContext
    const originalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (originalAudioContext) {
      window.AudioContext = window.webkitAudioContext = function() {
        const context = new originalAudioContext();
        Object.defineProperty(context, 'sampleRate', {
          get: () => 44100,
        });
        return context;
      };
    }
    
    // Override Connection API
    if ('connection' in navigator) {
      Object.defineProperty(navigator.connection, 'effectiveType', {
        get: () => '4g',
      });
      Object.defineProperty(navigator.connection, 'downlink', {
        get: () => 10,
      });
      Object.defineProperty(navigator.connection, 'rtt', {
        get: () => 50,
      });
    }
    
    // Override timezone
    Object.defineProperty(Intl, 'DateTimeFormat', {
      get: () => function(locale, options) {
        if (options && options.timeZone === undefined) {
          options.timeZone = 'Europe/Warsaw';
        }
        return new Date().toLocaleString(locale, options);
      },
    });
    
    // Override permissions API
    if ('permissions' in navigator) {
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = function(parameters) {
        return Promise.resolve({
          state: 'granted',
          onchange: null,
        });
      };
    }
    
    // Override battery API
    if ('getBattery' in navigator) {
      navigator.getBattery = function() {
        return Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 0.8,
        });
      };
    }
    
    // Override geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition = function(success) {
        success({
          coords: {
            latitude: 52.2297,
            longitude: 21.0122,
            accuracy: 10,
          },
          timestamp: Date.now(),
        });
      };
    }
    
    // Override notification permission
    if ('Notification' in window) {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'granted',
      });
    }
    
    // Override media devices
    if ('mediaDevices' in navigator) {
      navigator.mediaDevices.enumerateDevices = function() {
        return Promise.resolve([
          {
            deviceId: 'default',
            kind: 'audioinput',
            label: 'Default - iPhone Microphone',
            groupId: 'group1',
          },
          {
            deviceId: 'default',
            kind: 'audiooutput',
            label: 'Default - iPhone Speaker',
            groupId: 'group1',
          },
        ]);
      };
    }
    
    // Override performance timing
    if ('performance' in window) {
      const originalGetEntries = performance.getEntries;
      performance.getEntries = function() {
        const entries = originalGetEntries.call(this);
        // Add slight randomization to timing data
        return entries.map(entry => ({
          ...entry,
          duration: entry.duration + (Math.random() - 0.5) * 0.1,
        }));
      };
    }
    
    // Override console methods to avoid detection
    const originalConsole = console;
    console = {
      ...originalConsole,
      log: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      info: () => {},
    };
    
    // Override toString methods to avoid detection
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function() {
      if (this === Function.prototype.toString) {
        return originalToString.call(this);
      }
      return 'function () { [native code] }';
    };
    
    // Override document properties
    Object.defineProperty(document, 'hidden', {
      get: () => false,
    });
    
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
    });
    
    // Override window properties
    Object.defineProperty(window, 'outerWidth', {
      get: () => 390,
    });
    
    Object.defineProperty(window, 'outerHeight', {
      get: () => 844,
    });
    
    Object.defineProperty(window, 'innerWidth', {
      get: () => 390,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      get: () => 844,
    });
  });
  
  // Set additional headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  });
  
  // Set permissions, geolocation, timezone, and locale if supported
  const context = page.browserContext ? page.browserContext() : null;
  if (context) {
    if (context.overridePermissions) {
      await context.overridePermissions('https://www.instagram.com', [
        'geolocation',
        'notifications',
        'camera',
        'microphone',
      ]);
    }
    if (context.setGeolocation) {
      await context.setGeolocation({
        latitude: 52.2297,
        longitude: 21.0122,
      });
    }
    if (context.setTimezoneId) {
      await context.setTimezoneId('Europe/Warsaw');
    }
    if (context.setLocale) {
      await context.setLocale('en-US');
    }
  }
  // Set user agent again for safety
  await page.setUserAgent(mobileDevice.userAgent);
}

// Function to create a stealth browser instance
async function createStealthBrowser(options = {}) {
  const defaultArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-default-browser-check',
    '--safebrowsing-disable-auto-update',
    '--disable-features=AutomationControlled',
    '--enable-webgl',
    '--ignore-gpu-blacklist',
    // NIE wyłączamy GPU/WebGL!
  ];
  const browserOptions = {
    headless: true,
    args: [...defaultArgs, ...(options.args || [])],
    ignoreHTTPSErrors: true,
    ...options,
  };
  return await puppeteer.launch(browserOptions);
}

module.exports = {
  configureStealthPage,
  createStealthBrowser,
  mobileDevice,
  fingerprintConfig,
}; 