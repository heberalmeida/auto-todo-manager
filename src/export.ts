import * as vscode from "vscode";
import * as path from "path";
import { TodoEntry } from "./todoTree";

/**
 * Exports TODO entries to Markdown format
 */
export function exportToMarkdown(entries: TodoEntry[]): string {
  const lines: string[] = [];

  // Header
  lines.push("# TODO Report");
  lines.push(`\nGenerated on ${new Date().toLocaleString()}\n`);
  lines.push(`**Total TODOs:** ${entries.length}\n`);

  // Group by file
  const byFile = new Map<string, TodoEntry[]>();
  for (const entry of entries) {
    const filePath = entry.fileUri.fsPath;
    const existing = byFile.get(filePath);
    if (existing) {
      existing.push(entry);
    } else {
      byFile.set(filePath, [entry]);
    }
  }

  // Sort files by path
  const sortedFiles = Array.from(byFile.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [filePath, fileEntries] of sortedFiles) {
    const fileName = path.basename(filePath);
    lines.push(`## ${fileName}`);
    lines.push(`\n\`${filePath}\`\n`);

    // Group by type
    const byType = new Map<string, TodoEntry[]>();
    for (const entry of fileEntries) {
      const existing = byType.get(entry.kind);
      if (existing) {
        existing.push(entry);
      } else {
        byType.set(entry.kind, [entry]);
      }
    }

    const sortedTypes = Array.from(byType.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [type, typeEntries] of sortedTypes) {
      lines.push(`### ${type} (${typeEntries.length})`);
      lines.push("");

      for (const entry of typeEntries) {
        const lineNum = entry.line + 1;
        const text = entry.text.trim() || entry.lineText.trim();
        lines.push(`- **Line ${lineNum}**: ${text}`);
        if (text !== entry.lineText.trim()) {
          lines.push(`  \`${entry.lineText.trim()}\``);
        }
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Exports TODO entries to JSON format
 */
export function exportToJSON(entries: TodoEntry[]): string {
  const data = {
    metadata: {
      generated: new Date().toISOString(),
      total: entries.length,
      version: "1.0"
    },
    entries: entries.map(entry => ({
      kind: entry.kind,
      text: entry.text,
      filePath: entry.fileUri.fsPath,
      line: entry.line + 1, // Convert to 1-based
      lineText: entry.lineText
    }))
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Exports TODO entries to CSV format
 */
export function exportToCSV(entries: TodoEntry[]): string {
  const lines: string[] = [];

  // Header
  lines.push("Type,File,Line,Text,Line Content");

  // Data rows
  for (const entry of entries) {
    const type = entry.kind;
    const file = entry.fileUri.fsPath;
    const line = (entry.line + 1).toString();
    const text = escapeCSV(entry.text.trim() || entry.lineText.trim());
    const lineContent = escapeCSV(entry.lineText.trim());

    lines.push(`${type},${escapeCSV(file)},${line},${text},${lineContent}`);
  }

  return lines.join("\n");
}

/**
 * Escapes CSV field values
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exports TODO entries as formatted text for clipboard
 */
export function exportToFormattedText(entries: TodoEntry[]): string {
  const lines: string[] = [];

  lines.push("TODO Report");
  lines.push("=".repeat(50));
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Total TODOs: ${entries.length}`);
  lines.push("");

  // Group by file
  const byFile = new Map<string, TodoEntry[]>();
  for (const entry of entries) {
    const filePath = entry.fileUri.fsPath;
    const existing = byFile.get(filePath);
    if (existing) {
      existing.push(entry);
    } else {
      byFile.set(filePath, [entry]);
    }
  }

  const sortedFiles = Array.from(byFile.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [filePath, fileEntries] of sortedFiles) {
    const fileName = path.basename(filePath);
    lines.push(fileName);
    lines.push("-".repeat(50));
    lines.push(`File: ${filePath}`);
    lines.push("");

    for (const entry of fileEntries) {
      const lineNum = entry.line + 1;
      const text = entry.text.trim() || entry.lineText.trim();
      lines.push(`[${entry.kind}] Line ${lineNum}: ${text}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Saves content to a file
 */
export async function saveToFile(
  content: string,
  filename: string,
  defaultUri?: vscode.Uri
): Promise<vscode.Uri | undefined> {
  let uri: vscode.Uri | undefined = defaultUri;

  if (!uri) {
    const workspaceFolder =
      vscode.workspace.workspaceFolders?.[0]?.uri ||
      vscode.Uri.file(process.cwd());

    uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(workspaceFolder, filename),
      filters: {
        "All Files": ["*"]
      }
    });
  }

  if (!uri) {
    return undefined;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    await vscode.workspace.fs.writeFile(uri, data);
    return uri;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save file: ${errorMessage}`);
  }
}

