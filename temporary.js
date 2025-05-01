app.get('/messageSend', (req, res) => {
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
      <form method='POST' action='/sendMessage'>
        <h3>Test Kirim Pesan WhatsApp</h3>
        <input type='text' name='number' placeholder='628xxxxxxx'>
        <textarea name='message' placeholder='Isi pesan'></textarea>
        <input class="btn" type='submit' value='Kirim Pesan'>
      </form>
    </div>
  </body>
  </html>
  `);
});