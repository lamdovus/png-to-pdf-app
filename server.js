const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cors = require("cors");

const app = express();

// 🔥 FIX CORS
app.use(cors());

// 🔥 parse JSON
app.use(express.json({ limit: "10mb" }));

app.post("/generate-pdf", async (req, res) => {
    try {
        const { html } = req.body;

        console.log("🚀 Start generate PDF");

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });

        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: ["domcontentloaded", "networkidle0"]
        });

        // 🔥 WAIT IMAGE (fix mất QR)
        await page.evaluate(async () => {
            const waitImage = (img) => {
                if (img.complete) return;
                return new Promise(resolve => {
                    img.onload = img.onerror = resolve;
                });
            };
            await Promise.all([...document.images].map(waitImage));
        });

        // 🔥 WAIT FONT
        await page.evaluateHandle('document.fonts.ready');

        // 🔥 DELAY
        await new Promise(r => setTimeout(r, 800));

        const pdf = await page.pdf({
            width: "453px",
            height: "750px",
            printBackground: true,
            preferCSSPageSize: true
        });

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=card.pdf"
        });

        res.send(pdf);

        console.log("✅ Done PDF");

    } catch (err) {
        console.error("❌ ERROR:", err);
        res.status(500).send("Error generating PDF");
    }
});

// test route
app.get("/", (req, res) => {
    res.send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running:", PORT));