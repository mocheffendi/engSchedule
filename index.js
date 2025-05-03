const express = require('express');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const moment = require('moment');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');

const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = 5000;
// const JADWAL_FILE = path.join(__dirname, 'jadwal.txt');
const JADWAL_FILE = path.join(__dirname, 'output', 'jadwal.txt');
const WA_API = 'http://wasistech.duckdns.org:3001/send';
const DEFAULT_NUMBER = '6283856088009';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Set static folder for CSS, images, JS
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  // res.send(``);
  res.render('index', {});
});


app.get('/uploadSchedule', (req, res) => {
  // res.sendFile(path.join(__dirname, 'public', 'uploadSchedule.html'));
  res.render('uploadSchedule', {});
});

app.get('/uploadExcel', (req, res) => {
  // res.sendFile(path.join(__dirname, 'public', 'uploadExcel.html'));
  res.render('uploadExcel', {});
});

function excelDateToJSDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return dateInfo;
}

function excelDateToMonth(serial) {
  const date = new Date((serial - 25569) * 86400 * 1000);
  const options = { month: 'long' };
  return date.toLocaleDateString('en-US', options);
}

app.post('/upload', upload.single('excel'), async (req, res) => {
  const filePath = req.file.path;

  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const dateRow = jsonData[3];
  const dataRows = jsonData.slice(5);
  const nameColumnIndex = 1;

  const shiftCodes = ['M', 'MD', 'A', 'N'];
  const shiftMap = { M: 'Morning', MD: 'Middle', A: 'Afternoon', N: 'Night' };

  const monthMap = {};
  const merges = sheet['!merges'] || [];

  for (const merge of merges) {
    const startCol = merge.s.c;
    const endCol = merge.e.c;
    const row = merge.s.r;
    if (row === 1) {
      const cellAddress = xlsx.utils.encode_cell({ c: startCol, r: row });
      const cell = sheet[cellAddress];
      const value = cell ? cell.v : null;
      if (value) {
        for (let col = startCol; col <= endCol; col++) {
          monthMap[col] = value;
        }
      }
    }
  }

  let allText = '';
  let lastTanggal = 0;
  let currentBulan = '';

  for (let col = 2; col <= 32; col++) {
    const rawTanggal = dateRow[col];
    if (!rawTanggal) continue;

    let bulan = monthMap[col];
    if (!bulan) bulan = currentBulan;
    else currentBulan = bulan;

    bulan = excelDateToMonth(currentBulan);

    let tanggalFormatted = '';

    if (typeof rawTanggal === 'number' && rawTanggal > 40000) {
      const date = excelDateToJSDate(rawTanggal);
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      tanggalFormatted = date.toLocaleDateString('en-US', options);
    } else {
      let hariIni = parseInt(rawTanggal);

      if (lastTanggal > 0 && hariIni < lastTanggal) {
        const tempDate = new Date(`${bulan} 1, 2025`);
        tempDate.setMonth(tempDate.getMonth() + 1);
        bulan = tempDate.toLocaleDateString('en-US', { month: 'long' });
      }

      tanggalFormatted = `${hariIni} ${bulan} 2025`;
      lastTanggal = hariIni;
    }

    const result = { M: [], MD: [], A: [], N: [] };

    for (const row of dataRows) {
      const name = row[nameColumnIndex];
      const shift = (row[col] || '').toString().toUpperCase().trim();
      if (shiftCodes.includes(shift)) {
        result[shift].push(name);
      }
    }

    allText += `${tanggalFormatted}\n`;
    for (const code of shiftCodes) {
      if (result[code].length) {
        allText += `${shiftMap[code]}: ${result[code].join(', ')}\n`;
      }
    }
    allText += '\n';
  }

  if (!allText.trim()) {
    return res.send('⚠️ Tidak ada data jadwal yang berhasil diekstrak.');
  }

  const outputDir = path.join(__dirname, 'output');
  try { await fs.mkdir(outputDir); } catch { }
  await fs.writeFile(JADWAL_FILE, allText);

  res.redirect('/preview');
});

// app.get('/preview', async (req, res) => {
//   try {
//     const data = await fs.readFile(JADWAL_FILE, 'utf-8');
//     const blocks = data.split(/\n(?=\d{1,2} [A-Za-z]+ \d{4})/g);
//     let html = `
//       <!DOCTYPE html>
// <html lang="en">
//   <head>
//     <meta charset="UTF-8" />
//     <title>Engineering Dashboard</title>
//     <meta name="viewport" content="width=device-width, initial-scale=1" />
//     <link
//       href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
//       rel="stylesheet"
//     />
//     <script
//       src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
//       defer
//     ></script>
//     <style>
//       * {
//         margin: 0;
//         padding: 0;
//         box-sizing: border-box;
//         font-family: "Inter", sans-serif;
//       }

//       body {
//         font-family: 'Roboto', sans-serif;
//         background-color: #1c1f24;
//         color: #fff;
//         display: flex;
//       }

//       .sidebar {
//         width: 240px;
//         background-color: #1a1d22;
//         height: 100vh;
//         padding: 30px 12px;
//         display: flex;
//         flex-direction: column;
//         justify-content: space-between;
//         transition: width 0.3s ease;
//       }
//       .sidebar.collapsed {
//         width: 60px;
//       }
//       .toggle-btn {
//         color: #c4ff00;
//         font-size: 24px;
//         cursor: pointer;
//         margin-bottom: 20px;
//         display: inline-block;
//       }
//       .sidebar .user {
//         text-align: center;
//         margin-bottom: 40px;
//       }
//       .sidebar .user img {
//         border-radius: 50%;
//         width: 60px;
//         height: 60px;
//         transition: width 0.3s, height 0.3s;
//       }
//       .sidebar.collapsed .user img {
//         width: 40px;
//         height: 40px;
//       }
//       .sidebar .user h4 {
//         margin-top: 10px;
//         font-size: 16px;
//         color: #fff;
//       }
//       .sidebar.collapsed .user h4 {
//         display: none;
//       }
//       .sidebar nav a {
//         display: flex;
//         align-items: center;
//         gap: 10px;
//         color: #ccc;
//         text-decoration: none;
//         margin: 15px 0;
//         padding: 10px;
//         border-radius: 8px;
//         transition: background 0.2s;
//       }
//       .sidebar nav a:hover,
//       .sidebar nav a.active {
//         background-color: #31343a;
//         color: #c4ff00;
//       }
//       .sidebar nav a i {
//         font-size: 16px;
//         min-width: 20px;
//         text-align: center;
//       }
//       .sidebar nav a span {
//         transition: opacity 0.3s;
//       }
//       .sidebar.collapsed nav a span {
//         display: none;
//       }

//       .main {
//         flex: 1;
//         padding: 30px;
//         background-color: #20242a;
//         display: grid;
//         grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
//         gap: 20px;
//         transition: margin-left 0.3s;
//       }

//       .card {
//         background-color: #2a2f36;
//         border-radius: 16px;
//         padding: 20px;
//         position: relative;
//         overflow: hidden;
//         min-height: 120px;
//         display: flex;
//         flex-direction: column;
//         justify-content: flex-end;
//         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
//         transition: all 0.2s ease;
//         cursor: pointer;
//       }

//       .card h3 {
//         color: #c4ff00;
//         margin-bottom: 10px;
//       }

//       .card:hover {
//         transform: translateY(-4px);
//         box-shadow: 0 6px 12px rgba(196, 255, 0, 0.3);
//       }

//       .card:active {
//         transform: scale(0.97);
//         box-shadow: 0 3px 6px rgba(196, 255, 0, 0.2);
//       }

//       .card-icon {
//         position: absolute;
//         top: 20px;
//         left: 20px;
//         font-size: 24px;
//         color: #c4ff00;
//       }

//       .card-title {
//         font-weight: 600;
//         font-size: 16px;
//         color: #fff;
//       }

//       .card-subtitle {
//         font-size: 12px;
//         color: #ccc;
//       }

//       .schedule-card {
//         background-color: #2a2f36;
//         flex: 1;
//         background-color: #2a2f36;
//         border-radius: 16px;
//         padding: 20px;
//         position: relative;
//         overflow: hidden;
//         min-height: 120px;
//         display: flex;
//         flex-direction: column;
//         justify-content: flex-end;
//         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
//         transition: all 0.2s ease;
//         cursor: pointer;
//       }

//       .schedule-card h3 {
//         color: #c4ff00;
//         margin-bottom: 10px;
//       }

//       #scheduleContent div {
//         margin-bottom: 10px;
//         color: #fff;
//       }
//       #scheduleContent .label {
//         font-weight: bold;
//         margin-right: 6px;
//       }
//       #scheduleContent .label.morning {
//         color: #90ee90;
//       }
//       #scheduleContent .label.middle {
//         color: orange;
//       }
//       #scheduleContent .label.afternoon {
//         color: #ffd700;
//       }
//       #scheduleContent .label.night {
//         color: #66b2ff;
//       }

//       @media (max-width: 768px) {
//         .sidebar {
//           width: 240px;
//           background-color: #1a1d22;
//           height: 100vh;
//           padding: 30px 12px;
//           display: flex;
//           flex-direction: column;
//           justify-content: space-between;
//           transition: width 0.3s ease;
//         }
//         /* .sidebar.auto-collapsed {
//           width: 60px;
//         } */
//         .sidebar .user h4,
//         .sidebar nav a span {
//           transition: opacity 0.3s;
//           /* display: none; */
//         }
//         .sidebar nav a {
//           display: flex;
//           align-items: center;
//           gap: 10px;
//           color: #ccc;
//           text-decoration: none;
//           margin: 15px 0;
//           padding: 10px;
//           border-radius: 8px;
//           transition: background 0.2s;
//         }
//         .sidebar nav a:hover,
//         .sidebar nav a.active {
//           background-color: #31343a;
//           color: #c4ff00;
//         }
//         .sidebar nav a i {
//           font-size: 16px;
//           min-width: 20px;
//           text-align: center;
//         }

//         .sidebar.collapsed nav a span {
//           display: none;
//         }
//       }
//               .card-title {
//                   font-size: 20px;
//                   color: #007bff;
//               }
//               .shift-label {
//                   font-weight: bold;
//               }
//               .morning { color: green; }
//               .middle { color: orange; }
//               .afternoon { color: #ffc107; }
//               .night { color: #007bff; }
//     </style>
//   </head>
//   <body>
//     <div class="sidebar collapsed" id="sidebar">
//       <div>
//         <div class="toggle-btn" onclick="toggleSidebar()">☰</div>
//         <div class="user">
//           <img
//             src="https://scontent.fcgk29-1.fna.fbcdn.net/v/t39.30808-6/240149924_1266153830469898_4312465236162673900_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeEPi4lbNMQ-IxTwzC-eP1oceag_PbyWHCB5qD89vJYcIGoJPPUbL5bIj0yaWebCjAg&_nc_ohc=ncaUPkqnRDwQ7kNvwFs7ZHp&_nc_oc=Adn_cJ05hJqRO3hD48s3OBANurDQ_OkhwHiFdcJDDr2j4NizAzwaaqBpTgA_La249K8&_nc_zt=23&_nc_ht=scontent.fcgk29-1.fna&_nc_gid=3EnV0HibA8BnXzSQOM4BTg&oh=00_AfEfcJxngGqfYda-0xnTrh0oDEqf6pLuYz2XaA7GRICNhw&oe=6816A56E"
//             alt="User"
//           />
//           <h4>Engineering Schedule</h4>
//         </div>
//         <nav>
//           <a href="/"
//             ><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a
//           >
//           <a href="/scheduleDate"
//             ><i class="fas fa-calendar-alt"></i><span>Calendar</span></a
//           >
//           <a href="#"><i class="fas fa-book"></i><span>Log</span></a>
//           <a class="active" href="/preview"
//             ><i class="fas fa-clock"></i><span>Schedule</span></a
//           >
//         </nav>
//       </div>
//       <div>
//         <nav>
//           <a href="#"><i class="fas fa-cog"></i><span>Settings</span></a>
//           <a href="#"><i class="fas fa-sign-out-alt"></i><span>Logout</span></a>
//         </nav>
//       </div>
//     </div>

//     <div class="main">
//     `;

//     for (const block of blocks) {
//       const lines = block.trim().split('\n');
//       if (!lines[0]) continue;
//       const date = lines[0];

//       let content = lines.slice(1).map(line => {
//         if (line.startsWith('Morning:')) {
//           return `<div><span class="label morning">Morning:</span>${line.replace('Morning:', '').trim()}</div>`;
//         } else if (line.startsWith('Middle:')) {
//           return `<div><span class="label middle">Middle:</span>${line.replace('Middle:', '').trim()}</div>`;
//         } else if (line.startsWith('Afternoon:')) {
//           return `<div><span class="label afternoon">Afternoon:</span>${line.replace('Afternoon:', '').trim()}</div>`;
//         } else if (line.startsWith('Night:')) {
//           return `<div><span class="label night">Night:</span>${line.replace('Night:', '').trim()}</div>`;
//         } else {
//           return line;
//         }
//       }).join('');

//       html += `
//         <div class="col">
//             <div class="card">

//                     <h3>${date}</h3>
//                     <div id="scheduleContent">${content}</div>

//             </div>
//         </div>
//       `;
//     }

//     html += `
//     </div>

//     <script>
//       function toggleSidebar() {
//         const sidebar = document.getElementById("sidebar");
//         sidebar.classList.toggle("collapsed");
//       }

//       window.addEventListener("DOMContentLoaded", () => {
//         const sidebar = document.getElementById("sidebar");

//         // Jika lebar layar > 500, buka sidebar
//         // if (window.innerWidth > 700) {
//         //   sidebar.classList.remove("collapsed");
//         // }

//         // Saat ukuran layar berubah
//         window.addEventListener("resize", () => {
//           if (window.innerWidth > 1080) {
//             sidebar.classList.remove("collapsed");
//           } else {
//             sidebar.classList.add("collapsed");
//           }
//         });
//       });
//     </script>
//   </body>
// </html>
//     `;
//     res.send(html);

//   } catch (err) {
//     res.status(500).send('Gagal membaca jadwal.');
//   }
// });

app.get('/preview', async (req, res) => {
  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const rawBlocks = data.split(/\n(?=\d{1,2} [A-Za-z]+ \d{4})/g);

    const blocks = rawBlocks.map(block => {
      const lines = block.trim().split('\n');
      if (!lines[0]) return null;

      const date = lines[0];
      const contents = lines.slice(1).map(line => {
        if (line.startsWith('Morning:')) {
          return { label: 'Morning', value: line.replace('Morning:', '').trim() };
        } else if (line.startsWith('Middle:')) {
          return { label: 'Middle', value: line.replace('Middle:', '').trim() };
        } else if (line.startsWith('Afternoon:')) {
          return { label: 'Afternoon', value: line.replace('Afternoon:', '').trim() };
        } else if (line.startsWith('Night:')) {
          return { label: 'Night', value: line.replace('Night:', '').trim() };
        } else {
          return { label: '', value: line.trim() };
        }
      });

      return { date, contents };
    }).filter(Boolean);

    res.render('preview', { blocks });

  } catch (err) {
    res.status(500).send('Gagal membaca jadwal.');
  }
});


app.get('/download', (req, res) => {
  res.download(JADWAL_FILE, 'jadwal.txt');
});

app.get('/scheduleDate', (req, res) => {
  // res.send(``);
  res.render('scheduleDate', {});
});

app.get('/scheduleByDate', (req, res) => {
  res.send(`
  < html >
  <head>
    <title>Upload Schedule</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: Arial; margin: 20px; padding: 0; background: #f0f0f0; }
      .container { max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
      h3 { margin-top: 0; }
      textarea, input[type=text], input[type=submit], button, input[type=date] { width: 100%; padding: 10px; margin: 10px 0; }
      .form-group { margin-bottom: 20px; }
      .btn { background: #007bff; color: white; border: none; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <form method='GET' action='/byDate'>
        <h3>Cek Jadwal Berdasarkan Tanggal</h3>
        <input type='date' name='date'>
        <input class="btn" type='submit' value='Cek Jadwal'>
      </form>
    </div>
  </body>
  </html>
  `);
});

app.get('/scheduleDeleteByDate', (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Upload Schedule</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: Arial; margin: 20px; padding: 0; background: #f0f0f0; }
      .container { max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
      h3 { margin-top: 0; }
      textarea, input[type=text], input[type=submit], button, input[type=date] { width: 100%; padding: 10px; margin: 10px 0; }
      .form-group { margin-bottom: 20px; }
      .btn { background: #007bff; color: white; border: none; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <form method='POST' action='/deleteByDate'>
        <h3>Hapus Jadwal Berdasarkan Tanggal</h3>
        <input type='date' name='date'>
        <input class="btn" type='submit' value='Hapus Jadwal'>
      </form>
    </div>
  </body>
  </html>
  `);
});

app.get('/byDate', async (req, res) => {
  const input = req.query.date;
  if (!input) return res.status(400).send('Tanggal tidak valid.');

  const moment = require('moment'); // Pastikan moment sudah diimport
  const targetDate = moment(input).format('D MMMM YYYY');

  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const lines = data.split(/\r?\n/);
    let collect = false;
    let result = '';

    for (let line of lines) {
      if (line.trim() === targetDate) {
        collect = true;
        result += line + '\n';
        continue;
      }
      if (collect) {
        if (line.trim() === '') break;
        result += line + '\n';
      }
    }

    if (!result) return res.status(404).send('Tidak ada jadwal untuk tanggal tersebut.');

    // HTML template seperti di getDataHtml
    const html = `
        <html>
        <head>
            <title>Jadwal ${targetDate}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
                .card {
                    background: #fff; padding: 15px; border-radius: 10px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    max-width: 600px; margin: auto;
                }
                .card h4 { margin: 0 0 10px; color: #007bff; }
                pre { white-space: pre-wrap; word-wrap: break-word; color: #000000}
            </style>
        </head>
        <body>
            <div class="card">
                <h4>${targetDate}</h4>
                <pre>${result.split('\n').slice(1).join('\n')}</pre>
            </div>
        </body>
        </html>
        `;

    res.send(html);
  } catch (err) {
    res.status(500).send('Gagal membaca jadwal.');
  }
});

app.get('/byDay', async (req, res) => {
  const date = req.query.date;
  // console.log('date: ', date);
  const formatted = moment(date).format('D MMMM YYYY');
  // console.log('formatted: ', formatted);

  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const lines = data.split(/\r?\n/);
    let collect = false;
    let result = '';

    for (let line of lines) {
      if (line.trim() === formatted) {
        collect = true;
        result += line + '\n';
        continue;
      }
      if (collect) {
        if (line.trim() === '') break;
        result += line + '\n';
      }
    }

    if (!result) return res.status(404).send("Tidak ada jadwal untuk tanggal ini.");

    const html = result
      .split('\n')
      .slice(1)
      .map(line => {
        if (line.startsWith('Morning:')) {
          return `<div><span class="label morning">Morning:</span> ${line.replace('Morning:', '').trim()}</div>`;
        } else if (line.startsWith('Middle:')) {
          return `<div><span class="label middle">Middle:</span> ${line.replace('Middle:', '').trim()}</div>`;
        } else if (line.startsWith('Afternoon:')) {
          return `<div><span class="label afternoon">Afternoon:</span> ${line.replace('Afternoon:', '').trim()}</div>`;
        } else if (line.startsWith('Night:')) {
          return `<div><span class="label night">Night:</span> ${line.replace('Night:', '').trim()}</div>`;
        } else {
          return `<div>${line}</div>`;
        }
      })
      .join('');

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan.");
  }
});

app.post('/deleteByDate', async (req, res) => {
  const input = req.body.date;
  if (!input) return res.status(400).send('Tanggal tidak valid.');
  const targetDate = moment(input).format('D MMMM YYYY');

  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const lines = data.split(/\r?\n/);
    let newData = '';
    let skip = false;

    for (let line of lines) {
      if (line.trim() === targetDate) {
        skip = true;
        continue;
      }
      if (skip && line.trim() === '') {
        skip = false;
        continue;
      }
      if (!skip) newData += line + '\n';
    }

    await fs.writeFile(JADWAL_FILE, newData.trim() + '\n');
    res.send(`Jadwal untuk tanggal ${targetDate} berhasil dihapus.`);
  } catch (err) {
    res.status(500).send('Gagal menghapus jadwal.');
  }
});

app.get('/deleteAll', async (req, res) => {
  try {
    await fs.writeFile(JADWAL_FILE, ''); // Kosongkan isi file jadwal

    const html = `
    <html>
      <head>
        <title>Hapus Jadwal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
            .card {
              background: #fff; padding: 15px; border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            max-width: 600px; margin: auto; text-align: center;
                }
            .success {color: red; font-weight: bold; }
          </style>
      </head>
      <body>
        <div class="card">
          <p class="success">🗑️ Semua jadwal berhasil dihapus.</p>
        </div>
      </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    const html = `
    <html>
      <head>
        <title>Gagal Hapus Jadwal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
            .card {
              background: #fff; padding: 15px; border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            max-width: 600px; margin: auto; text-align: center;
                }
            .error {color: red; font-weight: bold; }
          </style>
      </head>
      <body>
        <div class="card">
          <p class="error">❌ Gagal menghapus jadwal.<br>${err.message}</p>
        </div>
      </body>
    </html>
    `;

    res.status(500).send(html);
  }
});

app.post('/submit', async (req, res) => {
  const bulk = req.body.bulk;
  if (!bulk) {
    return res.status(400).send(`
    <html>
      <head>
        <title>Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
            .card {
              background: #fff; padding: 15px; border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            max-width: 600px; margin: auto; text-align: center;
                }
            .error {color: red; font-weight: bold; }
          </style>
      </head>
      <body>
        <div class="card">
          <p class="error">⚠️ Jadwal kosong. Tidak ada data untuk disimpan.</p>
        </div>
      </body>
    </html>
    `);
  }

  try {
    await fs.writeFile(JADWAL_FILE, bulk);

    const html = `
    <html>
      <head>
        <title>Jadwal Tersimpan</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
            .card {
              background: #fff; padding: 15px; border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            max-width: 600px; margin: auto; text-align: center;
                }
            .success {color: green; font-weight: bold; }
          </style>
      </head>
      <body>
        <div class="card">
          <p class="success">✅ Jadwal berhasil disimpan.</p>
        </div>
      </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    const html = `
    <html>
      <head>
        <title>Gagal Simpan Jadwal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
            .card {
              background: #fff; padding: 15px; border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            max-width: 600px; margin: auto; text-align: center;
                }
            .error {color: red; font-weight: bold; }
          </style>
      </head>
      <body>
        <div class="card">
          <p class="error">❌ Gagal menyimpan jadwal.<br>${err.message}</p>
        </div>
      </body>
    </html>
    `;

    res.status(500).send(html);
  }
});

app.get('/getData', async (req, res) => {
  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    res.type('text/plain').send(data);
  } catch (err) {
    res.status(500).send('Gagal membaca jadwal.');
  }
});

app.get('/getDataHtml', async (req, res) => {
  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const blocks = data.split(/\n(?=\d{1, 2} [A-Za-z]+ \d{4})/g); // Pisah berdasarkan tanggal
    let html = `
    <html>
      <head>
        <title>Semua Jadwal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
            .grid {display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .card {
              background: #fff; padding: 15px; border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
            .card h4 {margin: 0 0 10px; color: #007bff; }
            pre {white - space: pre-wrap; word-wrap: break-word; }
          </style>
      </head>
      <body>
        <h2>Semua Jadwal</h2>
        <div class="grid">
          `;
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (!lines[0]) continue;
      const date = lines[0];
      const content = lines.slice(1).join('\n');
      html += `<div class="card"><h4>${date}</h4><pre>${content}</pre></div>`;
    }
    html += `</div></body></html>`;
    res.send(html);
  } catch (err) {
    res.status(500).send('Gagal membaca jadwal.');
  }
});

// app.get('/today', async (req, res) => {
//   const moment = require('moment');
//   const fs = require('fs').promises;
//   const today = moment().format('D MMMM YYYY');

//   try {
//     const data = await fs.readFile(JADWAL_FILE, 'utf-8');
//     const lines = data.split(/\r?\n/);
//     let collect = false;
//     let result = '';

//     for (let line of lines) {
//       if (line.trim() === today) {
//         collect = true;
//         result += line + '\n';
//         continue;
//       }
//       if (collect) {
//         if (line.trim() === '') break;
//         result += line + '\n';
//       }
//     }

//     if (!result) return res.status(404).send('Tidak ada jadwal untuk hari ini.');

//     const formatted = result
//       .split('\n')
//       .slice(1)
//       .map(line => {
//         if (line.startsWith('Morning:')) {
//           return `<div><span class="label morning">Morning:</span> ${line.replace('Morning:', '').trim()}</div>`;
//         } else if (line.startsWith('Middle:')) {
//           return `<div><span class="label middle">Middle:</span> ${line.replace('Middle:', '').trim()}</div>`;
//         } else if (line.startsWith('Afternoon:')) {
//           return `<div><span class="label afternoon">Afternoon:</span> ${line.replace('Afternoon:', '').trim()}</div>`;
//         } else if (line.startsWith('Night:')) {
//           return `<div><span class="label night">Night:</span> ${line.replace('Night:', '').trim()}</div>`;
//         } else {
//           return `<div>${line}</div>`;
//         }
//       })
//       .join('');

//     const html = `
//     <html>
//       <head>
//         <title>Jadwal Hari Ini (${today})</title>
//         <meta name="viewport" content="width=device-width, initial-scale=1">
//           <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
//             <style>
//               body {
//                 font - family: 'Roboto', sans-serif;
//               background: #f0f0f0;
//               margin: 0;
//               padding: 20px;
//           }
//               .card {
//                 background: #fff;
//               padding: 15px;
//               border-radius: 10px;
//               box-shadow: 0 0 10px rgba(0,0,0,0.1);
//               max-width: 600px;
//               margin: auto;
//           }
//               .card h5 {
//                 margin: 0 0 10px;
//               color: rgb(0, 132, 255);
//               font-size: 18px; /* Ukuran diperbesar */
//           }
//               .label {
//                 font - weight: bold;
//           }
//               .label.morning {color: green; }
//               .label.middle {color: orange; }
//               .label.afternoon {color:#ffc107; }
//               .label.night {color:rgb(0, 132, 255); }
//             </style>

//           </head>
//           <body>
//             <div class="card">
//               <h5>${today}</h5>
//               ${formatted}
//             </div>
//           </body>
//         </html>
//         `;

//     res.send(html);

//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Gagal membaca jadwal.');
//   }
// });

app.get('/today', async (req, res) => {
  const today = moment().format('D MMMM YYYY');

  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const lines = data.split(/\r?\n/);
    let collect = false;
    let result = '';

    for (let line of lines) {
      if (line.trim() === today) {
        collect = true;
        result += line + '\n';
        continue;
      }
      if (collect) {
        if (line.trim() === '') break;
        result += line + '\n';
      }
    }

    if (!result) return res.status(404).send('Tidak ada jadwal untuk hari ini.');

    const formatted = result
      .split('\n')
      .slice(1)
      .map(line => {
        if (line.startsWith('Morning:')) {
          return `<div><span class="label morning">Morning:</span> ${line.replace('Morning:', '').trim()}</div>`;
        } else if (line.startsWith('Middle:')) {
          return `<div><span class="label middle">Middle:</span> ${line.replace('Middle:', '').trim()}</div>`;
        } else if (line.startsWith('Afternoon:')) {
          return `<div><span class="label afternoon">Afternoon:</span> ${line.replace('Afternoon:', '').trim()}</div>`;
        } else if (line.startsWith('Night:')) {
          return `<div><span class="label night">Night:</span> ${line.replace('Night:', '').trim()}</div>`;
        } else {
          return `<div>${line}</div>`;
        }
      })
      .join('');

    res.render('today', { today, formatted });

  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal membaca jadwal.');
  }
});

app.get('/testSendSchedule', async (req, res) => {
  const moment = require('moment'); // Pastikan moment sudah diimport
  const today = moment().format('D MMMM YYYY');

  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const lines = data.split(/\r?\n/);
    let collect = false;
    let result = '';

    for (let line of lines) {
      if (line.trim() === today) {
        collect = true;
        result += line + '\n';
        continue;
      }
      if (collect) {
        if (line.trim() === '') break;
        result += line + '\n';
      }
    }

    // Buat HTML respons
    let html = `
        <html>
          <head>
            <title>Pengiriman Jadwal Hari Ini</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
                .card {
                  background: #fff; padding: 15px; border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                max-width: 600px; margin: auto; text-align: center;
                }
                .card h4 {margin: 0 0 10px; color: #007bff; }
                .success {color: green; font-weight: bold; }
                .warning {color: #e69500; font-weight: bold; }
                .error {color: red; font-weight: bold; }
                pre {text - align: left; white-space: pre-wrap; word-wrap: break-word; }
              </style>
          </head>
          <body>
            <div class="card">
              `;

    if (result) {
      await axios.post(WA_API, {
        number: DEFAULT_NUMBER,
        message: result.trim()
      });

      html += `
              <h4>${today}</h4>
              <p class="success">✅ Pesan jadwal hari ini berhasil dikirim!</p>
              <pre>${result.split('\n').slice(1).join('\n')}</pre>
              `;
    } else {
      html += `
                <h4>${today}</h4>
                <p class="warning">⚠️ Tidak ada jadwal hari ini.</p>
            `;
    }

    html += `</div></body></html>`;
    res.send(html);

  } catch (err) {
    console.error('❌ Gagal kirim pesan:', err.message);

    const html = `
        <html>
          <head>
            <title>Gagal Kirim Pesan</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {font - family: Arial; background: #f0f0f0; margin: 0; padding: 20px; }
                .card {
                  background: #fff; padding: 15px; border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                max-width: 600px; margin: auto; text-align: center;
                }
                .error {color: red; font-weight: bold; }
              </style>
          </head>
          <body>
            <div class="card">
              <p class="error">❌ Gagal mengirim pesan.<br>${err.message}</p>
            </div>
          </body>
        </html>
        `;

    res.status(500).send(html);
  }
});

app.get('/messageSend', (req, res) => {
  res.render('messageSend', {});
  // res.send(`
  // <html>
  // <head>
  //   <title>Upload Schedule</title>
  //   <meta name="viewport" content="width=device-width, initial-scale=1">
  //   <style>
  //     body { font-family: Arial; margin: 20px; padding: 0; background: #f0f0f0; }
  //     .container { max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
  //     h3 { margin-top: 0; }
  //     textarea, input[type=text], input[type=submit], button, input[type=date] { width: 100%; padding: 10px; margin: 10px 0; }
  //     .form-group { margin-bottom: 20px; }
  //     .btn { background: #007bff; color: white; border: none; border-radius: 5px; }
  //   </style>
  // </head>
  // <body>
  //   <div class="container">
  //     <form method='POST' action='/sendMessage'>
  //       <h3>Test Kirim Pesan WhatsApp</h3>
  //       <input type='text' name='number' placeholder='628xxxxxxx'>
  //       <textarea name='message' placeholder='Isi pesan'></textarea>
  //       <input class="btn" type='submit' value='Kirim Pesan'>
  //     </form>
  //   </div>
  // </body>
  // </html>
  // `);
});

app.post('/sendMessage', async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).send('Nomor dan pesan wajib diisi.');

  try {
    await axios.post(WA_API, { number, message });
    res.send('Pesan berhasil dikirim.');
  } catch (err) {
    res.status(500).send('Gagal mengirim pesan.');
  }
});

cron.schedule('0 7 * * *', async () => {
  console.log('⏰ Mengirim pesan otomatis...');
  const today = moment().format('D MMMM YYYY');
  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const lines = data.split(/\r?\n/);
    let collect = false;
    let result = '';

    for (let line of lines) {
      if (line.trim() === today) {
        collect = true;
        result += line + '\n';
        continue;
      }
      if (collect) {
        if (line.trim() === '') break;
        result += line + '\n';
      }
    }

    if (result) {
      await axios.post(WA_API, {
        number: DEFAULT_NUMBER,
        message: result.trim()
      });
      console.log('✅ Pesan jadwal hari ini berhasil dikirim.');
    } else {
      console.log('⚠️ Tidak ada jadwal hari ini.');
    }
  } catch (err) {
    console.error('❌ Gagal kirim pesan otomatis:', err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
