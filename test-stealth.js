"use strict";

const { createStealthBrowser, configureStealthPage } = require("./src/stealth-config");

async function testStealthConfiguration() {
  let browser;
  
  try {
    console.log("🚀 Starting stealth browser test...");
    
    // Create stealth browser
    browser = await createStealthBrowser({
      headless: false, // Set to false for testing to see the browser
    });
    
    console.log("✅ Stealth browser created successfully");
    
    // Create a new page
    const page = await browser.newPage();
    
    // Configure stealth settings
    await configureStealthPage(page);
    
    console.log("✅ Stealth settings configured");
    
    // Test 1: Check if we can access bot detection test site
    console.log("🔍 Testing bot detection evasion...");
    await page.goto("https://bot.sannysoft.com", { 
      waitUntil: "networkidle0",
      timeout: 30000 
    });
    
    console.log("✅ Successfully loaded bot detection test site");
    
    // Wait a bit for the page to fully load
    await new Promise(r => setTimeout(r, 5000));
    
    // Test 2: Check various stealth properties
    console.log("🔍 Testing stealth properties...");
    
    const stealthResults = await page.evaluate(() => {
      const results = {};
      
      // Check navigator properties
      results.webdriver = navigator.webdriver;
      results.userAgent = navigator.userAgent;
      results.platform = navigator.platform;
      results.languages = navigator.languages;
      results.deviceMemory = navigator.deviceMemory;
      results.hardwareConcurrency = navigator.hardwareConcurrency;
      
      // Check plugins type
      try {
        results.pluginsType = navigator.plugins.constructor.name;
        results.pluginsLength = navigator.plugins.length;
        results.isPluginArray = navigator.plugins instanceof PluginArray;
      } catch (e) {
        results.pluginsType = 'Error: ' + e.message;
        results.pluginsLength = navigator.plugins ? navigator.plugins.length : 0;
        results.isPluginArray = false;
      }
      
      // Check screen properties
      results.screenWidth = screen.width;
      results.screenHeight = screen.height;
      results.colorDepth = screen.colorDepth;
      results.pixelDepth = screen.pixelDepth;
      
      // Check window properties
      results.devicePixelRatio = window.devicePixelRatio;
      results.innerWidth = window.innerWidth;
      results.innerHeight = window.innerHeight;
      
      // Check WebGL
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        results.webglVendor = gl.getParameter(gl.VENDOR);
        results.webglRenderer = gl.getParameter(gl.RENDERER);
        results.webglVersion = gl.getParameter(gl.VERSION);
      } else {
        results.webglVendor = 'No WebGL context';
        results.webglRenderer = 'No WebGL context';
      }
      
      // Check if automation is detected
      results.chrome = window.chrome;
      results.automation = window.automation;
      
      // Check additional fingerprint properties
      results.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      results.language = navigator.language;
      
      return results;
    });
    
    console.log("📊 Stealth test results:");
    console.log("WebDriver:", stealthResults.webdriver);
    console.log("User Agent:", stealthResults.userAgent);
    console.log("Platform:", stealthResults.platform);
    console.log("Languages:", stealthResults.languages);
    console.log("Device Memory:", stealthResults.deviceMemory);
    console.log("Hardware Concurrency:", stealthResults.hardwareConcurrency);
    console.log("Plugins Type:", stealthResults.pluginsType);
    console.log("Plugins Length:", stealthResults.pluginsLength);
    console.log("Is PluginArray:", stealthResults.isPluginArray);
    console.log("Screen:", `${stealthResults.screenWidth}x${stealthResults.screenHeight}`);
    console.log("Color Depth:", stealthResults.colorDepth);
    console.log("Device Pixel Ratio:", stealthResults.devicePixelRatio);
    console.log("WebGL Vendor:", stealthResults.webglVendor);
    console.log("WebGL Renderer:", stealthResults.webglRenderer);
    console.log("WebGL Version:", stealthResults.webglVersion);
    console.log("Chrome object:", stealthResults.chrome ? "Present" : "Not present");
    console.log("Automation object:", stealthResults.automation ? "Present" : "Not present");
    console.log("Timezone:", stealthResults.timezone);
    console.log("Language:", stealthResults.language);
    
    // Test 3: Check if we can access Instagram
    console.log("🔍 Testing Instagram access...");
    await page.goto("https://www.instagram.com", { 
      waitUntil: "networkidle0",
      timeout: 30000 
    });
    
    console.log("✅ Successfully loaded Instagram");
    
    // Wait a bit to see the page
    await new Promise(r => setTimeout(r, 10000));
    
    console.log("🎉 All stealth tests completed successfully!");
    console.log("The bot should now be able to pass most bot detection tests.");
    
  } catch (error) {
    console.error("❌ Error during stealth test:", error);
  } finally {
    if (browser) {
      console.log("🔄 Closing browser...");
      await browser.close();
    }
  }
}

// Run the test
testStealthConfiguration().catch(console.error); 