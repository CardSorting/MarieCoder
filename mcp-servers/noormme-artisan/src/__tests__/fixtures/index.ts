/**
 * Test Fixtures Index
 * Export all test fixtures and utilities
 */

export * from "./mock-commands.js"
export {
	mockCommands,
	mockDbMigrateCommand,
	mockDbSeedCommand,
	mockInstallAdminCommand,
	mockInstallAuthCommand,
	mockMakeApiCommand,
	mockMakeComponentCommand,
	mockMakeMiddlewareCommand,
	mockMakeMigrationCommand,
	mockMakePageCommand,
	mockMakeServiceCommand,
	mockNewProjectCommand,
	mockServeCommand,
	mockTestCommand,
	setupMockCommands,
	teardownMockCommands,
} from "./mock-commands.js"
export * from "./mock-fs.js"
export {
	MockFileSystem,
	mockFs,
	mockFsExtra,
	mockPath,
	mockProcessCwd,
	mockProcessEnv,
	setupMockFileSystem,
	teardownMockFileSystem,
} from "./mock-fs.js"
export * from "./mock-mcp.js"
export {
	MockMCPServer,
	mockMCPSDK,
	mockMCPServer,
	mockToolResults,
	mockToolSchemas,
	setupMockMCP,
	teardownMockMCP,
} from "./mock-mcp.js"
export * from "./mock-utils.js"
export {
	mockErrorHandler,
	mockFileGenerator,
	mockProjectAnalyzer,
	mockTemplateManager,
	mockValidation,
	setupMockUtils,
	teardownMockUtils,
} from "./mock-utils.js"
export * from "./test-data.js"
// Re-export commonly used fixtures
export {
	mockApiContent,
	mockArtisanCommand,
	mockAuthConfigContent,
	mockCommandArguments,
	mockCommandOptions,
	mockCommandResult,
	mockComponentContent,
	mockDbConfigContent,
	mockDbTypesContent,
	mockEnvContent,
	mockGitignoreContent,
	mockGlobalCssContent,
	mockLayoutContent,
	mockMiddlewareContent,
	mockMigrationContent,
	mockNextConfigContent,
	mockPackageJson,
	mockPageContent,
	mockProjectStructure,
	mockReadmeContent,
	mockSeederContent,
	mockServiceContent,
	mockTailwindConfigContent,
	mockTestContent,
	mockTsConfigContent,
} from "./test-data.js"
