const puppeteer = require('puppeteer-core'); // Ganti jadi puppeteer-core
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Ganti path ke chromium yang sesuai dengan hasil dari `which`
const CHROMIUM_PATH = '/usr/bin/chromium-browser'; // Atau '/usr/bin/chromium'

const TARGET_URL = 'http://wasistech.duckdns.org:5001/today'; // Ganti sesuai kebutuhan
const NUMBER = '6283856088009';             // Nomor tujuan
const CAPTION = 'Jadwal hari ini';          // Caption untuk gambar

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#isiJadwal'); // Tunggu elemen dengan ID 'colScheduleContent' muncul

  const element = await page.$('#isiJadwal'); // Ambil elemen dengan ID 'colScheduleContent'
  const screenshotPath = path.join(__dirname, 'scheduleContent.png');
  await element.screenshot({ path: screenshotPath });

  await browser.close();

  const form = new FormData();
  form.append('image', fs.createReadStream(screenshotPath));
  form.append('number', NUMBER);
  form.append('caption', CAPTION);

  try {
    const response = await axios.post(
      'http://wasistech.duckdns.org:3001/send-image',
      form,
      { headers: form.getHeaders() }
    );
    console.log('Berhasil mengirim:', response.data);
  } catch (error) {
    console.error('Gagal mengirim:', error.response?.data || error.message);
  }
})();
