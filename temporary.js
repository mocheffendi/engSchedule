app.get('/preview', async (req, res) => {
  try {
    const data = await fs.readFile(JADWAL_FILE, 'utf-8');
    const blocks = data.split(/\n(?=\d{1,2} [A-Za-z]+ \d{4})/g);
    let html = `
      <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Engineering Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <script
      src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js"
      defer
    ></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: "Inter", sans-serif;
      }

      body {
        font-family: 'Roboto', sans-serif;
        background-color: #1c1f24;
        color: #fff;
        display: flex;
      }

      .sidebar {
        width: 240px;
        background-color: #1a1d22;
        height: 100vh;
        padding: 30px 12px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: width 0.3s ease;
      }
      .sidebar.collapsed {
        width: 60px;
      }
      .toggle-btn {
        color: #c4ff00;
        font-size: 24px;
        cursor: pointer;
        margin-bottom: 20px;
        display: inline-block;
      }
      .sidebar .user {
        text-align: center;
        margin-bottom: 40px;
      }
      .sidebar .user img {
        border-radius: 50%;
        width: 60px;
        height: 60px;
        transition: width 0.3s, height 0.3s;
      }
      .sidebar.collapsed .user img {
        width: 40px;
        height: 40px;
      }
      .sidebar .user h4 {
        margin-top: 10px;
        font-size: 16px;
        color: #fff;
      }
      .sidebar.collapsed .user h4 {
        display: none;
      }
      .sidebar nav a {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ccc;
        text-decoration: none;
        margin: 15px 0;
        padding: 10px;
        border-radius: 8px;
        transition: background 0.2s;
      }
      .sidebar nav a:hover,
      .sidebar nav a.active {
        background-color: #31343a;
        color: #c4ff00;
      }
      .sidebar nav a i {
        font-size: 16px;
        min-width: 20px;
        text-align: center;
      }
      .sidebar nav a span {
        transition: opacity 0.3s;
      }
      .sidebar.collapsed nav a span {
        display: none;
      }

      .main {
        flex: 1;
        padding: 30px;
        background-color: #20242a;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        transition: margin-left 0.3s;
      }

      .card {
        background-color: #2a2f36;
        border-radius: 16px;
        padding: 20px;
        position: relative;
        overflow: hidden;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
        cursor: pointer;
      }

      .card h3 {
        color: #c4ff00;
        margin-bottom: 10px;
      }

      .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 12px rgba(196, 255, 0, 0.3);
      }

      .card:active {
        transform: scale(0.97);
        box-shadow: 0 3px 6px rgba(196, 255, 0, 0.2);
      }

      .card-icon {
        position: absolute;
        top: 20px;
        left: 20px;
        font-size: 24px;
        color: #c4ff00;
      }

      .card-title {
        font-weight: 600;
        font-size: 16px;
        color: #fff;
      }

      .card-subtitle {
        font-size: 12px;
        color: #ccc;
      }

      .schedule-card {
        background-color: #2a2f36;
        flex: 1;
        background-color: #2a2f36;
        border-radius: 16px;
        padding: 20px;
        position: relative;
        overflow: hidden;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
        cursor: pointer;
      }

      .schedule-card h3 {
        color: #c4ff00;
        margin-bottom: 10px;
      }

      #scheduleContent div {
        margin-bottom: 10px;
        color: #fff;
      }
      #scheduleContent .label {
        font-weight: bold;
        margin-right: 6px;
      }
      #scheduleContent .label.morning {
        color: #90ee90;
      }
      #scheduleContent .label.middle {
        color: orange;
      }
      #scheduleContent .label.afternoon {
        color: #ffd700;
      }
      #scheduleContent .label.night {
        color: #66b2ff;
      }

      @media (max-width: 768px) {
        .sidebar {
          width: 240px;
          background-color: #1a1d22;
          height: 100vh;
          padding: 30px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: width 0.3s ease;
        }
        /* .sidebar.auto-collapsed {
          width: 60px;
        } */
        .sidebar .user h4,
        .sidebar nav a span {
          transition: opacity 0.3s;
          /* display: none; */
        }
        .sidebar nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ccc;
          text-decoration: none;
          margin: 15px 0;
          padding: 10px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .sidebar nav a:hover,
        .sidebar nav a.active {
          background-color: #31343a;
          color: #c4ff00;
        }
        .sidebar nav a i {
          font-size: 16px;
          min-width: 20px;
          text-align: center;
        }

        .sidebar.collapsed nav a span {
          display: none;
        }
      }
              .card-title {
                  font-size: 20px;
                  color: #007bff;
              }
              .shift-label {
                  font-weight: bold;
              }
              .morning { color: green; }
              .middle { color: orange; }
              .afternoon { color: #ffc107; }
              .night { color: #007bff; }
    </style>
  </head>
  <body>
    <div class="sidebar collapsed" id="sidebar">
      <div>
        <div class="toggle-btn" onclick="toggleSidebar()">☰</div>
        <div class="user">
          <img
            src="https://scontent.fcgk29-1.fna.fbcdn.net/v/t39.30808-6/240149924_1266153830469898_4312465236162673900_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeEPi4lbNMQ-IxTwzC-eP1oceag_PbyWHCB5qD89vJYcIGoJPPUbL5bIj0yaWebCjAg&_nc_ohc=ncaUPkqnRDwQ7kNvwFs7ZHp&_nc_oc=Adn_cJ05hJqRO3hD48s3OBANurDQ_OkhwHiFdcJDDr2j4NizAzwaaqBpTgA_La249K8&_nc_zt=23&_nc_ht=scontent.fcgk29-1.fna&_nc_gid=3EnV0HibA8BnXzSQOM4BTg&oh=00_AfEfcJxngGqfYda-0xnTrh0oDEqf6pLuYz2XaA7GRICNhw&oe=6816A56E"
            alt="User"
          />
          <h4>Engineering Schedule</h4>
        </div>
        <nav>
          <a href="/"
            ><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a
          >
          <a href="/scheduleDate"
            ><i class="fas fa-calendar-alt"></i><span>Calendar</span></a
          >
          <a href="#"><i class="fas fa-book"></i><span>Log</span></a>
          <a class="active" href="/preview"
            ><i class="fas fa-clock"></i><span>Schedule</span></a
          >
        </nav>
      </div>
      <div>
        <nav>
          <a href="#"><i class="fas fa-cog"></i><span>Settings</span></a>
          <a href="#"><i class="fas fa-sign-out-alt"></i><span>Logout</span></a>
        </nav>
      </div>
    </div>

    <div class="main">
      <% blocks.forEach(block => { %>
      <div class="col">
        <div class="card">
          <h3><%= block.date %></h3>
          <div id="scheduleContent">
            <% block.contents.forEach(content => { %>
            <div>
              <span class="label <%= content.label.toLowerCase() %>"
                ><%= content.label %>:</span
              ><%= content.value %>
            </div>
            <% }); %>
          </div>
        </div>
      </div>
      <% }); %>
    </div>

    <script>
      function toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        sidebar.classList.toggle("collapsed");
      }

      window.addEventListener("DOMContentLoaded", () => {
        const sidebar = document.getElementById("sidebar");

        // Jika lebar layar > 500, buka sidebar
        // if (window.innerWidth > 700) {
        //   sidebar.classList.remove("collapsed");
        // }

        // Saat ukuran layar berubah
        window.addEventListener("resize", () => {
          if (window.innerWidth > 1080) {
            sidebar.classList.remove("collapsed");
          } else {
            sidebar.classList.add("collapsed");
          }
        });
      });
    </script>
  </body>
</html>
    `;
    res.send(html);

  } catch (err) {
    res.status(500).send('Gagal membaca jadwal.');
  }
});