const fs = require('fs');
const axios = require('axios');
const { getTodaySchedule } = require('./utils/parser');

const sendTodaySchedule = async () => {
    const message = getTodaySchedule();
    if (!message) {
        console.log("No schedule found for today.");
        return;
    }

    try {
        const response = await axios.post("http://wasistech.duckdns.org:3001/send", {
            number: "6283856088009",
            message
        });

        console.log("Message sent:", response.data);
    } catch (error) {
        console.error("Failed to send message:", error.response?.data || error.message);
    }
};

module.exports = { sendTodaySchedule };
