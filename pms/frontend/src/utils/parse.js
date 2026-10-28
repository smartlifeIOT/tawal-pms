import * as XLSX from "xlsx";

// Standard project headers
export const CORE_PROJECT_HEADERS = [
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

// Milestone headers for Mapping & Approvals, Installation, Integration, and Closeout
export const MILESTONE_EXPORT_HEADERS = [
  // Mapping & Approvals
  "mapping_woRequest_status",
  "mapping_woRequest_date",
  "mapping_woRequest_remarks",
  "mapping_woIssuance_woNumber",
  "mapping_woIssuance_status",
  "mapping_woIssuance_date",
  "mapping_woIssuance_remarks",
  "mapping_materialsRequest_status",
  "mapping_materialsRequest_date",
  "mapping_materialsRequest_remarks",
  "mapping_generalRemarks",

  // Installation
  "installation_tcnRequest_tcnNumber",
  "installation_tcnRequest_status",
  "installation_tcnRequest_date",
  "installation_tcnRequest_remarks",
  "installation_teamsMobilization_status",
  "installation_teamsMobilization_date",
  "installation_teamsMobilization_remarks",
  "installation_tcnApproval_status",
  "installation_tcnApproval_date",
  "installation_tcnApproval_remarks",
  "installation_siteInstallation_type",
  "installation_siteInstallation_status",
  "installation_siteInstallation_date",
  "installation_siteInstallation_remarks",
  "installation_generalRemarks",

  // Integration
  "integration_alarmsConfig_status",
  "integration_alarmsConfig_date",
  "integration_alarmsConfig_remarks",
  "integration_annexNumber_number",
  "integration_annexNumber_status",
  "integration_annexNumber_date",
  "integration_annexNumber_remarks",
  "integration_tenantsIntegration_status",
  "integration_tenantsIntegration_date",
  "integration_tenantsIntegration_remarks",
  "integration_generalRemarks",

  // Closeout
  "closeout_patTcn_number",
  "closeout_patTcn_status",
  "closeout_patTcn_date",
  "closeout_patTcn_remarks",
  "closeout_patStatus_status",
  "closeout_patStatus_date",
  "closeout_patStatus_remarks",
  "closeout_invoicing_status",
  "closeout_invoicing_date",
  "closeout_invoicing_remarks",
  "closeout_capitalisation_status",
  "closeout_capitalisation_date",
  "closeout_capitalisation_remarks",
  "closeout_generalRemarks",
];

export const ALL_PROJECT_EXPORT_HEADERS = [
  ...CORE_PROJECT_HEADERS,
  ...MILESTONE_EXPORT_HEADERS,
];

// Helper to format Date or date string to YYYY-MM-DD
function formatExportDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return "";
}

// Clean string helper
const cleanStr = (val) => {
  if (val === undefined || val === null) return "";
  return String(val).trim();
};

// Fuzzy enum matcher that accepts case-insensitive, hyphenated, or spaceless values
function matchEnum(val, allowedValues, defaultVal = "Pending") {
  if (val === undefined || val === null) return defaultVal;
  const str = String(val).trim();
  if (!str) return defaultVal;

  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const allowed of allowedValues) {
    const allowedNorm = allowed.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === allowedNorm) return allowed;
  }
  // Common colloquial / short aliases
  if (["na", "notapplicable", "none"].includes(normalized)) {
    if (allowedValues.includes("N/A")) return "N/A";
  }
  if (["inprogress", "inprog", "progress", "wip"].includes(normalized)) {
    if (allowedValues.includes("In Progress")) return "In Progress";
  }
  if (["req", "request", "requested"].includes(normalized)) {
    if (allowedValues.includes("Requested")) return "Requested";
  }
  if (["app", "approve", "approved"].includes(normalized)) {
    if (allowedValues.includes("Approved")) return "Approved";
  }
  if (["rej", "reject", "rejected"].includes(normalized)) {
    if (allowedValues.includes("Rejected")) return "Rejected";
  }
  if (["done", "complete", "completed"].includes(normalized)) {
    if (allowedValues.includes("Completed")) return "Completed";
  }
  if (["smartlock", "lock"].includes(normalized)) {
    if (allowedValues.includes("Smart Lock")) return "Smart Lock";
  }
  if (["smartmeter", "meter"].includes(normalized)) {
    if (allowedValues.includes("Smart Meter")) return "Smart Meter";
  }
  if (normalized === "rms") {
    if (allowedValues.includes("RMS")) return "RMS";
  }

  return defaultVal;
}

// Normalize a single row object from CSV or Excel into a project payload
function normalizeProjectRow(rawRow) {
  const obj = {};

  // Standardize keys by trimming and mapping common aliases
  const normalizedKeys = {};
  const strippedKeys = {};
  for (const key of Object.keys(rawRow)) {
    const cleanKey = key.trim();
    const lower = cleanKey.toLowerCase();
    normalizedKeys[lower] = rawRow[key];
    const stripped = lower.replace(/[^a-z0-9]/g, "");
    if (stripped) {
      strippedKeys[stripped] = rawRow[key];
    }
  }

  const getVal = (...aliases) => {
    for (const alias of aliases) {
      const lower = alias.toLowerCase();
      if (
        normalizedKeys[lower] !== undefined &&
        normalizedKeys[lower] !== null &&
        String(normalizedKeys[lower]).trim() !== ""
      ) {
        return normalizedKeys[lower];
      }
      const stripped = lower.replace(/[^a-z0-9]/g, "");
      if (
        stripped &&
        strippedKeys[stripped] !== undefined &&
        strippedKeys[stripped] !== null &&
        String(strippedKeys[stripped]).trim() !== ""
      ) {
        return strippedKeys[stripped];
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
  if (projectScope !== undefined)
    obj.projectScope = String(projectScope).trim();

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
    if (val === undefined || val === null) return undefined;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    // Handle Excel serial date numbers
    if (typeof val === "number") {
      const parsed = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    const str = String(val).trim();
    if (!str) return undefined;
    const parsed = new Date(str);
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

  // Milestone 1: Mapping & Approvals
  const mappingWoRequestStatus = matchEnum(
    getVal(
      "mapping_woRequest_status",
      "mapping.woRequest.status",
      "woRequestStatus",
      "wo_request_status",
      "wo request status",
      "wo request",
    ),
    ["Pending", "Requested", "Rejected", "N/A"],
    "Pending",
  );
  const mappingWoRequestDate = parseDate(
    getVal(
      "mapping_woRequest_date",
      "mapping.woRequest.date",
      "woRequestDate",
      "wo_request_date",
      "wo request date",
    ),
  );
  const mappingWoRequestRemarks = cleanStr(
    getVal(
      "mapping_woRequest_remarks",
      "mapping.woRequest.remarks",
      "woRequestRemarks",
      "wo_request_remarks",
      "wo request remarks",
    ),
  );

  const mappingWoIssuanceWoNumber = cleanStr(
    getVal(
      "mapping_woIssuance_woNumber",
      "mapping.woIssuance.woNumber",
      "woIssuanceWoNumber",
      "woNumber",
      "wo_number",
      "wo number",
      "wo #",
      "work order number",
    ),
  );
  const mappingWoIssuanceStatus = matchEnum(
    getVal(
      "mapping_woIssuance_status",
      "mapping.woIssuance.status",
      "woIssuanceStatus",
      "wo_issuance_status",
      "wo issuance status",
      "wo status",
    ),
    ["Pending", "Approved", "Rejected", "N/A"],
    "Pending",
  );
  const mappingWoIssuanceDate = parseDate(
    getVal(
      "mapping_woIssuance_date",
      "mapping.woIssuance.date",
      "woIssuanceDate",
      "wo_issuance_date",
      "wo issuance date",
      "wo date",
    ),
  );
  const mappingWoIssuanceRemarks = cleanStr(
    getVal(
      "mapping_woIssuance_remarks",
      "mapping.woIssuance.remarks",
      "woIssuanceRemarks",
      "wo_issuance_remarks",
      "wo issuance remarks",
    ),
  );

  const mappingMaterialsRequestStatus = matchEnum(
    getVal(
      "mapping_materialsRequest_status",
      "mapping.materialsRequest.status",
      "materialsRequestStatus",
      "materials_request_status",
      "materials request status",
      "material request status",
    ),
    ["Pending", "Approved", "Rejected", "N/A"],
    "Pending",
  );
  const mappingMaterialsRequestDate = parseDate(
    getVal(
      "mapping_materialsRequest_date",
      "mapping.materialsRequest.date",
      "materialsRequestDate",
      "materials_request_date",
      "materials request date",
      "material request date",
    ),
  );
  const mappingMaterialsRequestRemarks = cleanStr(
    getVal(
      "mapping_materialsRequest_remarks",
      "mapping.materialsRequest.remarks",
      "materialsRequestRemarks",
      "materials_request_remarks",
      "materials request remarks",
      "material request remarks",
    ),
  );

  const mappingGeneralRemarks = cleanStr(
    getVal(
      "mapping_generalRemarks",
      "mapping.generalRemarks",
      "mappingGeneralRemarks",
      "mapping_remarks",
      "mapping remarks",
      "mapping general remarks",
    ),
  );

  obj.mapping = {
    woRequest: {
      status: mappingWoRequestStatus,
      remarks: mappingWoRequestRemarks,
      ...(mappingWoRequestDate ? { date: mappingWoRequestDate } : {}),
    },
    woIssuance: {
      woNumber: mappingWoIssuanceWoNumber,
      status: mappingWoIssuanceStatus,
      remarks: mappingWoIssuanceRemarks,
      ...(mappingWoIssuanceDate ? { date: mappingWoIssuanceDate } : {}),
    },
    materialsRequest: {
      status: mappingMaterialsRequestStatus,
      remarks: mappingMaterialsRequestRemarks,
      ...(mappingMaterialsRequestDate
        ? { date: mappingMaterialsRequestDate }
        : {}),
    },
    generalRemarks: mappingGeneralRemarks,
  };

  // Milestone 2: Installation
  const installationTcnRequestTcnNumber = cleanStr(
    getVal(
      "installation_tcnRequest_tcnNumber",
      "installation.tcnRequest.tcnNumber",
      "tcnRequestTcnNumber",
      "tcnNumber",
      "tcn_number",
      "tcn number",
      "tcn #",
      "issued tcn number",
    ),
  );
  const installationTcnRequestStatus = matchEnum(
    getVal(
      "installation_tcnRequest_status",
      "installation.tcnRequest.status",
      "tcnRequestStatus",
      "tcn_request_status",
      "tcn request status",
      "issued tcn status",
    ),
    ["Pending", "Approved", "Rejected", "N/A"],
    "Pending",
  );
  const installationTcnRequestDate = parseDate(
    getVal(
      "installation_tcnRequest_date",
      "installation.tcnRequest.date",
      "tcnRequestDate",
      "tcn_request_date",
      "tcn request date",
      "issued tcn date",
    ),
  );
  const installationTcnRequestRemarks = cleanStr(
    getVal(
      "installation_tcnRequest_remarks",
      "installation.tcnRequest.remarks",
      "tcnRequestRemarks",
      "tcn_request_remarks",
      "tcn request remarks",
    ),
  );

  const installationTeamsMobilizationStatus = matchEnum(
    getVal(
      "installation_teamsMobilization_status",
      "installation.teamsMaterialsMobilization.status",
      "teamsMaterialsMobilizationStatus",
      "teamsMobilizationStatus",
      "teams_mobilization_status",
      "teams mobilization status",
      "teams and materials mobilization status",
      "teams & materials mobilization status",
    ),
    ["Pending", "In Progress", "Completed", "N/A"],
    "Pending",
  );
  const installationTeamsMobilizationDate = parseDate(
    getVal(
      "installation_teamsMobilization_date",
      "installation.teamsMaterialsMobilization.date",
      "teamsMaterialsMobilizationDate",
      "teamsMobilizationDate",
      "teams_mobilization_date",
      "teams mobilization date",
    ),
  );
  const installationTeamsMobilizationRemarks = cleanStr(
    getVal(
      "installation_teamsMobilization_remarks",
      "installation.teamsMaterialsMobilization.remarks",
      "teamsMaterialsMobilizationRemarks",
      "teamsMobilizationRemarks",
      "teams_mobilization_remarks",
      "teams mobilization remarks",
    ),
  );

  const installationTcnApprovalStatus = matchEnum(
    getVal(
      "installation_tcnApproval_status",
      "installation.tcnApproval.status",
      "tcnApprovalStatus",
      "tcn_approval_status",
      "tcn approval status",
    ),
    ["Pending", "Approved", "Rejected", "N/A"],
    "Pending",
  );
  const installationTcnApprovalDate = parseDate(
    getVal(
      "installation_tcnApproval_date",
      "installation.tcnApproval.date",
      "tcnApprovalDate",
      "tcn_approval_date",
      "tcn approval date",
    ),
  );
  const installationTcnApprovalRemarks = cleanStr(
    getVal(
      "installation_tcnApproval_remarks",
      "installation.tcnApproval.remarks",
      "tcnApprovalRemarks",
      "tcn_approval_remarks",
      "tcn approval remarks",
    ),
  );

  const installationSiteInstallationType = matchEnum(
    getVal(
      "installation_siteInstallation_type",
      "installation.siteInstallation.type",
      "siteInstallationType",
      "site_installation_type",
      "site installation type",
      "installation type",
    ),
    ["RMS", "Smart Lock", "Smart Meter", "Other"],
    "RMS",
  );
  const installationSiteInstallationStatus = matchEnum(
    getVal(
      "installation_siteInstallation_status",
      "installation.siteInstallation.status",
      "siteInstallationStatus",
      "site_installation_status",
      "site installation status",
      "installation status",
    ),
    ["Pending", "In Progress", "Completed", "N/A"],
    "Pending",
  );
  const installationSiteInstallationDate = parseDate(
    getVal(
      "installation_siteInstallation_date",
      "installation.siteInstallation.date",
      "siteInstallationDate",
      "site_installation_date",
      "site installation date",
      "installation date",
    ),
  );
  const installationSiteInstallationRemarks = cleanStr(
    getVal(
      "installation_siteInstallation_remarks",
      "installation.siteInstallation.remarks",
      "siteInstallationRemarks",
      "site_installation_remarks",
      "site installation remarks",
    ),
  );

  const installationGeneralRemarks = cleanStr(
    getVal(
      "installation_generalRemarks",
      "installation.generalRemarks",
      "installationGeneralRemarks",
      "installation_remarks",
      "installation remarks",
      "installation general remarks",
    ),
  );

  obj.installation = {
    tcnRequest: {
      tcnNumber: installationTcnRequestTcnNumber,
      status: installationTcnRequestStatus,
      remarks: installationTcnRequestRemarks,
      ...(installationTcnRequestDate ? { date: installationTcnRequestDate } : {}),
    },
    teamsMaterialsMobilization: {
      status: installationTeamsMobilizationStatus,
      remarks: installationTeamsMobilizationRemarks,
      ...(installationTeamsMobilizationDate
        ? { date: installationTeamsMobilizationDate }
        : {}),
    },
    tcnApproval: {
      status: installationTcnApprovalStatus,
      remarks: installationTcnApprovalRemarks,
      ...(installationTcnApprovalDate
        ? { date: installationTcnApprovalDate }
        : {}),
    },
    siteInstallation: {
      type: installationSiteInstallationType,
      status: installationSiteInstallationStatus,
      remarks: installationSiteInstallationRemarks,
      ...(installationSiteInstallationDate
        ? { date: installationSiteInstallationDate }
        : {}),
    },
    generalRemarks: installationGeneralRemarks,
  };

  // Milestone 3: Integration
  const integrationAlarmsConfigStatus = matchEnum(
    getVal(
      "integration_alarmsConfig_status",
      "integration.alarmsConfiguration.status",
      "alarmsConfigurationStatus",
      "alarmsConfigStatus",
      "alarms_config_status",
      "alarms configuration status",
      "alarms config status",
      "alarms status",
    ),
    ["Pending", "In Progress", "Completed", "N/A"],
    "Pending",
  );
  const integrationAlarmsConfigDate = parseDate(
    getVal(
      "integration_alarmsConfig_date",
      "integration.alarmsConfiguration.date",
      "alarmsConfigurationDate",
      "alarmsConfigDate",
      "alarms_config_date",
      "alarms configuration date",
    ),
  );
  const integrationAlarmsConfigRemarks = cleanStr(
    getVal(
      "integration_alarmsConfig_remarks",
      "integration.alarmsConfiguration.remarks",
      "alarmsConfigurationRemarks",
      "alarmsConfigRemarks",
      "alarms_config_remarks",
      "alarms configuration remarks",
    ),
  );

  const integrationAnnexNumberNumber = cleanStr(
    getVal(
      "integration_annexNumber_number",
      "integration.annexNumber.number",
      "annexNumber",
      "annex_number",
      "annex number",
      "annex #",
    ),
  );
  const integrationAnnexNumberStatus = matchEnum(
    getVal(
      "integration_annexNumber_status",
      "integration.annexNumber.status",
      "annexNumberStatus",
      "annex_number_status",
      "annex status",
      "annex number status",
    ),
    ["Pending", "Approved", "Rejected", "N/A"],
    "Pending",
  );
  const integrationAnnexNumberDate = parseDate(
    getVal(
      "integration_annexNumber_date",
      "integration.annexNumber.date",
      "annexNumberDate",
      "annex_number_date",
      "annex date",
      "annex number date",
    ),
  );
  const integrationAnnexNumberRemarks = cleanStr(
    getVal(
      "integration_annexNumber_remarks",
      "integration.annexNumber.remarks",
      "annexNumberRemarks",
      "annex_number_remarks",
      "annex remarks",
    ),
  );

  const integrationTenantsIntegrationStatus = matchEnum(
    getVal(
      "integration_tenantsIntegration_status",
      "integration.tenantsIntegration.status",
      "tenantsIntegrationStatus",
      "tenants_integration_status",
      "tenants integration status",
      "tenant integration status",
    ),
    ["Pending", "In Progress", "Completed", "N/A"],
    "Pending",
  );
  const integrationTenantsIntegrationDate = parseDate(
    getVal(
      "integration_tenantsIntegration_date",
      "integration.tenantsIntegration.date",
      "tenantsIntegrationDate",
      "tenants_integration_date",
      "tenants integration date",
    ),
  );
  const integrationTenantsIntegrationRemarks = cleanStr(
    getVal(
      "integration_tenantsIntegration_remarks",
      "integration.tenantsIntegration.remarks",
      "tenantsIntegrationRemarks",
      "tenants_integration_remarks",
      "tenants integration remarks",
    ),
  );

  const integrationGeneralRemarks = cleanStr(
    getVal(
      "integration_generalRemarks",
      "integration.generalRemarks",
      "integrationGeneralRemarks",
      "integration_remarks",
      "integration remarks",
      "integration general remarks",
    ),
  );

  obj.integration = {
    alarmsConfiguration: {
      status: integrationAlarmsConfigStatus,
      remarks: integrationAlarmsConfigRemarks,
      ...(integrationAlarmsConfigDate
        ? { date: integrationAlarmsConfigDate }
        : {}),
    },
    annexNumber: {
      number: integrationAnnexNumberNumber,
      status: integrationAnnexNumberStatus,
      remarks: integrationAnnexNumberRemarks,
      ...(integrationAnnexNumberDate
        ? { date: integrationAnnexNumberDate }
        : {}),
    },
    tenantsIntegration: {
      status: integrationTenantsIntegrationStatus,
      remarks: integrationTenantsIntegrationRemarks,
      ...(integrationTenantsIntegrationDate
        ? { date: integrationTenantsIntegrationDate }
        : {}),
    },
    generalRemarks: integrationGeneralRemarks,
  };

  // Milestone 4: Closeout
  const closeoutPatTcnNumber = cleanStr(
    getVal(
      "closeout_patTcn_number",
      "closeout.patTcn.number",
      "patTcnNumber",
      "pat_tcn_number",
      "pat tcn number",
      "pat tcn #",
    ),
  );
  const closeoutPatTcnStatus = matchEnum(
    getVal(
      "closeout_patTcn_status",
      "closeout.patTcn.status",
      "patTcnStatus",
      "pat_tcn_status",
      "pat tcn status",
    ),
    ["Pending", "Approved", "Rejected", "N/A"],
    "Pending",
  );
  const closeoutPatTcnDate = parseDate(
    getVal(
      "closeout_patTcn_date",
      "closeout.patTcn.date",
      "patTcnDate",
      "pat_tcn_date",
      "pat tcn date",
    ),
  );
  const closeoutPatTcnRemarks = cleanStr(
    getVal(
      "closeout_patTcn_remarks",
      "closeout.patTcn.remarks",
      "patTcnRemarks",
      "pat_tcn_remarks",
      "pat tcn remarks",
    ),
  );

  const closeoutPatStatusStatus = matchEnum(
    getVal(
      "closeout_patStatus_status",
      "closeout.patStatus.status",
      "patStatus",
      "pat_status",
      "pat status",
    ),
    ["Pending", "Approved", "Rejected", "N/A"],
    "Pending",
  );
  const closeoutPatStatusDate = parseDate(
    getVal(
      "closeout_patStatus_date",
      "closeout.patStatus.date",
      "patStatusDate",
      "pat_status_date",
      "pat date",
      "pat status date",
    ),
  );
  const closeoutPatStatusRemarks = cleanStr(
    getVal(
      "closeout_patStatus_remarks",
      "closeout.patStatus.remarks",
      "patStatusRemarks",
      "pat_status_remarks",
      "pat remarks",
      "pat status remarks",
    ),
  );

  const closeoutInvoicingStatus = matchEnum(
    getVal(
      "closeout_invoicing_status",
      "closeout.invoicing.status",
      "invoicingStatus",
      "invoicing_status",
      "invoicing status",
    ),
    ["Pending", "In Progress", "Completed", "N/A"],
    "Pending",
  );
  const closeoutInvoicingDate = parseDate(
    getVal(
      "closeout_invoicing_date",
      "closeout.invoicing.date",
      "invoicingDate",
      "invoicing_date",
      "invoicing date",
    ),
  );
  const closeoutInvoicingRemarks = cleanStr(
    getVal(
      "closeout_invoicing_remarks",
      "closeout.invoicing.remarks",
      "invoicingRemarks",
      "invoicing_remarks",
      "invoicing remarks",
    ),
  );

  const closeoutCapitalisationStatus = matchEnum(
    getVal(
      "closeout_capitalisation_status",
      "closeout.capitalisationSheetUpdate.status",
      "capitalisationSheetUpdateStatus",
      "capitalisationStatus",
      "capitalisation_status",
      "capitalisation status",
      "capitalisation sheet update status",
    ),
    ["Pending", "In Progress", "Completed", "N/A"],
    "Pending",
  );
  const closeoutCapitalisationDate = parseDate(
    getVal(
      "closeout_capitalisation_date",
      "closeout.capitalisationSheetUpdate.date",
      "capitalisationSheetUpdateDate",
      "capitalisationDate",
      "capitalisation_date",
      "capitalisation date",
      "capitalisation sheet update date",
    ),
  );
  const closeoutCapitalisationRemarks = cleanStr(
    getVal(
      "closeout_capitalisation_remarks",
      "closeout.capitalisationSheetUpdate.remarks",
      "capitalisationSheetUpdateRemarks",
      "capitalisationRemarks",
      "capitalisation_remarks",
      "capitalisation remarks",
    ),
  );

  const closeoutGeneralRemarks = cleanStr(
    getVal(
      "closeout_generalRemarks",
      "closeout.generalRemarks",
      "closeoutGeneralRemarks",
      "closeout_remarks",
      "closeout remarks",
      "closeout general remarks",
    ),
  );

  obj.closeout = {
    patTcn: {
      number: closeoutPatTcnNumber,
      status: closeoutPatTcnStatus,
      remarks: closeoutPatTcnRemarks,
      ...(closeoutPatTcnDate ? { date: closeoutPatTcnDate } : {}),
    },
    patStatus: {
      status: closeoutPatStatusStatus,
      remarks: closeoutPatStatusRemarks,
      ...(closeoutPatStatusDate ? { date: closeoutPatStatusDate } : {}),
    },
    invoicing: {
      status: closeoutInvoicingStatus,
      remarks: closeoutInvoicingRemarks,
      ...(closeoutInvoicingDate ? { date: closeoutInvoicingDate } : {}),
    },
    capitalisationSheetUpdate: {
      status: closeoutCapitalisationStatus,
      remarks: closeoutCapitalisationRemarks,
      ...(closeoutCapitalisationDate
        ? { date: closeoutCapitalisationDate }
        : {}),
    },
    generalRemarks: closeoutGeneralRemarks,
  };

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

// Prepare clean export data rows with core fields and all milestone details
export function prepareExportRows(data) {
  if (!Array.isArray(data)) return [];

  return data.map((row) => {
    const item = {};

    // 1. Core Project Fields
    CORE_PROJECT_HEADERS.forEach((h) => {
      let val = row[h];
      if (val === null || val === undefined) {
        val = "";
      } else if (val instanceof Date) {
        val = formatExportDate(val);
      } else if (Array.isArray(val)) {
        val = val.join("; ");
      } else if (typeof val === "object") {
        val = val.name || val.title || "";
      }
      item[h] = val;
    });

    // 2. Mapping & Approvals
    item.mapping_woRequest_status =
      row.mapping_woRequest_status ?? row.mapping?.woRequest?.status ?? "";
    item.mapping_woRequest_date = formatExportDate(
      row.mapping_woRequest_date ?? row.mapping?.woRequest?.date,
    );
    item.mapping_woRequest_remarks =
      row.mapping_woRequest_remarks ?? row.mapping?.woRequest?.remarks ?? "";

    item.mapping_woIssuance_woNumber =
      row.mapping_woIssuance_woNumber ??
      row.mapping?.woIssuance?.woNumber ??
      "";
    item.mapping_woIssuance_status =
      row.mapping_woIssuance_status ?? row.mapping?.woIssuance?.status ?? "";
    item.mapping_woIssuance_date = formatExportDate(
      row.mapping_woIssuance_date ?? row.mapping?.woIssuance?.date,
    );
    item.mapping_woIssuance_remarks =
      row.mapping_woIssuance_remarks ??
      row.mapping?.woIssuance?.remarks ??
      "";

    item.mapping_materialsRequest_status =
      row.mapping_materialsRequest_status ??
      row.mapping?.materialsRequest?.status ??
      "";
    item.mapping_materialsRequest_date = formatExportDate(
      row.mapping_materialsRequest_date ?? row.mapping?.materialsRequest?.date,
    );
    item.mapping_materialsRequest_remarks =
      row.mapping_materialsRequest_remarks ??
      row.mapping?.materialsRequest?.remarks ??
      "";

    item.mapping_generalRemarks =
      row.mapping_generalRemarks ?? row.mapping?.generalRemarks ?? "";

    // 3. Installation
    item.installation_tcnRequest_tcnNumber =
      row.installation_tcnRequest_tcnNumber ??
      row.installation?.tcnRequest?.tcnNumber ??
      "";
    item.installation_tcnRequest_status =
      row.installation_tcnRequest_status ??
      row.installation?.tcnRequest?.status ??
      "";
    item.installation_tcnRequest_date = formatExportDate(
      row.installation_tcnRequest_date ?? row.installation?.tcnRequest?.date,
    );
    item.installation_tcnRequest_remarks =
      row.installation_tcnRequest_remarks ??
      row.installation?.tcnRequest?.remarks ??
      "";

    item.installation_teamsMobilization_status =
      row.installation_teamsMobilization_status ??
      row.installation?.teamsMaterialsMobilization?.status ??
      "";
    item.installation_teamsMobilization_date = formatExportDate(
      row.installation_teamsMobilization_date ??
        row.installation?.teamsMaterialsMobilization?.date,
    );
    item.installation_teamsMobilization_remarks =
      row.installation_teamsMobilization_remarks ??
      row.installation?.teamsMaterialsMobilization?.remarks ??
      "";

    item.installation_tcnApproval_status =
      row.installation_tcnApproval_status ??
      row.installation?.tcnApproval?.status ??
      "";
    item.installation_tcnApproval_date = formatExportDate(
      row.installation_tcnApproval_date ?? row.installation?.tcnApproval?.date,
    );
    item.installation_tcnApproval_remarks =
      row.installation_tcnApproval_remarks ??
      row.installation?.tcnApproval?.remarks ??
      "";

    item.installation_siteInstallation_type =
      row.installation_siteInstallation_type ??
      row.installation?.siteInstallation?.type ??
      "";
    item.installation_siteInstallation_status =
      row.installation_siteInstallation_status ??
      row.installation?.siteInstallation?.status ??
      "";
    item.installation_siteInstallation_date = formatExportDate(
      row.installation_siteInstallation_date ??
        row.installation?.siteInstallation?.date,
    );
    item.installation_siteInstallation_remarks =
      row.installation_siteInstallation_remarks ??
      row.installation?.siteInstallation?.remarks ??
      "";

    item.installation_generalRemarks =
      row.installation_generalRemarks ??
      row.installation?.generalRemarks ??
      "";

    // 4. Integration
    item.integration_alarmsConfig_status =
      row.integration_alarmsConfig_status ??
      row.integration?.alarmsConfiguration?.status ??
      "";
    item.integration_alarmsConfig_date = formatExportDate(
      row.integration_alarmsConfig_date ??
        row.integration?.alarmsConfiguration?.date,
    );
    item.integration_alarmsConfig_remarks =
      row.integration_alarmsConfig_remarks ??
      row.integration?.alarmsConfiguration?.remarks ??
      "";

    item.integration_annexNumber_number =
      row.integration_annexNumber_number ??
      row.integration?.annexNumber?.number ??
      "";
    item.integration_annexNumber_status =
      row.integration_annexNumber_status ??
      row.integration?.annexNumber?.status ??
      "";
    item.integration_annexNumber_date = formatExportDate(
      row.integration_annexNumber_date ?? row.integration?.annexNumber?.date,
    );
    item.integration_annexNumber_remarks =
      row.integration_annexNumber_remarks ??
      row.integration?.annexNumber?.remarks ??
      "";

    item.integration_tenantsIntegration_status =
      row.integration_tenantsIntegration_status ??
      row.integration?.tenantsIntegration?.status ??
      "";
    item.integration_tenantsIntegration_date = formatExportDate(
      row.integration_tenantsIntegration_date ??
        row.integration?.tenantsIntegration?.date,
    );
    item.integration_tenantsIntegration_remarks =
      row.integration_tenantsIntegration_remarks ??
      row.integration?.tenantsIntegration?.remarks ??
      "";

    item.integration_generalRemarks =
      row.integration_generalRemarks ?? row.integration?.generalRemarks ?? "";

    // 5. Closeout
    item.closeout_patTcn_number =
      row.closeout_patTcn_number ?? row.closeout?.patTcn?.number ?? "";
    item.closeout_patTcn_status =
      row.closeout_patTcn_status ?? row.closeout?.patTcn?.status ?? "";
    item.closeout_patTcn_date = formatExportDate(
      row.closeout_patTcn_date ?? row.closeout?.patTcn?.date,
    );
    item.closeout_patTcn_remarks =
      row.closeout_patTcn_remarks ?? row.closeout?.patTcn?.remarks ?? "";

    item.closeout_patStatus_status =
      row.closeout_patStatus_status ?? row.closeout?.patStatus?.status ?? "";
    item.closeout_patStatus_date = formatExportDate(
      row.closeout_patStatus_date ?? row.closeout?.patStatus?.date,
    );
    item.closeout_patStatus_remarks =
      row.closeout_patStatus_remarks ?? row.closeout?.patStatus?.remarks ?? "";

    item.closeout_invoicing_status =
      row.closeout_invoicing_status ?? row.closeout?.invoicing?.status ?? "";
    item.closeout_invoicing_date = formatExportDate(
      row.closeout_invoicing_date ?? row.closeout?.invoicing?.date,
    );
    item.closeout_invoicing_remarks =
      row.closeout_invoicing_remarks ?? row.closeout?.invoicing?.remarks ?? "";

    item.closeout_capitalisation_status =
      row.closeout_capitalisation_status ??
      row.closeout?.capitalisationSheetUpdate?.status ??
      "";
    item.closeout_capitalisation_date = formatExportDate(
      row.closeout_capitalisation_date ??
        row.closeout?.capitalisationSheetUpdate?.date,
    );
    item.closeout_capitalisation_remarks =
      row.closeout_capitalisation_remarks ??
      row.closeout?.capitalisationSheetUpdate?.remarks ??
      "";

    item.closeout_generalRemarks =
      row.closeout_generalRemarks ?? row.closeout?.generalRemarks ?? "";

    return item;
  });
}

// Export projects to Excel (.xlsx) file
export function exportToExcel(data, filename = "projects_export.xlsx") {
  if (!data || !data.length) return;

  const exportRows = prepareExportRows(data);
  const worksheet = XLSX.utils.json_to_sheet(exportRows, {
    header: ALL_PROJECT_EXPORT_HEADERS,
  });

  // Auto-size columns based on content
  const colWidths = ALL_PROJECT_EXPORT_HEADERS.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...exportRows.map((r) => String(r[key] || "").length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
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

  const headers = ALL_PROJECT_EXPORT_HEADERS;
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

      // Mapping & Approvals
      mapping_woRequest_status: "Requested",
      mapping_woRequest_date: "2026-01-05",
      mapping_woRequest_remarks: "Initial WO request submitted",
      mapping_woIssuance_woNumber: "WO-99881",
      mapping_woIssuance_status: "Approved",
      mapping_woIssuance_date: "2026-01-10",
      mapping_woIssuance_remarks: "Approved by client",
      mapping_materialsRequest_status: "Approved",
      mapping_materialsRequest_date: "2026-01-12",
      mapping_materialsRequest_remarks: "Materials ready",
      mapping_generalRemarks: "Mapping phase on track",

      // Installation
      installation_tcnRequest_tcnNumber: "TCN-55441",
      installation_tcnRequest_status: "Approved",
      installation_tcnRequest_date: "2026-01-15",
      installation_tcnRequest_remarks: "TCN approved",
      installation_teamsMobilization_status: "Completed",
      installation_teamsMobilization_date: "2026-01-18",
      installation_teamsMobilization_remarks: "Teams on site",
      installation_tcnApproval_status: "Approved",
      installation_tcnApproval_date: "2026-01-20",
      installation_tcnApproval_remarks: "Approved",
      installation_siteInstallation_type: "RMS",
      installation_siteInstallation_status: "In Progress",
      installation_siteInstallation_date: "2026-01-25",
      installation_siteInstallation_remarks: "Hardware mounting underway",
      installation_generalRemarks: "Installation started",

      // Integration
      integration_alarmsConfig_status: "Pending",
      integration_alarmsConfig_date: "",
      integration_alarmsConfig_remarks: "",
      integration_annexNumber_number: "ANN-102",
      integration_annexNumber_status: "Pending",
      integration_annexNumber_date: "",
      integration_annexNumber_remarks: "",
      integration_tenantsIntegration_status: "Pending",
      integration_tenantsIntegration_date: "",
      integration_tenantsIntegration_remarks: "",
      integration_generalRemarks: "",

      // Closeout
      closeout_patTcn_number: "PAT-009",
      closeout_patTcn_status: "Pending",
      closeout_patTcn_date: "",
      closeout_patTcn_remarks: "",
      closeout_patStatus_status: "Pending",
      closeout_patStatus_date: "",
      closeout_patStatus_remarks: "",
      closeout_invoicing_status: "Pending",
      closeout_invoicing_date: "",
      closeout_invoicing_remarks: "",
      closeout_capitalisation_status: "Pending",
      closeout_capitalisation_date: "",
      closeout_capitalisation_remarks: "",
      closeout_generalRemarks: "",
    },
  ];

  if (format === "csv") {
    exportToCSV(sampleData, "projects_bulk_upload_template.csv");
  } else {
    exportToExcel(sampleData, "projects_bulk_upload_template.xlsx");
  }
}
