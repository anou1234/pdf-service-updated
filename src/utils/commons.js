import axios from "axios";
import logger from "../config/logger";
import envVariables from "../EnvironmentVariables";
import get from "lodash/get";
const NodeCache = require("node-cache");
var moment = require("moment-timezone");

const cache = new NodeCache({ stdTTL: 300 });

let datetimezone = envVariables.DATE_TIMEZONE;
let egovLocHost = envVariables.EGOV_LOCALISATION_HOST;
let egovLocSearchCall = envVariables.EGOV_LOCALISATION_SEARCH;
let defaultLocale = envVariables.DEFAULT_LOCALISATION_LOCALE;
let defaultTenant = envVariables.DEFAULT_LOCALISATION_TENANT;
export const getTransformedLocale = (label) => {
  return label.toUpperCase().replace(/[.:-\s\/]/g, "_");
};

/**
 * This function returns localisation label from keys based on needs
 * This function does optimisation to fetch one module localisation values only once
 * @param {*} requestInfo - requestinfo from client
 * @param {*} localisationMap - localisation map containing localisation key,label fetched till now
 * @param {*} prefix - prefix to be added before key before fetching localisation ex:-"MODULE_NAME_MASTER_NAME"
 * @param {*} key - key to fetch localisation
 * @param {*} moduleName - "module name for fetching localisation"
 * @param {*} localisationModuleList - "list of modules for which localisation was already fetched"
 * @param {*} isCategoryRequired - ex:- "GOODS_RETAIL_TST-1" = get localisation for "GOODS"
 * @param {*} isMainTypeRequired  - ex:- "GOODS_RETAIL_TST-1" = get localisation for "RETAIL"
 * @param {*} isSubTypeRequired  - - ex:- "GOODS_RETAIL_TST-1" = get localisation for "GOODS_RETAIL_TST-1"
 */
export const findLocalisation = async (
  requestInfo,
  moduleList,
  codeList,
  pdfKey,
) => {
  let cacheData = null;
  let locale = requestInfo.msgId;
  if (null != locale) {
    locale = locale.split("|");
    locale = locale.length > 1 ? locale[1] : defaultLocale;
  } else {
    locale = defaultLocale;
  }

  if (pdfKey != null) {
    let cacheKey = pdfKey + "-" + locale;
    cacheData = await verifyCache(cacheKey);
  }

  if (cacheData != null && Object.keys(cacheData).length >= 1) {
    return cacheData;
  } else {
    let statetenantid = get(
      requestInfo,
      "userInfo.tenantId",
      defaultTenant,
    ).split(".")[0];
    // Build localisation search URL; in local/dev rewrite internal docker hostnames to EGOV_HOST
    let url;
    try {
      const base = new URL(egovLocHost);
      const isInternal =
        base.hostname === "egov-localization" ||
        base.hostname.endsWith(".egov");
      if (envVariables.REWRITE_INTERNAL_HOSTS && isInternal) {
        const newBase = new URL(envVariables.EGOV_HOST);
        url = new URL(egovLocSearchCall, newBase).toString();
      } else {
        url = new URL(egovLocSearchCall, base).toString();
      }
    } catch (e) {
      // Fallback if EGOV_LOCALISATION_HOST is not a full URL
      const newBase = new URL(envVariables.EGOV_HOST);
      url = new URL(egovLocSearchCall, newBase).toString();
    }

    let request = {
      RequestInfo: requestInfo,
      messageSearchCriteria: {
        tenantId: statetenantid,
        locale: locale,
        codes: [],
      },
    };

    request.messageSearchCriteria.module = moduleList.toString();
    request.messageSearchCriteria.codes = codeList.toString().split(",");

    let headers = {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json, text/plain, */*",
      },
    };

    let responseBody = await axios
      .post(url, request, headers)
      .then(function (response) {
        return response;
      })
      .catch((error) => {
        throw error;
      });

    if (pdfKey != null) cache.set(pdfKey, responseBody.data);

    return responseBody.data;
  }
};

export const verifyCache = async (pdfKey) => {
  let cacheData = null;
  if (cache.has(pdfKey)) {
    cacheData = cache.get(pdfKey);

    return Promise.resolve(cacheData);
  } else return cacheData;
};

export const getLocalisationkey = async (
  prefix,
  key,
  isCategoryRequired,
  isMainTypeRequired,
  isSubTypeRequired,
  delimiter = " / ",
) => {
  let keyArray = [];
  let localisedLabels = [];
  let isArray = false;

  if (key == null) {
    return key;
  } else if (typeof key == "string" || typeof key == "number") {
    keyArray.push(key);
  } else {
    keyArray = key;
    isArray = true;
  }

  keyArray.map((item) => {
    let codeFromKey = "";

    // append main category in the beginning
    if (isCategoryRequired) {
      codeFromKey = getLocalisationLabel(item.split(".")[0], prefix);
    }

    if (isMainTypeRequired) {
      if (isCategoryRequired) codeFromKey = `${codeFromKey}${delimiter}`;
      codeFromKey = getLocalisationLabel(item.split(".")[1], prefix);
    }

    if (isSubTypeRequired) {
      if (isMainTypeRequired || isCategoryRequired)
        codeFromKey = `${codeFromKey}${delimiter}`;
      codeFromKey = `${codeFromKey}${getLocalisationLabel(item, prefix)}`;
    }

    if (!isCategoryRequired && !isMainTypeRequired && !isSubTypeRequired) {
      codeFromKey = getLocalisationLabel(item, prefix);
    }

    localisedLabels.push(codeFromKey === "" ? item : codeFromKey);
  });
  if (isArray) {
    return localisedLabels;
  }
  return localisedLabels[0];
};

const getLocalisationLabel = (key, prefix) => {
  if (prefix != undefined && prefix != "") {
    key = `${prefix}_${key}`;
  }
  key = getTransformedLocale(key);
  return key;
};

export const getDateInRequiredFormat = (et, dateformat = "DD/MM/YYYY") => {
  if (!et) return "NA";
  // var date = new Date(Math.round(Number(et)));
  return moment(et).tz(datetimezone).format(dateformat);
};

/**
 *
 * @param {*} value - values to be checked
 * @param {*} defaultValue - default value
 * @param {*} path  - jsonpath from where the value was fetched
 */
export const getValue = (value, defaultValue, path) => {
  if (
    value == undefined ||
    value == null ||
    value.length === 0 ||
    (value.length === 1 && (value[0] === null || value[0] === ""))
  ) {
    // logger.error(`no value found for path: ${path}`);
    return defaultValue;
  } else return value;
};

export const convertFooterStringtoFunctionIfExist = (footer) => {
  if (footer != undefined) {
    footer = Function(`'use strict'; return (${footer})`)();
  }
  return footer;
};

const HOLE_SIZE = 8192; // 8192 bytes = 16384 hex characters

// Exact string pdf-lib writes for ByteRange: [0, 999999999, 999999999, 999999999]
const BR_PLACEHOLDER = "[ 0 999999999 999999999 999999999 ]";
const BR_PLACEHOLDER_LEN = BR_PLACEHOLDER.length; // 34

export async function preparePdfForSigning(
  rawPdfBuffer,
  PDFDocument,
  PDFHexString,
  PDFString,
  PDFName,
  crypto,
  signerInfo = {},
) {
  const pdfDoc = await PDFDocument.load(rawPdfBuffer);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];

  const holePlaceholder = "0".repeat(HOLE_SIZE * 2);

  const {
    signerName = "Authorized Signatory",
    reason = "Digital Approval of Document",
    location = "Chhattisgarh",
    contactInfo = "",
  } = signerInfo;

  // 1. Signature Value Dictionary (/Type /Sig)
  //    ByteRange uses the fixed placeholder array — pdf-lib writes it as a real PDF array [...]
  const sigDict = pdfDoc.context.obj({
    Type: "Sig",
    Filter: "Adobe.PPKLite",
    SubFilter: "adbe.pkcs7.detached",
    ByteRange: [0, 999999999, 999999999, 999999999],
    Contents: PDFHexString.of(holePlaceholder),
    M: PDFString.fromDate(new Date()),
    Name: PDFString.of(signerName),
    Reason: PDFString.of(reason),
    Location: PDFString.of(location),
    ...(contactInfo && { ContactInfo: PDFString.of(contactInfo) }),
  });
  const sigRef = pdfDoc.context.register(sigDict);

  // 2. Build Appearance Stream (/AP /N) — transparent background & compact size
  //    Width: 220pt, Height: 55pt
  const apW = 220;
  const apH = 55;

  const escapePdfStr = (s) =>
    (s || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const signerDisplayName = escapePdfStr(signerName.substring(0, 26));
  const locationDisplay = escapePdfStr(location.substring(0, 26));
  const now = new Date();
  const dateDisplay = escapePdfStr(
    now.toISOString().replace("T", " ").substring(0, 19) + " IST"
  );

  const apContent = [
    "q",
    // Transparent background — no fill!
    // Optional subtle border (#d0d0d0)
    "0.816 0.816 0.816 RG",
    "0.75 w",
    `0.5 0.5 ${apW - 1} ${apH - 1} re S`,
    // Green left accent bar (#1a7f3c)
    "0.102 0.498 0.235 rg",
    `0 0 3 ${apH} re f`,
    "BT",
    // 1. Label (#1a7f3c green)
    "0.102 0.498 0.235 rg",
    "/HelvBold 7 Tf",
    `10 ${apH - 12} Td`,
    "(DIGITALLY SIGNED BY) Tj",
    // 2. Signer Name (#1a1a1a dark bold)
    "0.102 0.102 0.102 rg",
    "/HelvBold 10 Tf",
    "0 -13 Td",
    `(${signerDisplayName}) Tj`,
    // 3. Signature Meta (#6b6b6b muted gray)
    "0.420 0.420 0.420 rg",
    "/Helv 6.5 Tf",
    "0 -12 Td",
    `(Date: ${dateDisplay}) Tj`,
    "0 -9 Td",
    `(Loc: ${locationDisplay}) Tj`,
    "ET",
    "Q",
  ].join("\n");

  const apFontRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: "Font",
      Subtype: "Type1",
      BaseFont: "Helvetica",
      Encoding: "WinAnsiEncoding",
    })
  );

  const apFontBoldRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: "Font",
      Subtype: "Type1",
      BaseFont: "Helvetica-Bold",
      Encoding: "WinAnsiEncoding",
    })
  );

  const apStream = pdfDoc.context.stream(
    Buffer.from(apContent, "latin1"),
    {
      Type: "XObject",
      Subtype: "Form",
      BBox: [0, 0, apW, apH],
      Resources: pdfDoc.context.obj({
        Font: pdfDoc.context.obj({
          Helv: apFontRef,
          HelvBold: apFontBoldRef,
        }),
      }),
    }
  );
  const apRef = pdfDoc.context.register(apStream);

  // 3. Signature Field Widget Annotation — compact 220pt x 55pt box
  const sigFieldDict = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    T: PDFString.of("Signature1"),
    V: sigRef,
    F: 4,
    P: lastPage.ref,
    Rect: [36, 36, 256, 91],
    AP: pdfDoc.context.obj({ N: apRef }),
  });
  const sigFieldRef = pdfDoc.context.register(sigFieldDict);



  // 4. Register in AcroForm
  pdfDoc.catalog.set(
    PDFName.of("AcroForm"),
    pdfDoc.context.obj({
      Fields: [sigFieldRef],
      SigFlags: 3,
    }),
  );

  // 5. Attach annotation to last page
  const existingAnnots = lastPage.node.Annots();
  if (existingAnnots) {
    existingAnnots.push(sigFieldRef);
  } else {
    lastPage.node.set(PDFName.of("Annots"), pdfDoc.context.obj([sigFieldRef]));
  }

  let pdfWithHole = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

  // 6. Locate /Contents < to compute ByteRange
  const contentsMarker = Buffer.from("/Contents <");
  let markerIdx = pdfWithHole.indexOf(contentsMarker);
  let markerLen = contentsMarker.length;
  if (markerIdx === -1) {
    const altMarker = Buffer.from("/Contents<");
    markerIdx = pdfWithHole.indexOf(altMarker);
    markerLen = altMarker.length;
  }
  if (markerIdx === -1) throw new Error("Could not locate /Contents in PDF");

  const hexStart = markerIdx + markerLen; // byte index of first hex char after '<'

  // Locate open bracket '<' (at hexStart - 1) and closing bracket '>' (at hexStart + HOLE_SIZE * 2)
  // PDF ISO 32000-1 specification requires BOTH '<' and '>' to be EXCLUDED from ByteRange!
  const range1_len = hexStart - 1;                       // Range 1 stops right BEFORE '<'
  const range2_offset = hexStart + HOLE_SIZE * 2 + 1;    // Range 2 starts right AFTER '>'
  const range2_len = pdfWithHole.length - range2_offset;
  const byteRange = [0, range1_len, range2_offset, range2_len];

  // 7. Patch ByteRange in-place using fixed-size placeholder
  //    pdf-lib writes [9999999999 9999999999 9999999999 9999999999] as a PDF array
  //    We search for that exact byte sequence and overwrite it safely.
  const brMarker = Buffer.from(BR_PLACEHOLDER);
  const brIdx = pdfWithHole.indexOf(brMarker);
  if (brIdx === -1) {
    // Fallback: log what's near /ByteRange for debugging
    const brDebugIdx = pdfWithHole.indexOf(Buffer.from("/ByteRange"));
    const snippet = brDebugIdx !== -1
      ? pdfWithHole.subarray(brDebugIdx, brDebugIdx + 60).toString("ascii")
      : "(not found)";
    throw new Error(`ByteRange placeholder not found. /ByteRange area: ${snippet}`);
  }

  const actualBrStr = `[${byteRange[0]} ${byteRange[1]} ${byteRange[2]} ${byteRange[3]}]`;
  const paddedBrStr = actualBrStr.padEnd(BR_PLACEHOLDER_LEN, " ");
  Buffer.from(paddedBrStr, "ascii").copy(pdfWithHole, brIdx);

  // 8. Compute SHA-256 hash over the two ByteRange segments
  const part1 = pdfWithHole.subarray(byteRange[0], byteRange[1]);
  const part2 = pdfWithHole.subarray(byteRange[2], byteRange[2] + byteRange[3]);

  const documentHash = crypto
    .createHash("sha256")
    .update(part1)
    .update(part2)
    .digest("base64"); // Base64 required by Signer.Digital

  return { pdfWithHole, documentHash };
}

/**
 * Overwrites /Contents placeholder with the real PKCS#7 signature hex.
 * Writes exactly HOLE_SIZE*2 ASCII hex characters into the hole.
 */
export function injectSignatureIntoPdf(pdfBuffer, pkcs7SignatureBase64) {
  const pdfBuf = Buffer.from(pdfBuffer);

  const sigHex = Buffer.from(pkcs7SignatureBase64, "base64")
    .toString("hex");

  if (sigHex.length > HOLE_SIZE * 2) {
    throw new Error(
      `PKCS7 signature (${sigHex.length / 2} bytes) exceeds HOLE_SIZE (${HOLE_SIZE} bytes). Increase HOLE_SIZE.`
    );
  }

  const padded = sigHex.padEnd(HOLE_SIZE * 2, "0");
  const sigHexBuffer = Buffer.from(padded, "ascii");

  const contentsMarker = Buffer.from("/Contents <");
  let markerIdx = pdfBuf.indexOf(contentsMarker);
  let markerLen = contentsMarker.length;
  if (markerIdx === -1) {
    const altMarker = Buffer.from("/Contents<");
    markerIdx = pdfBuf.indexOf(altMarker);
    markerLen = altMarker.length;
  }
  if (markerIdx === -1) throw new Error("Could not locate /Contents in PDF");

  sigHexBuffer.copy(pdfBuf, markerIdx + markerLen);
  return pdfBuf;
}

export async function createHash(
  pdfBuffer,
  {
    signerName,
    reason,
    location,
    contactInfo,
    tenantId,
    key,
    PDFDocument,
    PDFHexString,
    PDFString,
    PDFName,
    crypto,
    fileStoreAPICall,
  }
) {
  const { pdfWithHole, documentHash } = await preparePdfForSigning(
    pdfBuffer,
    PDFDocument,
    PDFHexString,
    PDFString,
    PDFName,
    crypto,
    {
      signerName,
      reason,
      location,
      contactInfo,
    }
  );

  const holeFilename = `${key}-hole-${Date.now()}.pdf`;

  const signatureId = await fileStoreAPICall(
    holeFilename,
    tenantId,
    pdfWithHole
  );

  return {
    signatureId,
    documentHash,
  };
}
