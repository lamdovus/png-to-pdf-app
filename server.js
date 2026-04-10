const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json({ limit: "10mb" }));

app.post("/generate-pdf", async (req, res) => {
    try {
        const { html } = req.body;

        console.log("🚀 Start generate PDF");

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();

        // SET HTML
        await page.setContent(html, {
            waitUntil: ["domcontentloaded", "networkidle0"]
        });

        // 🔥 WAIT IMAGE LOAD (fix QR)
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

        // 🔥 DELAY thêm cho QR API
        await new Promise(resolve => setTimeout(resolve, 800));

        // DEBUG screenshot (optional)
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

app.listen(3000, () => console.log("🚀 Server running port 3000"));