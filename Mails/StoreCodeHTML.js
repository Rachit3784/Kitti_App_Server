export const htmlTemplate = ({StoreName , OwnerEmail , OwnerName, Code })=>{
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OTP Confirmation - TeamWork</title>
  <style>
    body {
      font-family: 'Poppins', Arial, sans-serif;
      background-color: #000000;
      margin: 0;
      padding: 0;
      color: #ffffff;
    }

    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #111111;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      border: 1px solid #FFD700;
    }

    .header {
      background-color: #FFD700;
      color: #000;
      padding: 20px;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 1px;
    }

    .content {
      padding: 30px 25px;
      text-align: center;
    }

    .content h2 {
      color: #FFD700;
      margin-bottom: 15px;
      font-size: 22px;
    }

    .otp-box {
      background: #000000;
      border: 2px dashed #FFD700;
      display: inline-block;
      padding: 12px 24px;
      margin: 20px 0;
      border-radius: 10px;
      font-size: 24px;
      letter-spacing: 4px;
      font-weight: bold;
      color: #ffffff;
    }

    .info {
      text-align: left;
      font-size: 15px;
      color: #dcdcdc;
      line-height: 1.6;
      margin-top: 15px;
    }

    .highlight {
      color: #FFD700;
      font-weight: 600;
    }

    .footer {
      text-align: center;
      background-color: #0a0a0a;
      color: #999999;
      font-size: 13px;
      padding: 15px;
      border-top: 1px solid #222;
    }

    .footer strong {
      color: #FFD700;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">
      <h1>TeamWork</h1>
      <p><em>Building the Future of Fashion Commerce</em></p>
    </div>

    <div class="content">
      <h2>OTP Confirmation for Your New Store</h2>

      <p>Hi <strong>${OwnerName}</strong>,</p>
      <p>We’ve received a request to create a new clothing store listing on <span class="highlight">TeamWork</span> under your name.</p>

      <div class="otp-box">${Code}</div>

      <div class="info">
        <p><strong>Store Name:</strong> ${StoreName}</p>
        <p><strong>Owner Email:</strong> ${OwnerEmail}</p>
        <p><strong>Requested By:</strong> ${OwnerName}</p>
      </div>

      <p style="margin-top: 20px;">You're about to create a <span class="highlight">new legacy</span> in the clothing market. 🚀</p>

      <p class="info">
        🔒 Do not share this code with anyone. <br />
        This OTP will expire in <span class="highlight">10 minutes</span> for your security.
      </p>
    </div>

    <div class="footer">
      <p>With ❤️ from the <strong>TeamWork</strong> Team</p>
      <p>Empowering Brands. Connecting Customers.</p>
    </div>
  </div>
</body>
</html>

    `
}