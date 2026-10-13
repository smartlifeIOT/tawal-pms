import * as XLSX from "xlsx-js-style";

// ─── Hardcoded fixed values ──────────────────────────────────────────────────
const FIXED = {
  Budget: "Smart Tower",
  Contractor: "Smart Life",
  PO: "10001099",
};

function normalize(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function findKey(row, target) {
  return Object.keys(row).find((k) => normalize(k) === normalize(target)) ?? null;
}

function getVal(row, target) {
  const k = findKey(row, target);
  return k ? String(row[k] ?? "").trim() : "";
}

// ─── TAWAL ID detection ──────────────────────────────────────────────────────
export function findTawalIdKey(rows) {
  if (!rows.length) return null;
  return (
    Object.keys(rows[0]).find((k) => normalize(k) === "tawal id") ??
    Object.keys(rows[0]).find((k) => normalize(k).includes("tawal")) ??
    null
  );
}

export function extractTawalIds(rows, tawalKey) {
  const ids = new Set();
  for (const row of rows) {
    const val = String(row[tawalKey] ?? "").trim();
    if (val) ids.add(val);
  }
  return [...ids].sort();
}

// ─── Extract available categories from Sheet 2 ───────────────────────────────
export function extractAvailableCategories(sheet2) {
  if (!sheet2.length) return [];
  const catKey = findKey(sheet2[0], "Categories");
  if (!catKey) return [];

  const seen = new Set();
  const result = [];
  for (const row of sheet2) {
    const val = String(row[catKey] ?? "").trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push(val);
    }
  }
  return result;
}

// ─── Category matching against Sheet 1 columns ──────────────────────────────
function categoryMatches(category, row) {
  const cat = normalize(category);

  // ── Special cases ──────────────────────────────────────────────────────────
  if (cat === "smart lock for new request") {
    const v = normalize(getVal(row, "Smart Lock for New Request"));
    return v === "yes" || v === "required";
  }
  if (cat === "new smart lock cabinets") {
    return getVal(row, "New Smart Lock Cabinets").toUpperCase().includes("STC ODU");
  }

  // ── Generic fallback: column name = category, value = "required" or "yes" ─
  // Handles: RMS, Multiplexer, Expander, Smart Meter, Fence Lock, ODU Lock, etc.
  const val = normalize(getVal(row, category));
  return val === "required" || val === "yes";
}

// ─── Dynamic qty resolution ──────────────────────────────────────────────────
// Derives the Sheet 1 qty column name from the category + item type at runtime.
//
// supply  → tries "{category} qty",  "{category} quantity"
// service → tries "{category} installation", "{category} install"
//
// findKey does a normalized (lowercase + trim) comparison so "Multiplexer Qty",
// "multiplexer qty", "MULTIPLEXER QTY" etc. all resolve correctly.
function resolveQty(s1row, category, itemType) {
  const cat = normalize(category);

  const candidates =
    itemType === "supply"
      ? [`${cat} qty`, `${cat} quantity`]
      : itemType === "service"
        ? [`${cat} installation`, `${cat} install`]
        : [];

  for (const candidate of candidates) {
    const key = findKey(s1row, candidate);
    if (key) return String(s1row[key] ?? "").trim();
  }

  return "";
}

// ─── Build output rows ────────────────────────────────────────────────────────
export function processWorkbook(data, selectedTawalIds, selectedCategories = []) {
  const { sheet1, sheet2 } = data;
  const tawalKey = findTawalIdKey(sheet1);

  // Filter Sheet 1 by selected TAWAL IDs
  let filtered = sheet1;
  if (selectedTawalIds.length && tawalKey) {
    filtered = sheet1.filter((row) =>
      selectedTawalIds.includes(String(row[tawalKey] ?? "").trim()),
    );
  }

  // Group Sheet 2 rows by their 'Categories' value
  const sheet2ByCat = new Map();
  for (const s2row of sheet2) {
    const cat = String(s2row[findKey(s2row, "Categories") ?? ""] ?? "").trim();
    if (!cat) continue;
    if (!sheet2ByCat.has(cat)) sheet2ByCat.set(cat, []);
    sheet2ByCat.get(cat).push(s2row);
  }

  // Determine which categories to process
  const allCategories = [...sheet2ByCat.keys()];
  const categoriesToProcess = selectedCategories.length
    ? allCategories.filter((cat) =>
        selectedCategories.some((sel) => normalize(sel) === normalize(cat)),
      )
    : allCategories;

  const outputRows = [];
  const matchedCategories = new Set();

  for (const s1row of filtered) {
    const tawalId = tawalKey ? String(s1row[tawalKey] ?? "").trim() : "";
    const stcId = getVal(s1row, "STC ID");
    const project = normalize(s1row[findKey(s1row, "Project") ?? ""] ?? "");
    const subProjectName = normalize(s1row[findKey(s1row, "Subproject") ?? ""] ?? "");

    for (const cat of categoriesToProcess) {
      if (!categoryMatches(cat, s1row)) continue;
      matchedCategories.add(cat);

      const s2rows = sheet2ByCat.get(cat) ?? [];
      for (const s2 of s2rows) {
        const description = String(s2[findKey(s2, "Description") ?? ""] ?? "").trim();
        const uom = String(s2[findKey(s2, "UOM") ?? ""] ?? "").trim();
        const price = String(s2[findKey(s2, "Price") ?? ""] ?? "");
        const lineNo = s2[findKey(s2, "Item") ?? ""] ?? "";
        const itemType = normalize(s2[findKey(s2, "Type") ?? ""] ?? "");

        // ── Dynamic: column name built from category name + item type ────────
        const updatedQty = resolveQty(s1row, cat, itemType);

        const parsedQty = parseFloat(updatedQty) || 0;
        const parsedPrice = parseFloat(price) || 0;
        const totalPrice = parsedQty * parsedPrice;

        outputRows.push({
          Budget: FIXED.Budget,
          Project: project,
          Subproject: subProjectName,
          Contractor: FIXED.Contractor,
          "PO#": FIXED.PO,
          "Site ID": tawalId,
          "Site Code": stcId,
          "Site Name": "",
          "Item Code": String(lineNo),
          "Description of": description,
          Unit: uom,
          "Updated Qty": updatedQty || "N/A",
          "Unit price": price,
          "Total price": String(totalPrice),
        });
      }
    }
  }

  return {
    outputRows,
    filteredCount: filtered.length,
    uniqueTawalIds: [...new Set(outputRows.map((r) => r["Site ID"]))].filter(Boolean),
    uniqueCategories: [...matchedCategories],
  };
}

// ─── Column validation ────────────────────────────────────────────────────────
const REQUIRED_SHEET1_COLS = ["rms"];
const REQUIRED_SHEET2_COLS = ["type"];

function validateColumns(sheet1, sheet2) {
  if (!sheet1.length) throw new Error("Sheet 1 is empty.");
  if (!sheet2.length) throw new Error("Sheet 2 is empty.");

  const sheet1Keys = Object.keys(sheet1[0]).map(normalize);
  const sheet2Keys = Object.keys(sheet2[0]).map(normalize);

  const missingSheet1 = REQUIRED_SHEET1_COLS.filter((c) => !sheet1Keys.includes(c));
  const missingSheet2 = REQUIRED_SHEET2_COLS.filter((c) => !sheet2Keys.includes(c));

  const errors = [];
  if (missingSheet1.length)
    errors.push(
      `Sheet 1 is missing column(s): ${missingSheet1.map((c) => `"${c}"`).join(", ")}`,
    );
  if (missingSheet2.length)
    errors.push(
      `Sheet 2 is missing column(s): ${missingSheet2.map((c) => `"${c}"`).join(", ")}`,
    );

  if (errors.length) throw new Error(errors.join("\n"));
}

// ─── Parse uploaded workbook ──────────────────────────────────────────────────
export function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  if (wb.SheetNames.length < 2) {
    throw new Error("The workbook must contain at least 2 sheets.");
  }
  const [sheet1Name, sheet2Name] = wb.SheetNames;
  const sheet1 = XLSX.utils.sheet_to_json(wb.Sheets[sheet1Name], { defval: "" });
  const sheet2 = XLSX.utils.sheet_to_json(wb.Sheets[sheet2Name], { defval: "" });

  validateColumns(sheet1, sheet2);

  return { sheet1, sheet2, sheet1Name, sheet2Name, allSheetNames: wb.SheetNames };
}

// ─── Build the "Final Sheet" worksheet ───────────────────────────────────────
function buildFinalSheet(outputRows) {
  const sheetData = outputRows.length
    ? outputRows
    : [
        {
          Note: "No rows matched. Check that RMS/Expander/Smart Meter = Required, Smart Lock = Yes, or New Smart Lock Cabinets contains STC ODU.",
        },
      ];

  const outSheet = XLSX.utils.json_to_sheet(sheetData);

  if (outputRows.length) {
    const range = XLSX.utils.decode_range(outSheet["!ref"] ?? "A1");

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!outSheet[addr]) continue;
      outSheet[addr].s = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "92D050" } },
        alignment: { horizontal: "center" },
      };
    }

    const colWidths = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      let maxLen = 10;
      for (let r = range.s.r; r <= range.e.r; r++) {
        const cell = outSheet[XLSX.utils.encode_cell({ r, c })];
        if (!cell) continue;
        const len = String(cell.v ?? "").length;
        if (len > maxLen) maxLen = len;
      }
      colWidths.push(maxLen + 2);
    }
    outSheet["!cols"] = colWidths.map((w) => ({ wch: w }));
  }

  return outSheet;
}

// ─── Build output workbook (original sheets + Final Sheet) — for download ────
export function buildOutputWorkbook(originalBuffer, outputRows) {
  const wb = XLSX.read(originalBuffer, { type: "array" });

  const existingIdx = wb.SheetNames.indexOf("Final Sheet");
  if (existingIdx !== -1) {
    wb.SheetNames.splice(existingIdx, 1);
    delete wb.Sheets["Final Sheet"];
  }

  XLSX.utils.book_append_sheet(wb, buildFinalSheet(outputRows), "Final Sheet");
  return wb;
}

// ─── Workbook with ONLY the Final Sheet — attached to projects as mapping file
export function buildFinalSheetWorkbook(outputRows) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildFinalSheet(outputRows), "Final Sheet");
  return wb;
}

export function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}

// Serialises the workbook so it can be uploaded as the project's mapping file.
export function workbookToFile(wb, filename) {
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new File([data], filename, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// Unique STC IDs of the sites that actually produced BOQ lines in the Final
// Sheet (taken from the sheet's "STC ID" column, written out as "Site Code").
export function extractStcIds(outputRows) {
  return [
    ...new Set(outputRows.map((r) => String(r["Site Code"] ?? "").trim())),
  ].filter(Boolean);
}

// ─── Re-exports ───────────────────────────────────────────────────────────────
export const OUTPUT_COLUMNS = [
  "Budget",
  "SubProject Name",
  "Contractor",
  "PO#",
  "Site ID",
  "Site Code",
  "Site Name",
  "Work type",
  "Item Code",
  "Description of",
  "Unit",
  "Updated Qty",
  "Unit price",
  "Total price",
];
