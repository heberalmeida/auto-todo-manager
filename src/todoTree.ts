import * as vscode from "vscode";

/**
 * Represents the type of TODO comment (TODO, FIXME, BUG, HACK, NOTE, or custom keyword).
 */
export type TodoKind = "TODO" | "FIXME" | "BUG" | "HACK" | "NOTE" | string;

/**
 * Represents a single TODO entry found in the workspace.
 * 
 * @property kind - The type of TODO (e.g., "TODO", "FIXME", "BUG")
 * @property text - The text content after the keyword (e.g., "Fix authentication bug")
 * @property fileUri - The URI of the file containing this TODO
 * @property line - The zero-based line number where the TODO was found
 * @property lineText - The full text of the line containing the TODO
 */
export interface TodoEntry {
  kind: TodoKind;
  text: string;
  fileUri: vscode.Uri;
  line: number;
  lineText: string;
}

/**
 * Represents a TODO item in the tree view.
 * Each item corresponds to a single TODO entry and can be clicked to navigate to its location.
 */
export class TodoTreeItem extends vscode.TreeItem {
  /** The TODO entry this tree item represents */
  public readonly entry: TodoEntry;

  /**
   * Creates a new TODO tree item.
   * 
   * @param entry - The TODO entry to display in the tree
   */
  constructor(entry: TodoEntry) {
    const label = entry.text.trim() || entry.lineText.trim();
    super(label, vscode.TreeItemCollapsibleState.None);
    this.entry = entry;
    this.tooltip = `${entry.kind} • ${entry.fileUri.fsPath}:${entry.line + 1}`;
    this.description = `${entry.fileUri.fsPath.split("/").pop()}:${entry.line + 1}`;
    this.command = {
      command: "vscode.open",
      title: "Open TODO",
      arguments: [
        entry.fileUri,
        {
          selection: new vscode.Range(entry.line, 0, entry.line, 0)
        }
      ]
    };
    this.iconPath = new vscode.ThemeIcon("checklist");
    this.contextValue = "todoItem";
  }
}

/**
 * Represents a file group in the tree view.
 * Groups multiple TODO entries that belong to the same file.
 */
class FileGroupItem extends vscode.TreeItem {
  /**
   * Creates a new file group item.
   * 
   * @param uri - The URI of the file containing TODOs
   * @param count - The number of TODOs in this file
   */
  constructor(public readonly uri: vscode.Uri, public readonly count: number) {
    super(
      `${uri.fsPath.split("/").pop()} (${count})`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    this.resourceUri = uri;
    this.iconPath = vscode.ThemeIcon.File;
  }
}

/**
 * Provides data for the TODO tree view.
 * Manages the hierarchical structure of files and their TODO entries.
 */
export class TodoTreeDataProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  /** The list of all TODO entries found in the workspace */
  private entries: TodoEntry[] = [];
  
  /** Event emitter for tree data changes */
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined | null | void
  >();

  /** Event fired when the tree data changes */
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /**
   * Updates the TODO entries and refreshes the tree view.
   * 
   * @param entries - The new list of TODO entries to display
   */
  setEntries(entries: TodoEntry[]): void {
    this.entries = entries;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Returns the tree item for the given element.
   * 
   * @param element - The tree item element
   * @returns The tree item itself
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Returns the children of the given element.
   * If no element is provided, returns the root level items (file groups).
   * If a FileGroupItem is provided, returns the TODO items for that file.
   * 
   * @param element - The parent element (optional for root)
   * @returns An array of child tree items
   */
  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!element) {
      const byFile = new Map<string, { uri: vscode.Uri; list: TodoEntry[] }>();
      for (const entry of this.entries) {
        const key = entry.fileUri.toString();
        const existing = byFile.get(key);
        if (existing) {
          existing.list.push(entry);
        } else {
          byFile.set(key, { uri: entry.fileUri, list: [entry] });
        }
      }
      return Array.from(byFile.values()).map(
        f => new FileGroupItem(f.uri, f.list.length)
      );
    }

    if (element instanceof FileGroupItem) {
      const fileEntries = this.entries.filter(
        e => e.fileUri.toString() === element.uri.toString()
      );
      return fileEntries.map(e => new TodoTreeItem(e));
    }

    return [];
  }
}
