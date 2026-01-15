import * as fs from "fs";
import * as path from "path";
import express, { Express, Request, Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";

// ============================================================================
// STRATAUM REGISTRY SERVER (EXPRESS)
// ============================================================================
// Package registry server similar to npm, with real file downloads

interface User {
    username: string;
    password: string; // hashed
    email: string;
    token: string;
    createdAt: string;
}

interface Package {
    name: string;
    version: string;
    author: string;
    description: string;
    main: string;
    license: string;
    keywords: string[];
    content: string; // Actual file content (not base64 anymore)
    createdAt: string;
    updatedAt: string;
}

interface RegistryStorage {
    users: Map<string, User>;
    packages: Map<string, Package[]>; // name -> versions
    tokens: Map<string, string>; // token -> username
}

class StrataumRegistry {
    private app: Express;
    private port: number;
    private storage: RegistryStorage;
    private upload: multer.Multer;

    constructor(port: number = 4873) {
        this.port = port;
        this.app = express();
        this.storage = {
            users: new Map(),
            packages: new Map(),
            tokens: new Map(),
        };

        // Multer for file uploads
        const storage = multer.memoryStorage();
        this.upload = multer({ storage });

        this.initializeDefaultUsers();
        this.setupRoutes();
    }

    private initializeDefaultUsers(): void {
        const adminUser: User = {
            username: "admin",
            password: this.hashPassword("admin123"),
            email: "admin@stratauim.io",
            token: this.generateToken(),
            createdAt: new Date().toISOString(),
        };
        this.storage.users.set("admin", adminUser);
        this.storage.tokens.set(adminUser.token, "admin");
    }

    private hashPassword(password: string): string {
        return Buffer.from(password).toString("base64");
    }

    private generateToken(): string {
        return Buffer.from(Math.random().toString()).toString("hex").slice(0, 40);
    }

    private sendJSON(res: Response, statusCode: number, data: any): void {
        res.status(statusCode).json(data);
    }

    // ========================================================================
    // MIDDLEWARE
    // ========================================================================

    private setupRoutes(): void {
        // Middleware
        this.app.use(express.json({ limit: "10mb" }));
        this.app.use(express.urlencoded({ limit: "10mb", extended: true }));

        // CORS
        this.app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            if (req.method === "OPTIONS") {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Rate limiting
        const loginLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // Limit each IP to 10 login requests per window
            standardHeaders: true,
            legacyHeaders: false,
        });

        // Web UI
        this.app.get("/", (req, res) => this.handleWebUI(res));

        // API Routes
        this.app.post("/api/register", (req, res) => this.handleRegister(req, res));
        this.app.post("/api/login", loginLimiter, (req, res) => this.handleLogin(req, res));
        this.app.post("/api/publish", this.upload.single("tarball"), (req, res) => this.handlePublish(req, res));
        this.app.get("/api/search", (req, res) => this.handleSearch(req, res));
        this.app.get("/api/packages", (req, res) => this.handlePackagesList(req, res));
        this.app.get("/api/package/:name", (req, res) => this.handlePackageInfo(req, res));
        this.app.get("/api/package/:name/:version", (req, res) => this.handleDownload(req, res));

        // 404
        this.app.use((req, res) => {
            this.sendJSON(res, 404, { error: "Not found" });
        });
    }

    // ========================================================================
    // API HANDLERS
    // ========================================================================

    private handleRegister(req: Request, res: Response): void {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            this.sendJSON(res, 400, { error: "Missing required fields" });
            return;
        }

        if (this.storage.users.has(username)) {
            this.sendJSON(res, 409, { error: "User already exists" });
            return;
        }

        const token = this.generateToken();
        const user: User = {
            username,
            password: this.hashPassword(password),
            email,
            token,
            createdAt: new Date().toISOString(),
        };

        this.storage.users.set(username, user);
        this.storage.tokens.set(token, username);

        this.sendJSON(res, 201, {
            success: true,
            message: "User registered successfully",
            token,
            user: { username, email },
        });
    }

    private handleLogin(req: Request, res: Response): void {
        const { username, password } = req.body;

        if (!username || !password) {
            this.sendJSON(res, 400, { error: "Missing username or password" });
            return;
        }

        const user = this.storage.users.get(username);
        if (!user || user.password !== this.hashPassword(password)) {
            this.sendJSON(res, 401, { error: "Invalid credentials" });
            return;
        }

        const token = this.generateToken();
        user.token = token;
        this.storage.users.set(username, user);
        this.storage.tokens.set(token, username);

        this.sendJSON(res, 200, {
            success: true,
            token,
            user: { username, email: user.email },
        });
    }

    private handlePublish(req: Request, res: Response): void {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token || !this.storage.tokens.has(token)) {
            this.sendJSON(res, 401, { error: "Unauthorized" });
            return;
        }

        const username = this.storage.tokens.get(token)!;
        const { name, version, description, main, license, keywords } = req.body;

        if (!name || !version || !req.file) {
            this.sendJSON(res, 400, { error: "Missing required fields or file" });
            return;
        }

        // Get actual file content from upload
        const content = req.file.buffer.toString("utf-8");

        const pkg: Package = {
            name,
            version,
            author: username,
            description: description || "",
            main: main || "index.str",
            license: license || "MIT",
            keywords: keywords || [],
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (!this.storage.packages.has(name)) {
            this.storage.packages.set(name, []);
        }

        const versions = this.storage.packages.get(name)!;
        const existingIndex = versions.findIndex((p) => p.version === version);
        if (existingIndex >= 0) {
            versions[existingIndex] = pkg;
        } else {
            versions.push(pkg);
        }

        this.sendJSON(res, 201, {
            success: true,
            message: `Package ${name}@${version} published`,
            package: { name, version, author: username },
        });
    }

    private handleSearch(req: Request, res: Response): void {
        const query = req.query.q as string;

        if (!query) {
            this.sendJSON(res, 400, { error: "Missing search query" });
            return;
        }

        const results = Array.from(this.storage.packages.entries())
            .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
            .map(([name, versions]) => ({
                name,
                latestVersion: versions[versions.length - 1].version,
                description: versions[versions.length - 1].description,
                author: versions[versions.length - 1].author,
            }));

        this.sendJSON(res, 200, { results, total: results.length });
    }

    private handlePackagesList(req: Request, res: Response): void {
        const packages = Array.from(this.storage.packages.entries()).map(([name, versions]) => ({
            name,
            latestVersion: versions[versions.length - 1].version,
            description: versions[versions.length - 1].description,
            author: versions[versions.length - 1].author,
        }));
        this.sendJSON(res, 200, { packages });
    }

    private handlePackageInfo(req: Request, res: Response): void {
        const pkgName = req.params.name;
        const versions = this.storage.packages.get(pkgName);
        if (!versions) {
            this.sendJSON(res, 404, { error: "Package not found" });
            return;
        }

        this.sendJSON(res, 200, {
            name: pkgName,
            versions: versions.map((v) => ({
                version: v.version,
                author: v.author,
                description: v.description,
                publishedAt: v.createdAt,
            })),
        });
    }

    private handleDownload(req: Request, res: Response): void {
        const pkgName = req.params.name;
        const version = req.params.version || "latest";
        const versions = this.storage.packages.get(pkgName);

        if (!versions) {
            this.sendJSON(res, 404, { error: "Package not found" });
            return;
        }

        let pkg = versions.find((p) => p.version === version || version === "latest");
        if (!pkg) {
            pkg = versions[versions.length - 1];
        }

        // Send file content
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${pkg.name}-${pkg.version}.str"`);
        res.send(pkg.content);
    }

    // ========================================================================
    // WEB UI
    // ========================================================================

    private handleWebUI(res: Response): void {
        const packagesCount = this.storage.packages.size;
        const usersCount = this.storage.users.size;
        const totalVersions = Array.from(this.storage.packages.values()).reduce(
            (sum, versions) => sum + versions.length,
            0
        );

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strataum Registry</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            padding: 40px;
            border-radius: 8px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .subtitle { font-size: 1.1em; opacity: 0.9; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .stat-card h3 { color: #667eea; font-size: 2em; margin-bottom: 10px; }
        .stat-card p { color: #666; font-size: 0.95em; }
        .section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .section h2 { color: #333; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        input, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: inherit;
            font-size: 1em;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.3s;
        }
        button:hover { background: #5568d3; }
        .packages-list { list-style: none; }
        .package-item {
            background: #f8f9fa;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 4px solid #667eea;
        }
        .package-item h4 { color: #667eea; margin-bottom: 5px; }
        .package-item p { color: #666; font-size: 0.9em; }
        .version-badge {
            display: inline-block;
            background: #e7e9f5;
            color: #667eea;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .message {
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📦 Strataum Registry</h1>
            <p class="subtitle">Official package registry for the Strata language</p>
        </header>

        <div class="stats">
            <div class="stat-card">
                <h3>${packagesCount}</h3>
                <p>Packages</p>
            </div>
            <div class="stat-card">
                <h3>${totalVersions}</h3>
                <p>Package Versions</p>
            </div>
            <div class="stat-card">
                <h3>${usersCount}</h3>
                <p>Users</p>
            </div>
        </div>

        <div class="section">
            <h2>Register</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label for="regUsername">Username</label>
                    <input type="text" id="regUsername" required>
                </div>
                <div class="form-group">
                    <label for="regEmail">Email</label>
                    <input type="email" id="regEmail" required>
                </div>
                <div class="form-group">
                    <label for="regPassword">Password</label>
                    <input type="password" id="regPassword" required>
                </div>
                <button type="submit">Register</button>
                <div id="registerMessage"></div>
            </form>
        </div>

        <div class="section">
            <h2>Login</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginUsername">Username</label>
                    <input type="text" id="loginUsername" required value="admin">
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" required value="admin123">
                </div>
                <button type="submit">Login</button>
                <div id="loginMessage"></div>
            </form>
        </div>

        <div class="section">
            <h2>Search Packages</h2>
            <form id="searchForm">
                <div class="form-group">
                    <label for="searchQuery">Package Name</label>
                    <input type="text" id="searchQuery" placeholder="e.g., http, json">
                </div>
                <button type="submit">Search</button>
            </form>
            <div id="searchResults"></div>
        </div>

        <div class="section">
            <h2>All Packages</h2>
            <ul class="packages-list" id="packagesList"></ul>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;
        let token = localStorage.getItem("strataumToken");

        document.getElementById("registerForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("regUsername").value;
            const email = document.getElementById("regEmail").value;
            const password = document.getElementById("regPassword").value;

            try {
                const res = await fetch(API_BASE + "/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password }),
                });
                const data = await res.json();
                const msg = document.getElementById("registerMessage");
                if (res.ok) {
                    msg.innerHTML = '<div class="message success">✓ Registration successful! Token: ' + data.token + '</div>';
                    localStorage.setItem("strataumToken", data.token);
                    token = data.token;
                } else {
                    msg.innerHTML = '<div class="message error">✗ ' + data.error + '</div>';
                }
            } catch (err) {
                document.getElementById("registerMessage").innerHTML = '<div class="message error">✗ Error: ' + err.message + '</div>';
            }
        });

        document.getElementById("loginForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;

            try {
                const res = await fetch(API_BASE + "/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });
                const data = await res.json();
                const msg = document.getElementById("loginMessage");
                if (res.ok) {
                    msg.innerHTML = '<div class="message success">✓ Login successful! Token: ' + data.token + '</div>';
                    localStorage.setItem("strataumToken", data.token);
                    token = data.token;
                } else {
                    msg.innerHTML = '<div class="message error">✗ ' + data.error + '</div>';
                }
            } catch (err) {
                document.getElementById("loginMessage").innerHTML = '<div class="message error">✗ Error: ' + err.message + '</div>';
            }
        });

        document.getElementById("searchForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const query = document.getElementById("searchQuery").value;

            try {
                const res = await fetch(API_BASE + "/api/search?q=" + encodeURIComponent(query));
                const data = await res.json();
                const results = document.getElementById("searchResults");
                if (data.results.length > 0) {
                    results.innerHTML = data.results.map(pkg =>
                        '<div class="package-item"><h4>' + pkg.name +
                        ' <span class="version-badge">' + pkg.latestVersion + '</span></h4>' +
                        '<p>' + pkg.description + ' - by ' + pkg.author + '</p></div>'
                    ).join("");
                } else {
                    results.innerHTML = '<p>No packages found</p>';
                }
            } catch (err) {
                document.getElementById("searchResults").innerHTML = '<div class="message error">✗ Error: ' + err.message + '</div>';
            }
        });

        async function loadPackages() {
            try {
                const res = await fetch(API_BASE + "/api/packages");
                const data = await res.json();
                const list = document.getElementById("packagesList");
                if (data.packages.length > 0) {
                    list.innerHTML = data.packages.map(pkg =>
                        '<li class="package-item"><h4>' + pkg.name +
                        ' <span class="version-badge">' + pkg.latestVersion + '</span></h4>' +
                        '<p>' + pkg.description + ' - by ' + pkg.author + '</p></li>'
                    ).join("");
                } else {
                    list.innerHTML = '<li><p>No packages published yet</p></li>';
                }
            } catch (err) {
                console.error(err);
            }
        }

        loadPackages();
        setInterval(loadPackages, 5000);
    </script>
</body>
</html>
        `;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`🚀 Strataum Registry running on http://localhost:${this.port}`);
            console.log(`📦 Web UI: http://localhost:${this.port}`);
            console.log(`🔐 Default credentials: admin / admin123`);
        });
    }

    // ========================================================================
    // EXPORT FOR SERVERLESS
    // ========================================================================

    public toJSON(): string {
        return JSON.stringify(
            {
                users: Array.from(this.storage.users.entries()).map(([uname, user]) => {
                    const obj: any = { username: uname };
                    Object.assign(obj, user);
                    return obj;
                }),
                packages: Array.from(this.storage.packages.entries()).map(([name, versions]) => ({
                    name,
                    versions,
                })),
            },
            null,
            2
        );
    }

    public static fromJSON(data: any): StrataumRegistry {
        const registry = new StrataumRegistry();
        registry.storage.users.clear();
        registry.storage.packages.clear();
        registry.storage.tokens.clear();

        data.users.forEach((user: any) => {
            const { username: uname, ...rest } = user;
            registry.storage.users.set(uname, rest);
            registry.storage.tokens.set(rest.token, uname);
        });

        data.packages.forEach(({ name, versions }: any) => {
            registry.storage.packages.set(name, versions);
        });

        return registry;
    }
}

// ============================================================================
// START SERVER
// ============================================================================

const registry = new StrataumRegistry(process.env.PORT ? parseInt(process.env.PORT) : 4873);
registry.start();

export { StrataumRegistry };
