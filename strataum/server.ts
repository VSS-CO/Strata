import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as url from "url";
import * as querystring from "querystring";

// ============================================================================
// STRATAUM REGISTRY SERVER
// ============================================================================
// Package registry server similar to npm, with storage for serverless

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
    tarball: string; // base64 encoded
    createdAt: string;
    updatedAt: string;
}

interface RegistryStorage {
    users: Map<string, User>;
    packages: Map<string, Package[]>; // name -> versions
    tokens: Map<string, string>; // token -> username
}

class StrataumRegistry {
    private port: number;
    private storage: RegistryStorage;

    constructor(port: number = 4873) {
        this.port = port;
        this.storage = {
            users: new Map(),
            packages: new Map(),
            tokens: new Map(),
        };
        this.initializeDefaultUsers();
    }

    private initializeDefaultUsers(): void {
        // Create default admin user
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
        // Simple hash (in production, use bcrypt)
        return Buffer.from(password).toString("base64");
    }

    private generateToken(): string {
        return Buffer.from(Math.random().toString()).toString("hex").slice(0, 40);
    }

    private parseBody(request: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            let body = "";
            request.on("data", (chunk) => {
                body += chunk.toString();
            });
            request.on("end", () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch {
                    resolve(body);
                }
            });
            request.on("error", reject);
        });
    }

    private sendJSON(response: http.ServerResponse, statusCode: number, data: any): void {
        response.writeHead(statusCode, { "Content-Type": "application/json" });
        response.end(JSON.stringify(data, null, 2));
    }

    private sendHTML(response: http.ServerResponse, html: string): void {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(html);
    }

    // ========================================================================
    // API ENDPOINTS
    // ========================================================================

    private async handleRegister(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
        const body = await this.parseBody(request);
        const { username, password, email } = body;

        if (!username || !password || !email) {
            this.sendJSON(response, 400, { error: "Missing required fields" });
            return;
        }

        if (this.storage.users.has(username)) {
            this.sendJSON(response, 409, { error: "User already exists" });
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

        this.sendJSON(response, 201, {
            success: true,
            message: "User registered successfully",
            token,
            user: { username, email },
        });
    }

    private async handleLogin(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
        const body = await this.parseBody(request);
        const { username, password } = body;

        if (!username || !password) {
            this.sendJSON(response, 400, { error: "Missing username or password" });
            return;
        }

        const user = this.storage.users.get(username);
        if (!user || user.password !== this.hashPassword(password)) {
            this.sendJSON(response, 401, { error: "Invalid credentials" });
            return;
        }

        const token = this.generateToken();
        user.token = token;
        this.storage.users.set(username, user);
        this.storage.tokens.set(token, username);

        this.sendJSON(response, 200, {
            success: true,
            token,
            user: { username, email: user.email },
        });
    }

    private async handlePublish(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
        const token = request.headers.authorization?.replace("Bearer ", "");
        if (!token || !this.storage.tokens.has(token)) {
            this.sendJSON(response, 401, { error: "Unauthorized" });
            return;
        }

        const username = this.storage.tokens.get(token)!;
        const body = await this.parseBody(request);
        const { name, version, description, main, license, keywords, tarball } = body;

        if (!name || !version || !tarball) {
            this.sendJSON(response, 400, { error: "Missing required fields" });
            return;
        }

        const pkg: Package = {
            name,
            version,
            author: username,
            description: description || "",
            main: main || "index.str",
            license: license || "MIT",
            keywords: keywords || [],
            tarball,
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

        this.sendJSON(response, 201, {
            success: true,
            message: `Package ${name}@${version} published`,
            package: { name, version, author: username },
        });
    }

    private handleSearch(request: http.IncomingMessage, response: http.ServerResponse): void {
        const parsedUrl = url.parse(request.url || "", true);
        const query = parsedUrl.query.q as string;

        if (!query) {
            this.sendJSON(response, 400, { error: "Missing search query" });
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

        this.sendJSON(response, 200, { results, total: results.length });
    }

    private handlePackageInfo(request: http.IncomingMessage, response: http.ServerResponse, pkgName: string): void {
        const versions = this.storage.packages.get(pkgName);
        if (!versions) {
            this.sendJSON(response, 404, { error: "Package not found" });
            return;
        }

        this.sendJSON(response, 200, {
            name: pkgName,
            versions: versions.map((v) => ({
                version: v.version,
                author: v.author,
                description: v.description,
                publishedAt: v.createdAt,
            })),
        });
    }

    private async handleInstall(request: http.IncomingMessage, response: http.ServerResponse, pkgName: string, version: string): Promise<void> {
        const versions = this.storage.packages.get(pkgName);
        if (!versions) {
            this.sendJSON(response, 404, { error: "Package not found" });
            return;
        }

        let pkg = versions.find((p) => p.version === version || version === "latest");
        if (!pkg) {
            pkg = versions[versions.length - 1];
        }

        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end(Buffer.from(pkg.tarball, "base64"));
    }

    private handleWebUI(response: http.ServerResponse): void {
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

        // Register
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

        // Login
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

        // Search
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

        // Load all packages
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
        this.sendHTML(response, html);
    }

    // ========================================================================
    // HTTP REQUEST HANDLER
    // ========================================================================

    private async handleRequest(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
        const parsedUrl = url.parse(request.url || "", true);
        const pathname = parsedUrl.pathname || "";

        // CORS
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (request.method === "OPTIONS") {
            response.writeHead(200);
            response.end();
            return;
        }

        try {
            // Web UI
            if (pathname === "/" || pathname === "") {
                this.handleWebUI(response);
                return;
            }

            // API Routes
            if (pathname === "/api/register" && request.method === "POST") {
                await this.handleRegister(request, response);
            } else if (pathname === "/api/login" && request.method === "POST") {
                await this.handleLogin(request, response);
            } else if (pathname === "/api/publish" && request.method === "POST") {
                await this.handlePublish(request, response);
            } else if (pathname === "/api/search" && request.method === "GET") {
                this.handleSearch(request, response);
            } else if (pathname === "/api/packages") {
                const packages = Array.from(this.storage.packages.entries()).map(([name, versions]) => ({
                    name,
                    latestVersion: versions[versions.length - 1].version,
                    description: versions[versions.length - 1].description,
                    author: versions[versions.length - 1].author,
                }));
                this.sendJSON(response, 200, { packages });
            } else if (pathname.startsWith("/api/package/")) {
                const parts = pathname.replace("/api/package/", "").split("@");
                const pkgName = parts[0];
                const version = parts[1] || "latest";
                if (request.method === "GET") {
                    this.handlePackageInfo(request, response, pkgName);
                } else if (request.method === "POST") {
                    await this.handleInstall(request, response, pkgName, version);
                }
            } else {
                this.sendJSON(response, 404, { error: "Not found" });
            }
        } catch (error) {
            console.error(error);
            this.sendJSON(response, 500, { error: "Internal server error" });
        }
    }

    public start(): void {
        const server = http.createServer((req, res) => this.handleRequest(req, res));

        server.listen(this.port, () => {
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
