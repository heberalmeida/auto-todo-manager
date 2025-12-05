import * as vscode from "vscode";

/**
 * Represents the type of TODO comment (TODO, FIXME, BUG, HACK, NOTE, or custom keyword).
 */
export type TodoKind = "TODO" | "FIXME" | "BUG" | "HACK" | "NOTE" | string;

/**
 * Filter options for TODO entries
 */
export interface TodoFilter {
  keyword?: string;
  searchText?: string;
  filePath?: string;
  currentFileOnly?: boolean;
}

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
    this.contextValue = "fileGroup";
  }
}

/**
 * Represents a TODO type group in the tree view.
 * Groups multiple TODO entries by their type (TODO, FIXME, etc.).
 */
class TypeGroupItem extends vscode.TreeItem {
  /**
   * Creates a new type group item.
   * 
   * @param kind - The TODO type (TODO, FIXME, etc.)
   * @param count - The number of TODOs of this type
   */
  constructor(public readonly kind: TodoKind, public readonly count: number) {
    super(
      `${kind} (${count})`,
      vscode.TreeItemCollapsibleState.Expanded
    );
    this.iconPath = new vscode.ThemeIcon("tag");
    this.contextValue = "typeGroup";
    
    // Color-code by TODO type
    switch (kind.toUpperCase()) {
      case "TODO":
        this.description = "Task to do";
        break;
      case "FIXME":
        this.description = "Needs fixing";
        break;
      case "BUG":
        this.description = "Known bug";
        break;
      case "HACK":
        this.description = "Temporary solution";
        break;
      case "NOTE":
        this.description = "Important note";
        break;
      default:
        this.description = "Custom keyword";
    }
  }
}

/**
 * Root item showing total TODO count
 */
class RootItem extends vscode.TreeItem {
  constructor(public readonly count: number) {
    super(
      count === 0 ? "No TODOs found" : `${count} TODO${count === 1 ? "" : "s"} found`,
      vscode.TreeItemCollapsibleState.None
    );
    this.iconPath = new vscode.ThemeIcon("checklist");
    this.contextValue = "root";
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
  
  /** Current filter applied to entries */
  private filter: TodoFilter = {};
  
  /**
   * Gets the current filter.
   */
  getFilter(): TodoFilter {
    return { ...this.filter };
  }
  
  /** Group by type instead of by file */
  private groupByType: boolean = false;
  
  /** Sort order for entries */
  private sortOrder: "file" | "type" | "line" = "file";
  
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
   * Sets the filter for TODO entries.
   * 
   * @param filter - The filter to apply
   */
  setFilter(filter: TodoFilter): void {
    this.filter = filter;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Sets whether to group by type or by file.
   * 
   * @param groupByType - True to group by type, false to group by file
   */
  setGroupByType(groupByType: boolean): void {
    this.groupByType = groupByType;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Sets the sort order for TODO entries.
   * 
   * @param sortOrder - The sort order: 'file', 'type', or 'line'
   */
  setSortOrder(sortOrder: "file" | "type" | "line"): void {
    this.sortOrder = sortOrder;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Gets the filtered and sorted entries.
   * 
   * @returns Filtered and sorted TODO entries
   */
  private getFilteredEntries(): TodoEntry[] {
    let filtered = [...this.entries];

    // Apply filters
    if (this.filter.keyword) {
      filtered = filtered.filter(e => e.kind.toUpperCase() === this.filter.keyword!.toUpperCase());
    }

    if (this.filter.searchText) {
      const searchLower = this.filter.searchText.toLowerCase();
      filtered = filtered.filter(e => 
        e.text.toLowerCase().includes(searchLower) ||
        e.lineText.toLowerCase().includes(searchLower)
      );
    }

    if (this.filter.filePath) {
      const pathLower = this.filter.filePath.toLowerCase();
      filtered = filtered.filter(e => 
        e.fileUri.fsPath.toLowerCase().includes(pathLower)
      );
    }

    if (this.filter.currentFileOnly) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const activeUri = activeEditor.document.uri.toString();
        filtered = filtered.filter(e => e.fileUri.toString() === activeUri);
      } else {
        filtered = [];
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (this.sortOrder) {
        case "type":
          const typeCompare = a.kind.localeCompare(b.kind);
          if (typeCompare !== 0) return typeCompare;
          return a.fileUri.fsPath.localeCompare(b.fileUri.fsPath);
        case "line":
          const fileCompare = a.fileUri.fsPath.localeCompare(b.fileUri.fsPath);
          if (fileCompare !== 0) return fileCompare;
          return a.line - b.line;
        case "file":
        default:
          const pathCompare = a.fileUri.fsPath.localeCompare(b.fileUri.fsPath);
          if (pathCompare !== 0) return pathCompare;
          return a.line - b.line;
      }
    });

    return filtered;
  }

  /**
   * Gets all unique TODO types from entries.
   * 
   * @returns Array of unique TODO types
   */
  getAvailableTypes(): string[] {
    const types = new Set<string>();
    this.entries.forEach(e => types.add(e.kind));
    return Array.from(types).sort();
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
   * If no element is provided, returns the root level items (file groups or type groups).
   * If a FileGroupItem or TypeGroupItem is provided, returns the TODO items for that group.
   * 
   * @param element - The parent element (optional for root)
   * @returns An array of child tree items
   */
  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    const filteredEntries = this.getFilteredEntries();

    if (!element) {
      // Root level - show count and groups
      if (filteredEntries.length === 0) {
        return [new RootItem(0)];
      }

      if (this.groupByType) {
        // Group by type
        const byType = new Map<string, TodoEntry[]>();
        for (const entry of filteredEntries) {
          const existing = byType.get(entry.kind);
          if (existing) {
            existing.push(entry);
          } else {
            byType.set(entry.kind, [entry]);
          }
        }
        return Array.from(byType.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([kind, list]) => new TypeGroupItem(kind, list.length));
      } else {
        // Group by file
        const byFile = new Map<string, { uri: vscode.Uri; list: TodoEntry[] }>();
        for (const entry of filteredEntries) {
          const key = entry.fileUri.toString();
          const existing = byFile.get(key);
          if (existing) {
            existing.list.push(entry);
          } else {
            byFile.set(key, { uri: entry.fileUri, list: [entry] });
          }
        }
        return Array.from(byFile.values())
          .sort((a, b) => a.uri.fsPath.localeCompare(b.uri.fsPath))
          .map(f => new FileGroupItem(f.uri, f.list.length));
      }
    }

    if (element instanceof FileGroupItem) {
      const fileEntries = filteredEntries.filter(
        e => e.fileUri.toString() === element.uri.toString()
      );
      return fileEntries.map(e => new TodoTreeItem(e));
    }

    if (element instanceof TypeGroupItem) {
      const typeEntries = filteredEntries.filter(
        e => e.kind === element.kind
      );
      return typeEntries.map(e => new TodoTreeItem(e));
    }

    return [];
  }

  /**
   * Gets the total count of TODO entries (after filtering).
   * 
   * @returns Total count of filtered TODO entries
   */
  getTotalCount(): number {
    return this.getFilteredEntries().length;
  }

  /**
   * Gets all TODO entries (without filtering).
   * Useful for statistics calculation.
   * 
   * @returns All TODO entries
   */
  getAllEntries(): TodoEntry[] {
    return [...this.entries];
  }
}
