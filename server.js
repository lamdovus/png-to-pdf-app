const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 3000;

// ============================
// 🚀 Launch browser
// ============================
async function launchBrowser() {
    return await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
    });
}

// ============================
// 🚀 GENERATE PDF FROM HTML
// ============================
app.post("/generate-pdf", async (req, res) => {
    let browser;

    try {
        const { html } = req.body;

        if (!html) {
            return res.status(400).send("Missing HTML");
        }

        browser = await launchBrowser();
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "networkidle0"
        });

        // 🔥 đảm bảo load font xong
        await page.evaluateHandle("document.fonts.ready");

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

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 ERROR:", err);
        if (browser) await browser.close();
        res.status(500).send("Error generating PDF");
    }
});

// ============================
app.get("/", (req, res) => {
    res.send("🚀 HTML → PDF server running");
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});