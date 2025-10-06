/**
 * Template Manager Tests
 * Tests for the TemplateManager utility class
 */

import { Template, TemplateManager } from "../../utils/template-manager"

describe("TemplateManager", () => {
	let templateManager: TemplateManager

	beforeEach(() => {
		templateManager = new TemplateManager()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe("constructor", () => {
		it("should create TemplateManager instance", () => {
			expect(templateManager).toBeInstanceOf(TemplateManager)
		})

		it("should load default templates", () => {
			const templates = templateManager.getAllTemplates()
			expect(Array.isArray(templates)).toBe(true)
		})
	})

	describe("getTemplate", () => {
		it("should return template by name", () => {
			const template = templateManager.getTemplate("component")
			expect(template).toBeDefined()
			expect(template?.name).toBe("component")
		})

		it("should return undefined for non-existent template", () => {
			const template = templateManager.getTemplate("non-existent")
			expect(template).toBeUndefined()
		})
	})

	describe("getAllTemplates", () => {
		it("should return all templates", () => {
			const templates = templateManager.getAllTemplates()
			expect(Array.isArray(templates)).toBe(true)
			expect(templates.length).toBeGreaterThan(0)
		})

		it("should return templates with correct structure", () => {
			const templates = templateManager.getAllTemplates()
			const template = templates[0]

			expect(template).toHaveProperty("name")
			expect(template).toHaveProperty("description")
			expect(template).toHaveProperty("category")
			expect(template).toHaveProperty("content")
			expect(template).toHaveProperty("variables")
			expect(template).toHaveProperty("requiredVariables")
		})
	})

	describe("getTemplatesByCategory", () => {
		it("should return templates by category", () => {
			const templates = templateManager.getTemplatesByCategory("component")
			expect(Array.isArray(templates)).toBe(true)
		})

		it("should return empty array for non-existent category", () => {
			const templates = templateManager.getTemplatesByCategory("non-existent")
			expect(Array.isArray(templates)).toBe(true)
			expect(templates).toHaveLength(0)
		})
	})

	describe("getCategories", () => {
		it("should return all categories", () => {
			const categories = templateManager.getCategories()
			expect(Array.isArray(categories)).toBe(true)
			expect(categories.length).toBeGreaterThan(0)
		})

		it("should return unique categories", () => {
			const categories = templateManager.getCategories()
			const uniqueCategories = [...new Set(categories)]
			expect(categories).toHaveLength(uniqueCategories.length)
		})
	})

	describe("registerTemplate", () => {
		it("should register a new template", () => {
			const newTemplate: Template = {
				name: "test-template",
				description: "Test template",
				category: "test",
				content: "Test content {{name}}",
				variables: ["name"],
				requiredVariables: ["name"],
			}

			templateManager.registerTemplate(newTemplate)

			const retrievedTemplate = templateManager.getTemplate("test-template")
			expect(retrievedTemplate).toEqual(newTemplate)
		})

		it("should overwrite existing template", () => {
			const originalTemplate = templateManager.getTemplate("component")
			expect(originalTemplate).toBeDefined()

			const newTemplate: Template = {
				name: "component",
				description: "Updated component template",
				category: "component",
				content: "Updated content {{name}}",
				variables: ["name"],
				requiredVariables: ["name"],
			}

			templateManager.registerTemplate(newTemplate)

			const retrievedTemplate = templateManager.getTemplate("component")
			expect(retrievedTemplate).toEqual(newTemplate)
		})
	})

	describe("processTemplate", () => {
		it("should process template with variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				withProps: true,
			})

			expect(typeof result).toBe("string")
			expect(result).toContain("TestComponent")
		})

		it("should handle missing variables", () => {
			const result = templateManager.processTemplate("component", {})
			expect(typeof result).toBe("string")
		})

		it("should throw error for non-existent template", () => {
			expect(() => {
				templateManager.processTemplate("non-existent", {})
			}).toThrow()
		})

		it("should process template with complex variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				withProps: true,
				withStyles: false,
				withTests: true,
				description: "A test component",
			})

			expect(typeof result).toBe("string")
			expect(result).toContain("TestComponent")
		})

		it("should handle nested variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				props: {
					title: "Test Title",
					description: "Test Description",
				},
			})

			expect(typeof result).toBe("string")
		})

		it("should handle array variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				imports: ["React", "useState", "useEffect"],
			})

			expect(typeof result).toBe("string")
		})

		it("should handle boolean variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				withProps: true,
				withStyles: false,
				withTests: true,
			})

			expect(typeof result).toBe("string")
		})

		it("should handle number variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				version: 1,
				priority: 5,
			})

			expect(typeof result).toBe("string")
		})

		it("should handle null and undefined variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				optional: null,
				undefined: undefined,
			})

			expect(typeof result).toBe("string")
		})

		it("should handle empty string variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				empty: "",
				spaces: "   ",
			})

			expect(typeof result).toBe("string")
		})

		it("should handle special characters in variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				special: "Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?",
			})

			expect(typeof result).toBe("string")
		})

		it("should handle unicode characters in variables", () => {
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				unicode: "Unicode: 你好世界 🌍",
			})

			expect(typeof result).toBe("string")
		})

		it("should handle very long variables", () => {
			const longString = "a".repeat(10000)
			const result = templateManager.processTemplate("component", {
				name: "TestComponent",
				longContent: longString,
			})

			expect(typeof result).toBe("string")
		})

		it("should handle multiple template processing", () => {
			const variables = { name: "TestComponent" }

			const result1 = templateManager.processTemplate("component", variables)
			const result2 = templateManager.processTemplate("component", variables)

			expect(result1).toBe(result2)
		})

		it("should handle template with no variables", () => {
			const result = templateManager.processTemplate("component", {})
			expect(typeof result).toBe("string")
		})

		it("should handle template with all variable types", () => {
			const result = templateManager.processTemplate("component", {
				string: "test",
				number: 42,
				boolean: true,
				null: null,
				undefined: undefined,
				array: [1, 2, 3],
				object: { key: "value" },
			})

			expect(typeof result).toBe("string")
		})
	})

	describe("template validation", () => {
		it("should validate template structure", () => {
			const templates = templateManager.getAllTemplates()

			templates.forEach((template) => {
				expect(template.name).toBeDefined()
				expect(template.description).toBeDefined()
				expect(template.category).toBeDefined()
				expect(template.content).toBeDefined()
				expect(Array.isArray(template.variables)).toBe(true)
				expect(Array.isArray(template.requiredVariables)).toBe(true)
			})
		})

		it("should have consistent variable definitions", () => {
			const templates = templateManager.getAllTemplates()

			templates.forEach((template) => {
				// All required variables should be in the variables array
				template.requiredVariables.forEach((requiredVar) => {
					expect(template.variables).toContain(requiredVar)
				})
			})
		})
	})
})
