const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

async function launchBrowser() {
    return await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
    });
}

app.post("/generate-pdf", async (req, res) => {
    let browser;

    try {
        const { name, email, phone } = req.body;

        const html = `
        <html>
        <head>
        <meta charset="utf-8">

        <style>
        @page {
            size: 61mm 96mm;
            margin: 0;
        }

        * {
            box-sizing: border-box;
        }

        @font-face {
          font-family: 'VUS Pro Black';
          src: url('https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/LC-VUS-Pro-Black.otf');
        }
        @font-face {
          font-family: 'VUS Pro Bold';
          src: url('https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/LC-VUS-Pro-Bold.otf');
        }
        @font-face {
          font-family: 'VUS Pro Medium';
          src: url('https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/LC-VUS-Pro-Medium.otf');
        }

        body {
            margin: 0;
            padding: 0;
        }

        .card {
            width: 61mm;
            height: 96mm;
            padding: 8mm 6mm;
            display: flex;
            flex-direction: column;
            font-family: 'VUS Pro Medium';
        }

        /* TOP */
        .logo {
            width: 150px;
            margin-bottom: 8px;
        }

        .name {
            font-family: 'VUS Pro Black';
            font-size: 18pt;
            color: #f6042e;
        }

        .suffix {
            font-family: 'VUS Pro Bold';
            font-size: 12pt;
        }

        .role {
            font-size: 12pt;
            margin-bottom: 10px;
        }

        .label {
            font-family: 'VUS Pro Bold';
            color: #f6042e;
            font-size: 10pt;
            margin-top: 6px;
        }

        .value {
            font-size: 10pt;
        }

        /* WAVE */
        .wave {
            width: calc(100% + 12mm);
            margin-left: -6mm;
            margin-top: 12px;
        }

        /* FOOTER */
        .footer {
            margin-top: auto; /* 🔥 KEY FIX */
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .left {
            font-size: 9pt;
            line-height: 1.5;
        }

        .site {
            display: flex;
            align-items: center;
            margin-top: 4px;
        }

        .site img {
            width: 12px;
            margin-right: 5px;
        }

        .qr-wrapper {
            position: relative;
            width: 80px;
        }

        .qr {
            width: 100%;
        }

        .qr-logo {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 16px;
            transform: translate(-50%, -50%);
        }

        </style>
        </head>

        <body>
            <div class="card">

                <img class="logo"
                src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/LOGO_VUS_ENG@3x.png" />

                <div class="name">
                    ${name} <span class="suffix">(Ms.)</span>
                </div>

                <div class="role">ASA Manager</div>

                <div class="label">Email</div>
                <div class="value">${email}</div>

                <div class="label">Phone</div>
                <div class="value">${phone}</div>

                <img class="wave"
                src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/wave_line.png" />

                <div class="footer">
                    <div class="left">
                        <div class="label">VUS UT TICH</div>
                        <div>201/36A Ut Tich</div>
                        <div>Tan Son Nhat Ward</div>
                        <div>Ho Chi Minh City</div>

                        <div class="site">
                            <img src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/ICON_WEBSITE@3x.png" />
                            vus.edu.vn
                        </div>
                    </div>

                    <div class="qr-wrapper">
                        <img class="qr"
                        src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            \`BEGIN:VCARD\\nFN:${name}\\nTEL:${phone}\\nEMAIL:${email}\\nEND:VCARD\`
                        )}" />

                        <img class="qr-logo"
                        src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/LOGO_QR_CODE@3x.png" />
                    </div>
                </div>

            </div>
        </body>
        </html>
        `;

        browser = await launchBrowser();
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdf = await page.pdf({
            printBackground: true,
            preferCSSPageSize: true
        });

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=vus-card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error(err);
        if (browser) await browser.close();
        res.status(500).send("Error generating PDF");
    }
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});