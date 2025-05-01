const cron = require('node-cron');
const { sendTodaySchedule } = require('./sendTodaySchedule');

// Menjadwalkan setiap hari jam 07:00 pagi
cron.schedule('0 7 * * *', () => {
    console.log("Running daily schedule at 07:00...");
    sendTodaySchedule();
});
