import type { McpServer } from "@/shared/mcp"
import { SystemPromptSection } from "../templates/section_definitions"
import { createComponent } from "./base_component"

/**
 * MCP Servers - Model Context Protocol server integration
 *
 * Refactored to use unified base component system.
 * Maintains MCP server formatting logic as domain-specific helper.
 */

const MCP_TEMPLATE_TEXT = `MCP SERVERS

The Model Context Protocol (MCP) enables communication between the system and locally running MCP servers that provide additional tools and resources to extend your capabilities.

# Connected MCP Servers

When a server is connected, you can use the server's tools via the \`use_mcp_tool\` tool, and access the server's resources via the \`access_mcp_resource\` tool.

{{MCP_SERVERS_LIST}}`

export const getMcp = createComponent({
	section: SystemPromptSection.MCP,
	defaultTemplate: MCP_TEMPLATE_TEXT,
	shouldInclude: (context) => {
		const servers = context.mcpHub?.getServers() || []
		return servers.length > 0
	},
	buildVariables: (context) => {
		const servers = context.mcpHub?.getServers() || []
		const serversList =
			servers.length > 0
				? formatMcpServersList(servers.filter((s) => s.status === "connected"))
				: "(No MCP servers currently connected)"
		return { MCP_SERVERS_LIST: serversList }
	},
})

function formatMcpServersList(servers: McpServer[]): string {
	return servers
		.filter((server) => server.status === "connected")
		.map((server) => {
			const tools = server.tools
				?.map((tool) => {
					const schemaStr = tool.inputSchema
						? `    Input Schema:
    ${JSON.stringify(tool.inputSchema, null, 2).split("\n").join("\n    ")}`
						: ""

					return `- ${tool.name}: ${tool.description}\n${schemaStr}`
				})
				.join("\n\n")

			const templates = server.resourceTemplates
				?.map((template) => `- ${template.uriTemplate} (${template.name}): ${template.description}`)
				.join("\n")

			const resources = server.resources
				?.map((resource) => `- ${resource.uri} (${resource.name}): ${resource.description}`)
				.join("\n")

			const config = JSON.parse(server.config)

			return (
				`## ${server.name}` +
				(config.command
					? ` (\`${config.command}${config.args && Array.isArray(config.args) ? ` ${config.args.join(" ")}` : ""}\`)`
					: "") +
				(tools ? `\n\n### Available Tools\n${tools}` : "") +
				(templates ? `\n\n### Resource Templates\n${templates}` : "") +
				(resources ? `\n\n### Direct Resources\n${resources}` : "")
			)
		})
		.join("\n\n")
}
