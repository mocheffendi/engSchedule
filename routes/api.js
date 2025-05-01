// routes/api.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getTodaySchedule } = require('../utils/parser');
const { sendMessage } = require('../utils/waSender');

const filePath = path.join(__dirname, '../data/jadwal.txt');

router.post('/submit', (req, res) => {
    const bulk = req.body.bulk;
    if (!bulk) return res.status(400).send('No data provided.');

    fs.appendFile(filePath, bulk + '\n\n', err => {
        if (err) return res.status(500).send('Failed to save schedule.');
        res.send('Schedule saved.');
    });
});

router.get('/getData', (req, res) => {
    if (!fs.existsSync(filePath)) return res.send('No schedule found.');
    const data = fs.readFileSync(filePath, 'utf-8');
    res.send(`<pre>${data}</pre>`);
});

router.post('/delete', (req, res) => {
    const targetDate = req.body.date;
    if (!targetDate) return res.status(400).send('Date is required.');

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    let newData = '';
    let skip = false;

    lines.forEach(line => {
        if (line.trim() === targetDate) skip = true;
        else if (skip && line.trim() === '') skip = false;
        else if (!skip) newData += line + '\n';
    });

    fs.writeFileSync(filePath, newData);
    res.send(`Schedule for ${targetDate} deleted.`);
});

router.post('/deleteAll', (req, res) => {
    fs.writeFileSync(filePath, '');
    res.send('All schedules deleted.');
});

router.get('/test-parse', (req, res) => {
    const today = getTodaySchedule(filePath);
    res.send(`<pre>${today}</pre>`);
});

router.post('/sendMessage', (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) return res.status(400).send('Number and message are required.');
    sendMessage(number, message)
        .then(() => res.send('Message sent'))
        .catch(err => res.status(500).send('Failed to send message'));
});

module.exports = router;
