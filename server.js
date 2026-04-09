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
// ✅ API 1: PNG → PDF (OLD)
// ============================
app.post("/upload-png", upload.single("file"), async (req, res) => {
    let browser;

    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const filePath = req.file.path;

        const imageBase64 =
            "data:image/png;base64," +
            fs.readFileSync(filePath, "base64");

        browser = await launchBrowser();
        const page = await browser.newPage();

        const html = `
        <html>
        <body style="margin:0;padding:0;">
            <img src="${imageBase64}" style="width:61mm;height:96mm;" />
        </body>
        </html>
        `;

        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdf = await page.pdf({
            width: "61mm",
            height: "96mm",
            printBackground: true
        });

        await browser.close();
        fs.unlinkSync(filePath);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=card.png.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 PNG ERROR:", err);
        if (browser) await browser.close();
        res.status(500).send("Error converting PNG to PDF");
    }
});

// ============================
// 🚀 API 2: HTML → PDF (CHUẨN IN)
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

        .vus-card {
            width: 61mm;
            height: 96mm;
            padding: 6mm;
            box-sizing: border-box;
            font-family: 'VUS Pro Medium', Arial;
        }

        .vus-logo {
            width: 140px;
            margin-bottom: 10px;
        }

        .vus-name {
            font-family: 'VUS Pro Black';
            font-size: 16pt;
            color: #f6042e;
            line-height: 1.2;
        }

        .vus-role {
            font-size: 11pt;
            margin-bottom: 4mm;
        }

        .vus-label {
            font-family: 'VUS Pro Bold';
            color: #f6042e;
            margin-top: 3mm;
            font-size: 9pt;
        }

        .vus-value {
            font-size: 9pt;
        }

        .wave {
            width: 100%;
            margin-top: 4mm;
        }

        .bottom {
            display: flex;
            justify-content: space-between;
            margin-top: 4mm;
        }

        .qr {
            width: 80px;
        }

        </style>
        </head>

        <body>
            <div class="vus-card">

                <img class="vus-logo"
                  src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/LOGO_VUS_ENG@3x.png" />

                <div class="vus-name">${name || ""}</div>
                <div class="vus-role">Teaching Quality Manager</div>

                <div class="vus-label">Email</div>
                <div class="vus-value">${email || ""}</div>

                <div class="vus-label">Phone</div>
                <div class="vus-value">${phone || ""}</div>

                <img class="wave"
                  src="https://hcm03.vstorage.vngcloud.vn/v1/AUTH_0f4fc1cb9192411da4f5ef9ef7553ea3/LXP_CE/hr_emp_card/wave_line.png" />

                <div class="bottom">
                    <div>
                        <div class="vus-label">VUS DA NANG</div>
                        <div class="vus-value">233 Dien Bien Phu</div>
                        <div class="vus-value">vus.edu.vn</div>
                    </div>

                    <img class="qr"
                      src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `BEGIN:VCARD\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`
                      )}" />
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
            printBackground: true
        });

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=vus-card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 HTML PDF ERROR:", err);
        if (browser) await browser.close();
        res.status(500).send("Error generating PDF");
    }
});

// ============================
// 🧪 TEST
// ============================
app.get("/", (req, res) => {
    res.send("🚀 PNG + HTML → PDF server is running");
});

// ============================
// 🚀 START
// ============================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});