// Génère les images de marketing/visuels/ à partir de visuels.html.
// Usage : node marketing/templates/render.js [filtre]   (ex. « post2 »)
// Nécessite Playwright (Chromium) et un accès à Google Fonts.
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")); }

(async () => {
  const filter = process.argv[2] || "";
  const out = path.join(__dirname, "..", "visuels");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
  await page.goto("file://" + path.join(__dirname, "visuels.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const ids = await page.$$eval("section.v", els => els.map(e => e.id));
  for (const id of ids.filter(i => i.includes(filter))) {
    // PNG pour la photo de profil et les couvertures, JPEG (qualité 92) pour les posts et stories
    const png = /^(profil|une)-/.test(id);
    await page.locator("#" + id).screenshot(png
      ? { path: path.join(out, id + ".png") }
      : { path: path.join(out, id + ".jpg"), type: "jpeg", quality: 92 });
    console.log("✓", id);
  }
  await browser.close();
})();
