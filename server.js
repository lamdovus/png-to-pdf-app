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

// ============================
// ✅ FINAL FIX - GIỐNG PNG
// ============================
app.post("/generate-pdf", async (req, res) => {
    let browser;

    try {
        const { name, email, phone } = req.body;

        const html = `
        <html>
        <head>
        <meta charset="utf-8">

        <style>
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
            background: #fff;
        }

        .card {
            width: 61mm;
            height: 96mm;
            padding: 8mm 6mm; /* 🔥 FIX: padding đều trên dưới */
            box-sizing: border-box;
            font-family: 'VUS Pro Medium';
        }

        .logo {
            width: 150px;
            margin-bottom: 8px;
        }

        .name {
            font-family: 'VUS Pro Black';
            font-size: 16pt;
            color: #f6042e;
            line-height: 1.2;
        }

        .suffix {
            font-family: 'VUS Pro Bold';
            font-size: 11pt;
        }

        .role {
            font-size: 11pt;
            margin-top: 4px;
            margin-bottom: 10px;
        }

        .label {
            font-family: 'VUS Pro Bold';
            color: #f6042e;
            font-size: 9pt;
            margin-top: 6px;
        }

        .value {
            font-size: 9pt;
        }

        .wave {
            width: calc(100% + 12mm);
            margin-left: -6mm;
            margin-top: 10px;
            margin-bottom: 10px;
        }

        .bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 10px;
        }

        .left {
            font-size: 8pt;
            line-height: 1.6;
        }

        .site {
            display: flex;
            align-items: center;
            margin-top: 4px;
            font-size: 8pt;
        }

        .site img {
            width: 12px;
            margin-right: 5px;
        }

        .qr-wrapper {
            position: relative;
            width: 75px;
            height: 75px;
        }

        .qr {
            width: 100%;
        }

        .qr-logo {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 18px;
            transform: translate(-50%, -50%);
        }

        </style>
        </head>

        <body>
            <div class="card">

                <img class="logo"
                src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/LOGO_VUS_ENG@3x.png" />

                <div class="name">
                    ${name}
                    <span class="suffix">(Ms.)</span>
                </div>

                <div class="role">Teaching Quality Manager</div>

                <div class="label">Email</div>
                <div class="value">${email}</div>

                <div class="label">Phone</div>
                <div class="value">${phone}</div>

                <img class="wave"
                src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/wave_line.png" />

                <div class="bottom">

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
                            `BEGIN:VCARD\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`
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
            width: "61mm",
            height: "96mm",
            printBackground: true
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

app.get("/", (req, res) => {
    res.send("🚀 PDF server ready");
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});