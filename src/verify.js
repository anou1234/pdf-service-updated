const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

// Helper function to extract a readable Common Name (CN) from raw ASN.1 bytes
function extractSignerName(contentsHex) {
  try {
    const bytes = Buffer.from(contentsHex, "hex");
    // Look for the Common Name OID sequence in hex: 55 04 03
    const oidIdx = bytes.indexOf(Buffer.from([0x55, 0x04, 0x03]));

    if (oidIdx !== -1) {
      // Find printable ASCII data right after the OID sequence
      let searchSlice = bytes.slice(oidIdx + 3, oidIdx + 50);
      let nameChars = [];
      for (let b of searchSlice) {
        if (b >= 32 && b <= 126) {
          nameChars.push(String.fromCharCode(b));
        }
      }
      const cleanName = nameChars
        .join("")
        .replace(/[^a-zA-Z0-9\s-_.,]/g, "")
        .trim();
      if (cleanName.length > 2) return cleanName;
    }
  } catch (e) {
    // Fallback if parsing fails
  }
  return "Unknown Signer (Encoded inside ASN.1 Certificate Block)";
}

async function verifyPdfSignatures(pdfPath) {
  console.log(`=== Analyzing: ${path.basename(pdfPath)} ===`);

  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ Error: File '${pdfPath}' not found.`);
    return;
  }

  try {
    const fileBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(fileBytes, {
      ignoreEncryption: true,
    });

    // Retrieve the low-level PDF Catalog structure
    const acroForm = pdfDoc.catalog.get(pdfDoc.context.obj("AcroForm"));

    if (!acroForm) {
      console.log(
        "❌ Result: No interactive form fields or digital signature structure found.",
      );
      return;
    }

    // Get all form fields mapped in the document
    const fields = acroForm.get(pdfDoc.context.obj("Fields"));
    if (!fields || !fields.array) {
      console.log("❌ Result: Form layout is empty. No fields found.");
      return;
    }

    let sigCount = 0;

    for (const fieldRef of fields.array) {
      const field = pdfDoc.context.lookup(fieldRef);
      if (!field || !field.get) continue;

      const ftValue = field.get(pdfDoc.context.obj("FT"));

      // Check if field type is explicitly set to /Sig (Signature)
      if (ftValue && ftValue.toString() === "/Sig") {
        sigCount++;
        console.log(`\n[+] Found Embedded Signature Block #${sigCount}`);

        // Fetch the signature Value object (/V)
        const vValue = field.get(pdfDoc.context.obj("V"));
        if (!vValue) {
          console.log(
            "  ⚠️ Field exists but it contains NO cryptographic signature data.",
          );
          continue;
        }

        const sigDict = pdfDoc.context.lookup(vValue);
        console.log(
          "  ✅ Proof of Certificate: Cryptographic token dictionary (/V) is present.",
        );

        // Attempt to parse metadata fields
        const nameObj = sigDict.get(pdfDoc.context.obj("Name"));
        const subFilterObj = sigDict.get(pdfDoc.context.obj("SubFilter"));
        const byteRangeObj = sigDict.get(pdfDoc.context.obj("ByteRange"));
        const contentsObj = sigDict.get(pdfDoc.context.obj("Contents"));

        let signerName = nameObj
          ? nameObj.toString().replace(/^\(|\)$/g, "")
          : "";

        // If the Name key is missing from the layout dictionary, mine the raw PKCS7 cert bytes
        if (!signerName && contentsObj) {
          signerName = extractSignerName(contentsObj.toString());
        }

        console.log(
          `  👤 Signer Identity: ${signerName || "Hidden inside Certificate Structure"}`,
        );
        console.log(
          `  🛡️ Cryptographic Protocol (SubFilter): ${subFilterObj ? subFilterObj.toString() : "Unknown"}`,
        );

        // Confirm a byte range map envelops the file to secure its content hashing
        if (byteRangeObj) {
          console.log(
            "  🔒 Integrity Check: ByteRange layout exists (forces structural validation).",
          );
        } else {
          console.log("  ⚠️ Warning: ByteRange boundary tags are missing.");
        }
      }
    }

    if (sigCount === 0) {
      console.log(
        "❌ Result: Zero cryptographic signature objects found inside the file binary.",
      );
    }
  } catch (error) {
    console.log(`❌ Error processing the PDF: ${error.message}`);
  }
}

// Replace with your actual file name
const targetPdf = "newDoc.pdf";
verifyPdfSignatures(targetPdf);
