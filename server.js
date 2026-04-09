const express = require("express");
const puppeteer = require("puppeteer");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

// 🔥 PORT cho Render
const PORT = process.env.PORT || 3000;

// 📁 tạo folder uploads nếu chưa có
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 📁 config multer
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 5 * 1024 * 1024 } // max 5MB
});

// ===== API UPLOAD PNG → PDF =====
app.post("/upload-png", upload.single("file"), async (req, res) => {
    let browser;

    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const filePath = req.file.path;

        // 👉 đọc file base64
        const imageBase64 =
            "data:image/png;base64," +
            fs.readFileSync(filePath, "base64");

        // 🔥 Puppeteer config chuẩn Render
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-first-run",
                "--no-zygote",
                "--single-process"
            ]
        });

        const page = await browser.newPage();

        // 🔥 set timeout tránh treo
        page.setDefaultNavigationTimeout(60000);

        const html = `
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                }
                img {
                    width: 61mm;
                    height: 96mm;
                    object-fit: cover;
                }
            </style>
        </head>
        <body>
            <img src="${imageBase64}" />
        </body>
        </html>
        `;

        await page.setContent(html, {
            waitUntil: "networkidle0"
        });

        const pdf = await page.pdf({
            width: "61mm",
            height: "96mm",
            printBackground: true,
            margin: {
                top: "0mm",
                bottom: "0mm",
                left: "0mm",
                right: "0mm"
            }
        });

        // 🔥 đóng browser trước
        await browser.close();

        // 🔥 xoá file temp an toàn
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
        });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 ERROR:", err);

        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }

        res.status(500).send("Error converting PNG to PDF");
    }
});

// ===== HEALTH CHECK (Render dùng) =====
app.get("/healthz", (req, res) => {
    res.send("OK");
});

// ===== TEST SERVER =====
app.get("/", (req, res) => {
    res.send("🚀 PNG to PDF server is running");
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});