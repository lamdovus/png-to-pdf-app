const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 📁 uploads folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: uploadDir });

// ===== API =====
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

        // 🔥 dùng chromium cloud-compatible
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });

        const page = await browser.newPage();

        const html = `
        <html>
        <body style="margin:0;padding:0;">
            <img src="${imageBase64}" style="width:61mm;height:96mm;" />
        </body>
        </html>
        `;

        await page.setContent(html);

        const pdf = await page.pdf({
            width: "61mm",
            height: "96mm",
            printBackground: true,
            margin: 0
        });

        await browser.close();

        fs.unlinkSync(filePath);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 ERROR:", err);

        if (browser) await browser.close();

        res.status(500).send("Error converting PNG to PDF");
    }
});

// ===== TEST =====
app.get("/", (req, res) => {
    res.send("🚀 PNG to PDF server is running");
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});