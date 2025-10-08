export interface EnvironmentConfig {
	mcpBaseUrl: string
}

// Simplified config for MCP marketplace only
// Authentication and account features have been removed
export const clineEnvConfig: EnvironmentConfig = {
	mcpBaseUrl: "https://api.cline.bot/v1/mcp",
}
