import * as XLSX from "xlsx";

const norm = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9#]/g, "");

const SITE_ALIASES = ["siteid", "site", "stcid", "sitecode"];
const WO_ALIASES = ["wonumber", "wono", "wo#", "wonum", "wo", "workorder", "workordernumber"];
const DATE_ALIASES = ["date", "wodate", "issuancedate", "woissuancedate", "issuedate", "issueddate"];

const findCol = (headers, aliases) =>
  headers.find((h) => aliases.includes(norm(h))) ?? null;

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

const validYmd = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
};

// Returns { value: "YYYY-MM-DD" | "" , error?: string }
export function parseSheetDate(raw) {
  if (raw === "" || raw === null || raw === undefined) return { value: "" };

  // Real Excel date cell → serial number
  // (days since 1899-12-30; computed in UTC so the timezone can't shift the day)
  if (typeof raw === "number") {
    if (raw < 1 || raw > 2958465) return { value: "", error: "Invalid date" };
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(raw) * 86400000);
    return {
      value: iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()),
    };
  }

  const s = String(raw).trim();
  let m;
  // YYYY-MM-DD or YYYY/MM/DD
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    if (validYmd(y, mo, d)) return { value: iso(y, mo, d) };
  }
  // DD/MM/YYYY (day first, as used in KSA)
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    const [d, mo, y] = [+m[1], +m[2], +m[3]];
    if (validYmd(y, mo, d)) return { value: iso(y, mo, d) };
  }
  return { value: "", error: `Unrecognised date "${s}"` };
}

/**
 * Reads the Issued WO sheet (first sheet of the workbook).
 * Returns { rows: [{ rowNumber, siteId, woNumber, date, error }], columns }
 */
export async function parseWoSheet(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The file has no sheets.");

  const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
  if (!json.length) throw new Error("The sheet is empty.");

  const headers = Object.keys(json[0]);
  const siteCol = findCol(headers, SITE_ALIASES);
  const woCol = findCol(headers, WO_ALIASES);
  const dateCol = findCol(headers, DATE_ALIASES);

  const missing = [];
  if (!siteCol) missing.push('"Site ID"');
  if (!woCol) missing.push('"WO Number"');
  if (missing.length) {
    throw new Error(
      `Missing column(s): ${missing.join(", ")}. Expected columns: Site ID, WO Number, Date.`,
    );
  }

  const rows = [];
  json.forEach((r, i) => {
    const siteId = String(r[siteCol] ?? "").trim();
    const woNumber = String(r[woCol] ?? "").trim();
    const rawDate = dateCol ? r[dateCol] : "";
    if (!siteId && !woNumber && !String(rawDate).trim()) return; // blank row

    const { value: date, error: dateError } = parseSheetDate(rawDate);
    let error = "";
    if (!siteId) error = "Missing Site ID";
    else if (!woNumber) error = "Missing WO Number";
    else if (dateError) error = dateError;

    rows.push({ rowNumber: i + 2, siteId, woNumber, date, error });
  });

  return { rows, columns: { siteCol, woCol, dateCol } };
}

export function downloadWoTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Site ID", "WO Number", "Date"],
    ["STC-12345", "WO-SLife-IMP-XXX000-00000-SmartTower-00000", "2026-10-13"],
  ]);
  ws["!cols"] = [{ wch: 16 }, { wch: 48 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Issued WO");
  XLSX.writeFile(wb, "issued_wo_template.xlsx");
}
