const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/generate-pdf", async (req, res) => {
    try {
        const { html } = req.body;

        console.log("🚀 Start generate PDF");

        // 🔥 LAUNCH CHROME (QUAN TRỌNG)
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });

        const page = await browser.newPage();

        // SET HTML
        await page.setContent(html, {
            waitUntil: ["domcontentloaded", "networkidle0"]
        });

        // 🔥 WAIT IMAGE LOAD (fix mất QR)
        await page.evaluate(async () => {
            const waitImage = (img) => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = img.onerror = resolve;
                });
            };

            const images = Array.from(document.images);
            console.log("IMG COUNT:", images.length);

            await Promise.all(images.map(waitImage));
        });

        // 🔥 WAIT FONT
        await page.evaluateHandle('document.fonts.ready');

        // 🔥 DELAY cho QR API
        await new Promise(resolve => setTimeout(resolve, 800));

        // DEBUG (nếu cần)
        // await page.screenshot({ path: "debug.png", fullPage: true });

        // 🔥 FIX 1 PAGE
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
        console.error("❌ PDF ERROR:", err);
        res.status(500).send("Error generating PDF");
    }
});

// health check
app.get("/", (req, res) => {
    res.send("PDF service running");
});

// 🔥 PORT cho Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running port ${PORT}`));