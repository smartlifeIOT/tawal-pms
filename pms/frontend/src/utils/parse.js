import * as XLSX from "xlsx";

// Normalize a single row object from CSV or Excel into a project payload
function normalizeProjectRow(rawRow) {
  const obj = {};

  // Standardize keys by trimming and mapping common aliases
  const normalizedKeys = {};
  for (const key of Object.keys(rawRow)) {
    const cleanKey = key.trim();
    normalizedKeys[cleanKey.toLowerCase()] = rawRow[key];
  }

  const getVal = (...aliases) => {
    for (const alias of aliases) {
      const lower = alias.toLowerCase();
      if (
        normalizedKeys[lower] !== undefined &&
        normalizedKeys[lower] !== null
      ) {
        return normalizedKeys[lower];
      }
    }
    return undefined;
  };

  // String fields
  const title = getVal("title", "name", "projectTitle", "projectName");
  if (title !== undefined) obj.title = String(title).trim();

  const description = getVal("description", "desc");
  if (description !== undefined) obj.description = String(description).trim();

  const program = getVal(
    "program",
    "programName",
    "program_name",
    "program name",
  );
  if (program !== undefined) obj.program = String(program).trim();

  const category = getVal("category");
  if (category !== undefined) obj.category = String(category).trim();

  const projectScope = getVal(
    "projectScope",
    "project_scope",
    "project scope",
    "scope",
  );
  if (projectScope !== undefined) obj.projectScope = String(projectScope).trim();

  const status = getVal("status");
  if (status !== undefined && String(status).trim() !== "") {
    obj.status = String(status).trim();
  }

  const priority = getVal("priority");
  if (priority !== undefined && String(priority).trim() !== "") {
    obj.priority = String(priority).trim();
  }

  const siteId = getVal("siteId", "site_id", "site id");
  if (siteId !== undefined) obj.siteId = String(siteId).trim();

  const tawalId = getVal("tawalId", "tawal_id", "tawal id");
  if (tawalId !== undefined) obj.tawalId = String(tawalId).trim();

  const region = getVal("region");
  if (region !== undefined) obj.region = String(region).trim();

  const city = getVal("city");
  if (city !== undefined) obj.city = String(city).trim();

  const teamLead = getVal("teamLead", "team_lead", "team lead", "lead");
  if (teamLead !== undefined) obj.teamLead = String(teamLead).trim();

  // Numeric fields
  const parseNum = (val, defaultVal = 0) => {
    if (val === undefined || val === null || String(val).trim() === "") {
      return defaultVal;
    }
    const n = Number(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? defaultVal : n;
  };

  const budget = getVal("budget");
  if (budget !== undefined) obj.budget = parseNum(budget, 0);

  const spent = getVal("spent");
  if (spent !== undefined) obj.spent = parseNum(spent, 0);

  const progress = getVal("progress");
  if (progress !== undefined) obj.progress = parseNum(progress, 0);

  const longitude = getVal("longitude", "lng", "lon");
  if (longitude !== undefined && String(longitude).trim() !== "") {
    obj.longitude = parseNum(longitude, undefined);
  }

  const latitude = getVal("latitude", "lat");
  if (latitude !== undefined && String(latitude).trim() !== "") {
    obj.latitude = parseNum(latitude, undefined);
  }

  // Array fields (e.g. semicolon or comma separated)
  const parseArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val))
      return val.map((s) => String(s).trim()).filter(Boolean);
    const str = String(val).trim();
    if (!str) return [];
    const delimiter = str.includes(";") ? ";" : ",";
    return str
      .split(delimiter)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const teamMembers = getVal(
    "teamMembers",
    "team_members",
    "team members",
    "members",
  );
  if (teamMembers !== undefined) obj.teamMembers = parseArray(teamMembers);

  const tags = getVal("tags", "tag");
  if (tags !== undefined) obj.tags = parseArray(tags);

  // Date fields
  const parseDate = (val) => {
    if (!val) return undefined;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    // Handle Excel serial date numbers
    if (typeof val === "number") {
      const parsed = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const startDate = getVal("startDate", "start_date", "start date");
  if (startDate !== undefined) {
    const d = parseDate(startDate);
    if (d) obj.startDate = d;
  }

  const endDate = getVal("endDate", "end_date", "end date");
  if (endDate !== undefined) {
    const d = parseDate(endDate);
    if (d) obj.endDate = d;
  }

  return obj;
}

// Simple CSV parser that supports quoted fields and maps headers to object keys
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1);
  return rows
    .map((line) => {
      const values = parseCSVLine(line);
      const raw = {};
      headers.forEach((h, i) => {
        raw[h] = values[i] !== undefined ? values[i].trim() : "";
      });
      return normalizeProjectRow(raw);
    })
    .filter((p) => p.title);
}

// Parse a single CSV line into fields (handles quoted commas)
export function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Parse Excel file (.xlsx or .xls) from ArrayBuffer or File
export async function parseExcel(fileOrBuffer) {
  let arrayBuffer;
  if (fileOrBuffer instanceof File || fileOrBuffer instanceof Blob) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  return rawRows.map((row) => normalizeProjectRow(row)).filter((p) => p.title);
}

// Unified parser for both CSV and Excel (.xlsx, .xls)
export async function parseProjectsFile(file) {
  if (!file) return [];
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return await parseExcel(file);
  } else {
    const text = await file.text();
    return parseCSV(text);
  }
}

// Prepare clean export data rows
function prepareExportRows(data) {
  const headers = [
    "title",
    "description",
    "program",
    "category",
    "projectScope",
    "status",
    "priority",
    "siteId",
    "tawalId",
    "region",
    "city",
    "teamLead",
    "budget",
    "spent",
    "progress",
    "startDate",
    "endDate",
    "teamMembers",
    "tags",
    "longitude",
    "latitude",
  ];

  return data.map((row) => {
    const item = {};
    headers.forEach((h) => {
      let val = row[h];
      if (val === null || val === undefined) {
        val = "";
      } else if (val instanceof Date) {
        val = val.toISOString().slice(0, 10);
      } else if (Array.isArray(val)) {
        val = val.join("; ");
      } else if (typeof val === "object") {
        val = val.name || val.title || "";
      }
      item[h] = val;
    });
    return item;
  });
}

// Export projects to Excel (.xlsx) file
export function exportToExcel(data, filename = "projects_export.xlsx") {
  if (!data || !data.length) return;

  const exportRows = prepareExportRows(data);
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Auto-size columns based on content
  const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...exportRows.map((r) => String(r[key] || "").length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");

  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}

// Convert an array of objects to a CSV file and trigger download
export function exportToCSV(data, filename = "projects_export.csv") {
  if (!data || !data.length) return;

  const headers = [
    "title",
    "description",
    "program",
    "category",
    "projectScope",
    "status",
    "priority",
    "siteId",
    "tawalId",
    "region",
    "city",
    "teamLead",
    "budget",
    "spent",
    "progress",
    "startDate",
    "endDate",
    "teamMembers",
    "tags",
    "longitude",
    "latitude",
  ];

  const exportRows = prepareExportRows(data);

  const csvContent = [
    headers.join(","),
    ...exportRows.map((row) =>
      headers
        .map((header) => {
          let cell = row[header] ?? "";
          const cellString = String(cell);
          if (
            cellString.includes(",") ||
            cellString.includes('"') ||
            cellString.includes("\n")
          ) {
            return `"${cellString.replace(/"/g, '""')}"`;
          }
          return cellString;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate and download a sample template for bulk project upload (Excel or CSV)
export function downloadProjectsTemplate(format = "xlsx") {
  const sampleData = [
    {
      title: "Sample Tower Expansion",
      description: "Sample project description",
      program: "Telecom Expansion 2026",
      category: "Telecom",
      projectScope: "Installation",
      status: "Initiation",
      priority: "Medium",
      siteId: "SITE-1001",
      tawalId: "TWL-1001",
      region: "Riyadh",
      city: "Riyadh",
      teamLead: "lead@example.com",
      budget: 50000,
      spent: 0,
      progress: 0,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      teamMembers: "member1@example.com; member2@example.com",
      tags: "Phase1; Urgent",
      longitude: 46.6753,
      latitude: 24.7136,
    },
  ];

  if (format === "csv") {
    exportToCSV(sampleData, "projects_bulk_upload_template.csv");
  } else {
    exportToExcel(sampleData, "projects_bulk_upload_template.xlsx");
  }
}
