/**
 * Strata IDE - Renderer Process (Frontend)
 * Modern web-based UI for Strata development
 */

import type { Project, File, ExecutionResult, CompilationResult } from '../types/index.js';

declare const window: any;

class StrataIDE {
  private activeProject: Project | null = null;
  private openFiles: Map<string, File> = new Map();
  private currentFile: string | null = null;
  private outputBuffer: string = '';

  constructor() {
    this.initUI();
    this.attachEventListeners();
    this.loadProjects();
  }

  /**
   * Initialize UI components
   */
  private initUI() {
    const root = document.getElementById('app');
    if (!root) return;

    root.innerHTML = `
      <div class="container">
        <header class="topbar">
          <div class="logo">Strata IDE</div>
          <nav class="menu">
            <button id="btn-new-project" class="btn">New Project</button>
            <button id="btn-open-project" class="btn">Open Project</button>
            <button id="btn-build" class="btn primary">Build</button>
            <button id="btn-run" class="btn success">Run</button>
          </nav>
        </header>

        <div class="main">
          <aside class="sidebar">
            <div class="sidebar-section">
              <h3>Projects</h3>
              <ul id="projects-list" class="projects-list"></ul>
            </div>
            <div class="sidebar-section">
              <h3>Files</h3>
              <ul id="files-list" class="files-list"></ul>
              <button id="btn-add-file" class="btn-sm">+ Add File</button>
            </div>
          </aside>

          <main class="editor-container">
            <div class="editor-tabs" id="editor-tabs"></div>
            <div class="editor">
              <textarea id="editor-input" class="editor-textarea" placeholder="Select or create a file..."></textarea>
            </div>
          </main>

          <aside class="right-panel">
            <div class="tabs">
              <button class="tab-btn active" data-tab="output">Output</button>
              <button class="tab-btn" data-tab="problems">Problems</button>
              <button class="tab-btn" data-tab="debug">Debug</button>
            </div>
            <div class="tab-content">
              <div id="output-panel" class="panel active">
                <div class="output-header">
                  <span>Execution Output</span>
                  <button class="btn-sm">Clear</button>
                </div>
                <div id="output-text" class="output-text"></div>
              </div>
              <div id="problems-panel" class="panel">
                <div class="problems-list" id="problems-list"></div>
              </div>
              <div id="debug-panel" class="panel">
                <div class="debug-info" id="debug-info"></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.injectStyles();
  }

  /**
   * Inject CSS styles
   */
  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #1e1e1e;
        color: #d4d4d4;
      }

      .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      .topbar {
        background: #252526;
        border-bottom: 1px solid #3e3e42;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo {
        font-size: 18px;
        font-weight: bold;
        color: #4ec9b0;
      }

      .menu {
        display: flex;
        gap: 8px;
      }

      .btn {
        background: #0e639c;
        color: white;
        border: none;
        padding: 6px 14px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      }

      .btn:hover {
        background: #1177bb;
      }

      .btn.primary {
        background: #1976d2;
      }

      .btn.success {
        background: #107c10;
      }

      .btn-sm {
        background: #3e3e42;
        color: #cccccc;
        border: none;
        padding: 4px 8px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
      }

      .btn-sm:hover {
        background: #464647;
      }

      .main {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .sidebar {
        width: 250px;
        background: #252526;
        border-right: 1px solid #3e3e42;
        overflow-y: auto;
        padding: 10px;
      }

      .sidebar-section {
        margin-bottom: 20px;
      }

      .sidebar-section h3 {
        font-size: 12px;
        text-transform: uppercase;
        color: #858585;
        margin-bottom: 8px;
      }

      .projects-list, .files-list {
        list-style: none;
      }

      .projects-list li, .files-list li {
        padding: 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 13px;
        margin-bottom: 4px;
      }

      .projects-list li:hover, .files-list li:hover {
        background: #3e3e42;
      }

      .projects-list li.active, .files-list li.active {
        background: #0e639c;
        color: white;
      }

      .editor-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .editor-tabs {
        background: #1e1e1e;
        border-bottom: 1px solid #3e3e42;
        display: flex;
        overflow-x: auto;
        height: 35px;
      }

      .editor-tab {
        padding: 8px 15px;
        border-right: 1px solid #3e3e42;
        cursor: pointer;
        font-size: 13px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .editor-tab.active {
        background: #252526;
        border-bottom: 2px solid #007acc;
      }

      .editor {
        flex: 1;
        overflow: hidden;
      }

      .editor-textarea {
        width: 100%;
        height: 100%;
        background: #1e1e1e;
        color: #d4d4d4;
        border: none;
        padding: 12px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        resize: none;
        outline: none;
      }

      .right-panel {
        width: 300px;
        background: #252526;
        border-left: 1px solid #3e3e42;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .tabs {
        display: flex;
        border-bottom: 1px solid #3e3e42;
      }

      .tab-btn {
        flex: 1;
        background: none;
        border: none;
        color: #858585;
        padding: 10px;
        cursor: pointer;
        font-size: 13px;
        border-bottom: 2px solid transparent;
      }

      .tab-btn.active {
        color: #ffffff;
        border-bottom-color: #007acc;
      }

      .tab-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .panel {
        display: none;
        height: 100%;
        overflow-y: auto;
      }

      .panel.active {
        display: block;
      }

      .output-header {
        padding: 8px 12px;
        border-bottom: 1px solid #3e3e42;
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }

      .output-text {
        padding: 12px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-word;
        color: #d4d4d4;
      }

      .output-text.error {
        color: #f48771;
      }

      .output-text.success {
        color: #89d185;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners() {
    document.getElementById('btn-new-project')?.addEventListener('click', () => this.showNewProjectDialog());
    document.getElementById('btn-open-project')?.addEventListener('click', () => this.showOpenProjectDialog());
    document.getElementById('btn-build')?.addEventListener('click', () => this.build());
    document.getElementById('btn-run')?.addEventListener('click', () => this.run());
    document.getElementById('btn-add-file')?.addEventListener('click', () => this.showAddFileDialog());

    const editorInput = document.getElementById('editor-input') as HTMLTextAreaElement;
    editorInput?.addEventListener('input', (e) => this.onEditorChange(e));

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab((e.target as HTMLElement).dataset.tab));
    });

    // Listen for runner events
    window.strataSDK.on('runner:compile', (event: any, data: any) => {
      this.handleCompileEvent(data);
    });

    window.strataSDK.on('runner:runtime', (event: any, data: any) => {
      this.handleRuntimeEvent(data);
    });
  }

  /**
   * Load projects list
   */
  private async loadProjects() {
    try {
      const projects = await window.strataSDK.project.list();
      const projectsList = document.getElementById('projects-list');
      if (projectsList) {
        projectsList.innerHTML = projects
          .map((p: any) => `<li data-id="${p.id}">${p.name}</li>`)
          .join('');

        projectsList.querySelectorAll('li').forEach(li => {
          li.addEventListener('click', () => this.openProject((li as HTMLElement).dataset.id!));
        });
      }
    } catch (err) {
      this.appendOutput(`Error loading projects: ${err}`);
    }
  }

  /**
   * Open project
   */
  private async openProject(projectId: string) {
    try {
      const project = await window.strataSDK.project.get(projectId);
      this.activeProject = project;
      this.loadProjectFiles(projectId);
      this.appendOutput(`Opened project: ${project.name}`);
    } catch (err) {
      this.appendOutput(`Error opening project: ${err}`);
    }
  }

  /**
   * Load project files
   */
  private async loadProjectFiles(projectId: string) {
    try {
      const files = await window.strataSDK.file.list(projectId);
      const filesList = document.getElementById('files-list');
      if (filesList) {
        filesList.innerHTML = files
          .map((f: any) => `<li data-path="${f.path}">${f.name}</li>`)
          .join('');

        filesList.querySelectorAll('li').forEach(li => {
          li.addEventListener('click', () => this.openFile((li as HTMLElement).dataset.path!));
        });
      }
    } catch (err) {
      this.appendOutput(`Error loading files: ${err}`);
    }
  }

  /**
   * Open file in editor
   */
  private openFile(filePath: string) {
    const file = this.openFiles.get(filePath);
    if (file) {
      const editor = document.getElementById('editor-input') as HTMLTextAreaElement;
      if (editor) {
        editor.value = file.content;
        this.currentFile = filePath;
        this.updateEditorTabs();
      }
    }
  }

  /**
   * Handle editor change
   */
  private onEditorChange(e: Event) {
    const editor = e.target as HTMLTextAreaElement;
    if (this.currentFile) {
      const file = this.openFiles.get(this.currentFile);
      if (file) {
        file.content = editor.value;
        file.modified = true;
      }
    }
  }

  /**
   * Update editor tabs
   */
  private updateEditorTabs() {
    const tabs = document.getElementById('editor-tabs');
    if (tabs) {
      tabs.innerHTML = Array.from(this.openFiles.values())
        .map(f => `
          <div class="editor-tab ${this.currentFile === f.path ? 'active' : ''}">
            ${f.name}${f.modified ? ' •' : ''}
          </div>
        `)
        .join('');
    }
  }

  /**
   * Build project
   */
  private async build() {
    if (!this.activeProject) {
      this.appendOutput('No project open', 'error');
      return;
    }

    this.appendOutput(`Building ${this.activeProject.name}...`);

    try {
      const result = await window.strataSDK.build.compile(this.activeProject.path, {
        verbose: true
      });

      if (result.success) {
        this.appendOutput(`Build successful in ${result.duration}ms`, 'success');
        this.appendOutput(result.output);
      } else {
        this.appendOutput(`Build failed: ${result.error}`, 'error');
      }
    } catch (err) {
      this.appendOutput(`Build error: ${err}`, 'error');
    }
  }

  /**
   * Run project
   */
  private async run() {
    if (!this.activeProject) {
      this.appendOutput('No project open', 'error');
      return;
    }

    this.appendOutput(`Running ${this.activeProject.name}...`);

    try {
      const result = await window.strataSDK.run.execute(this.activeProject.path, {});

      if (result.success) {
        this.appendOutput(result.output, 'success');
      } else {
        this.appendOutput(`Execution failed: ${result.error}`, 'error');
      }
    } catch (err) {
      this.appendOutput(`Execution error: ${err}`, 'error');
    }
  }

  /**
   * Show new project dialog
   */
  private showNewProjectDialog() {
    const name = prompt('Project name:');
    if (name) {
      window.strataSDK.project.create(name, {})
        .then(() => {
          this.appendOutput(`Project "${name}" created`);
          this.loadProjects();
        })
        .catch((err: any) => this.appendOutput(`Error: ${err}`, 'error'));
    }
  }

  /**
   * Show open project dialog
   */
  private showOpenProjectDialog() {
    const path = prompt('Project path:');
    if (path) {
      window.strataSDK.project.open(path)
        .then(() => {
          this.appendOutput(`Project opened from ${path}`);
          this.loadProjects();
        })
        .catch((err: any) => this.appendOutput(`Error: ${err}`, 'error'));
    }
  }

  /**
   * Show add file dialog
   */
  private showAddFileDialog() {
    if (!this.activeProject) {
      this.appendOutput('No project open', 'error');
      return;
    }

    const filePath = prompt('File path (relative to project):');
    if (filePath) {
      window.strataSDK.file.add(this.activeProject.id, filePath, '')
        .then(() => {
          this.appendOutput(`File "${filePath}" created`);
          this.loadProjectFiles(this.activeProject!.id);
        })
        .catch((err: any) => this.appendOutput(`Error: ${err}`, 'error'));
    }
  }

  /**
   * Append to output
   */
  private appendOutput(text: string, type: 'normal' | 'error' | 'success' = 'normal') {
    const output = document.getElementById('output-text');
    if (output) {
      const line = document.createElement('div');
      line.className = type === 'error' ? 'error' : type === 'success' ? 'success' : '';
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }
  }

  /**
   * Switch tab
   */
  private switchTab(tabName?: string) {
    if (!tabName) return;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.remove('active');
    });

    (event?.target as HTMLElement)?.classList.add('active');
    const panel = document.getElementById(`${tabName}-panel`);
    if (panel) panel.classList.add('active');
  }

  /**
   * Handle compile events
   */
  private handleCompileEvent(event: any) {
    if (event.type === 'start') {
      this.appendOutput(event.message);
    } else if (event.type === 'error') {
      this.appendOutput(event.error, 'error');
    } else if (event.type === 'complete') {
      this.appendOutput(event.message, 'success');
    }
  }

  /**
   * Handle runtime events
   */
  private handleRuntimeEvent(event: any) {
    if (event.type === 'start') {
      this.appendOutput(event.message);
    } else if (event.type === 'output') {
      this.appendOutput(event.message);
    } else if (event.type === 'error') {
      this.appendOutput(event.message, 'error');
    } else if (event.type === 'complete') {
      this.appendOutput(event.message, 'success');
    }
  }
}

// Initialize IDE on page load
document.addEventListener('DOMContentLoaded', () => {
  new StrataIDE();
});
