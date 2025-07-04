'use strict';

// Load environment variables from .env file
require('dotenv').config();

const puppeteer = require('puppeteer');

async function testProxy() {
  let browser;

  try {
    console.log('Testing proxy configuration...');
    
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ];

    // Add proxy if configured
    if (process.env.PROXY_SERVER) {
      args.push(`--proxy-server=${process.env.PROXY_SERVER}`);
      console.log(`Using proxy: ${process.env.PROXY_SERVER}`);
    } else {
      console.log('No proxy configured');
    }

    browser = await puppeteer.launch({
      headless: false, // Set to false to see the browser
      args: args,
    });

    const page = await browser.newPage();

    // Set proxy authentication if needed
    if (process.env.PROXY_AUTH && process.env.PROXY_SERVER) {
      const [username, password] = process.env.PROXY_AUTH.split(':');
      await page.authenticate({ username, password });
      console.log(`Authenticated proxy with user: ${username}`);
    }

    // Test 1: Check IP address
    console.log('\n1. Testing IP address...');
    try {
      await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle0' });
      const ipText = await page.$eval('pre', el => el.textContent);
      console.log('Current IP:', JSON.parse(ipText).origin);
    } catch (error) {
      console.error('Failed to get IP:', error.message);
    }

    // Test 2: Check if Instagram is accessible
    console.log('\n2. Testing Instagram access...');
    try {
      await page.goto('https://www.instagram.com', { waitUntil: 'networkidle0' });
      const title = await page.title();
      console.log('Instagram title:', title);
      console.log('✅ Instagram is accessible');
    } catch (error) {
      console.error('❌ Failed to access Instagram:', error.message);
    }

    // Test 3: Check proxy headers
    console.log('\n3. Testing proxy headers...');
    try {
      await page.goto('https://httpbin.org/headers', { waitUntil: 'networkidle0' });
      const headersText = await page.$eval('pre', el => el.textContent);
      const headers = JSON.parse(headersText);
      console.log('User-Agent:', headers.headers['User-Agent']);
      console.log('Accept-Language:', headers.headers['Accept-Language']);
    } catch (error) {
      console.error('Failed to get headers:', error.message);
    }

    // Test 4: Check connection speed
    console.log('\n4. Testing connection speed...');
    const startTime = Date.now();
    try {
      await page.goto('https://www.google.com', { waitUntil: 'networkidle0' });
      const loadTime = Date.now() - startTime;
      console.log(`Page load time: ${loadTime}ms`);
      
      if (loadTime < 5000) {
        console.log('✅ Connection speed is good');
      } else if (loadTime < 10000) {
        console.log('⚠️ Connection speed is acceptable');
      } else {
        console.log('❌ Connection speed is slow');
      }
    } catch (error) {
      console.error('Failed to test connection speed:', error.message);
    }

    console.log('\n✅ Proxy test completed successfully!');
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ Proxy test failed:', error);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Run the test
testProxy().catch(console.error); 