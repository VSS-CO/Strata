/**
 * Strata SDK - Project Management System
 * Handles project creation, configuration, and file management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { Project, ProjectMetadata, StrataConfig, File } from '../types/index.js';

export class ProjectManager extends EventEmitter {
  private projects: Map<string, Project> = new Map();
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    super();
    this.baseDir = baseDir;
  }

  /**
   * Create a new Strata project
   */
  async createProject(name: string, options: Partial<StrataConfig> = {}): Promise<Project> {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const projectPath = path.join(this.baseDir, name);

    // Create directory structure
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'dist'), { recursive: true });
    await fs.mkdir(path.join(projectPath, '.strata'), { recursive: true });

    // Default configuration
    const config: StrataConfig = {
      projectName: name,
      version: '0.1.0',
      target: options.target || 'c',
      optimization: options.optimization || 'O2',
      description: options.description,
      dependencies: options.dependencies || {},
      warnings: options.warnings || { level: 'warn' }
    };

    // Write strata.toml
    const tomlContent = this.generateToml(config);
    await fs.writeFile(path.join(projectPath, 'strata.toml'), tomlContent);

    // Create main.str
    await fs.writeFile(
      path.join(projectPath, 'src', 'main.str'),
      `import io from std::io\n\nfunc main() {\n  io.println("Hello, Strata!")\n}\n`
    );

    // Create project object
    const project: Project = {
      id: projectId,
      name,
      path: projectPath,
      files: new Map(),
      config,
      isOpen: true
    };

    this.projects.set(projectId, project);
    this.emit('projectCreated', { id: projectId, name, path: projectPath });

    return project;
  }

  /**
   * Open existing project
   */
  async openProject(projectPath: string): Promise<Project> {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Load strata.toml
    const tomlPath = path.join(projectPath, 'strata.toml');
    const tomlContent = await fs.readFile(tomlPath, 'utf-8');
    const config = this.parseToml(tomlContent);

    const project: Project = {
      id: projectId,
      name: config.projectName,
      path: projectPath,
      files: new Map(),
      config,
      isOpen: true
    };

    // Load project files
    await this.loadProjectFiles(project);

    this.projects.set(projectId, project);
    this.emit('projectOpened', { id: projectId, name: config.projectName });

    return project;
  }

  /**
   * Close project
   */
  closeProject(projectId: string): void {
    const project = this.projects.get(projectId);
    if (project) {
      project.isOpen = false;
      this.projects.delete(projectId);
      this.emit('projectClosed', { id: projectId });
    }
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  /**
   * List all open projects
   */
  listProjects(): ProjectMetadata[] {
    return Array.from(this.projects.values()).map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: p.config
    }));
  }

  /**
   * Add file to project
   */
  async addFile(projectId: string, filePath: string, content: string = ''): Promise<File> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const fullPath = path.join(project.path, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);

    const file: File = {
      path: filePath,
      name: path.basename(filePath),
      content,
      language: this.detectLanguage(filePath),
      modified: false
    };

    project.files.set(filePath, file);
    this.emit('fileAdded', { projectId, file });

    return file;
  }

  /**
   * Update file content
   */
  async updateFile(projectId: string, filePath: string, content: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const fullPath = path.join(project.path, filePath);
    await fs.writeFile(fullPath, content);

    const file = project.files.get(filePath);
    if (file) {
      file.content = content;
      file.modified = true;
      this.emit('fileUpdated', { projectId, file });
    }
  }

  /**
   * Delete file from project
   */
  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const fullPath = path.join(project.path, filePath);
    await fs.unlink(fullPath);

    project.files.delete(filePath);
    this.emit('fileDeleted', { projectId, filePath });
  }

  /**
   * Get project files
   */
  getProjectFiles(projectId: string): File[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    return Array.from(project.files.values());
  }

  /**
   * Save all project files
   */
  async saveProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    for (const file of project.files.values()) {
      if (file.modified) {
        const fullPath = path.join(project.path, file.path);
        await fs.writeFile(fullPath, file.content);
        file.modified = false;
      }
    }

    this.emit('projectSaved', { id: projectId });
  }

  /**
   * Private helper to load project files
   */
  private async loadProjectFiles(project: Project): Promise<void> {
    const srcPath = path.join(project.path, 'src');
    const files = await this.readDir(srcPath);

    for (const file of files) {
      const fullPath = path.join(srcPath, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const relPath = path.relative(project.path, fullPath);

      project.files.set(relPath, {
        path: relPath,
        name: path.basename(file),
        content,
        language: this.detectLanguage(file),
        modified: false
      });
    }
  }

  /**
   * Recursively read directory
   */
  private async readDir(dir: string, prefix = ''): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        files = [...files, ...(await this.readDir(path.join(dir, entry.name), fullPath))];
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Detect file language from extension
   */
  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const langMap: Record<string, string> = {
      '.str': 'strata',
      '.c': 'c',
      '.h': 'c',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.json': 'json',
      '.toml': 'toml'
    };
    return langMap[ext] || 'text';
  }

  /**
   * Generate TOML from config
   */
  private generateToml(config: StrataConfig): string {
    let toml = `[project]\n`;
    toml += `name = "${config.projectName}"\n`;
    toml += `version = "${config.version}"\n`;
    if (config.description) toml += `description = "${config.description}"\n`;
    toml += `\n[build]\n`;
    toml += `target = "${config.target}"\n`;
    toml += `optimization = "${config.optimization}"\n`;

    if (Object.keys(config.dependencies || {}).length > 0) {
      toml += `\n[dependencies]\n`;
      for (const [name, version] of Object.entries(config.dependencies || {})) {
        toml += `${name} = "${version}"\n`;
      }
    }

    return toml;
  }

  /**
   * Parse TOML to config (simplified)
   */
  private parseToml(content: string): StrataConfig {
    const config: any = {};
    const lines = content.split('\n');
    let section = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('[')) {
        section = trimmed.slice(1, -1);
        if (!config[section]) config[section] = {};
      } else if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (section) {
          config[section][key.trim()] = value;
        } else {
          config[key.trim()] = value;
        }
      }
    }

    return {
      projectName: config.project?.name || 'untitled',
      version: config.project?.version || '0.1.0',
      description: config.project?.description,
      target: config.build?.target || 'c',
      optimization: config.build?.optimization || 'O2',
      dependencies: config.dependencies || {}
    };
  }
}
