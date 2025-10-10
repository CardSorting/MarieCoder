/**
 * Form Validation Utilities
 *
 * Comprehensive validation system for forms with:
 * - Real-time validation
 * - Composable validators
 * - Type-safe validation rules
 * - Helpful error messages
 * - Accessibility-first design
 *
 * @example
 * ```typescript
 * const validators = [
 *   required("Name is required"),
 *   minLength(3, "Name must be at least 3 characters"),
 * ]
 *
 * const { error, isValid } = validateField(value, validators)
 * ```
 */

/**
 * Validation result
 */
export interface ValidationResult {
	/** Whether the value is valid */
	isValid: boolean
	/** Error message if invalid */
	error?: string
	/** Warning message (non-blocking) */
	warning?: string
	/** Success message for positive feedback */
	success?: string
}

/**
 * Validator function type
 */
export type Validator<T = string> = (value: T) => ValidationResult

/**
 * Validation trigger options
 */
export type ValidationTrigger = "blur" | "change" | "submit" | "manual"

/**
 * Field validation configuration
 */
export interface FieldValidationConfig<T = string> {
	/** Validators to apply */
	validators: Validator<T>[]
	/** When to trigger validation */
	validateOn?: ValidationTrigger
	/** Optional success message */
	successMessage?: string
	/** Whether to show success state */
	showSuccess?: boolean
}

// ============================================================================
// CORE VALIDATION UTILITIES
// ============================================================================

/**
 * Validates a value against an array of validators
 * Returns the first error encountered, or success if all pass
 */
export function validateField<T = string>(value: T, validators: Validator<T>[], successMessage?: string): ValidationResult {
	// Run through all validators
	for (const validator of validators) {
		const result = validator(value)
		if (!result.isValid) {
			return result
		}
		// Collect warnings
		if (result.warning) {
			return result
		}
	}

	// All validators passed
	return {
		isValid: true,
		success: successMessage,
	}
}

/**
 * Validates multiple fields at once
 * Returns a map of field names to validation results
 */
export function validateForm<T extends Record<string, unknown>>(
	values: T,
	validationConfig: Record<keyof T, Validator<unknown>[]>,
): Record<keyof T, ValidationResult> {
	const results: Partial<Record<keyof T, ValidationResult>> = {}

	for (const fieldName in validationConfig) {
		const value = values[fieldName]
		const validators = validationConfig[fieldName]
		results[fieldName] = validateField(value, validators)
	}

	return results as Record<keyof T, ValidationResult>
}

/**
 * Checks if all fields in a form are valid
 */
export function isFormValid<T extends Record<string, unknown>>(validationResults: Record<keyof T, ValidationResult>): boolean {
	return Object.values(validationResults).every((result) => (result as ValidationResult).isValid)
}

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/**
 * Creates a required field validator
 */
export function required(message = "This field is required"): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		return {
			isValid: trimmed.length > 0,
			error: trimmed.length > 0 ? undefined : message,
		}
	}
}

/**
 * Creates a minimum length validator
 */
export function minLength(length: number, message?: string): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		const isValid = trimmed.length >= length
		return {
			isValid,
			error: isValid ? undefined : message || `Must be at least ${length} characters`,
		}
	}
}

/**
 * Creates a maximum length validator
 */
export function maxLength(length: number, message?: string): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		const isValid = trimmed.length <= length
		return {
			isValid,
			error: isValid ? undefined : message || `Must be no more than ${length} characters`,
		}
	}
}

/**
 * Creates an email format validator
 */
export function email(message = "Please enter a valid email address"): Validator<string> {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		// Empty is valid (use required() for required emails)
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		const isValid = emailRegex.test(trimmed)
		return {
			isValid,
			error: isValid ? undefined : message,
		}
	}
}

/**
 * Creates a URL format validator
 */
export function url(message = "Please enter a valid URL"): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		// Empty is valid (use required() for required URLs)
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		try {
			new URL(trimmed)
			return { isValid: true }
		} catch {
			return {
				isValid: false,
				error: message,
			}
		}
	}
}

/**
 * Creates a pattern (regex) validator
 */
export function pattern(regex: RegExp, message = "Invalid format"): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		// Empty is valid (use required() for required fields)
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		const isValid = regex.test(trimmed)
		return {
			isValid,
			error: isValid ? undefined : message,
		}
	}
}

/**
 * Creates a number validator
 */
export function number(message = "Please enter a valid number"): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		// Empty is valid (use required() for required numbers)
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		const num = Number(trimmed)
		const isValid = !Number.isNaN(num) && Number.isFinite(num)
		return {
			isValid,
			error: isValid ? undefined : message,
		}
	}
}

/**
 * Creates a minimum value validator (for numbers)
 */
export function min(minValue: number, message?: string): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		const num = Number(trimmed)
		if (Number.isNaN(num)) {
			return { isValid: false, error: "Please enter a valid number" }
		}
		const isValid = num >= minValue
		return {
			isValid,
			error: isValid ? undefined : message || `Must be at least ${minValue}`,
		}
	}
}

/**
 * Creates a maximum value validator (for numbers)
 */
export function max(maxValue: number, message?: string): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		const num = Number(trimmed)
		if (Number.isNaN(num)) {
			return { isValid: false, error: "Please enter a valid number" }
		}
		const isValid = num <= maxValue
		return {
			isValid,
			error: isValid ? undefined : message || `Must be no more than ${maxValue}`,
		}
	}
}

/**
 * Creates a range validator (for numbers)
 */
export function range(minValue: number, maxValue: number, message?: string): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		const num = Number(trimmed)
		if (Number.isNaN(num)) {
			return { isValid: false, error: "Please enter a valid number" }
		}
		const isValid = num >= minValue && num <= maxValue
		return {
			isValid,
			error: isValid ? undefined : message || `Must be between ${minValue} and ${maxValue}`,
		}
	}
}

/**
 * Creates a custom validator
 */
export function custom<T = string>(validatorFn: (value: T) => boolean, message = "Invalid value"): Validator<T> {
	return (value: T): ValidationResult => {
		const isValid = validatorFn(value)
		return {
			isValid,
			error: isValid ? undefined : message,
		}
	}
}

/**
 * Creates a validator that checks if value matches another field
 */
export function matches(otherValue: string, fieldName = "field", message?: string): Validator<string> {
	return (value: string): ValidationResult => {
		const isValid = value === otherValue
		return {
			isValid,
			error: isValid ? undefined : message || `Must match ${fieldName}`,
		}
	}
}

/**
 * Creates a conditional validator (only validates if condition is met)
 */
export function when<T = string>(condition: (value: T) => boolean, validator: Validator<T>): Validator<T> {
	return (value: T): ValidationResult => {
		if (!condition(value)) {
			return { isValid: true }
		}
		return validator(value)
	}
}

/**
 * Combines multiple validators into one
 * All validators must pass for the combined validator to pass
 */
export function combine<T = string>(...validators: Validator<T>[]): Validator<T> {
	return (value: T): ValidationResult => {
		return validateField(value, validators)
	}
}

/**
 * Creates a validator that passes if ANY of the provided validators pass
 */
export function or<T = string>(...validators: Validator<T>[]): Validator<T> {
	return (value: T): ValidationResult => {
		const errors: string[] = []

		for (const validator of validators) {
			const result = validator(value)
			if (result.isValid) {
				return { isValid: true }
			}
			if (result.error) {
				errors.push(result.error)
			}
		}

		return {
			isValid: false,
			error: errors.join(" OR "),
		}
	}
}

// ============================================================================
// SPECIALIZED VALIDATORS
// ============================================================================

/**
 * Creates a port number validator
 */
export function port(message = "Please enter a valid port (1-65535)"): Validator<string> {
	return combine(number("Must be a number"), range(1, 65535, message))
}

/**
 * Creates a filename validator
 */
export function filename(message = "Invalid filename"): Validator<string> {
	// Disallow: < > : " / \ | ? *
	const invalidCharsRegex = /[<>:"/\\|?*]/
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		const isValid = !invalidCharsRegex.test(trimmed)
		return {
			isValid,
			error: isValid ? undefined : message,
		}
	}
}

/**
 * Creates a path validator
 */
export function filePath(message = "Invalid file path"): Validator<string> {
	return (value: string): ValidationResult => {
		const trimmed = value?.trim() || ""
		if (trimmed.length === 0) {
			return { isValid: true }
		}
		// Basic path validation (allows / and \ for cross-platform)
		const isValid = trimmed.length > 0 && !trimmed.includes("<") && !trimmed.includes(">")
		return {
			isValid,
			error: isValid ? undefined : message,
		}
	}
}

/**
 * Creates a server name validator (alphanumeric, dashes, underscores)
 */
export function serverName(
	message = "Server name can only contain letters, numbers, dashes, and underscores",
): Validator<string> {
	const serverNameRegex = /^[a-zA-Z0-9_-]+$/
	return combine(required("Server name is required"), pattern(serverNameRegex, message))
}

/**
 * Creates an API key validator
 */
export function apiKey(minLen = 16, message = "Invalid API key format"): Validator<string> {
	return combine(required("API key is required"), minLength(minLen, message))
}
