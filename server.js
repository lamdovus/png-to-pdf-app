const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

// ============================
// 📁 Upload folder
// ============================
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: uploadDir });

// ============================
// 🔥 Launch browser (Render)
// ============================
async function launchBrowser() {
    return await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
    });
}

// ============================
// 🚀 API HTML → PDF (CHUẨN IN)
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
        }

        .card {
            width: 61mm;
            min-height: 96mm; /* ✅ FIX mất nội dung */
            padding: 5mm;
            box-sizing: border-box;
            font-family: 'VUS Pro Medium';
        }

        .logo {
            width: 140px;
            margin-bottom: 10px;
        }

        .name {
            font-family: 'VUS Pro Black';
            font-size: 16pt;
            color: #f6042e;
            line-height: 1.2;
        }

        .role {
            font-size: 11pt;
            margin-bottom: 3mm;
        }

        .label {
            font-family: 'VUS Pro Bold';
            color: #f6042e;
            margin-top: 2mm;
            font-size: 9pt;
        }

        .value {
            font-size: 9pt;
        }

        .wave {
            width: calc(100% + 10mm);
            margin-left: -5mm;
            margin-top: 3mm;
        }

        .bottom {
            display: flex;
            justify-content: space-between;
            margin-top: 3mm;
        }

        .left {
            font-size: 8pt;
            line-height: 1.4;
        }

        .site {
            display: flex;
            align-items: center;
            margin-top: 2mm;
        }

        .site img {
            width: 12px;
            margin-right: 4px;
        }

        .qr-wrapper {
            position: relative;
            width: 75px;
            height: 75px;
        }

        .qr {
            width: 100%;
            height: 100%;
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

                <div class="name">${name || ""}</div>
                <div class="role">Teaching Quality Manager</div>

                <div class="label">Email</div>
                <div class="value">${email || ""}</div>

                <div class="label">Phone</div>
                <div class="value">${phone || ""}</div>

                <img class="wave"
                src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/wave_line.png" />

                <div class="bottom">

                    <div class="left">
                        <div class="label">VUS UT TICH</div>
                        <div>201/36A Ut Tich</div>
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

        await page.setContent(html, {
            waitUntil: "networkidle0"
        });

        const pdf = await page.pdf({
            width: "61mm",
            height: "96mm",
            printBackground: true,
            preferCSSPageSize: true /* ✅ FIX 1 page */
        });

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=vus-card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 PDF ERROR:", err);
        if (browser) await browser.close();
        res.status(500).send("Error generating PDF");
    }
});

// ============================
// 🧪 TEST
// ============================
app.get("/", (req, res) => {
    res.send("🚀 PDF server is running");
});

// ============================
// 🚀 START
// ============================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});