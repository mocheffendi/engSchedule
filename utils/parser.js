// utils/parser.js
const fs = require('fs');
const path = require('path');

function getTodayDateString() {
    const options = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    return new Date().toLocaleDateString('en-GB', options);
}

function getTodaySchedule(filePath = path.join(__dirname, '../data/jadwal.txt')) {
    if (!fs.existsSync(filePath)) return '';
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    const today = getTodayDateString();
    let collecting = false;
    let result = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === today) {
            collecting = true;
            result += trimmed + '\n';
            continue;
        }

        if (collecting) {
            if (trimmed === '') break;
            result += trimmed + '\n';
        }
    }

    return result.trim();
}

module.exports = { getTodaySchedule };
