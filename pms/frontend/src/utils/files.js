const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export const isPdfFile = (name = "") => /\.pdf$/i.test(String(name).split("?")[0]);

/**
 * Turns a stored file URL (e.g. "/uploads/abc-123.xlsx") into a link served by
 * the API: PDFs open inline in the browser, everything else downloads with
 * its original file name.
 */
export const getFileLink = (fileUrl, fileName) => {
  if (!fileUrl) return "";

  const match = String(fileUrl).match(/\/uploads\/([^/?#]+)/);
  if (!match) {
    // External / absolute link that isn't one of our uploads — use as-is
    return fileUrl;
  }

  const storedName = decodeURIComponent(match[1]);
  const displayName = fileName || storedName;
  return `${API_BASE}/upload/files/${encodeURIComponent(storedName)}?name=${encodeURIComponent(displayName)}`;
};

/** Props for an <a> that opens PDFs in a new tab and downloads other files. */
export const getFileLinkProps = (fileUrl, fileName) => {
  const href = getFileLink(fileUrl, fileName);
  const pdf = isPdfFile(fileName) || isPdfFile(fileUrl);
  return pdf
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href, download: fileName || true, rel: "noopener noreferrer" };
};
