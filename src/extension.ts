import * as vscode from "vscode";
import { TodoEntry, TodoTreeDataProvider } from "./todoTree";

/** The tree data provider instance for the TODO view */
let treeDataProvider: TodoTreeDataProvider;

/** Output channel for logging extension activities and errors */
let outputChannel: vscode.OutputChannel;

/** The tree view instance */
let treeView: vscode.TreeView<vscode.TreeItem>;

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

  // Update visibility based on configuration
  updateActivityBarVisibility();

  // Listen for configuration changes
  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("autoTodoManager.showActivityBar")) {
      updateActivityBarVisibility();
    }
  });
  context.subscriptions.push(configListener);

  const refreshCommand = vscode.commands.registerCommand(
    "autoTodoManager.refresh",
    async () => {
      await scanWorkspaceAndUpdate();
    }
  );
  context.subscriptions.push(refreshCommand);

  const toggleActivityBarCommand = vscode.commands.registerCommand(
    "autoTodoManager.toggleActivityBar",
    async () => {
      // Show instructions to the user
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

  const saveListener = vscode.workspace.onDidSaveTextDocument(async () => {
    await scanWorkspaceAndUpdate();
  });
  const createListener = vscode.workspace.onDidCreateFiles(async () => {
    await scanWorkspaceAndUpdate();
  });
  const deleteListener = vscode.workspace.onDidDeleteFiles(async () => {
    await scanWorkspaceAndUpdate();
  });

  context.subscriptions.push(saveListener, createListener, deleteListener);

  scanWorkspaceAndUpdate();
}

/**
 * Updates the Activity Bar visibility based on configuration.
 */
function updateActivityBarVisibility() {
  const config = vscode.workspace.getConfiguration("autoTodoManager");
  const showActivityBar = config.get<boolean>("showActivityBar", true);
  
  // The visibility is controlled by the "when" clause in package.json
  // This function can be used for additional logic if needed
  outputChannel.appendLine(`Activity Bar visibility: ${showActivityBar ? "enabled" : "disabled"}`);
}

/**
 * Deactivates the extension.
 * Called when the extension is deactivated.
 */
export function deactivate() {}

/**
 * Scans the entire workspace for TODO comments and updates the tree view.
 * 
 * Reads configuration for keywords and file patterns, then searches all matching files
 * for TODO-style comments. Updates the tree view with the results.
 */
async function scanWorkspaceAndUpdate() {
  try {
    const config = vscode.workspace.getConfiguration("autoTodoManager");
    const keywords = config.get<string[]>("keywords") || ["TODO"];
    const globPatterns =
      config.get<string[]>("globPatterns") || ["**/*.{ts,tsx,js,jsx}"];

    outputChannel.appendLine(`Scanning workspace for TODOs with keywords: ${keywords.join(", ")}`);
    
    const entries: TodoEntry[] = [];
    const excludePattern = "**/{node_modules,dist,build,.git,.vscode-test}/**";

    for (const pattern of globPatterns) {
      try {
        const files = await vscode.workspace.findFiles(pattern, excludePattern);
        outputChannel.appendLine(`Found ${files.length} files matching pattern: ${pattern}`);
        
        for (const uri of files) {
          try {
            const doc = await vscode.workspace.openTextDocument(uri);
            for (let line = 0; line < doc.lineCount; line++) {
              const lineText = doc.lineAt(line).text;
              const match = matchLine(lineText, keywords);
              if (match) {
                entries.push({
                  kind: match.kind,
                  text: match.text,
                  fileUri: uri,
                  line,
                  lineText
                });
              }
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

    outputChannel.appendLine(`Found ${entries.length} TODO entries`);
    treeDataProvider.setEntries(entries);
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
function matchLine(
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
