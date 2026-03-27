const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => res.json({ status: 'YASIA Puppeteer OK' }));

// HTML → PNG slides
app.post('/html-to-images', async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: 'html required' });

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/run/current-system/sw/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote'
      ],
      headless: 'new'
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Attendre que les polices et images chargent
    await page.waitForTimeout(1500);

    const slides = await page.$$('.slide');
    const images = [];

    for (let i = 0; i < slides.length; i++) {
      // Forcer chaque slide en 1080x1080
      await page.evaluate((idx) => {
        const slides = document.querySelectorAll('.slide');
        slides.forEach((s, j) => {
          s.style.display = j === idx ? 'flex' : 'none';
        });
      }, i);

      const screenshot = await page.screenshot({
        type: 'png',
        encoding: 'base64',
        clip: { x: 0, y: 0, width: 1080, height: 1080 }
      });
      images.push(screenshot);
    }

    await browser.close();
    res.json({ images, count: images.length });

  } catch (err) {
    if (browser) await browser.close();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`YASIA Puppeteer running on port ${PORT}`));
