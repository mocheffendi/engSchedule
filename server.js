// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const apiRoutes = require('./routes/api');
const scheduleChecker = require('./schedule/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// Start daily schedule checker
scheduleChecker.start();

app.listen(PORT, () => {
    console.log(`ZahraBot server running at http://localhost:${PORT}`);
});
