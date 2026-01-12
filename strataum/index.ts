import * as functions from "@google-cloud/functions-framework";
import * as express from "express";
import * as fs from "fs";
import * as path from "path";
import multer from "multer";

// ============================================================================
// STRATAUM REGISTRY - GOOGLE CLOUD FUNCTIONS ENTRY POINT
// ============================================================================

interface User {
    username: string;
    password: string;
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
    content: string;
    createdAt: string;
    updatedAt: string;
}

interface RegistryStorage {
    users: Map<string, User>;
    packages: Map<string, Package[]>;
    tokens: Map<string, string>;
}

// ============================================================================
// REGISTRY IMPLEMENTATION
// ============================================================================

class StrataumRegistry {
    private storage: RegistryStorage;

    constructor() {
        this.storage = {
            users: new Map(),
            packages: new Map(),
            tokens: new Map(),
        };
        this.initializeDefaultUsers();
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

    register(username: string, email: string, password: string): { success: boolean; token?: string; error?: string } {
        if (this.storage.users.has(username)) {
            return { success: false, error: "User already exists" };
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

        return { success: true, token };
    }

    login(username: string, password: string): { success: boolean; token?: string; error?: string } {
        const user = this.storage.users.get(username);
        if (!user || user.password !== this.hashPassword(password)) {
            return { success: false, error: "Invalid credentials" };
        }

        const token = this.generateToken();
        user.token = token;
        this.storage.tokens.set(token, username);

        return { success: true, token };
    }

    publish(
        name: string,
        version: string,
        description: string,
        main: string,
        license: string,
        keywords: string[],
        content: string,
        author: string
    ): { success: boolean; message?: string; error?: string } {
        const pkg: Package = {
            name,
            version,
            author,
            description,
            main,
            license,
            keywords,
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

        return { success: true, message: `Published ${name}@${version}` };
    }

    search(query: string): any[] {
        return Array.from(this.storage.packages.entries())
            .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
            .map(([name, versions]) => ({
                name,
                latestVersion: versions[versions.length - 1].version,
                description: versions[versions.length - 1].description,
                author: versions[versions.length - 1].author,
            }));
    }

    getPackageInfo(name: string): { name: string; versions: any[] } | null {
        const versions = this.storage.packages.get(name);
        if (!versions) return null;

        return {
            name,
            versions: versions.map((v) => ({
                version: v.version,
                author: v.author,
                description: v.description,
                publishedAt: v.createdAt,
            })),
        };
    }

    downloadPackage(name: string, version: string = "latest"): string | null {
        const versions = this.storage.packages.get(name);
        if (!versions) return null;

        let pkg = versions.find((p) => p.version === version || version === "latest");
        if (!pkg) {
            pkg = versions[versions.length - 1];
        }

        return pkg.content;
    }

    getPackages(): any[] {
        return Array.from(this.storage.packages.entries()).map(([name, versions]) => ({
            name,
            latestVersion: versions[versions.length - 1].version,
            description: versions[versions.length - 1].description,
            author: versions[versions.length - 1].author,
        }));
    }

    validateToken(token: string): string | null {
        return this.storage.tokens.get(token) || null;
    }

    toJSON(): string {
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

    static fromJSON(data: any): StrataumRegistry {
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
// GLOBAL REGISTRY INSTANCE (SHARED ACROSS INVOCATIONS)
// ============================================================================

let registry: StrataumRegistry | null = null;

function getRegistry(): StrataumRegistry {
    if (!registry) {
        // Try to restore from environment
        if (process.env.REGISTRY_STATE) {
            try {
                const state = JSON.parse(process.env.REGISTRY_STATE);
                registry = StrataumRegistry.fromJSON(state);
                console.log("✓ Registry restored from state");
            } catch (error) {
                console.warn("Failed to restore state, creating fresh registry");
                registry = new StrataumRegistry();
            }
        } else {
            registry = new StrataumRegistry();
            console.log("✓ Fresh registry initialized");
        }
    }
    return registry;
}

// ============================================================================
// EXPRESS APP
// ============================================================================

function createApp(): express.Express {
    const app = express.default();
    const upload = multer({ storage: multer.memoryStorage() });

    // Middleware
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));

    // CORS
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    // ========================================================================
    // ROUTES
    // ========================================================================

    // Health check
    app.get("/health", (req, res) => {
        res.json({ status: "ok", message: "Strataum Registry is running" });
    });

    // Root info
    app.get("/", (req, res) => {
        res.json({
            message: "🚀 Strataum Registry (Google Cloud Functions)",
            status: "running",
            version: "1.0.0",
            endpoints: {
                health: "GET /health",
                register: "POST /api/register",
                login: "POST /api/login",
                publish: "POST /api/publish",
                search: "GET /api/search?q=<query>",
                packages: "GET /api/packages",
                packageInfo: "GET /api/package/<name>",
                download: "GET /api/package/<name>/<version>",
            },
        });
    });

    // Register
    app.post("/api/register", (req, res) => {
        const { username, password, email } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const reg = getRegistry();
        const result = reg.register(username, email, password);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: "User registered successfully",
                token: result.token,
                user: { username, email },
            });
        } else {
            res.status(409).json({ error: result.error });
        }
    });

    // Login
    app.post("/api/login", (req, res) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Missing username or password" });
        }

        const reg = getRegistry();
        const result = reg.login(username, password);

        if (result.success) {
            res.status(200).json({
                success: true,
                token: result.token,
                user: { username },
            });
        } else {
            res.status(401).json({ error: result.error });
        }
    });

    // Publish
    app.post("/api/publish", upload.single("tarball"), (req, res) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const reg = getRegistry();
        const author = reg.validateToken(token);
        if (!author) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const { name, version, description, main, license, keywords } = req.body;
        if (!name || !version || !req.file) {
            return res.status(400).json({ error: "Missing required fields or file" });
        }

        const content = req.file.buffer.toString("utf-8");
        const result = reg.publish(
            name,
            version,
            description || "",
            main || "index.str",
            license || "MIT",
            keywords || [],
            content,
            author
        );

        if (result.success) {
            res.status(201).json({
                success: true,
                message: result.message,
                package: { name, version, author },
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    });

    // Search
    app.get("/api/search", (req, res) => {
        const query = req.query.q as string;

        if (!query) {
            return res.status(400).json({ error: "Missing search query" });
        }

        const reg = getRegistry();
        const results = reg.search(query);

        res.json({ results, total: results.length });
    });

    // Get all packages
    app.get("/api/packages", (req, res) => {
        const reg = getRegistry();
        const packages = reg.getPackages();

        res.json({ packages });
    });

    // Get package info
    app.get("/api/package/:name", (req, res) => {
        const reg = getRegistry();
        const info = reg.getPackageInfo(req.params.name);

        if (!info) {
            return res.status(404).json({ error: "Package not found" });
        }

        res.json(info);
    });

    // Download package
    app.get("/api/package/:name/:version", (req, res) => {
        const reg = getRegistry();
        const content = reg.downloadPackage(req.params.name, req.params.version);

        if (!content) {
            return res.status(404).json({ error: "Package not found" });
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="${req.params.name}.str"`);
        res.send(content);
    });

    // Export state (backup)
    app.get("/api/export", (req, res) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const reg = getRegistry();
        if (!reg.validateToken(token)) {
            return res.status(401).json({ error: "Invalid token" });
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=registry-state.json");
        res.send(reg.toJSON());
    });

    // Import state (restore)
    app.post("/api/import", express.json({ limit: "50mb" }), (req, res) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const oldRegistry = getRegistry();
        if (!oldRegistry.validateToken(token)) {
            return res.status(401).json({ error: "Invalid token" });
        }

        try {
            const state = req.body;
            registry = StrataumRegistry.fromJSON(state);
            process.env.REGISTRY_STATE = JSON.stringify(state);

            res.json({
                success: true,
                message: "Registry state imported successfully",
            });
        } catch (error) {
            res.status(400).json({
                error: "Invalid state",
                details: error instanceof Error ? error.message : String(error),
            });
        }
    });

    // 404
    app.use((req, res) => {
        res.status(404).json({
            error: "Not found",
            path: req.path,
            method: req.method,
        });
    });

    return app;
}

// ============================================================================
// GOOGLE CLOUD FUNCTIONS ENTRY POINT
// ============================================================================

const app = createApp();

// Register HTTP function with Google Cloud Functions Framework
functions.http("strataum", app);

// For local testing (Express listen)
if (process.env.NODE_ENV === "development" || process.env.LOCAL_DEVELOPMENT) {
    const port = parseInt(process.env.PORT || "3000", 10);
    app.listen(port, () => {
        console.log(`✓ Strataum Registry listening on port ${port}`);
        console.log(`📦 Access at http://localhost:${port}`);
    });
}

// Export for testing and direct imports
export { app, StrataumRegistry, getRegistry };
