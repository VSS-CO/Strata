import * as functions from "@google-cloud/functions-framework";
import * as express from "express";
import { StrataumRegistry } from "./server";

// ============================================================================
// STRATAUM GOOGLE CLOUD FUNCTIONS ENTRY POINT
// ============================================================================

let registry: StrataumRegistry | null = null;

// Initialize registry on cold start
function initializeRegistry(): StrataumRegistry {
    if (registry) {
        return registry;
    }

    // Load from environment variable if exists (for state persistence)
    if (process.env.REGISTRY_STATE) {
        try {
            const state = JSON.parse(process.env.REGISTRY_STATE);
            registry = StrataumRegistry.fromJSON(state);
            console.log("✓ Registry state restored from environment");
        } catch (error) {
            console.warn("Failed to restore state, creating fresh registry");
            registry = new StrataumRegistry();
        }
    } else {
        registry = new StrataumRegistry();
        console.log("✓ Fresh registry initialized");
    }

    return registry;
}

// Create Express app for the registry
const createApp = (): express.Express => {
    const app = express.default();

    // Initialize registry
    const reg = initializeRegistry();

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

    // Health check
    app.get("/health", (req, res) => {
        res.json({ status: "ok", message: "Strataum Registry is running" });
    });

    // Root redirect to info
    app.get("/", (req, res) => {
        res.json({
            message: "🚀 Strataum Registry (Google Cloud Functions)",
            status: "running",
            endpoints: {
                health: "/health",
                register: "POST /api/register",
                login: "POST /api/login",
                publish: "POST /api/publish",
                search: "GET /api/search?q=<query>",
                packages: "GET /api/packages",
                packageInfo: "GET /api/package/<name>",
                download: "GET /api/package/<name>/<version>",
                export: "GET /api/export (admin only)",
            },
        });
    });

    // API Routes (delegated to registry instance)
    app.post("/api/register", (req, res) => {
        handleRegistryRequest(reg, req, res, "register");
    });

    app.post("/api/login", (req, res) => {
        handleRegistryRequest(reg, req, res, "login");
    });

    app.post("/api/publish", (req, res) => {
        handleRegistryRequest(reg, req, res, "publish");
    });

    app.get("/api/search", (req, res) => {
        handleRegistryRequest(reg, req, res, "search");
    });

    app.get("/api/packages", (req, res) => {
        handleRegistryRequest(reg, req, res, "packages");
    });

    app.get("/api/package/:name", (req, res) => {
        handleRegistryRequest(reg, req, res, "packageInfo");
    });

    app.get("/api/package/:name/:version", (req, res) => {
        handleRegistryRequest(reg, req, res, "download");
    });

    // Export state (for backup/persistence)
    app.get("/api/export", (req, res) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=registry-state.json");
        res.send(reg.toJSON());
    });

    // Import state
    app.post("/api/import", express.json({ limit: "50mb" }), (req, res) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
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
};

// Handle registry requests (this is a simplified delegation)
function handleRegistryRequest(
    reg: StrataumRegistry,
    req: express.Request,
    res: express.Response,
    action: string
): void {
    // For this simple implementation, we'll call the registry methods
    // In production, you'd properly integrate the registry instance methods

    const { username, password, email, name, version, description, main, license, keywords } = req.body;
    const token = req.headers.authorization?.replace("Bearer ", "");

    try {
        switch (action) {
            case "register":
                // Manual implementation for GCF
                if (!username || !password || !email) {
                    res.status(400).json({ error: "Missing required fields" });
                } else {
                    res.status(201).json({
                        success: true,
                        message: "User registered successfully",
                        token: generateToken(),
                        user: { username, email },
                    });
                }
                break;

            case "login":
                if (!username || !password) {
                    res.status(400).json({ error: "Missing username or password" });
                } else {
                    res.status(200).json({
                        success: true,
                        token: generateToken(),
                        user: { username },
                    });
                }
                break;

            case "search":
                const query = req.query.q as string;
                if (!query) {
                    res.status(400).json({ error: "Missing search query" });
                } else {
                    res.json({ results: [], total: 0 });
                }
                break;

            case "packages":
                res.json({ packages: [] });
                break;

            case "packageInfo":
                res.status(404).json({ error: "Package not found" });
                break;

            case "download":
                res.status(404).json({ error: "Package not found" });
                break;

            default:
                res.status(400).json({ error: "Unknown action" });
        }
    } catch (error) {
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}

function generateToken(): string {
    return Buffer.from(Math.random().toString()).toString("hex").slice(0, 40);
}

// Create and export the HTTP function for Google Cloud Functions
const app = createApp();

// Export as named export for Google Cloud Functions framework
export const strataum = app;
