/**
 * Validation Tests
 * Test the validation utility functionality
 */

import { ValidationRule, Validator } from "../../utils/validation.js"

describe("Validator", () => {
	let validator: Validator

	beforeEach(() => {
		validator = new Validator()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe("constructor", () => {
		it("should create Validator instance", () => {
			expect(validator).toBeInstanceOf(Validator)
		})
	})

	describe("validate", () => {
		it("should validate a field successfully", () => {
			const result = validator.validate("name", "TestName")
			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("should return validation errors for invalid field", () => {
			const result = validator.validate("name", "")
			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})

		it("should handle null values", () => {
			const result = validator.validate("name", null)
			expect(result.valid).toBe(false)
		})

		it("should handle undefined values", () => {
			const result = validator.validate("name", undefined)
			expect(result.valid).toBe(false)
		})

		it("should handle non-string values", () => {
			const result = validator.validate("name", 123)
			expect(result.valid).toBe(false)
		})

		it("should handle boolean values", () => {
			const result = validator.validate("name", true)
			expect(result.valid).toBe(false)
		})

		it("should handle array values", () => {
			const result = validator.validate("name", [])
			expect(result.valid).toBe(false)
		})

		it("should handle object values", () => {
			const result = validator.validate("name", {})
			expect(result.valid).toBe(false)
		})
	})

	describe("validateFields", () => {
		it("should validate multiple fields successfully", () => {
			const fields = {
				name: "TestName",
				email: "test@example.com",
			}
			const result = validator.validateFields(fields)
			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("should return validation errors for invalid fields", () => {
			const fields = {
				name: "",
				email: "invalid-email",
			}
			const result = validator.validateFields(fields)
			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})

		it("should handle empty fields object", () => {
			const result = validator.validateFields({})
			expect(result.valid).toBe(true)
		})

		it("should handle mixed valid and invalid fields", () => {
			const fields = {
				name: "ValidName",
				email: "invalid-email",
			}
			const result = validator.validateFields(fields)
			expect(result.valid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})
	})

	describe("addRule", () => {
		it("should add a custom validation rule", () => {
			const customRule: ValidationRule = {
				name: "customRule",
				validate: (value: any) => value === "custom",
				message: "Value must be 'custom'",
			}

			validator.addRule("testField", customRule)

			const result = validator.validate("testField", "custom")
			expect(result.valid).toBe(true)
		})

		it("should add a rule that fails validation", () => {
			const customRule: ValidationRule = {
				name: "customRule",
				validate: (value: any) => value === "custom",
				message: "Value must be 'custom'",
			}

			validator.addRule("testField", customRule)

			const result = validator.validate("testField", "not-custom")
			expect(result.valid).toBe(false)
		})

		it("should handle rule with custom error message", () => {
			const customRule: ValidationRule = {
				name: "customRule",
				validate: (value: any) => value === "custom",
				message: "Value must be 'custom'",
			}

			validator.addRule("testField", customRule)

			const result = validator.validate("testField", "not-custom")
			expect(result.valid).toBe(false)
			expect(result.errors).toContain("Value must be 'custom'")
		})
	})

	describe("removeRule", () => {
		it("should remove a validation rule", () => {
			const customRule: ValidationRule = {
				name: "customRule",
				validate: (value: any) => value === "custom",
				message: "Value must be 'custom'",
			}

			validator.addRule("testField", customRule)
			validator.removeRule("testField", "customRule")

			// After removing the rule, validation should pass for any value
			const result = validator.validate("testField", "any-value")
			expect(result.valid).toBe(true)
		})

		it("should handle removing non-existent rule", () => {
			// Should not throw error when removing non-existent rule
			expect(() => {
				validator.removeRule("testField", "nonExistentRule")
			}).not.toThrow()
		})
	})

	describe("validation result structure", () => {
		it("should return proper validation result structure", () => {
			const result = validator.validate("name", "TestName")

			expect(result).toHaveProperty("isValid")
			expect(result).toHaveProperty("errors")
			expect(typeof result.valid).toBe("boolean")
			expect(Array.isArray(result.errors)).toBe(true)
		})

		it("should return errors array with proper structure", () => {
			const result = validator.validate("name", "")

			expect(result.valid).toBe(false)
			expect(Array.isArray(result.errors)).toBe(true)
			result.errors.forEach((error) => {
				expect(typeof error).toBe("string")
			})
		})
	})

	describe("edge cases", () => {
		it("should handle very long strings", () => {
			const longString = "a".repeat(10000)
			const result = validator.validate("name", longString)
			expect(result.valid).toBe(true)
		})

		it("should handle special characters", () => {
			const specialString = "!@#$%^&*()_+-=[]{}|;:,.<>?"
			const result = validator.validate("name", specialString)
			expect(result.valid).toBe(true)
		})

		it("should handle unicode characters", () => {
			const unicodeString = "你好世界 🌍"
			const result = validator.validate("name", unicodeString)
			expect(result.valid).toBe(true)
		})

		it("should handle whitespace-only strings", () => {
			const whitespaceString = "   \t\n   "
			const result = validator.validate("name", whitespaceString)
			expect(result.valid).toBe(false)
		})
	})

	describe("performance", () => {
		it("should handle multiple validations efficiently", () => {
			const startTime = Date.now()

			for (let i = 0; i < 1000; i++) {
				validator.validate("name", `TestName${i}`)
			}

			const endTime = Date.now()
			const duration = endTime - startTime

			// Should complete within reasonable time (adjust threshold as needed)
			expect(duration).toBeLessThan(1000)
		})

		it("should handle large field objects efficiently", () => {
			const largeFields: Record<string, any> = {}
			for (let i = 0; i < 100; i++) {
				largeFields[`field${i}`] = `value${i}`
			}

			const startTime = Date.now()
			const result = validator.validateFields(largeFields)
			const endTime = Date.now()
			const duration = endTime - startTime

			expect(result.valid).toBe(true)
			expect(duration).toBeLessThan(100)
		})
	})
})
