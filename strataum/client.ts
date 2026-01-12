import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// ============================================================================
// STRATAUM REGISTRY CLIENT WITH REAL DOWNLOADS
// ============================================================================

interface RegistryConfig {
    registry: string;
    username?: string;
    token?: string;
}

class StrataumClient {
    private config: RegistryConfig;
    private configPath: string;

    constructor(registry: string = "http://localhost:4873") {
        this.configPath = path.join(process.env.HOME || process.env.USERPROFILE || ".", ".strataumrc");
        this.config = this.loadConfig() || { registry };
    }

    private loadConfig(): RegistryConfig | null {
        try {
            if (fs.existsSync(this.configPath)) {
                const content = fs.readFileSync(this.configPath, "utf-8");
                return JSON.parse(content);
            }
        } catch {
            // Ignore
        }
        return null;
    }

    private saveConfig(): void {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }

    private request(method: string, pathname: string, body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const registryUrl = new URL(this.config.registry);
            const options = {
                hostname: registryUrl.hostname,
                port: registryUrl.port,
                path: pathname,
                method: method,
                headers: {
                    "Content-Type": "application/json",
                } as any,
            };

            if (this.config.token) {
                options.headers.Authorization = `Bearer ${this.config.token}`;
            }

            const protocol = registryUrl.protocol === "https:" ? https : http;

            const req = protocol.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    try {
                        resolve({
                            status: res.statusCode,
                            data: JSON.parse(data),
                        });
                    } catch {
                        resolve({
                            status: res.statusCode,
                            data: data,
                        });
                    }
                });
            });

            req.on("error", reject);

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    private downloadFile(pathname: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const registryUrl = new URL(this.config.registry);
            const options = {
                hostname: registryUrl.hostname,
                port: registryUrl.port,
                path: pathname,
                method: "GET",
            } as any;

            if (this.config.token) {
                options.headers = {
                    Authorization: `Bearer ${this.config.token}`,
                };
            }

            const protocol = registryUrl.protocol === "https:" ? https : http;

            const req = protocol.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed with status ${res.statusCode}`));
                    return;
                }

                const writeStream = fs.createWriteStream(targetPath);
                res.pipe(writeStream);

                writeStream.on("finish", () => {
                    writeStream.close();
                    resolve();
                });

                writeStream.on("error", reject);
            });

            req.on("error", reject);
            req.end();
        });
    }

    async register(username: string, email: string, password: string): Promise<void> {
        try {
            const result = await this.request("POST", "/api/register", {
                username,
                email,
                password,
            });

            if (result.status === 201) {
                this.config.username = username;
                this.config.token = result.data.token;
                this.saveConfig();
                console.log("✓ Registration successful!");
                console.log(`✓ Token saved to ${this.configPath}`);
                console.log(`Welcome, ${username}!`);
            } else {
                console.error("✗ Registration failed:", result.data.error);
                process.exit(1);
            }
        } catch (error) {
            console.error("✗ Error:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async login(username: string, password: string): Promise<void> {
        try {
            const result = await this.request("POST", "/api/login", {
                username,
                password,
            });

            if (result.status === 200) {
                this.config.username = username;
                this.config.token = result.data.token;
                this.saveConfig();
                console.log("✓ Login successful!");
                console.log(`✓ Token saved to ${this.configPath}`);
                console.log(`Welcome back, ${username}!`);
            } else {
                console.error("✗ Login failed:", result.data.error);
                process.exit(1);
            }
        } catch (error) {
            console.error("✗ Error:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async logout(): Promise<void> {
        this.config.username = undefined;
        this.config.token = undefined;
        this.saveConfig();
        console.log("✓ Logged out successfully");
    }

    async publish(packageJsonPath: string): Promise<void> {
        if (!this.config.token) {
            console.error("✗ Not authenticated. Run 'strataum login' first.");
            process.exit(1);
        }

        try {
            // Read package.json
            if (!fs.existsSync(packageJsonPath)) {
                console.error(`✗ File not found: ${packageJsonPath}`);
                process.exit(1);
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            const packageDir = path.dirname(packageJsonPath);

            // Read main file
            const mainFile = packageJson.main || "index.str";
            const mainPath = path.join(packageDir, mainFile);

            if (!fs.existsSync(mainPath)) {
                console.error(`✗ Main file not found: ${mainFile}`);
                process.exit(1);
            }

            const fileContent = fs.readFileSync(mainPath, "utf-8");

            // Create FormData (manual multipart)
            const boundary = "----FormBoundary" + Date.now();
            const formData = this.createFormData(
                boundary,
                {
                    name: packageJson.name,
                    version: packageJson.version,
                    description: packageJson.description,
                    main: packageJson.main || "index.str",
                    license: packageJson.license || "MIT",
                    keywords: packageJson.keywords || [],
                },
                {
                    fieldname: "tarball",
                    filename: mainFile,
                    content: fileContent,
                }
            );

            const registryUrl = new URL(this.config.registry);
            const options = {
                hostname: registryUrl.hostname,
                port: registryUrl.port,
                path: "/api/publish",
                method: "POST",
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    Authorization: `Bearer ${this.config.token}`,
                    "Content-Length": Buffer.byteLength(formData),
                } as any,
            };

            const protocol = registryUrl.protocol === "https:" ? https : http;

            await new Promise<void>((resolve, reject) => {
                const req = protocol.request(options, (res) => {
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("end", () => {
                        const result = JSON.parse(data);
                        if (res.statusCode === 201) {
                            console.log(`✓ Published ${packageJson.name}@${packageJson.version}`);
                            console.log(`✓ Available at: ${this.config.registry}/api/package/${packageJson.name}/${packageJson.version}`);
                            resolve();
                        } else {
                            console.error("✗ Publish failed:", result.error);
                            reject(new Error(result.error));
                        }
                    });
                });

                req.on("error", reject);
                req.write(formData);
                req.end();
            });
        } catch (error) {
            console.error("✗ Error:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    private createFormData(
        boundary: string,
        fields: Record<string, any>,
        file: { fieldname: string; filename: string; content: string }
    ): string {
        let result = "";

        // Add text fields
        for (const [key, value] of Object.entries(fields)) {
            result += `--${boundary}\r\n`;
            result += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
            result += `${typeof value === "object" ? JSON.stringify(value) : value}\r\n`;
        }

        // Add file field
        result += `--${boundary}\r\n`;
        result += `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\n`;
        result += `Content-Type: text/plain\r\n\r\n`;
        result += `${file.content}\r\n`;

        result += `--${boundary}--\r\n`;

        return result;
    }

    async download(packageName: string, version: string = "latest", targetDir: string = "."): Promise<void> {
        try {
            console.log(`⬇️  Downloading ${packageName}@${version}...`);

            const outputPath = path.join(targetDir, `${packageName}.str`);

            await this.downloadFile(`/api/package/${packageName}/${version}`, outputPath);

            console.log(`✓ Downloaded ${packageName}@${version}`);
            console.log(`✓ Saved to ${outputPath}`);
        } catch (error) {
            console.error("✗ Download failed:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async search(query: string): Promise<void> {
        try {
            const result = await this.request("GET", `/api/search?q=${encodeURIComponent(query)}`);

            if (result.status === 200) {
                const { results } = result.data;
                if (results.length === 0) {
                    console.log("No packages found");
                    return;
                }

                console.log(`\nFound ${results.length} package(s):\n`);
                results.forEach((pkg: any) => {
                    console.log(`📦 ${pkg.name}@${pkg.latestVersion}`);
                    console.log(`   ${pkg.description}`);
                    console.log(`   Author: ${pkg.author}\n`);
                });
            } else {
                console.error("✗ Search failed:", result.data.error);
                process.exit(1);
            }
        } catch (error) {
            console.error("✗ Error:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async info(packageName: string): Promise<void> {
        try {
            const result = await this.request("GET", `/api/package/${packageName}`);

            if (result.status === 200) {
                const { name, versions } = result.data;
                console.log(`\n📦 ${name}\n`);
                console.log("Versions:");
                versions.forEach((v: any) => {
                    console.log(`  ${v.version} - ${v.description}`);
                    console.log(`    Published by ${v.author} on ${new Date(v.publishedAt).toLocaleDateString()}`);
                });
            } else {
                console.error("✗ Package not found");
                process.exit(1);
            }
        } catch (error) {
            console.error("✗ Error:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }

    async whoami(): Promise<void> {
        if (!this.config.username) {
            console.log("Not logged in");
            return;
        }
        console.log(this.config.username);
    }

    setRegistry(registry: string): void {
        this.config.registry = registry;
        this.saveConfig();
        console.log(`✓ Registry set to ${registry}`);
    }
}

// ============================================================================
// CLI HANDLER
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];
const client = new StrataumClient(process.env.STRATAUM_REGISTRY || "http://localhost:4873");

async function main() {
    switch (command) {
        case "register":
            if (args.length < 4) {
                console.error("Usage: strataum register <username> <email> <password>");
                process.exit(1);
            }
            await client.register(args[1], args[2], args[3]);
            break;

        case "login":
            if (args.length < 3) {
                console.error("Usage: strataum login <username> <password>");
                process.exit(1);
            }
            await client.login(args[1], args[2]);
            break;

        case "logout":
            await client.logout();
            break;

        case "publish":
            if (args.length < 2) {
                console.error("Usage: strataum publish <package.json>");
                process.exit(1);
            }
            await client.publish(args[1]);
            break;

        case "download":
            if (args.length < 2) {
                console.error("Usage: strataum download <package> [version] [targetDir]");
                process.exit(1);
            }
            await client.download(args[1], args[2] || "latest", args[3] || ".");
            break;

        case "search":
            if (args.length < 2) {
                console.error("Usage: strataum search <query>");
                process.exit(1);
            }
            await client.search(args[1]);
            break;

        case "info":
            if (args.length < 2) {
                console.error("Usage: strataum info <package>");
                process.exit(1);
            }
            await client.info(args[1]);
            break;

        case "whoami":
            await client.whoami();
            break;

        case "set-registry":
            if (args.length < 2) {
                console.error("Usage: strataum set-registry <url>");
                process.exit(1);
            }
            client.setRegistry(args[1]);
            break;

        default:
            console.error(`Unknown command: ${command}`);
            console.error("Available commands:");
            console.error("  register <username> <email> <password>");
            console.error("  login <username> <password>");
            console.error("  logout");
            console.error("  publish <package.json>");
            console.error("  download <package> [version] [targetDir]");
            console.error("  search <query>");
            console.error("  info <package>");
            console.error("  whoami");
            console.error("  set-registry <url>");
            process.exit(1);
    }
}

main().catch(console.error);

export { StrataumClient };
