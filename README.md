# Auto TODO Manager

Effortlessly detect, organize, and track all TODO comments in your project — fully automated.

Auto TODO Manager scans your entire workspace for TODO-style comments (TODO, FIXME, BUG, HACK, NOTE), builds a clean sidebar tree, and keeps everything up-to-date as you work.

Perfect for developers who want a clean, centralized, and automated way to track pending tasks.

---

*The sidebar view showing all TODOs organized by file*

![Extension Icon](src/images/auto-todo-manager.png)

---

## Features

- **Automatic detection** of TODO, FIXME, BUG, HACK, NOTE  
- **Tree view sidebar** grouped by files  
- **Live updates** on file save, create, or delete  
- **Quick navigation** — click any TODO to jump to the exact line  
- **Configurable keywords** and file patterns  
- **Zero configuration required** — works out of the box  
- Future: auto-warning for outdated TODOs  
- Future: assign TODOs to team members  
- Future: daily reminders panel  

---

## Quick Start

1. **Install the extension** from the VSCode marketplace
2. **Open your workspace** — the extension automatically scans for TODOs
3. **View TODOs** in the sidebar under "Auto TODOs"
4. **Click any TODO** to navigate directly to its location

---

## Usage Examples

### Basic TODO Comments

The extension detects various comment formats:

```typescript
// TODO: Refactor this function to use async/await
function fetchData() {
  // implementation
}

// FIXME: Memory leak in event listeners
window.addEventListener('click', handler);

// BUG: This doesn't handle null values correctly
const result = data.map(item => item.value);

// HACK: Temporary workaround for API limitation
const response = await fetch(url).catch(() => mockData);

// NOTE: This algorithm is O(n log n) complexity
function sortArray(arr) {
  // implementation
}
```

### Vue Component Example

The extension works with Vue single-file components:

```vue
<template>
  <!-- TODO: Add loading state for async data -->
  <div v-if="loading">Loading...</div>
</template>

<script>
export default {
  // FIXME: This should use computed property instead of method call
  methods: {
    // BUG: This doesn't handle null values correctly
    processData(data) {
      return data.map(item => item.value);
    }
  }
}
</script>

<style scoped>
/* HACK: Temporary workaround for styling issue */
.container {
  padding: 20px;
}
</style>
```

### Supported Comment Styles

Works with different comment syntaxes:

```javascript
// TODO: Single line comment
/* TODO: Block comment */
# TODO: Python/Script comment
<!-- TODO: HTML comment -->
```

### Custom Keywords

You can configure custom keywords in your VSCode settings:

```json
{
  "autoTodoManager.keywords": ["TODO", "FIXME", "BUG", "HACK", "NOTE", "REVIEW", "OPTIMIZE"]
}
```

### Custom File Patterns

Configure which files to scan:

```json
{
  "autoTodoManager.globPatterns": [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.vue",
    "**/*.py",
    "**/*.go"
  ]
}
```

---

## Configuration

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `autoTodoManager.keywords` | `string[]` | `["TODO", "FIXME", "BUG", "HACK", "NOTE"]` | Keywords used to detect reminders in code |
| `autoTodoManager.globPatterns` | `string[]` | `["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", ...]` | File patterns scanned for TODOs |

### Commands

- **Auto TODO Manager: Rescan TODOs** — Manually refresh the TODO list
- **Auto TODO Manager: Export to Markdown** — Export TODOs to Markdown file
- **Auto TODO Manager: Export to JSON** — Export TODOs to JSON file
- **Auto TODO Manager: Export to CSV** — Export TODOs to CSV file
- **Auto TODO Manager: Copy TODOs to Clipboard** — Copy TODOs as formatted text to clipboard
- **Auto TODO Manager: Show Statistics Dashboard** — Open statistics dashboard

#### Custom Keyboard Shortcuts

You can add custom keyboard shortcuts for export commands. Open your keybindings file (`Ctrl+Shift+P` → "Preferences: Open Keyboard Shortcuts (JSON)") and add:

```json
{
  "key": "ctrl+alt+e",
  "command": "autoTodoManager.exportToMarkdown"
},
{
  "key": "ctrl+alt+j",
  "command": "autoTodoManager.exportToJSON"
},
{
  "key": "ctrl+alt+c",
  "command": "autoTodoManager.exportToCSV"
},
{
  "key": "ctrl+alt+v",
  "command": "autoTodoManager.copyToClipboard"
}
```

---

## Use Cases

### Personal Projects
Track your own pending tasks and improvements as you code.

### Team Collaboration
Share TODO comments in code reviews and track technical debt.

### Code Reviews
Quickly identify areas that need attention during code reviews.

### Technical Debt Management
Organize and prioritize technical improvements across your codebase.

---

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/heberalmeida/auto-todo-manager.git
cd auto-todo-manager

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch
```

### Project Structure

```
auto-todo-manager/
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── todoTree.ts       # Tree view data provider
│   └── images/           # Extension icons and screenshots
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- Built with [VSCode Extension API](https://code.visualstudio.com/api)
- Inspired by the need for better TODO management in development workflows

---

## Roadmap

This roadmap outlines the planned features and improvements for Auto TODO Manager. Features are organized by priority and expected release timeline.

### ✅ Completed (v0.0.3)
*Recently implemented features*

- [x] **Multi-language Support**
  - [x] Enhanced exclude patterns for multiple programming languages
  - [x] Support for JavaScript/TypeScript, Python, Java, Rust, C#/.NET, PHP, iOS/macOS projects
  - [x] Comprehensive exclusion of dependency and build directories

---

### 🎯 Short-term (v0.1.x - v0.2.x)
*Core improvements and essential features - Q1 2025*

**Priority: High | Estimated: 2-3 months**

#### Performance & Reliability
- [x] **Performance Optimization** 🔥 *High Priority*
  - [x] Incremental scanning (only scan changed files)
  - [x] Debouncing for file change events (prevent excessive scans)
  - [x] Progress indicator during large scans
  - [x] Cache scan results with file hash validation
  - [ ] Background scanning for large workspaces *(Progress is async, but not true background workers)*

- [x] **Better Error Handling**
  - [x] User-friendly error messages
  - [x] Graceful handling of permission errors
  - [x] Retry mechanism for failed file reads
  - [x] Error reporting to output channel

#### User Experience
- [x] **Filtering & Search** 🔥 *High Priority*
  - [x] Filter by keyword type (TODO, FIXME, BUG, etc.)
  - [x] Search box to filter by text content *(Command: "Search TODOs by Text")*
  - [x] "Show only in current file" option
  - [x] Filter by file path/pattern *(Code implemented, can be added via filter API)*
  - [ ] Quick filter buttons in toolbar *(Commands available, toolbar buttons pending)*

- [x] **Enhanced Tree View**
  - [x] Show TODO count in root node
  - [x] Group by TODO type as alternative view mode
  - [x] Expand/collapse all buttons *(Commands available)*
  - [x] Color-code by TODO type
  - [x] Sort options (by file, by type, by line) *(Age sorting pending)*
  - [x] Empty state messages with helpful tips

- [x] **Context Menu Actions**
  - [x] "Mark as Done" - comment out or remove TODO
  - [x] "Copy TODO text" - copy to clipboard
  - [x] "Copy file path" - copy file path with line number
  - [x] "Reveal in Explorer" - show file in file explorer
  - [ ] "Open in new editor" - open file in split view *(Clicking TODO already opens file)*

#### Configuration
- [x] **Settings Improvements**
  - [x] Configurable exclude patterns (beyond defaults)
  - [x] Set maximum file size to scan
  - [x] Configure refresh interval
  - [x] Enable/disable auto-scan on save
  - [x] Per-workspace configuration support *(VSCode natively supports workspace settings)*

---

### 🚀 Medium-term (v0.3.x - v0.5.x)
*Advanced features and UX improvements - Q2-Q3 2025*

**Priority: Medium | Estimated: 4-6 months**

#### Analytics & Tracking
- [ ] **TODO Age Detection**
  - [ ] Track when TODOs were first detected
  - [ ] Show age indicator (e.g., "2 weeks old")
  - [ ] Warning badge for TODOs older than X days
  - [ ] Configurable age thresholds
  - [ ] Age-based sorting and filtering

- [x] **Statistics Dashboard**
  - [x] Total TODO count in status bar
  - [x] Breakdown by type (TODO, FIXME, BUG, etc.)
  - [x] Breakdown by file
  - [x] Most TODO-heavy files list
  - [x] Trend analysis (TODOs over time)
  - [x] Visual charts and graphs (text-based bars and statistics)

#### Export & Sharing
- [x] **Export Functionality**
  - [x] Export to Markdown (formatted report)
  - [x] Export to JSON (machine-readable)
  - [x] Export to CSV (spreadsheet compatible)
  - [x] Copy to clipboard as formatted text
  - [ ] Scheduled exports *(Future enhancement)*
  - [ ] Custom export templates *(Future enhancement)*

#### Advanced Features
- [ ] **Better Pattern Matching**
  - [ ] Support regex patterns for keywords
  - [ ] Ignore TODOs in strings/comments within strings
  - [ ] Support multi-line TODO comments
  - [ ] Better handling of different comment styles per language
  - [ ] Language-specific comment pattern detection

- [ ] **Configuration Enhancements**
  - [ ] Configure comment patterns per language
  - [ ] Custom keyword patterns with regex
  - [ ] Workspace-specific vs global settings
  - [ ] Import/export configuration

#### UI/UX Improvements
- [ ] **Status Bar Integration**
  - [ ] Show TODO count in status bar
  - [ ] Click to open TODO view
  - [ ] Show scan status indicator
  - [ ] Quick actions from status bar

- [ ] **Keyboard Shortcuts**
  - [ ] Quick navigation between TODOs
  - [ ] Keyboard shortcuts for common actions
  - [ ] Command palette integration
  - [ ] Customizable keybindings

---

### 🌟 Long-term (v0.6.x+)
*Collaboration and integration features - Q4 2025+*

**Priority: Low | Estimated: 6+ months**

#### Team Collaboration
- [ ] **Team Collaboration Features**
  - [ ] Assign TODOs to team members (via comments)
  - [ ] TODO ownership tracking
  - [ ] Share TODO list with team
  - [ ] Integration with issue trackers (GitHub Issues, Jira)
  - [ ] Team TODO dashboard
  - [ ] TODO assignment notifications

#### Notifications & Reminders
- [ ] **Notifications and Reminders**
  - [ ] Daily reminder panel
  - [ ] Notifications for new TODOs
  - [ ] Reminders for old TODOs
  - [ ] Configurable notification settings
  - [ ] Quiet hours configuration
  - [ ] Notification preferences per TODO type

#### Code Actions & Automation
- [ ] **Code Actions**
  - [ ] Quick fix to convert TODO to GitHub issue
  - [ ] Generate issue template from TODO
  - [ ] Link TODO to existing issue
  - [ ] Create branch from TODO
  - [ ] Auto-close TODO when linked issue is closed

#### Advanced Features
- [ ] **Advanced TODO Management**
  - [ ] TODO dependencies (link related TODOs)
  - [ ] TODO priority levels (Low, Medium, High, Critical)
  - [ ] TODO categories/tags
  - [ ] TODO due dates
  - [ ] TODO completion tracking
  - [ ] TODO templates

#### External Integrations
- [ ] **External Integrations**
  - [ ] GitHub/GitLab integration (sync with issues)
  - [ ] Slack notifications
  - [ ] Email reminders
  - [ ] Calendar integration
  - [ ] CI/CD pipeline integration
  - [ ] Webhook support

#### Platform & Ecosystem
- [ ] **Extension Ecosystem**
  - [ ] API for other extensions
  - [ ] Plugin system
  - [ ] Custom TODO processors
  - [ ] Language-specific handlers
  - [ ] Extension marketplace integration

---

### 📋 Feature Requests & Ideas

We're always open to new ideas! If you have a feature request, please [open an issue](https://github.com/heberalmeida/auto-todo-manager/issues) on GitHub.

**Under Consideration:**
- Internationalization (i18n) support
- Accessibility improvements (keyboard navigation, screen readers)
- Dark/light theme customization
- Custom TODO icons per type
- TODO templates and snippets
- Integration with task management tools (Todoist, Asana, etc.)

---

**Legend:**
- 🔥 = High priority feature
- ✅ = Completed
- [ ] = Planned
- Priority levels: High → Medium → Low

---

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/heberalmeida/auto-todo-manager/issues) on GitHub.

---

Made with care for developers who value code quality
