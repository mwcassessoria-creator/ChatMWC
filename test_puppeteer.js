const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    console.log('Browser launched successfully!');
    await browser.close();
    console.log('Browser closed.');
  } catch (error) {
    console.error('Error launching browser:', error);
  }
})();
