import * as express from "express";
import * as fs from "fs";
import multer from "multer";

// ============================================================================
// STRATAUM REGISTRY - VANILLA NODE.JS SERVER
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
// REGISTRY CLASS
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
        console.log("✓ Admin user initialized (admin/admin123)");
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

        console.log(`✓ User registered: ${username}`);
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

        console.log(`✓ User logged in: ${username}`);
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

        console.log(`✓ Published: ${name}@${version}`);
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
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

const registry = new StrataumRegistry();

// ============================================================================
// EXPRESS APP
// ============================================================================

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

// ============================================================================
// ROUTES
// ============================================================================

app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Strataum Registry is running" });
});

app.get("/", (req, res) => {
    res.json({
        message: "🚀 Strataum Registry",
        status: "running",
        version: "1.0.0",
        endpoints: {
            health: "GET /health",
            register: "POST /register",
            login: "POST /login",
            publish: "POST /publish",
            search: "GET /search?q=<query>",
            packages: "GET /packages",
            packageInfo: "GET /package/<name>",
            download: "GET /package/<name>/<version>",
        },
    });
});

app.post("/register", (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const result = registry.register(username, email, password);

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

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
    }

    const result = registry.login(username, password);

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

app.post("/publish", upload.single("tarball"), (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const author = registry.validateToken(token);
    if (!author) {
        return res.status(401).json({ error: "Invalid token" });
    }

    const { name, version, description, main, license, keywords } = req.body;
    if (!name || !version || !req.file) {
        return res.status(400).json({ error: "Missing required fields or file" });
    }

    const content = req.file.buffer.toString("utf-8");
    const result = registry.publish(
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

app.get("/search", (req, res) => {
    const query = req.query.q as string;

    if (!query) {
        return res.status(400).json({ error: "Missing search query" });
    }

    const results = registry.search(query);
    res.json({ results, total: results.length });
});

app.get("/packages", (req, res) => {
    const packages = registry.getPackages();
    res.json({ packages });
});

app.get("/package/:name", (req, res) => {
    const info = registry.getPackageInfo(req.params.name);

    if (!info) {
        return res.status(404).json({ error: "Package not found" });
    }

    res.json(info);
});

app.get("/package/:name/:version", (req, res) => {
    const content = registry.downloadPackage(req.params.name, req.params.version);

    if (!content) {
        return res.status(404).json({ error: "Package not found" });
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.name}.str"`);
    res.send(content);
});

// 404
app.use((req, res) => {
    res.status(404).json({
        error: "Not found",
        path: req.path,
        method: req.method,
    });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = parseInt(process.env.PORT || "3000", 10);

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  🚀 STRATAUM REGISTRY RUNNING          ║
╠════════════════════════════════════════╣
║  📍 http://localhost:${PORT}${PORT === 3000 ? "              " : "             "}║
║  🔐 admin / admin123                   ║
║  📦 POST   /publish    (publish pkg)   ║
║  🔍 GET    /search     (find pkg)      ║
║  💾 GET    /package    (get info)      ║
║  ⬇️  GET    /package/:name/:version    ║
╚════════════════════════════════════════╝
    `);
});

export default app;
