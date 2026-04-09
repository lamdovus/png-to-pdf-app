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
// 🔥 Helper: launch browser
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
// 🚀 API 2: HTML → PDF (VECTOR - CHUẨN IN)
// ============================
app.post("/generate-pdf", async (req, res) => {
    let browser;

    try {
        const { name, email, phone } = req.body;

        // 👉 HTML chuẩn in (bạn có thể thay bằng template full VUS mình đã build)
        const html = `
        <html>
        <head>
        <meta charset="utf-8">
        <style>
        body {
            margin: 0;
            padding: 0;
        }

        .card {
            width: 61mm;
            height: 96mm;
            padding: 6mm;
            box-sizing: border-box;
            font-family: Arial;
        }

        .name {
            font-size: 18pt;
            color: #f6042e;
            font-weight: bold;
        }

        .label {
            font-size: 9pt;
            color: #f6042e;
            margin-top: 3mm;
        }

        .value {
            font-size: 9pt;
        }
        </style>
        </head>

        <body>
            <div class="card">
                <div class="name">${name || ""}</div>

                <div class="label">Email</div>
                <div class="value">${email || ""}</div>

                <div class="label">Phone</div>
                <div class="value">${phone || ""}</div>
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
            "Content-Disposition": "attachment; filename=employee-card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 HTML PDF ERROR:", err);
        if (browser) await browser.close();
        res.status(500).send("Error generating PDF");
    }
});

// ============================
// 🧪 TEST SERVER
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