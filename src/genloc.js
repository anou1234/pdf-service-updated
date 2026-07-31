/**
 * generate-layout-locale.js
 *
 * Generates localization entries for WF_EMPLOYEE_LAYOUT_STATUS_* and
 * WF_EMPLOYEE_LAYOUT_* (action) keys, for all 4 layout businessServices,
 * matching the key-building logic already used in the UI:
 *
 *   status key = `WF_EMPLOYEE_LAYOUT_STATUS_${businessService}_${statusCode}`.toUpperCase()
 *   action key = `WF_EMPLOYEE_LAYOUT_${businessService}_${actionCode}`.toUpperCase()
 *
 * All 4 businessService action chains below are verified against live
 * ProcessInstance/history data (actual `action` sequences observed on
 * real applications), not just the static state-machine config. Both
 * "above" tier services (mcl_abv, mco_abv) confirmed to skip CTP/ATP(HQ)/
 * STP(HQ) in the default path — those exist only as an optional manual
 * escalation, contradicting the written business text. See inline
 * comments on each service.
 *
 * Usage:
 *   node generate-layout-locale.js
 *
 * Output:
 *   ./layout-locale-en_IN.json  (array of {code, message, module, locale})
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// CONFIG — adjust these if your prefixes/module/locale differ
// ---------------------------------------------------------------------------
const STATUS_PREFIX = "WF_EMPLOYEE_LAYOUT_STATUS_";
const ACTION_PREFIX = "WF_EMPLOYEE_LAYOUT_";
const MODULE = "rainmaker-common"; // change to your actual module name
const LOCALE = "en_IN";

// Set to true if you decide to sanitize "/" and "()" out of raw codes
// before building keys (recommended, but must match whatever the UI's
// key-building code does — keep this in sync with that logic).
const SANITIZE_SLASHES = false;

// ---------------------------------------------------------------------------
// CANONICAL PER-SERVICE STATUS + ACTION LISTS
// Each entry: { code: <raw status/action string>, label: <human message> }
// Forward-action labels name the ACTUAL target level for that service —
// the same action key (FORWARD_L3, FORWARD_L4, ...) routes to a
// DIFFERENT level in different services, so labels are never shared.
// ---------------------------------------------------------------------------

// Truly identical in meaning across every service (same source level,
// same target level, regardless of businessService).
const COMMON_STATUSES = [
  { code: "INITIATED", label: "Initiated" },
  { code: "PENDINGAPPLICATIONPAYMENT", label: "Pay 1 Fee: Pending" },
  { code: "FIELDINSPECTION_INPROGRESS", label: "Field Inspection In Progress" },
  { code: "INSPECTION_REPORT_PENDING", label: "Inspection Report Pending" },
  { code: "DOCUMENTVERIFY_DM", label: "Document Verification Pending" },
  { code: "DOCUMENTVERIFY_ATP/AME", label: "ATP Verification Pending" },
  { code: "PENDINGAPPROVAL", label: "Pending Approval" },
  { code: "PROFESSIONALACTIONREQUIRED", label: "Professional Action Required" },
  { code: "PENDINGSANCTIONPAYMENT", label: "Pay 2 Fee: Pending" },
  { code: "APPROVED", label: "Approved" },
  { code: "REJECTED", label: "Rejected" },
  { code: "CANCELLED", label: "Cancelled" },
];

const COMMON_ACTIONS = [
  { code: "INITIATE", label: "Initiate" },
  { code: "APPLY", label: "Apply" },
  { code: "DRAFT", label: "Save as Draft" },
  { code: "CANCEL", label: "Cancel" },
  { code: "PAY", label: "Pay" },
  { code: "UPDATE_FEE", label: "Update Fee" },
  { code: "UPDATE_ZONE", label: "Update Zone" },
  { code: "SEND_FOR_INSPECTION_REPORT", label: "Send for Inspection Report" },
  { code: "FORWARD_L1", label: "Forward to DM" }, // JE/BI -> DM, same in all 4 services
  { code: "OBSERVATION", label: "Raise Observation" },
  { code: "INTERNAL_QUERY", label: "Raise Internal Query" },
  { code: "APPROVE", label: "Approve" },
  { code: "REJECT", label: "Reject" },
  { code: "RESUBMIT", label: "Resubmit" },
  { code: "EDIT", label: "Edit" },
  { code: "SENDBACKTODM", label: "Send Back to DM" },
  { code: "SENDBACKFORINSPECTIONREPORT", label: "Send Back for Inspection Report" },
  { code: "SENDBACKFORFIELDINSPECTION", label: "Send Back for Field Inspection" },
  { code: "SENDBACKTOPROFESSIONAL", label: "Send Back to Professional" },
];

// -------------------------- Layout_mcl_up -----------------------------
// VERIFIED against live ProcessInstance data:
// JE/BI -> DM -> ATP/AME -> EO -> STP(Field) -> ADC
const mcl_up = {
  businessService: "Layout_mcl_up",
  statuses: [
    ...COMMON_STATUSES,
    { code: "DOCUMENTVERIFY_EO", label: "EO Verification Pending" },
    { code: "DOCUMENTVERIFY_STP(Field)", label: "STP (Field) Verification Pending" },
  ],
  actions: [
    ...COMMON_ACTIONS,
    { code: "FORWARD_L2", label: "Forward to ATP/AME" },        // DM -> ATP/AME
    { code: "FORWARD_L3", label: "Forward to EO" },              // ATP/AME -> EO (confirmed live)
    { code: "FORWARD_L5", label: "Forward to STP (Field)" },     // EO -> STP(Field) (confirmed live)
    { code: "FORWARD_L6", label: "Forward to ADC" },             // STP(Field) -> ADC (confirmed live)
    { code: "SENDBACKTOATP/AME", label: "Send Back to ATP/AME" },
    { code: "SENDBACKTOSTP_FIELD", label: "Send Back to STP (Field)" },
  ],
};

// -------------------------- Layout_mcl_abv -----------------------------
// VERIFIED against live ProcessInstance data:
// JE/BI -> DM -> ATP/AME -> EO -> ADC (approval) -> PendingSanctionPayment
// CTP/ATP(HQ)/STP(HQ) exist only as an OPTIONAL manual escalation off
// ADC's PendingApproval state via FORWARDTOATP_HQ — NOT part of the
// default happy path (EO's FORWARD_L5 goes directly to PENDINGAPPROVAL,
// confirmed live). Same pattern as mco_abv: this contradicts the written
// business text (which places CTP as a mandatory step), so it's flagged
// for the business-rules owner to confirm which is correct.
const mcl_abv = {
  businessService: "Layout_mcl_abv",
  statuses: [
    ...COMMON_STATUSES,
    { code: "DOCUMENTVERIFY_EO", label: "EO Verification Pending" },
    { code: "DOCUMENTVERIFY_CTP", label: "CTP Verification Pending" }, // optional escalation leg only
    { code: "DOCUMENTVERIFY_ATP_HQ", label: "ATP (HQ) Verification Pending" }, // optional escalation leg only
    { code: "DOCUMENTVERIFY_STP_HQ", label: "STP (HQ) Verification Pending" }, // optional escalation leg only
  ],
  actions: [
    ...COMMON_ACTIONS,
    { code: "FORWARD_L2", label: "Forward to ATP/AME" },         // DM -> ATP/AME (confirmed live)
    { code: "FORWARD_L3", label: "Forward to EO" },               // ATP/AME -> EO (confirmed live)
    { code: "FORWARD_L5", label: "Forward to ADC" },              // EO -> ADC (confirmed live)
    { code: "FORWARD_L4", label: "Forward to ATP (HQ)" },         // CTP -> ATP(HQ), optional leg
    { code: "FORWARD_L7", label: "Forward to STP (HQ)" },         // ATP(HQ) -> STP(HQ), optional leg
    { code: "FORWARD_FOR_APPROVAL", label: "Forward to ADC" },    // STP(HQ) -> ADC, optional leg
    { code: "FORWARDTOATP_HQ", label: "Forward to ATP (HQ)" },    // ADC manual escalation, optional leg
    { code: "SENDBACKTOATP/AME", label: "Send Back to ATP/AME" },
    { code: "SENDBACKTOEO", label: "Send Back to EO" },
  ],
};

// -------------------------- Layout_mcUp -----------------------------
// VERIFIED against live ProcessInstance data:
// JE/BI -> DM -> ATP/AME -> MTP/ME -> JC -> STP(Field) -> CMC
const mcUp = {
  businessService: "Layout_mcUp",
  statuses: [
    ...COMMON_STATUSES,
    { code: "DOCUMENTVERIFY_MTP/ME", label: "MTP/ME Verification Pending" },
    { code: "DOCUMENTVERIFY_JC", label: "JC Verification Pending" },
    { code: "DOCUMENTVERIFY_STP(Field)", label: "STP (Field) Verification Pending" },
  ],
  actions: [
    ...COMMON_ACTIONS,
    { code: "FORWARD_L2", label: "Forward to ATP/AME" },        // DM -> ATP/AME (confirmed live)
    { code: "FORWARD_L3", label: "Forward to MTP/ME" },         // ATP/AME -> MTP/ME (confirmed live)
    { code: "FORWARD_L4", label: "Forward to JC" },             // MTP/ME -> JC (confirmed live)
    { code: "FORWARD_STP", label: "Forward to STP (Field)" },   // JC -> STP(Field) (confirmed live)
    { code: "FORWARD_FOR_APPROVAL", label: "Forward to CMC" },  // STP(Field) -> CMC (confirmed live)
    { code: "SENDBACKTOMTP/ME", label: "Send Back to MTP/ME" },
    { code: "SENDBACKTOJC", label: "Send Back to JC" },
    { code: "SENDBACKTOSTP", label: "Send Back to STP" },
  ],
};

// -------------------------- Layout_mco_abv -----------------------------
// VERIFIED against live ProcessInstance data:
// JE/BI -> DM -> ATP/AME -> MTP/ME -> JC -> CMC (approval) -> PendingSanctionPayment
// CTP/ATP(HQ)/STP(HQ) exist only as an OPTIONAL manual escalation off
// CMC's PendingApproval state via FORWARDTOATP_HQ — NOT part of the
// default happy path. This contradicts the written business text (which
// places CTP as a mandatory step before ATP(HQ)); flagged for the
// business-rules owner to confirm which is correct, rather than silently
// picking one.
const mco_abv = {
  businessService: "Layout_mco_abv",
  statuses: [
    ...COMMON_STATUSES,
    { code: "DOCUMENTVERIFY_MTP/ME", label: "MTP/ME Verification Pending" },
    { code: "DOCUMENTVERIFY_JC", label: "JC Verification Pending" },
    { code: "DOCUMENTVERIFY_CTP", label: "CTP Verification Pending" }, // optional escalation leg only
    { code: "DOCUMENTVERIFY_ATP_HQ", label: "ATP (HQ) Verification Pending" }, // optional escalation leg only
    { code: "DOCUMENTVERIFY_STP_HQ", label: "STP (HQ) Verification Pending" }, // optional escalation leg only
  ],
  actions: [
    ...COMMON_ACTIONS,
    { code: "FORWARD_L2", label: "Forward to ATP/AME" },        // DM -> ATP/AME (confirmed live)
    { code: "FORWARD_L3", label: "Forward to MTP/ME" },         // ATP/AME -> MTP/ME (confirmed live)
    { code: "FORWARD_L4", label: "Forward to JC" },             // MTP/ME -> JC (confirmed live)
    { code: "FORWARD_L5", label: "Forward to CMC" },            // JC -> CMC (confirmed live)
    { code: "FORWARD_STP_HQ", label: "Forward to STP (HQ)" },   // ATP(HQ) -> STP(HQ), optional leg
    { code: "FORWARD_FOR_APPROVAL", label: "Forward to CMC" },  // STP(HQ) -> CMC, optional leg
    { code: "FORWARDTOATP_HQ", label: "Forward to ATP (HQ)" },  // CMC manual escalation -> ATP(HQ), optional leg
    { code: "SENDBACKTOMTP/ME", label: "Send Back to MTP/ME" },
    { code: "SENDBACKTOATP/AME", label: "Send Back to ATP/AME" },
    { code: "SENDBACKTOJC", label: "Send Back to JC" },
  ],
};

const SERVICES = [mcl_up, mcl_abv, mcUp, mco_abv];

// ---------------------------------------------------------------------------
// KEY BUILDING (mirrors the UI's runtime logic exactly)
// ---------------------------------------------------------------------------
function sanitize(code) {
  if (!SANITIZE_SLASHES) return code;
  return code.replace(/\//g, "_").replace(/[()]/g, "");
}

function buildStatusKey(businessService, statusCode) {
  return `${STATUS_PREFIX}${businessService}_${sanitize(statusCode)}`.toUpperCase();
}

function buildActionKey(businessService, actionCode) {
  return `${ACTION_PREFIX}${businessService}_${sanitize(actionCode)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// GENERATE
// ---------------------------------------------------------------------------
function generate() {
  const entries = [];
  const seenKeys = new Set(); // guard against accidental dupes across services

  SERVICES.forEach(({ businessService, statuses, actions }) => {
    statuses.forEach(({ code, label }) => {
      const key = buildStatusKey(businessService, code);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      entries.push({
        code: key,
        message: label,
        module: MODULE,
        locale: LOCALE,
      });
    });

    actions.forEach(({ code, label }) => {
      const key = buildActionKey(businessService, code);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      entries.push({
        code: key,
        message: label,
        module: MODULE,
        locale: LOCALE,
      });
    });
  });

  return entries;
}

const output = generate();
const outPath = path.join(__dirname, `layout-locale-${LOCALE}.json`);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

console.log(`Generated ${output.length} localization entries -> ${outPath}`);