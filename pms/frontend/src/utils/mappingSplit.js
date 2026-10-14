import * as XLSX from "xlsx-js-style";

// Header names that can carry a site identifier. A row is matched to a project
// when ANY of these values equals the project's Site ID (STC ID) or Tawal ID.
// The BOQ Final Sheet has "Site ID" (Tawal ID) and "Site Code" (STC ID).
const ID_HEADERS = [
  "siteid",
  "sitecode",
  "stcid",
  "tawalid",
  "site",
];

const normHeader = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "000000" } },
  fill: { fgColor: { rgb: "92D050" } },
  alignment: { horizontal: "center" },
};

export async function readMappingWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, {
    type: "array",
    cellStyles: true,
    cellNF: true,
  });
  if (!wb.SheetNames.length) throw new Error("The file has no sheets.");
  const defaultSheet =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === "final sheet") ??
    wb.SheetNames[0];
  return { wb, defaultSheet };
}

/**
 * Reads one sheet: header row = first row of the sheet.
 * Returns { headers, idCols: [{c, name}], rows: [{ r, ids: [..] }] }
 */
export function analyseSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws["!ref"]) throw new Error(`Sheet "${sheetName}" is empty.`);
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const headerRow = range.s.r;

  const headers = [];
  const idCols = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    const name = cell ? String(cell.w ?? cell.v ?? "").trim() : "";
    headers.push(name);
    const n = normHeader(name);
    const priority = ID_HEADERS.indexOf(n);
    if (priority !== -1) idCols.push({ c, name, priority });
  }
  idCols.sort((a, b) => a.priority - b.priority);

  if (!idCols.length) {
    throw new Error(
      `No Site ID column found in "${sheetName}". Expected a column named Site ID, Site Code, STC ID or TAWAL ID.`,
    );
  }

  const rows = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const ids = idCols
      .map(({ c }) => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        return cell ? String(cell.w ?? cell.v ?? "").trim() : "";
      })
      .filter(Boolean);
    if (ids.length) rows.push({ r, ids });
  }

  return { headers, idCols, rows, headerRow, range };
}

/**
 * Groups sheet rows by matched project.
 * projects: [{ _id, siteId, tawalId, ... }]
 * Returns { groups: [{ project, rowIndexes }], unmatchedIds: [] }
 */
export function groupRowsByProject(analysis, projects) {
  const bySite = new Map();
  const byTawal = new Map();
  for (const p of projects) {
    if (p.siteId) bySite.set(p.siteId.trim().toLowerCase(), p);
    if (p.tawalId) byTawal.set(p.tawalId.trim().toLowerCase(), p);
  }

  const groups = new Map();
  const unmatched = new Set();

  for (const row of analysis.rows) {
    const keys = row.ids.map((id) => id.toLowerCase());
    // Site ID (STC) match wins over Tawal ID match
    const project =
      keys.map((k) => bySite.get(k)).find(Boolean) ??
      keys.map((k) => byTawal.get(k)).find(Boolean);

    if (!project) {
      unmatched.add([...new Set(row.ids)].join(" / "));
      continue;
    }
    if (!groups.has(project._id)) groups.set(project._id, { project, rowIndexes: [] });
    groups.get(project._id).rowIndexes.push(row.r);
  }

  return { groups: [...groups.values()], unmatchedIds: [...unmatched] };
}

/** Builds an .xlsx File holding the header row + only the given rows. */
export function buildSiteFile(wb, sheetName, analysis, rowIndexes, fileName) {
  const src = wb.Sheets[sheetName];
  const { range, headerRow } = analysis;
  const out = {};
  const sourceRows = [headerRow, ...rowIndexes];

  sourceRows.forEach((srcR, outR) => {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = src[XLSX.utils.encode_cell({ r: srcR, c })];
      if (!cell) continue;
      const copy = { ...cell };
      delete copy.f; // formulas would point at the wrong rows; keep values
      if (outR === 0 && !copy.s) copy.s = HEADER_STYLE;
      out[XLSX.utils.encode_cell({ r: outR, c: c - range.s.c })] = copy;
    }
  });

  out["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: sourceRows.length - 1, c: range.e.c - range.s.c },
  });
  if (src["!cols"]) out["!cols"] = src["!cols"].slice(range.s.c);

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, out, sheetName.slice(0, 31));
  const data = XLSX.write(book, { bookType: "xlsx", type: "array" });
  return new File([data], fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export const safeFileName = (s) =>
  String(s || "site").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") ||
  "site";
