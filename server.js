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
    console.log("🚀 Launching browser...");
    return await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
    });
}

// ============================
// 🚀 API GENERATE PDF
// ============================
app.post("/generate-pdf", async (req, res) => {
    let browser;

    try {
        console.log("📥 Request received");

        const { html } = req.body;

        if (!html) {
            console.error("❌ Missing HTML");
            return res.status(400).send("Missing HTML");
        }

        console.log("📄 HTML length:", html.length);

        browser = await launchBrowser();
        const page = await browser.newPage();

        console.log("🌐 Setting content...");
        await page.setContent(html, {
            waitUntil: "networkidle0"
        });

        console.log("⏳ Waiting fonts...");
        await page.evaluateHandle("document.fonts.ready");

        console.log("🖨 Generating PDF...");
        const pdf = await page.pdf({
            width: "61mm",
            height: "96mm",
            printBackground: true,
            margin: 0
        });

        await browser.close();

        console.log("✅ PDF generated OK");

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=card.pdf"
        });

        res.send(pdf);

    } catch (err) {
        console.error("🔥 SERVER ERROR:", err);

        if (browser) await browser.close();

        res.status(500).send("Error generating PDF");
    }
});

// ============================
app.get("/", (req, res) => {
    res.send("🚀 HTML → PDF server running");
});

// ============================
app.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});