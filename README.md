# ChunkerText (Web Version)

A web-based version of ChunkerText designed to run directly in Google Chrome (or any modern web browser) as a regular website, with zero extension permissions, developer mode, or admin approvals required.

---

## 🚀 How to Run

You have two convenient ways to use it:

### Option 1: Standalone Web App (Recommended)
Double-click **`ChunkerText_App.html`** in the main folder (or double-click **`Run ChunkerText.bat`**).
- Opens immediately in Google Chrome.
- **Zero dependencies & 100% offline**: Works without internet access because styling, libraries (SortableJS), and logic are all self-contained in that single file.
- **Zero permissions or approvals needed**: Ideal for managed or corporate accounts where browser extensions are restricted.

### Option 2: Modular Source Folder (`ChunkerText-Web`)
You can open `ChunkerText-Web/index.html` directly in Chrome, or host this folder on any web server (GitHub Pages, Netlify, localhost, etc.).
- `index.html`: Web interface structure
- `styles.css`: Workspace styling & layout
- `app.js`: Application logic, drag-and-drop, variables, and block management
- `storage.js`: Universal storage adapter using standard `localStorage` with cross-window/cross-tab synchronization
- `Sortable.min.js`: Drag-and-drop library for reordering blocks
- `build.py`: Python script to re-bundle into `ChunkerText_App.html` after making edits

---

## 🌟 Key Features

1. **Full Workspace & Real Estate Optimization**:
   - Collapsible project sidebar to maximize text editing area.
   - **Fullscreen button (⤢)**: Toggle fullscreen with one click.
   - **Floating Side Window button (◧)**: Pop out a slim side window docked beside your other browser windows.

2. **Project Management**:
   - Create, rename, and delete projects.
   - Export all projects to a JSON backup file.
   - Import JSON project backup files with automatic state restoration.

3. **Smart Variables & Presets**:
   - Create variables (e.g. `client`, `date`, `item`) and insert them into master blocks as `[variable_name]`.
   - **Save Presets (💾 Save)**: Save frequent variable values to the preset list.
   - **Country-style Scrollable Dropdown**: Pick any saved value instantly from a dropdown.
   - **Quick removal**: Delete presets with the trash button (`🗑️`) or by clicking `×` on quick chip tags.

4. **Master Blocks**:
   - Independent drag-and-drop reordering with drag handles.
   - Big `+` button to the left of each block: substitutes variables with active values and appends the block into New Text.
   - Editable block titles and dynamic auto-resizing textareas (no internal scrollbars).
   - Real-time backdrop syntax highlighting for `[variables]`.
   - Right-click context menu and `[x] Var` button for inserting variables at cursor position.

5. **New Text Builder**:
   - Assemble blocks, reorder them, edit freely, and add blank blocks.
   - **Copy All**: Copies assembled text directly to clipboard with automatic fallback for `file://` and web environments.

6. **Data Privacy**:
   - All your projects and blocks stay 100% on your computer inside standard browser `localStorage`.
   - Nothing is transmitted to external servers.
