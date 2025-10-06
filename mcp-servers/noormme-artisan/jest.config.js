export default {
	preset: "ts-jest/presets/default-esm",
	extensionsToTreatAsEsm: [".ts"],
	testEnvironment: "node",
	roots: ["<rootDir>/src"],
	testMatch: ["**/__tests__/**/*.test.ts"],
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/__tests__/**", "!src/**/*.test.ts"],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
	testTimeout: 10000,
	verbose: true,
}
