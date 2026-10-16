let state = {
  projects: [],
  activeProjectId: null
};

// Elements
const els = {
  sidebar: document.getElementById('sidebar'),
  toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
  showSidebarBtn: document.getElementById('show-sidebar-btn'),
  projectList: document.getElementById('project-list'),
  newProjectBtn: document.getElementById('new-project-btn'),
  importBtn: document.getElementById('import-btn'),
  exportBtn: document.getElementById('export-btn'),
  
  noProjectView: document.getElementById('no-project-view'),
  projectView: document.getElementById('project-view'),
  
  projectName: document.getElementById('current-project-name'),
  deleteProjectBtn: document.getElementById('delete-project-btn'),
  
  variablesList: document.getElementById('variables-list'),
  addVariableBtn: document.getElementById('add-variable-btn'),
  toggleAllVarsBtn: document.getElementById('toggle-all-vars-btn'),
  
  blocksList: document.getElementById('blocks-list'),
  addBlankBlockBtn: document.getElementById('add-blank-block-btn'),
  addBlockBtn: document.getElementById('add-block-btn'),
  toggleAllBlocksBtn: document.getElementById('toggle-all-blocks-btn'),
  
  newTextList: document.getElementById('new-text-list'),
  clearNewTextBtn: document.getElementById('clear-new-text-btn'),
  copyAllBtn: document.getElementById('copy-all-btn'),
  toggleAllNewTextBtn: document.getElementById('toggle-all-new-text-btn')
};

// Utils
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Initialization
async function init() {
  const data = await Storage.get('chunkerState');
  if (data) {
    state = data;
  }
  
  setupSidebarToggle();
  setupSortable();
  initContextMenu();
  bindEvents();
  
  Storage.onChange((changes) => {
    if (changes.chunkerState && changes.chunkerState.newValue) {
      state = changes.chunkerState.newValue;
      renderSidebar();
      if (state.activeProjectId) {
        renderProject();
      } else {
        showNoProjectView();
      }
    }
  });

  renderSidebar();
  if (state.activeProjectId) {
    renderProject();
  } else {
    showNoProjectView();
  }
}

// Clipboard helper with fallback for web / file://
async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard failed, attempting fallback...', e);
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
}

async function saveState() {
  // Sync the active project's state before saving
  syncActiveProjectState();
  await Storage.set('chunkerState', state);
}

function getActiveProject() {
  return state.projects.find(p => p.id === state.activeProjectId);
}

// Sidebar logic
function setupSidebarToggle() {
  els.toggleSidebarBtn.addEventListener('click', () => {
    els.sidebar.classList.add('collapsed');
    els.showSidebarBtn.classList.remove('hidden');
  });
  els.showSidebarBtn.addEventListener('click', () => {
    els.sidebar.classList.remove('collapsed');
    els.showSidebarBtn.classList.add('hidden');
  });
}

function renderSidebar() {
  els.projectList.innerHTML = '';
  state.projects.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name;
    if (p.id === state.activeProjectId) li.classList.add('active');
    li.addEventListener('click', () => {
      syncActiveProjectState();
      state.activeProjectId = p.id;
      saveState();
      renderSidebar();
      renderProject();
    });
    els.projectList.appendChild(li);
  });
}

// Views
function showNoProjectView() {
  els.noProjectView.classList.remove('hidden');
  els.projectView.classList.add('hidden');
}

function renderProject() {
  const project = getActiveProject();
  if (!project) {
    showNoProjectView();
    return;
  }
  els.noProjectView.classList.add('hidden');
  els.projectView.classList.remove('hidden');
  
  els.projectName.textContent = project.name;
  
  renderVariables();
  renderBlocks();
  renderNewText();
}

// Sync DOM to State before switching or saving
function syncActiveProjectState() {
  const project = getActiveProject();
  if (!project) return;
  
  project.name = els.projectName.textContent;
  
  // Variables are synced on input change
  // Blocks are synced on change
  // New Text is synced on change
}

// Escape attribute helper
function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Variables
function renderVariables() {
  const project = getActiveProject();
  els.variablesList.innerHTML = '';
  project.variables = project.variables || [];
  
  if (els.toggleAllVarsBtn) {
    const anyExpanded = project.variables.some(v => !v.isCollapsed);
    els.toggleAllVarsBtn.textContent = anyExpanded ? 'Collapse All' : 'Expand All';
  }

  project.variables.forEach((v, index) => {
    const isCollapsed = !!v.isCollapsed;
    v.presets = Array.isArray(v.presets) ? v.presets : [];

    const div = document.createElement('div');
    div.className = `var-card ${isCollapsed ? 'collapsed' : ''}`;
    div.innerHTML = `
      <div class="var-header">
        <div class="title-container">
          <button class="btn icon-btn collapse-btn" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▶' : '▼'}</button>
          <span contenteditable="true" class="var-name-edit" spellcheck="false" title="Click to edit name">${escapeAttr(v.name || 'new_var')}</span>
        </div>
        <button class="btn icon-btn danger-text del-var-btn" title="Delete Variable">✖</button>
      </div>
      <div class="var-body">
        <div class="var-input-group">
          <input type="text" value="${escapeAttr(v.value || '')}" placeholder="Value for [${escapeAttr(v.name)}]" class="var-input" />
          <button class="save-preset-btn" title="Save current value as a preset">💾 Save</button>
        </div>
        <div class="var-presets-group">
          <select class="var-preset-select" title="Choose from saved values">
            <option value="">${v.presets.length > 0 ? `-- Choose saved value (${v.presets.length}) --` : '-- No saved values --'}</option>
          </select>
          <button class="del-preset-btn" title="Delete selected preset from list" disabled>🗑️</button>
        </div>
        <div class="var-presets-chips"></div>
      </div>
    `;

    // Elements
    const collapseBtn = div.querySelector('.collapse-btn');
    const nameEdit = div.querySelector('.var-name-edit');
    const input = div.querySelector('.var-input');
    const savePresetBtn = div.querySelector('.save-preset-btn');
    const presetSelect = div.querySelector('.var-preset-select');
    const delPresetBtn = div.querySelector('.del-preset-btn');
    const chipsContainer = div.querySelector('.var-presets-chips');

    // Populate preset dropdown options and chips
    function updatePresetsUI() {
      // Rebuild select options
      presetSelect.innerHTML = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = v.presets.length > 0 ? `-- Choose saved value (${v.presets.length}) --` : '-- No saved values --';
      presetSelect.appendChild(defaultOpt);

      let foundSelected = false;
      v.presets.forEach(preset => {
        const opt = document.createElement('option');
        opt.value = preset;
        opt.textContent = preset;
        if (v.value === preset) {
          opt.selected = true;
          foundSelected = true;
        }
        presetSelect.appendChild(opt);
      });

      delPresetBtn.disabled = !foundSelected || presetSelect.value === '';

      // Rebuild chips
      chipsContainer.innerHTML = '';
      v.presets.forEach(preset => {
        const chip = document.createElement('span');
        chip.className = `preset-chip ${v.value === preset ? 'active' : ''}`;
        chip.title = 'Click to use this value';

        const chipText = document.createElement('span');
        chipText.className = 'preset-chip-text';
        chipText.textContent = preset;
        chip.appendChild(chipText);

        const chipDel = document.createElement('button');
        chipDel.className = 'chip-del-btn';
        chipDel.title = 'Remove preset';
        chipDel.textContent = '×';
        chipDel.addEventListener('click', (e) => {
          e.stopPropagation();
          v.presets = v.presets.filter(p => p !== preset);
          saveState();
          updatePresetsUI();
        });
        chip.appendChild(chipDel);

        chip.addEventListener('click', () => {
          v.value = preset;
          input.value = preset;
          saveState();
          updatePresetsUI();
        });

        chipsContainer.appendChild(chip);
      });
    }

    updatePresetsUI();

    // Toggle collapse
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      v.isCollapsed = !v.isCollapsed;
      saveState();
      renderVariables();
    });
    
    // Edit variable name
    nameEdit.addEventListener('click', (e) => e.stopPropagation());
    nameEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameEdit.blur();
      }
    });
    nameEdit.addEventListener('blur', () => {
      v.name = cleanVarName(nameEdit.textContent) || ('var_' + (index + 1));
      nameEdit.textContent = v.name;
      if (input) input.placeholder = `Value for [${v.name}]`;
      saveState();
      document.querySelectorAll('.block-content').forEach(updateBackdrop);
    });
    
    // Edit variable value via input
    if (input) {
      input.addEventListener('input', (e) => {
        v.value = e.target.value;
        saveState();
        // Update select and chip active states to match typed value
        let match = false;
        Array.from(presetSelect.options).forEach(opt => {
          if (opt.value && opt.value === v.value) {
            opt.selected = true;
            match = true;
          }
        });
        if (!match) presetSelect.value = '';
        delPresetBtn.disabled = !match;
        chipsContainer.querySelectorAll('.preset-chip').forEach(c => {
          const txt = c.querySelector('.preset-chip-text')?.textContent;
          c.classList.toggle('active', txt === v.value);
        });
      });
    }

    // Save current value to presets
    if (savePresetBtn) {
      savePresetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentVal = (input ? input.value : v.value || '').trim();
        if (!currentVal) return;
        if (!v.presets.includes(currentVal)) {
          v.presets.push(currentVal);
          saveState();
          updatePresetsUI();
          savePresetBtn.classList.add('saved');
          savePresetBtn.textContent = '✓ Saved';
          setTimeout(() => {
            savePresetBtn.classList.remove('saved');
            savePresetBtn.textContent = '💾 Save';
          }, 1000);
        } else {
          savePresetBtn.textContent = '✓ Exists';
          setTimeout(() => {
            savePresetBtn.textContent = '💾 Save';
          }, 1000);
        }
      });
    }

    // Select preset from dropdown
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        const chosen = presetSelect.value;
        if (chosen !== '') {
          v.value = chosen;
          if (input) input.value = chosen;
          delPresetBtn.disabled = false;
          saveState();
          chipsContainer.querySelectorAll('.preset-chip').forEach(c => {
            const txt = c.querySelector('.preset-chip-text')?.textContent;
            c.classList.toggle('active', txt === chosen);
          });
        } else {
          delPresetBtn.disabled = true;
        }
      });
    }

    // Delete selected preset from dropdown
    if (delPresetBtn) {
      delPresetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chosen = presetSelect.value;
        if (chosen !== '') {
          v.presets = v.presets.filter(p => p !== chosen);
          saveState();
          updatePresetsUI();
        }
      });
    }
    
    // Delete variable
    div.querySelector('.del-var-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      project.variables.splice(index, 1);
      saveState();
      renderVariables();
      document.querySelectorAll('.block-content').forEach(updateBackdrop);
    });
    
    els.variablesList.appendChild(div);
  });
}

// Clean variable name helper
function cleanVarName(name) {
  if (!name) return '';
  return name.trim().replace(/^\[+|\]+$/g, '').trim();
}

// Helper to replace variables
function replaceVariables(text, variables) {
  if (!text) return '';
  let result = text;
  if (!variables || !Array.isArray(variables)) return result;
  
  variables.forEach(v => {
    const rawName = cleanVarName(v.name);
    if (rawName !== '' && v.value !== undefined && v.value !== '') {
      const escaped = rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\[${escaped}\\]`, 'gi');
      result = result.replace(regex, v.value);
    }
  });
  return result;
}

// Update backdrop highlights for [variables]
function updateBackdrop(textarea) {
  if (!textarea) return;
  const wrapper = textarea.closest('.editor-wrapper');
  if (!wrapper) return;
  const backdropContent = wrapper.querySelector('.backdrop-content');
  if (!backdropContent) return;

  const project = getActiveProject();
  const definedVarNames = new Set(
    (project && project.variables ? project.variables : [])
      .map(v => cleanVarName(v.name).toLowerCase())
      .filter(Boolean)
  );

  const text = textarea.value || '';
  
  // HTML escape
  let escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight all [variables]
  escapedText = escapedText.replace(/\[([^\]\n\r]+)\]/g, (match, inner) => {
    const isDefined = definedVarNames.has(inner.trim().toLowerCase());
    const badgeClass = isDefined ? 'var-highlight' : 'var-highlight unrecognized';
    return `<mark class="${badgeClass}">[${inner}]</mark>`;
  });

  // Trailing newline fix
  if (text.endsWith('\n')) {
    escapedText += '<br>&nbsp;';
  }

  backdropContent.innerHTML = escapedText;
}

// Auto-resize textarea to fit all text without internal scrollbar
function autoResizeTextarea(textarea) {
  if (!textarea) return;
  if (textarea.offsetParent === null) return;
  textarea.style.height = 'auto';
  const borderOffset = textarea.offsetHeight - textarea.clientHeight;
  textarea.style.height = Math.max(60, textarea.scrollHeight + borderOffset) + 'px';
  updateBackdrop(textarea);
}

// Custom Context Menu & Variable Insertion
let activeTarget = null; // { textarea, cursorPos }

function initContextMenu() {
  const menu = document.getElementById('custom-context-menu');

  document.addEventListener('click', (e) => {
    if (menu && !menu.contains(e.target)) {
      hideContextMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
    }
  });
}

function hideContextMenu() {
  const menu = document.getElementById('custom-context-menu');
  if (menu) menu.classList.add('hidden');
  activeTarget = null;
}

function showContextMenu(x, y, textarea, cursorPos) {
  const menu = document.getElementById('custom-context-menu');
  const varsList = document.getElementById('context-menu-vars-list');
  const project = getActiveProject();
  if (!menu || !varsList || !project) return;

  activeTarget = { textarea, cursorPos: (cursorPos !== undefined && cursorPos !== null) ? cursorPos : textarea.selectionStart };
  varsList.innerHTML = '';

  const variables = project.variables || [];
  const validVars = variables.filter(v => cleanVarName(v.name) !== '');

  if (validVars.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'context-menu-empty';
    empty.textContent = 'No variables created yet. Click "+ Variable" at top to add one.';
    varsList.appendChild(empty);
  } else {
    validVars.forEach(v => {
      const varName = cleanVarName(v.name);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'context-menu-item';
      item.innerHTML = `
        <span class="var-tag-preview">[${varName}]</span>
        <span class="var-val-preview" title="${v.value || 'No value entered'}">${v.value ? `="${v.value}"` : '(empty)'}</span>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        insertVariableAtCursor(activeTarget.textarea, activeTarget.cursorPos, varName);
        hideContextMenu();
      });
      varsList.appendChild(item);
    });
  }

  menu.classList.remove('hidden');
  const menuWidth = 220;
  const menuHeight = menu.offsetHeight || 160;
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  let left = x;
  let top = y;

  if (left + menuWidth > winWidth) {
    left = Math.max(10, winWidth - menuWidth - 10);
  }
  if (top + menuHeight > winHeight) {
    top = Math.max(10, winHeight - menuHeight - 10);
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function insertVariableAtCursor(textarea, cursorPos, varName) {
  if (!textarea) return;
  const token = `[${varName}]`;
  const val = textarea.value || '';
  const pos = (cursorPos !== undefined && cursorPos !== null) ? cursorPos : textarea.selectionStart;

  const before = val.substring(0, pos);
  const after = val.substring(pos);
  textarea.value = before + token + after;

  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  const newPos = pos + token.length;
  textarea.focus();
  textarea.setSelectionRange(newPos, newPos);
}

// Blocks
function renderBlocks() {
  const project = getActiveProject();
  els.blocksList.innerHTML = '';
  project.blocks = project.blocks || [];

  if (els.toggleAllBlocksBtn) {
    const anyExpanded = project.blocks.some(b => !b.isCollapsed);
    els.toggleAllBlocksBtn.textContent = anyExpanded ? 'Collapse All' : 'Expand All';
  }
  
  project.blocks.forEach((b, index) => {
    const isCollapsed = !!b.isCollapsed;
    const defaultTitle = 'Block ' + (index + 1);
    const titleText = b.title || defaultTitle;

    const row = document.createElement('div');
    row.className = `master-block-row ${isCollapsed ? 'collapsed' : ''}`;
    row.dataset.id = b.id;
    row.innerHTML = `
      <button class="side-add-btn" title="Add this block to New Text">＋</button>
      <div class="block-card master-block ${isCollapsed ? 'collapsed' : ''}">
        <div class="block-header drag-handle" title="Drag to reorder">
          <div class="title-container">
            <button class="btn icon-btn collapse-btn" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▶' : '▼'}</button>
            <span class="block-title-edit" contenteditable="true" spellcheck="false" title="Click to edit title">${titleText}</span>
          </div>
          <div class="block-actions">
            <button class="btn insert-var-btn" title="Insert Variable">[x] Var</button>
            <button class="btn icon-btn move-up-btn" title="Move Up"${index === 0 ? ' disabled' : ''}>▲</button>
            <button class="btn icon-btn move-down-btn" title="Move Down"${index === project.blocks.length - 1 ? ' disabled' : ''}>▼</button>
            <button class="btn icon-btn del-block-btn" title="Delete Block">✖</button>
          </div>
        </div>
        <div class="block-body">
          <div class="editor-wrapper">
            <div class="backdrop" aria-hidden="true"><div class="backdrop-content"></div></div>
            <textarea class="block-content" placeholder="Enter text. Right-click or use '[x] Var' to insert variables.">${b.content || ''}</textarea>
          </div>
        </div>
      </div>
    `;

    // Toggle collapse
    const collapseBtn = row.querySelector('.collapse-btn');
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      b.isCollapsed = !b.isCollapsed;
      saveState();
      renderBlocks();
    });

    // Edit title
    const titleEdit = row.querySelector('.block-title-edit');
    titleEdit.addEventListener('click', (e) => e.stopPropagation());
    titleEdit.addEventListener('mousedown', (e) => e.stopPropagation());
    titleEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEdit.blur();
      }
    });
    titleEdit.addEventListener('blur', () => {
      b.title = titleEdit.textContent.trim() || defaultTitle;
      saveState();
    });
    
    const textarea = row.querySelector('.block-content');
    const insertVarBtn = row.querySelector('.insert-var-btn');

    if (textarea) {
      textarea.addEventListener('input', (e) => {
        b.content = e.target.value;
        autoResizeTextarea(textarea);
        saveState();
      });

      textarea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, textarea, textarea.selectionStart);
      });

      if (!isCollapsed) {
        requestAnimationFrame(() => autoResizeTextarea(textarea));
      }
    }

    if (insertVarBtn && textarea) {
      insertVarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = insertVarBtn.getBoundingClientRect();
        showContextMenu(rect.left, rect.bottom + 4, textarea, textarea.selectionStart !== undefined ? textarea.selectionStart : textarea.value.length);
      });
    }
    
    row.querySelector('.del-block-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      project.blocks.splice(index, 1);
      saveState();
      renderBlocks();
    });

    row.querySelector('.move-up-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (index > 0) {
        const temp = project.blocks[index];
        project.blocks[index] = project.blocks[index - 1];
        project.blocks[index - 1] = temp;
        saveState();
        renderBlocks();
      }
    });

    row.querySelector('.move-down-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (index < project.blocks.length - 1) {
        const temp = project.blocks[index];
        project.blocks[index] = project.blocks[index + 1];
        project.blocks[index + 1] = temp;
        saveState();
        renderBlocks();
      }
    });

    const addBtn = row.querySelector('.side-add-btn');
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (textarea) {
        b.content = textarea.value;
      }
      
      const content = replaceVariables(b.content || '', project.variables);
      const newBlock = {
        id: generateId(),
        title: b.title || defaultTitle,
        content,
        isCollapsed: false
      };
      project.newText = project.newText || [];
      project.newText.push(newBlock);
      saveState();
      renderNewText();

      // Visual feedback on button
      addBtn.classList.add('added-feedback');
      addBtn.textContent = '✓';
      setTimeout(() => {
        addBtn.classList.remove('added-feedback');
        addBtn.textContent = '＋';
      }, 800);
    });
    
    els.blocksList.appendChild(row);
  });
}

function renderNewText() {
  const project = getActiveProject();
  els.newTextList.innerHTML = '';
  project.newText = project.newText || [];

  if (els.toggleAllNewTextBtn) {
    const anyExpanded = project.newText.some(b => !b.isCollapsed);
    els.toggleAllNewTextBtn.textContent = anyExpanded ? 'Collapse All' : 'Expand All';
  }
  
  if (project.newText.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'empty-new-text-notice';
    emptyNotice.textContent = 'No blocks added yet. Click "+ Add to New Text" on any block above, or click "+ Blank Block".';
    els.newTextList.appendChild(emptyNotice);
    return;
  }
  
  project.newText.forEach((b, index) => {
    const isCollapsed = !!b.isCollapsed;
    const defaultTitle = 'Text Block ' + (index + 1);
    const titleText = b.title || defaultTitle;

    const div = document.createElement('div');
    div.className = `block-card new-text-block ${isCollapsed ? 'collapsed' : ''}`;
    div.dataset.id = b.id;
    div.innerHTML = `
      <div class="block-header drag-handle" title="Drag to reorder">
        <div class="title-container">
          <button class="btn icon-btn collapse-btn" title="${isCollapsed ? 'Expand' : 'Collapse'}">${isCollapsed ? '▶' : '▼'}</button>
          <span class="block-title-edit" contenteditable="true" spellcheck="false" title="Click to edit title">${titleText}</span>
        </div>
        <div class="block-actions">
          <button class="btn insert-var-btn" title="Insert Variable">[x] Var</button>
          <button class="btn icon-btn move-up-btn" title="Move Up"${index === 0 ? ' disabled' : ''}>▲</button>
          <button class="btn icon-btn move-down-btn" title="Move Down"${index === project.newText.length - 1 ? ' disabled' : ''}>▼</button>
          <button class="btn icon-btn del-new-text-btn" title="Delete">✖</button>
        </div>
      </div>
      <div class="block-body">
        <div class="editor-wrapper">
          <div class="backdrop" aria-hidden="true"><div class="backdrop-content"></div></div>
          <textarea class="block-content">${b.content || ''}</textarea>
        </div>
      </div>
    `;

    // Toggle collapse
    const collapseBtn = div.querySelector('.collapse-btn');
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      b.isCollapsed = !b.isCollapsed;
      saveState();
      renderNewText();
    });

    // Edit title
    const titleEdit = div.querySelector('.block-title-edit');
    titleEdit.addEventListener('click', (e) => e.stopPropagation());
    titleEdit.addEventListener('mousedown', (e) => e.stopPropagation());
    titleEdit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEdit.blur();
      }
    });
    titleEdit.addEventListener('blur', () => {
      b.title = titleEdit.textContent.trim() || defaultTitle;
      saveState();
    });
    
    const textarea = div.querySelector('.block-content');
    const insertVarBtn = div.querySelector('.insert-var-btn');

    if (textarea) {
      textarea.addEventListener('input', (e) => {
        const proj = getActiveProject();
        const currentBlock = proj.newText.find(x => x.id === b.id);
        if(currentBlock) currentBlock.content = e.target.value;
        autoResizeTextarea(textarea);
        saveState();
      });

      textarea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, textarea, textarea.selectionStart);
      });

      if (!isCollapsed) {
        requestAnimationFrame(() => autoResizeTextarea(textarea));
      }
    }

    if (insertVarBtn && textarea) {
      insertVarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = insertVarBtn.getBoundingClientRect();
        showContextMenu(rect.left, rect.bottom + 4, textarea, textarea.selectionStart !== undefined ? textarea.selectionStart : textarea.value.length);
      });
    }
    
    div.querySelector('.del-new-text-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const proj = getActiveProject();
      const idx = proj.newText.findIndex(x => x.id === b.id);
      if(idx > -1) proj.newText.splice(idx, 1);
      saveState();
      renderNewText();
    });

    div.querySelector('.move-up-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const proj = getActiveProject();
      const idx = proj.newText.findIndex(x => x.id === b.id);
      if (idx > 0) {
        const temp = proj.newText[idx];
        proj.newText[idx] = proj.newText[idx - 1];
        proj.newText[idx - 1] = temp;
        saveState();
        renderNewText();
      }
    });

    div.querySelector('.move-down-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const proj = getActiveProject();
      const idx = proj.newText.findIndex(x => x.id === b.id);
      if (idx < proj.newText.length - 1) {
        const temp = proj.newText[idx];
        proj.newText[idx] = proj.newText[idx + 1];
        proj.newText[idx + 1] = temp;
        saveState();
        renderNewText();
      }
    });
    
    els.newTextList.appendChild(div);
  });
}

// Sortable (independent reordering for Master Blocks and New Text)
let sortableBlocks, sortableNewText;
function setupSortable() {
  if (sortableBlocks) {
    sortableBlocks.destroy();
  }
  sortableBlocks = new Sortable(els.blocksList, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'ghost',
    onEnd: function() {
      syncBlocksOrder();
    }
  });

  if (sortableNewText) {
    sortableNewText.destroy();
  }
  sortableNewText = new Sortable(els.newTextList, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'ghost',
    onEnd: function() {
      syncNewTextOrder();
    }
  });
}

function syncBlocksOrder() {
  const project = getActiveProject();
  if(!project || !project.blocks) return;
  const newOrderIds = Array.from(els.blocksList.children)
    .map(c => c.dataset ? c.dataset.id : null)
    .filter(Boolean);
  const blockMap = new Map(project.blocks.map(b => [b.id, b]));
  project.blocks = newOrderIds.map(id => blockMap.get(id)).filter(Boolean);
  saveState();
  renderBlocks();
}

function syncNewTextOrder() {
  const project = getActiveProject();
  if(!project || !project.newText) return;
  const newOrderIds = Array.from(els.newTextList.children)
    .map(c => c.dataset ? c.dataset.id : null)
    .filter(Boolean);
  const blockMap = new Map(project.newText.map(b => [b.id, b]));
  project.newText = newOrderIds.map(id => blockMap.get(id)).filter(Boolean);
  saveState();
  renderNewText();
}

// Events
function bindEvents() {
  els.newProjectBtn.addEventListener('click', () => {
    syncActiveProjectState();
    const newProj = {
      id: generateId(),
      name: 'New Project ' + (state.projects.length + 1),
      variables: [],
      blocks: [],
      newText: []
    };
    state.projects.push(newProj);
    state.activeProjectId = newProj.id;
    saveState();
    renderSidebar();
    renderProject();
  });
  
  els.deleteProjectBtn.addEventListener('click', () => {
    if(!confirm("Are you sure you want to delete this project?")) return;
    state.projects = state.projects.filter(p => p.id !== state.activeProjectId);
    state.activeProjectId = state.projects.length > 0 ? state.projects[0].id : null;
    saveState();
    renderSidebar();
    if (state.activeProjectId) renderProject();
    else showNoProjectView();
  });
  
  els.projectName.addEventListener('blur', () => {
    syncActiveProjectState();
    saveState();
    renderSidebar();
  });
  
  els.addVariableBtn.addEventListener('click', () => {
    const p = getActiveProject();
    p.variables.push({
      name: 'var_' + (p.variables.length + 1),
      value: '',
      isCollapsed: false,
      presets: []
    });
    saveState();
    renderVariables();
    document.querySelectorAll('.block-content').forEach(updateBackdrop);
  });
  
  els.addBlockBtn.addEventListener('click', () => {
    const p = getActiveProject();
    p.blocks.push({ id: generateId(), title: 'Block ' + (p.blocks.length + 1), content: '', isCollapsed: false });
    saveState();
    renderBlocks();
  });
  
  els.addBlankBlockBtn.addEventListener('click', () => {
    const p = getActiveProject();
    p.newText.push({ id: generateId(), title: 'Blank Block', content: '', isCollapsed: false });
    saveState();
    renderNewText();
  });

  if (els.toggleAllVarsBtn) {
    els.toggleAllVarsBtn.addEventListener('click', () => {
      const p = getActiveProject();
      if (!p || !p.variables) return;
      const anyExpanded = p.variables.some(v => !v.isCollapsed);
      p.variables.forEach(v => v.isCollapsed = anyExpanded);
      saveState();
      renderVariables();
    });
  }

  if (els.toggleAllBlocksBtn) {
    els.toggleAllBlocksBtn.addEventListener('click', () => {
      const p = getActiveProject();
      if (!p || !p.blocks) return;
      const anyExpanded = p.blocks.some(b => !b.isCollapsed);
      p.blocks.forEach(b => b.isCollapsed = anyExpanded);
      saveState();
      renderBlocks();
    });
  }

  if (els.toggleAllNewTextBtn) {
    els.toggleAllNewTextBtn.addEventListener('click', () => {
      const p = getActiveProject();
      if (!p || !p.newText) return;
      const anyExpanded = p.newText.some(b => !b.isCollapsed);
      p.newText.forEach(b => b.isCollapsed = anyExpanded);
      saveState();
      renderNewText();
    });
  }
  
  els.clearNewTextBtn.addEventListener('click', () => {
    if(!confirm("Clear all new text blocks?")) return;
    const p = getActiveProject();
    p.newText = [];
    saveState();
    renderNewText();
  });
  
  els.copyAllBtn.addEventListener('click', async () => {
    const p = getActiveProject();
    if (!p || !p.newText) return;
    const allText = p.newText.map(b => b.content).join(' ');
    const copied = await copyToClipboard(allText);
    if (copied) {
      const originalText = els.copyAllBtn.textContent;
      els.copyAllBtn.textContent = 'Copied!';
      setTimeout(() => els.copyAllBtn.textContent = originalText, 2000);
    } else {
      alert("Failed to copy text to clipboard.");
    }
  });

  const fullScreenBtn = document.getElementById('open-full-screen-btn');
  if (fullScreenBtn) {
    fullScreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  const sideWindowBtn = document.getElementById('open-side-window-btn');
  if (sideWindowBtn) {
    sideWindowBtn.addEventListener('click', () => {
      const width = 500;
      const height = window.screen.availHeight || 900;
      const left = window.screen.availWidth ? window.screen.availWidth - width - 20 : 1000;
      const sideWin = window.open(
        window.location.href,
        'ChunkerTextSideWindow',
        `width=${width},height=${height},left=${left},top=30,resizable=yes,scrollbars=yes`
      );
      if (!sideWin) {
        alert('Popup was blocked by the browser. Please allow popups for this page to use the floating side window.');
      }
    });
  }
  
  // Import / Export
  els.exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `chunker_projects.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });
  
  els.importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => { 
       const file = e.target.files[0]; 
       const reader = new FileReader();
       reader.readAsText(file,'UTF-8');
       reader.onload = readerEvent => {
          try {
            const content = readerEvent.target.result;
            const imported = JSON.parse(content);
            if (imported && imported.projects) {
              state = imported;
              if(!state.projects.find(p => p.id === state.activeProjectId)) {
                state.activeProjectId = state.projects.length > 0 ? state.projects[0].id : null;
              }
              saveState();
              renderSidebar();
              if(state.activeProjectId) renderProject();
              else showNoProjectView();
            } else {
              alert("Invalid backup file.");
            }
          } catch(e) {
            alert("Error parsing JSON.");
          }
       }
    };
    input.click();
  });
}

// Resize listener to re-calculate block heights if window dimensions change
window.addEventListener('resize', () => {
  document.querySelectorAll('.block-content').forEach(autoResizeTextarea);
});

// Start
document.addEventListener('DOMContentLoaded', init);
