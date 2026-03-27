const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.json({ status: 'YASIA Puppeteer OK' }));

app.post('/html-to-images', async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: 'html required' });
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: 'new'
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1500));
    const slides = await page.$$('.slide');
    const images = [];
    for (let i = 0; i < slides.length; i++) {
      await page.evaluate((idx) => {
        document.querySelectorAll('.slide').forEach((s, j) => {
          s.style.display = j === idx ? 'block' : 'none';
        });
      }, i);
      const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
      images.push(screenshot);
    }
    await browser.close();
    res.json({ images, count: images.length });
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000);
