/**
 * Form State Management Hook
 *
 * Comprehensive form state management with:
 * - Field-level validation
 * - Form-level validation
 * - Dirty/touched tracking
 * - Submit handling
 * - Reset functionality
 * - Type-safe field accessors
 *
 * @example
 * ```typescript
 * const form = useFormState({
 *   initialValues: { name: '', email: '' },
 *   validators: {
 *     name: [required(), minLength(3)],
 *     email: [required(), email()],
 *   },
 *   onSubmit: async (values) => {
 *     await api.save(values)
 *   },
 * })
 *
 * <input
 *   value={form.values.name}
 *   onChange={(e) => form.setFieldValue('name', e.target.value)}
 *   onBlur={() => form.setFieldTouched('name')}
 * />
 * {form.touched.name && form.errors.name && (
 *   <span>{form.errors.name}</span>
 * )}
 * ```
 */

import { useCallback, useState } from "react"
import {
	isFormValid,
	type ValidationResult,
	type Validator,
	validateField,
	validateForm,
} from "@/utils/validation/form_validation"

/**
 * Form configuration
 */
export interface UseFormStateConfig<T extends Record<string, unknown>> {
	/** Initial form values */
	initialValues: T
	/** Validators for each field */
	validators?: Partial<Record<keyof T, Validator<unknown>[]>>
	/** Callback when form is submitted */
	onSubmit?: (values: T) => void | Promise<void>
	/** Whether to validate on change (default: false) */
	validateOnChange?: boolean
	/** Whether to validate on blur (default: true) */
	validateOnBlur?: boolean
	/** Whether to validate all fields before submit (default: true) */
	validateOnSubmit?: boolean
}

/**
 * Form state
 */
export interface FormState<T extends Record<string, unknown>> {
	/** Current form values */
	values: T
	/** Validation errors for each field */
	errors: Partial<Record<keyof T, string>>
	/** Validation results for each field (includes warnings, success) */
	validationResults: Partial<Record<keyof T, ValidationResult>>
	/** Touched state for each field */
	touched: Partial<Record<keyof T, boolean>>
	/** Whether the form is currently submitting */
	isSubmitting: boolean
	/** Whether the form is valid (all fields pass validation) */
	isValid: boolean
	/** Whether the form has been modified */
	isDirty: boolean

	// Field operations
	/** Set value for a specific field */
	setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void
	/** Set touched state for a specific field */
	setFieldTouched: <K extends keyof T>(field: K, touched?: boolean) => void
	/** Set error for a specific field */
	setFieldError: <K extends keyof T>(field: K, error?: string) => void
	/** Validate a specific field */
	validateField: <K extends keyof T>(field: K) => ValidationResult

	// Form operations
	/** Set all form values at once */
	setValues: (values: Partial<T>) => void
	/** Validate all fields */
	validateForm: () => Record<keyof T, ValidationResult>
	/** Submit the form */
	handleSubmit: (e?: React.FormEvent) => Promise<void>
	/** Reset form to initial values */
	reset: () => void
	/** Reset form to specific values */
	resetToValues: (values: T) => void
}

/**
 * Hook for managing form state with validation
 */
export function useFormState<T extends Record<string, unknown>>(config: UseFormStateConfig<T>): FormState<T> {
	const {
		initialValues,
		validators = {},
		onSubmit,
		validateOnChange = false,
		validateOnBlur = true,
		validateOnSubmit = true,
	} = config

	// Form state
	const [values, setValues] = useState<T>(initialValues)
	const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
	const [validationResults, setValidationResults] = useState<Partial<Record<keyof T, ValidationResult>>>({})
	const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isDirty, setIsDirty] = useState(false)

	// Validate a single field
	const validateSingleField = useCallback(
		<K extends keyof T>(field: K): ValidationResult => {
			const fieldValidators = (validators[field as keyof typeof validators] as Validator<unknown>[] | undefined) || []
			const value = values[field]
			const result = validateField(value, fieldValidators)

			// Update validation results
			setValidationResults((prev) => ({ ...prev, [field]: result }))
			setErrors((prev) => ({
				...prev,
				[field]: result.error,
			}))

			return result
		},
		[validators, values],
	)

	// Validate all fields
	const validateAllFields = useCallback((): Record<keyof T, ValidationResult> => {
		const results = validateForm(values, validators as Record<keyof T, Validator<unknown>[]>)

		// Update state
		setValidationResults(results)
		const newErrors: Partial<Record<keyof T, string>> = {}
		for (const field in results) {
			if (results[field].error) {
				newErrors[field] = results[field].error
			}
		}
		setErrors(newErrors)

		return results
	}, [values, validators])

	// Set field value
	const setFieldValue = useCallback(
		<K extends keyof T>(field: K, value: T[K]) => {
			setValues((prev) => ({ ...prev, [field]: value }))
			setIsDirty(true)

			// Validate on change if enabled
			if (validateOnChange) {
				// Validate after state updates
				setTimeout(() => validateSingleField(field), 0)
			}
		},
		[validateOnChange, validateSingleField],
	)

	// Set field touched
	const setFieldTouched = useCallback(
		<K extends keyof T>(field: K, isTouched = true) => {
			setTouched((prev) => ({ ...prev, [field]: isTouched }))

			// Validate on blur if enabled
			if (validateOnBlur && isTouched) {
				validateSingleField(field)
			}
		},
		[validateOnBlur, validateSingleField],
	)

	// Set field error
	const setFieldError = useCallback(<K extends keyof T>(field: K, error?: string) => {
		setErrors((prev) => ({ ...prev, [field]: error }))
		setValidationResults((prev) => ({
			...prev,
			[field]: { isValid: !error, error },
		}))
	}, [])

	// Set multiple values at once
	const setFormValues = useCallback((newValues: Partial<T>) => {
		setValues((prev) => ({ ...prev, ...newValues }))
		setIsDirty(true)
	}, [])

	// Handle form submission
	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			if (e) {
				e.preventDefault()
			}

			// Validate all fields if enabled
			if (validateOnSubmit) {
				const results = validateAllFields()
				const formIsValid = isFormValid(results)

				if (!formIsValid) {
					// Mark all fields as touched to show errors
					const allTouched: Partial<Record<keyof T, boolean>> = {}
					for (const field in values) {
						allTouched[field] = true
					}
					setTouched(allTouched)
					return
				}
			}

			// Submit form
			if (onSubmit) {
				setIsSubmitting(true)
				try {
					await onSubmit(values)
				} finally {
					setIsSubmitting(false)
				}
			}
		},
		[validateOnSubmit, validateAllFields, onSubmit, values],
	)

	// Reset form
	const reset = useCallback(() => {
		setValues(initialValues)
		setErrors({})
		setValidationResults({})
		setTouched({})
		setIsSubmitting(false)
		setIsDirty(false)
	}, [initialValues])

	// Reset to specific values
	const resetToValues = useCallback((newValues: T) => {
		setValues(newValues)
		setErrors({})
		setValidationResults({})
		setTouched({})
		setIsSubmitting(false)
		setIsDirty(false)
	}, [])

	// Check if form is valid
	const isValid =
		Object.keys(validationResults).length > 0 ? isFormValid(validationResults as Record<keyof T, ValidationResult>) : true

	return {
		values,
		errors,
		validationResults,
		touched,
		isSubmitting,
		isValid,
		isDirty,
		setFieldValue,
		setFieldTouched,
		setFieldError,
		validateField: validateSingleField,
		setValues: setFormValues,
		validateForm: validateAllFields,
		handleSubmit,
		reset,
		resetToValues,
	}
}
