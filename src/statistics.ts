import * as vscode from "vscode";
import { TodoEntry, TodoKind } from "./todoTree";

/**
 * Statistics about TODO entries in the workspace
 */
export interface TodoStatistics {
  total: number;
  byType: Map<TodoKind, number>;
  byFile: Map<string, { count: number; uri: vscode.Uri }>;
  mostHeavyFiles: Array<{ uri: vscode.Uri; count: number; path: string }>;
  trend: {
    previousCount: number;
    currentCount: number;
    change: number;
    changePercent: number;
  };
}

/**
 * Calculates statistics from TODO entries
 */
export function calculateStatistics(
  entries: TodoEntry[],
  previousCount: number = 0
): TodoStatistics {
  const byType = new Map<TodoKind, number>();
  const byFile = new Map<string, { count: number; uri: vscode.Uri }>();

  // Count by type and by file
  for (const entry of entries) {
    // Count by type
    const typeCount = byType.get(entry.kind) || 0;
    byType.set(entry.kind, typeCount + 1);

    // Count by file
    const fileKey = entry.fileUri.toString();
    const fileData = byFile.get(fileKey);
    if (fileData) {
      fileData.count++;
    } else {
      byFile.set(fileKey, { count: 1, uri: entry.fileUri });
    }
  }

  // Get most TODO-heavy files (top 10)
  const mostHeavyFiles = Array.from(byFile.entries())
    .map(([key, data]) => ({
      uri: data.uri,
      count: data.count,
      path: data.uri.fsPath
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate trend
  const change = entries.length - previousCount;
  const changePercent =
    previousCount > 0 ? (change / previousCount) * 100 : 0;

  return {
    total: entries.length,
    byType,
    byFile,
    mostHeavyFiles,
    trend: {
      previousCount,
      currentCount: entries.length,
      change,
      changePercent
    }
  };
}

/**
 * Formats statistics as a markdown string for display
 */
export function formatStatisticsAsMarkdown(stats: TodoStatistics): string {
  const lines: string[] = [];

  // Header
  lines.push("# 📊 TODO Statistics Dashboard\n");

  // Total count
  lines.push("## Total TODOs");
  lines.push(`**${stats.total}** TODO${stats.total === 1 ? "" : "s"} found\n`);

  // Trend
  if (stats.trend.previousCount > 0) {
    const trendIcon =
      stats.trend.change > 0 ? "📈" : stats.trend.change < 0 ? "📉" : "➡️";
    const trendText =
      stats.trend.change > 0
        ? `+${stats.trend.change}`
        : stats.trend.change.toString();
    lines.push(
      `**Trend:** ${trendIcon} ${trendText} (${stats.trend.changePercent.toFixed(1)}%)\n`
    );
  }

  // Breakdown by type
  if (stats.byType.size > 0) {
    lines.push("## Breakdown by Type\n");
    const sortedTypes = Array.from(stats.byType.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const maxCount = Math.max(...sortedTypes.map(([, count]) => count));

    for (const [type, count] of sortedTypes) {
      const percentage = ((count / stats.total) * 100).toFixed(1);
      const barLength = Math.round((count / maxCount) * 20);
      const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);
      lines.push(
        `- **${type}**: ${count} (${percentage}%) \`${bar}\``
      );
    }
    lines.push("");
  }

  // Breakdown by file
  if (stats.byFile.size > 0) {
    lines.push("## Breakdown by File\n");
    lines.push(`**${stats.byFile.size}** file${stats.byFile.size === 1 ? "" : "s"} with TODOs\n`);
    
    const sortedFiles = Array.from(stats.byFile.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20); // Top 20 files

    for (const [, data] of sortedFiles) {
      const fileName = data.uri.fsPath.split("/").pop() || data.uri.fsPath;
      lines.push(`- \`${fileName}\`: ${data.count} TODO${data.count === 1 ? "" : "s"}`);
    }
    lines.push("");
  }

  // Most TODO-heavy files
  if (stats.mostHeavyFiles.length > 0) {
    lines.push("## 🔝 Most TODO-Heavy Files\n");
    for (let i = 0; i < stats.mostHeavyFiles.length; i++) {
      const file = stats.mostHeavyFiles[i];
      const fileName = file.path.split("/").pop() || file.path;
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      lines.push(
        `${medal} \`${fileName}\` - **${file.count}** TODO${file.count === 1 ? "" : "s"}`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Formats statistics as a simple text summary
 */
export function formatStatisticsAsText(stats: TodoStatistics): string {
  const parts: string[] = [];

  parts.push(`Total: ${stats.total}`);

  if (stats.byType.size > 0) {
    const typeParts: string[] = [];
    const sortedTypes = Array.from(stats.byType.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    for (const [type, count] of sortedTypes) {
      typeParts.push(`${type}:${count}`);
    }
    parts.push(`Types: ${typeParts.join(", ")}`);
  }

  return parts.join(" | ");
}

