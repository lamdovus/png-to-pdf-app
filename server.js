const express = require("express");
const puppeteer = require("puppeteer");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

// 📁 nơi lưu file tạm
const upload = multer({ dest: "uploads/" });

// ===== API UPLOAD PNG → PDF =====
app.post("/upload-png", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const filePath = req.file.path;

        // convert file → base64
        const imageBase64 =
            "data:image/png;base64," +
            fs.readFileSync(filePath, "base64");

        const browser = await puppeteer.launch({
            headless: "new"
        });

        const page = await browser.newPage();

        const html = `
        <html>
        <body style="margin:0;padding:0;">
            <img src="${imageBase64}" 
                 style="width:61mm;height:96mm;object-fit:cover;" />
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
            margin: 0
        });

        await browser.close();

        // xoá file tạm
        fs.unlinkSync(filePath);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error converting PNG to PDF");
    }
});

// ===== TEST SERVER =====
app.get("/", (req, res) => {
    res.send("🚀 PNG to PDF server is running");
});

// ===== START SERVER =====
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});