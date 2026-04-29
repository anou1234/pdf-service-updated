const fs = require("fs");
const https = require("https");
const path = require("path");

// Load JSON (order is preserved)
const images = require("./file-urls.json");

// Output directory
const outputDir = path.join(__dirname, "newDownloads");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function download(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);

    https
      .get(url, response => {
        if (response.statusCode !== 200) {
          fs.unlink(filename, () => {});
          return reject(
            new Error(`Status ${response.statusCode}`)
          );
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", err => {
        fs.unlink(filename, () => {});
        reject(err);
      });
  });
}

// ✅ Sequential download respecting JSON order
(async function downloadInOrder() {
  const entries = Object.entries(images);

  for (let index = 0; index < entries.length; index++) {
    const [fileStoreId, url] = entries[index];
    if (!url) continue;

    const filePath = path.join(outputDir, `${fileStoreId}.png`);

    console.log(`[${index + 1}/${entries.length}] Downloading ${fileStoreId}`);

    try {
      await download(url, filePath);
      console.log(`✅ Downloaded: ${fileStoreId}`);
    } catch (err) {
      console.error(`❌ Failed: ${fileStoreId}`, err.message);
    }
  }

  console.log("🎉 All downloads completed in order");
})();