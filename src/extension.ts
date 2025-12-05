import * as vscode from "vscode";
import * as crypto from "crypto";
import * as fs from "fs";
import { TodoEntry, TodoTreeDataProvider, TodoFilter } from "./todoTree";
import {
  calculateStatistics,
  formatStatisticsAsMarkdown,
  formatStatisticsAsText,
  TodoStatistics
} from "./statistics";

/** The tree data provider instance for the TODO view */
let treeDataProvider: TodoTreeDataProvider;

/** Output channel for logging extension activities and errors */
let outputChannel: vscode.OutputChannel;

/** The tree view instance */
let treeView: vscode.TreeView<vscode.TreeItem>;

/** Status bar item for TODO count */
let statusBarItem: vscode.StatusBarItem;

/** Previous TODO count for trend analysis */
let previousTodoCount: number = 0;

/** Cache for file hashes to enable incremental scanning */
interface FileCache {
  hash: string;
  entries: TodoEntry[];
  timestamp: number;
}

const fileCache = new Map<string, FileCache>();

/** Debounce timer for file change events */
let debounceTimer: NodeJS.Timeout | undefined;

/** Progress indicator for scanning */
let progressIndicator: vscode.Progress<{ message?: string; increment?: number }> | undefined;

/**
 * Activates the extension.
 * Sets up the tree view, commands, and file watchers.
 * 
 * @param context - The extension context provided by VSCode
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel("Auto TODO Manager");
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine("Auto TODO Manager activated");
  
  treeDataProvider = new TodoTreeDataProvider();
  treeView = vscode.window.createTreeView("autoTodoManagerView", {
    treeDataProvider
  });
  context.subscriptions.push(treeView);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "autoTodoManager.showStatistics";
  statusBarItem.tooltip = "Click to view TODO statistics";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Update visibility based on configuration
  updateActivityBarVisibility();

  // Listen for configuration changes
  const configListener = vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (e.affectsConfiguration("autoTodoManager.showActivityBar")) {
      updateActivityBarVisibility();
    }
    if (e.affectsConfiguration("autoTodoManager.groupByType") ||
        e.affectsConfiguration("autoTodoManager.sortOrder")) {
      updateTreeViewSettings();
    }
    if (e.affectsConfiguration("autoTodoManager")) {
      // Clear cache when settings change
      fileCache.clear();
      await scanWorkspaceAndUpdate();
    }
  });
  context.subscriptions.push(configListener);

  // Register commands
  registerCommands(context);

  // Setup file watchers with debouncing
  setupFileWatchers(context);

  // Initial scan
  scanWorkspaceAndUpdate();
}

/**
 * Registers all extension commands.
 */
function registerCommands(context: vscode.ExtensionContext) {
  const refreshCommand = vscode.commands.registerCommand(
    "autoTodoManager.refresh",
    async () => {
      fileCache.clear();
      await scanWorkspaceAndUpdate();
    }
  );
  context.subscriptions.push(refreshCommand);

  const toggleActivityBarCommand = vscode.commands.registerCommand(
    "autoTodoManager.toggleActivityBar",
    async () => {
      const action = await vscode.window.showInformationMessage(
        "To hide/show the Activity Bar icon, use: View > Appearance > Activity Bar Items",
        "Open Settings"
      );
      
      if (action === "Open Settings") {
        await vscode.commands.executeCommand("workbench.action.openSettings", "autoTodoManager.showActivityBar");
      }
    }
  );
  context.subscriptions.push(toggleActivityBarCommand);

  const filterByTypeCommand = vscode.commands.registerCommand(
    "autoTodoManager.filterByType",
    async () => {
      const types = treeDataProvider.getAvailableTypes();
      if (types.length === 0) {
        vscode.window.showInformationMessage("No TODO types available to filter.");
        return;
      }

      const selected = await vscode.window.showQuickPick(
        types.map(t => ({ label: t, description: `Filter by ${t}` })),
        { placeHolder: "Select TODO type to filter" }
      );

      if (selected) {
        const currentFilter = treeDataProvider.getFilter();
        treeDataProvider.setFilter({ ...currentFilter, keyword: selected.label });
        vscode.window.showInformationMessage(`Filtering by ${selected.label}`);
      }
    }
  );
  context.subscriptions.push(filterByTypeCommand);

  const clearFilterCommand = vscode.commands.registerCommand(
    "autoTodoManager.clearFilter",
    () => {
      treeDataProvider.setFilter({});
      vscode.window.showInformationMessage("Filter cleared");
    }
  );
  context.subscriptions.push(clearFilterCommand);

  const searchTextCommand = vscode.commands.registerCommand(
    "autoTodoManager.searchText",
    async () => {
      const searchText = await vscode.window.showInputBox({
        placeHolder: "Enter text to search in TODOs",
        prompt: "Search TODOs by text content"
      });

      if (searchText !== undefined) {
        const currentFilter = treeDataProvider.getFilter();
        treeDataProvider.setFilter({ ...currentFilter, searchText: searchText || undefined });
        if (searchText) {
          vscode.window.showInformationMessage(`Filtering by text: "${searchText}"`);
        }
      }
    }
  );
  context.subscriptions.push(searchTextCommand);

  const expandAllCommand = vscode.commands.registerCommand(
    "autoTodoManager.expandAll",
    async () => {
      // Expand all by refreshing the view
      // VSCode doesn't have a direct expand all API, so we refresh
      vscode.window.showInformationMessage("Use the expand buttons in the tree view to expand items");
    }
  );
  context.subscriptions.push(expandAllCommand);

  const collapseAllCommand = vscode.commands.registerCommand(
    "autoTodoManager.collapseAll",
    async () => {
      // Collapse all by setting all items to collapsed state
      // This is a workaround as VSCode doesn't have a direct collapse all API
      vscode.window.showInformationMessage("Use the collapse button in the tree view to collapse items");
    }
  );
  context.subscriptions.push(collapseAllCommand);

  const showCurrentFileOnlyCommand = vscode.commands.registerCommand(
    "autoTodoManager.showCurrentFileOnly",
    () => {
      const currentFilter = treeDataProvider.getFilter();
      const isActive = currentFilter.currentFileOnly;
      treeDataProvider.setFilter({ ...currentFilter, currentFileOnly: !isActive });
      vscode.window.showInformationMessage(
        isActive ? "Showing all files" : "Showing current file only"
      );
    }
  );
  context.subscriptions.push(showCurrentFileOnlyCommand);

  const markAsDoneCommand = vscode.commands.registerCommand(
    "autoTodoManager.markAsDone",
    async (item: vscode.TreeItem) => {
      const todoItem = item as any;
      if (!todoItem.entry) {
        vscode.window.showErrorMessage("Invalid TODO item");
        return;
      }

      const entry = todoItem.entry as TodoEntry;
      const action = await vscode.window.showQuickPick(
        ["Comment out", "Remove line", "Cancel"],
        { placeHolder: "How would you like to mark this TODO as done?" }
      );

      if (!action || action === "Cancel") {
        return;
      }

      try {
        const doc = await vscode.workspace.openTextDocument(entry.fileUri);
        const edit = new vscode.WorkspaceEdit();
        const line = doc.lineAt(entry.line);

        if (action === "Comment out") {
          // Comment out the TODO line
          const commentPrefix = getCommentPrefix(doc.languageId);
          if (commentPrefix) {
            edit.insert(entry.fileUri, new vscode.Position(entry.line, 0), commentPrefix + " ");
          }
        } else if (action === "Remove line") {
          // Remove the entire line
          edit.delete(entry.fileUri, line.rangeIncludingLineBreak);
        }

        await vscode.workspace.applyEdit(edit);
        await doc.save();
        vscode.window.showInformationMessage("TODO marked as done");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to mark TODO as done: ${errorMessage}`);
        outputChannel.appendLine(`Error marking TODO as done: ${errorMessage}`);
      }
    }
  );
  context.subscriptions.push(markAsDoneCommand);

  const copyTodoTextCommand = vscode.commands.registerCommand(
    "autoTodoManager.copyTodoText",
    async (item: vscode.TreeItem) => {
      const todoItem = item as any;
      if (!todoItem.entry) {
        return;
      }

      const entry = todoItem.entry as TodoEntry;
      await vscode.env.clipboard.writeText(entry.text);
      vscode.window.showInformationMessage("TODO text copied to clipboard");
    }
  );
  context.subscriptions.push(copyTodoTextCommand);

  const copyFilePathCommand = vscode.commands.registerCommand(
    "autoTodoManager.copyFilePath",
    async (item: vscode.TreeItem) => {
      const todoItem = item as any;
      if (!todoItem.entry) {
        return;
      }

      const entry = todoItem.entry as TodoEntry;
      const filePath = `${entry.fileUri.fsPath}:${entry.line + 1}`;
      await vscode.env.clipboard.writeText(filePath);
      vscode.window.showInformationMessage("File path copied to clipboard");
    }
  );
  context.subscriptions.push(copyFilePathCommand);

  const revealInExplorerCommand = vscode.commands.registerCommand(
    "autoTodoManager.revealInExplorer",
    async (item: vscode.TreeItem) => {
      const todoItem = item as any;
      if (!todoItem.entry) {
        return;
      }

      const entry = todoItem.entry as TodoEntry;
      await vscode.commands.executeCommand("revealFileInOS", entry.fileUri);
    }
  );
  context.subscriptions.push(revealInExplorerCommand);

  const showStatisticsCommand = vscode.commands.registerCommand(
    "autoTodoManager.showStatistics",
    async () => {
      const entries = treeDataProvider.getAllEntries();
      const stats = calculateStatistics(entries, previousTodoCount);
      
      // Create and show a webview panel with statistics
      const panel = vscode.window.createWebviewPanel(
        "todoStatistics",
        "TODO Statistics Dashboard",
        vscode.ViewColumn.Beside,
        {
          enableScripts: false,
          retainContextWhenHidden: true
        }
      );

      const markdown = formatStatisticsAsMarkdown(stats);
      
      // Convert markdown to HTML (simple conversion)
      const html = convertMarkdownToHtml(markdown);
      
      panel.webview.html = html;
    }
  );
  context.subscriptions.push(showStatisticsCommand);
}

/**
 * Converts markdown to HTML for webview display
 */
function convertMarkdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      htmlLines.push("<br>");
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      htmlLines.push(`<h3>${escapeHtml(line.substring(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      htmlLines.push(`<h2>${escapeHtml(line.substring(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      htmlLines.push(`<h1>${escapeHtml(line.substring(2))}</h1>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      const listItem = processMarkdownInline(line.substring(2));
      htmlLines.push(`<li>${listItem}</li>`);
    } else if (line.match(/^[🥇🥈🥉]\s/) || line.match(/^\d+\.\s/)) {
      // Numbered list items or medal items (for Most TODO-Heavy Files)
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      // Remove medal or number prefix
      const listItem = processMarkdownInline(line.replace(/^[🥇🥈🥉]\s/, "").replace(/^\d+\.\s/, ""));
      htmlLines.push(`<li>${listItem}</li>`);
    } else {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      const processed = processMarkdownInline(line);
      htmlLines.push(`<p>${processed}</p>`);
    }
  }

  if (inList) {
    htmlLines.push("</ul>");
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TODO Statistics</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      line-height: 1.6;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    h1 { 
      color: var(--vscode-textLink-foreground); 
      border-bottom: 2px solid var(--vscode-textLink-foreground); 
      padding-bottom: 10px; 
      margin-bottom: 20px;
    }
    h2 { 
      color: var(--vscode-textLink-foreground); 
      margin-top: 30px; 
      margin-bottom: 15px;
    }
    h3 { 
      color: var(--vscode-textLink-foreground); 
      margin-top: 20px; 
      margin-bottom: 10px;
    }
    code { 
      background-color: var(--vscode-textCodeBlock-background); 
      padding: 2px 6px; 
      border-radius: 3px; 
      font-family: 'Courier New', monospace; 
      font-size: 0.9em;
      white-space: pre;
      display: inline-block;
    }
    .progress-bar {
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      letter-spacing: 1px;
    }
    ul { 
      list-style-type: none; 
      padding-left: 0; 
      margin: 15px 0;
    }
    li { 
      margin: 8px 0; 
      padding: 10px; 
      background-color: var(--vscode-list-inactiveSelectionBackground); 
      border-radius: 4px; 
      border-left: 3px solid var(--vscode-textLink-foreground);
    }
    strong { 
      color: var(--vscode-textLink-foreground); 
      font-weight: 600;
    }
    p { 
      margin: 10px 0; 
    }
  </style>
</head>
<body>
  ${htmlLines.join("\n")}
</body>
</html>`;
}

/**
 * Processes inline markdown (bold, code, etc.)
 * Processes markdown syntax and converts to HTML, escaping text content
 */
function processMarkdownInline(text: string): string {
  // Split text into parts, processing markdown syntax
  const parts: string[] = [];
  let remaining = text;
  let lastIndex = 0;
  
  // Process code blocks first (they can contain other markdown)
  const codeRegex = /`([^`]+)`/g;
  let codeMatch;
  const codeRanges: Array<{ start: number; end: number; content: string }> = [];
  
  while ((codeMatch = codeRegex.exec(text)) !== null) {
    codeRanges.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
      content: codeMatch[1]
    });
  }
  
  // Process bold (but skip if inside code)
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let boldMatch;
  const boldRanges: Array<{ start: number; end: number; content: string }> = [];
  
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    // Check if this bold is inside a code block
    const isInCode = codeRanges.some(
      cr => boldMatch!.index >= cr.start && boldMatch!.index < cr.end
    );
    if (!isInCode) {
      boldRanges.push({
        start: boldMatch.index,
        end: boldMatch.index + boldMatch[0].length,
        content: boldMatch[1]
      });
    }
  }
  
  // Combine and sort all ranges
  const allRanges = [
    ...codeRanges.map(cr => ({ ...cr, type: "code" as const })),
    ...boldRanges.map(br => ({ ...br, type: "bold" as const }))
  ].sort((a, b) => a.start - b.start);
  
  // Build result
  let result = "";
  let currentIndex = 0;
  
  for (const range of allRanges) {
    // Add text before this range (escaped)
    if (range.start > currentIndex) {
      result += escapeHtml(text.substring(currentIndex, range.start));
    }
    
    // Add the formatted content
    if (range.type === "code") {
      result += `<code>${escapeHtml(range.content)}</code>`;
    } else if (range.type === "bold") {
      result += `<strong>${escapeHtml(range.content)}</strong>`;
    }
    
    currentIndex = range.end;
  }
  
  // Add remaining text (escaped)
  if (currentIndex < text.length) {
    result += escapeHtml(text.substring(currentIndex));
  }
  
  return result || escapeHtml(text);
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Gets the comment prefix for a given language.
 */
function getCommentPrefix(languageId: string): string {
  const commentMap: { [key: string]: string } = {
    javascript: "//",
    typescript: "//",
    javascriptreact: "//",
    typescriptreact: "//",
    java: "//",
    csharp: "//",
    cpp: "//",
    c: "//",
    go: "//",
    rust: "//",
    swift: "//",
    kotlin: "//",
    dart: "//",
    python: "#",
    ruby: "#",
    shellscript: "#",
    yaml: "#",
    html: "<!--",
    xml: "<!--",
    vue: "//",
    css: "/*",
    scss: "/*",
    less: "/*",
  };
  return commentMap[languageId] || "//";
}

/**
 * Sets up file watchers with debouncing.
 */
function setupFileWatchers(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("autoTodoManager");
  const autoScanOnSave = config.get<boolean>("autoScanOnSave", true);
  const refreshInterval = config.get<number>("refreshInterval", 500);

  if (!autoScanOnSave) {
    return;
  }

  const debouncedScan = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      scanWorkspaceAndUpdate();
    }, refreshInterval);
  };

  const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (shouldScanFile(doc.uri)) {
      // Invalidate cache for this file
      fileCache.delete(doc.uri.toString());
      debouncedScan();
    }
  });
  context.subscriptions.push(saveListener);

  const createListener = vscode.workspace.onDidCreateFiles(async (e) => {
    e.files.forEach(uri => {
      if (shouldScanFile(uri)) {
        fileCache.delete(uri.toString());
      }
    });
    debouncedScan();
  });
  context.subscriptions.push(createListener);

  const deleteListener = vscode.workspace.onDidDeleteFiles(async (e) => {
    e.files.forEach(uri => fileCache.delete(uri.toString()));
    debouncedScan();
  });
  context.subscriptions.push(deleteListener);
}

/**
 * Checks if a file should be scanned based on configuration.
 */
function shouldScanFile(uri: vscode.Uri): boolean {
  const config = vscode.workspace.getConfiguration("autoTodoManager");
  const globPatterns = config.get<string[]>("globPatterns") || ["**/*.{ts,tsx,js,jsx}"];
  
  const fileName = uri.fsPath;
  return globPatterns.some(pattern => {
    // Simple pattern matching (VSCode's findFiles does the real work)
    return fileName.match(convertGlobToRegex(pattern));
  });
}

/**
 * Converts a glob pattern to a regex (simplified version).
 */
function convertGlobToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*");
  return new RegExp(escaped + "$");
}

/**
 * Updates tree view settings from configuration.
 */
function updateTreeViewSettings() {
  const config = vscode.workspace.getConfiguration("autoTodoManager");
  const groupByType = config.get<boolean>("groupByType", false);
  const sortOrder = config.get<"file" | "type" | "line">("sortOrder", "file");
  
  treeDataProvider.setGroupByType(groupByType);
  treeDataProvider.setSortOrder(sortOrder);
}

/**
 * Updates the Activity Bar visibility based on configuration.
 */
function updateActivityBarVisibility() {
  const config = vscode.workspace.getConfiguration("autoTodoManager");
  const showActivityBar = config.get<boolean>("showActivityBar", true);
  
  outputChannel.appendLine(`Activity Bar visibility: ${showActivityBar ? "enabled" : "disabled"}`);
}

/**
 * Updates the status bar with TODO count
 */
function updateStatusBar(count: number) {
  if (statusBarItem) {
    const entries = treeDataProvider.getAllEntries();
    const stats = calculateStatistics(entries, previousTodoCount);
    const text = formatStatisticsAsText(stats);
    
    statusBarItem.text = `$(checklist) ${count} TODO${count === 1 ? "" : "s"}`;
    statusBarItem.tooltip = `Auto TODO Manager: ${text}\nClick to view statistics dashboard`;
    
    // Color code based on count
    if (count === 0) {
      statusBarItem.backgroundColor = undefined;
    } else if (count < 10) {
      statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    } else {
      statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    }
  }
}

/**
 * Deactivates the extension.
 * Called when the extension is deactivated.
 */
export function deactivate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
}

/**
 * Calculates a hash for a file to detect changes.
 */
async function calculateFileHash(uri: vscode.Uri): Promise<string> {
  try {
    const stats = await fs.promises.stat(uri.fsPath);
    const content = await fs.promises.readFile(uri.fsPath);
    const hash = crypto.createHash("md5")
      .update(content)
      .update(stats.mtimeMs.toString())
      .digest("hex");
    return hash;
  } catch (err) {
    // If we can't read the file, return empty hash to force rescan
    return "";
  }
}

/**
 * Scans the entire workspace for TODO comments and updates the tree view.
 * 
 * Reads configuration for keywords and file patterns, then searches all matching files
 * for TODO-style comments. Updates the tree view with the results.
 * Uses incremental scanning with caching for better performance.
 */
async function scanWorkspaceAndUpdate() {
  try {
    const config = vscode.workspace.getConfiguration("autoTodoManager");
    const keywords = config.get<string[]>("keywords") || ["TODO"];
    const globPatterns = config.get<string[]>("globPatterns") || ["**/*.{ts,tsx,js,jsx}"];
    const maxFileSize = config.get<number>("maxFileSize", 5242880); // 5MB default
    const showProgress = config.get<boolean>("showProgress", true);
    const excludePatterns = config.get<string[]>("excludePatterns") || [];

    outputChannel.appendLine(`Scanning workspace for TODOs with keywords: ${keywords.join(", ")}`);
    
    // Build exclude pattern
    const defaultExclude = "**/{node_modules,dist,build,.git,.vscode-test,venv,env,.venv,__pycache__,target,bin,obj,.gradle,.idea,.vscode,coverage,.nyc_output,out,.next,.nuxt,.cache,lib,libs,vendor,DerivedData,Pods,.pytest_cache,.mypy_cache,.tox,.eggs,.sass-cache,.parcel-cache,.turbo,.vercel,.serverless}/**";
    const customExclude = excludePatterns.length > 0 ? excludePatterns.join(",") : "";
    const excludePattern = customExclude ? `${defaultExclude},${customExclude}` : defaultExclude;

    const entries: TodoEntry[] = [];
    let totalFiles = 0;
    let scannedFiles = 0;
    let cachedFiles = 0;
    let skippedFiles = 0;

    // Show progress if enabled
    if (showProgress) {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: "Scanning for TODOs",
          cancellable: false
        },
        async (progress) => {
          progressIndicator = progress;
          
          for (const pattern of globPatterns) {
            try {
              progress.report({ message: `Scanning pattern: ${pattern}` });
              const files = await vscode.workspace.findFiles(pattern, excludePattern);
              totalFiles += files.length;
              
              for (const uri of files) {
                try {
                  // Check file size
                  const stats = await fs.promises.stat(uri.fsPath).catch(() => null);
                  if (stats && stats.size > maxFileSize) {
                    skippedFiles++;
                    outputChannel.appendLine(`Skipping large file: ${uri.fsPath} (${stats.size} bytes)`);
                    continue;
                  }

                  // Check cache
                  const fileKey = uri.toString();
                  const currentHash = await calculateFileHash(uri);
                  const cached = fileCache.get(fileKey);

                  if (cached && cached.hash === currentHash) {
                    // Use cached entries
                    entries.push(...cached.entries);
                    cachedFiles++;
                  } else {
                    // Scan file
                    const doc = await vscode.workspace.openTextDocument(uri);
                    const fileEntries: TodoEntry[] = [];
                    
                    for (let line = 0; line < doc.lineCount; line++) {
                      const lineText = doc.lineAt(line).text;
                      const match = matchLine(lineText, keywords);
                      if (match) {
                        fileEntries.push({
                          kind: match.kind,
                          text: match.text,
                          fileUri: uri,
                          line,
                          lineText
                        });
                      }
                    }

                    // Update cache
                    fileCache.set(fileKey, {
                      hash: currentHash,
                      entries: fileEntries,
                      timestamp: Date.now()
                    });

                    entries.push(...fileEntries);
                    scannedFiles++;
                  }

                  // Update progress
                  scannedFiles++;
                  progress.report({
                    message: `Scanned ${scannedFiles}/${totalFiles} files`,
                    increment: (1 / totalFiles) * 100
                  });
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : String(err);
                  outputChannel.appendLine(`Error reading file ${uri.fsPath}: ${errorMessage}`);
                  
                  // Retry mechanism for permission errors
                  if (errorMessage.includes("EACCES") || errorMessage.includes("permission")) {
                    outputChannel.appendLine(`Permission error for ${uri.fsPath}, will retry on next scan`);
                  }
                }
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              outputChannel.appendLine(`Error processing pattern ${pattern}: ${errorMessage}`);
            }
          }
        }
      );
    } else {
      // Scan without progress indicator
      for (const pattern of globPatterns) {
        try {
          const files = await vscode.workspace.findFiles(pattern, excludePattern);
          totalFiles += files.length;
          
          for (const uri of files) {
            try {
              const stats = await fs.promises.stat(uri.fsPath).catch(() => null);
              if (stats && stats.size > maxFileSize) {
                skippedFiles++;
                continue;
              }

              const fileKey = uri.toString();
              const currentHash = await calculateFileHash(uri);
              const cached = fileCache.get(fileKey);

              if (cached && cached.hash === currentHash) {
                entries.push(...cached.entries);
                cachedFiles++;
              } else {
                const doc = await vscode.workspace.openTextDocument(uri);
                const fileEntries: TodoEntry[] = [];
                
                for (let line = 0; line < doc.lineCount; line++) {
                  const lineText = doc.lineAt(line).text;
                  const match = matchLine(lineText, keywords);
                  if (match) {
                    fileEntries.push({
                      kind: match.kind,
                      text: match.text,
                      fileUri: uri,
                      line,
                      lineText
                    });
                  }
                }

                fileCache.set(fileKey, {
                  hash: currentHash,
                  entries: fileEntries,
                  timestamp: Date.now()
                });

                entries.push(...fileEntries);
                scannedFiles++;
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              outputChannel.appendLine(`Error reading file ${uri.fsPath}: ${errorMessage}`);
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          outputChannel.appendLine(`Error processing pattern ${pattern}: ${errorMessage}`);
        }
      }
    }

    outputChannel.appendLine(
      `Scan complete: Found ${entries.length} TODO entries in ${scannedFiles} files ` +
      `(${cachedFiles} from cache, ${skippedFiles} skipped)`
    );
    
    treeDataProvider.setEntries(entries);
    updateTreeViewSettings();
    
    // Update status bar and statistics
    updateStatusBar(entries.length);
    previousTodoCount = entries.length;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`Error during workspace scan: ${errorMessage}`);
    vscode.window.showErrorMessage(`Auto TODO Manager: Error scanning workspace - ${errorMessage}`);
  }
}

/**
 * Matches a line of code against the configured TODO keywords.
 * 
 * @param line - The line of code to check
 * @param keywords - Array of keywords to search for (e.g., ["TODO", "FIXME"])
 * @returns An object with the matched keyword and extracted text, or undefined if no match
 * 
 * @example
 * matchLine("// TODO: Fix this bug", ["TODO", "FIXME"])
 * // Returns: { kind: "TODO", text: "Fix this bug" }
 */
export function matchLine(
  line: string,
  keywords: string[]
): { kind: string; text: string } | undefined {
  for (const key of keywords) {
    const index = line.indexOf(key);
    if (index >= 0) {
      const after = line.slice(index + key.length);
      const cleaned = after.replace(/^[:\- ]+/, "");
      return {
        kind: key,
        text: cleaned
      };
    }
  }
  return undefined;
}
