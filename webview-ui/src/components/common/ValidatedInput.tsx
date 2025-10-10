import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { Check, X } from "lucide-react"
import { useState } from "react"

/**
 * Text input with visual validation feedback
 * Shows success (green checkmark) or error (red X) indicators
 *
 * @example
 * ```tsx
 * <ValidatedInput
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   onValidate={(value) => {
 *     if (!value) return { valid: false, message: "Email is required" }
 *     if (!/@/.test(value)) return { valid: false, message: "Invalid email format" }
 *     return { valid: true, message: "Looks good!" }
 *   }}
 *   placeholder="Enter email"
 * />
 * ```
 */

interface ValidationResult {
	valid: boolean
	message?: string
}

interface ValidatedInputProps {
	value: string
	onChange: (e: any) => void
	onValidate?: (value: string) => ValidationResult
	placeholder?: string
	type?: "text" | "email" | "url" | "password"
	disabled?: boolean
	className?: string
	label?: string
	required?: boolean
	validateOn?: "change" | "blur" | "both"
	showSuccessIndicator?: boolean
	ariaLabel?: string
}

export function ValidatedInput({
	value,
	onChange,
	onValidate,
	placeholder,
	type = "text",
	disabled,
	className = "",
	label,
	required,
	validateOn = "blur",
	showSuccessIndicator = true,
	ariaLabel,
}: ValidatedInputProps) {
	const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
	const [hasBlurred, setHasBlurred] = useState(false)

	const validate = (val: string) => {
		if (!onValidate) {
			return
		}

		const result = onValidate(val)
		setValidationResult(result)
	}

	const handleChange = (e: any) => {
		onChange(e)

		// Clear validation on change if showing error
		if (validationResult && !validationResult.valid) {
			setValidationResult(null)
		}

		// Validate on change if configured
		if (validateOn === "change" || validateOn === "both") {
			validate(e.target.value)
		}
	}

	const handleBlur = () => {
		setHasBlurred(true)

		// Validate on blur if configured
		if (validateOn === "blur" || validateOn === "both") {
			validate(value)
		}
	}

	const showValidation = hasBlurred && validationResult
	const isValid = showValidation && validationResult.valid
	const isInvalid = showValidation && !validationResult.valid

	return (
		<div className={`relative ${className}`}>
			{label && (
				<label className="block text-sm font-medium text-[var(--vscode-foreground)] mb-1">
					{label}
					{required && <span className="text-[var(--vscode-errorForeground)]"> *</span>}
				</label>
			)}

			<div className="relative">
				<VSCodeTextField
					aria-describedby={showValidation && validationResult.message ? "validation-message" : undefined}
					aria-invalid={isInvalid ? "true" : undefined}
					aria-label={ariaLabel || label}
					className="w-full"
					disabled={disabled}
					onBlur={handleBlur}
					onChange={handleChange}
					placeholder={placeholder}
					type={type}
					value={value}
				/>

				{/* Success indicator */}
				{isValid && showSuccessIndicator && (
					<div aria-label="Valid input" className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
						<Check aria-hidden="true" className="text-[var(--vscode-terminal-ansiGreen)]" size={16} />
					</div>
				)}

				{/* Error indicator */}
				{isInvalid && (
					<div aria-label="Invalid input" className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
						<X aria-hidden="true" className="text-[var(--vscode-errorForeground)]" size={16} />
					</div>
				)}
			</div>

			{/* Validation message */}
			{showValidation && validationResult.message && (
				<div
					className={`mt-1 text-xs ${
						validationResult.valid
							? "text-[var(--vscode-terminal-ansiGreen)]"
							: "text-[var(--vscode-errorForeground)]"
					}`}
					id="validation-message"
					role={validationResult.valid ? "status" : "alert"}>
					{validationResult.message}
				</div>
			)}
		</div>
	)
}

/**
 * Common validation functions
 */
export const validators = {
	required:
		(message = "This field is required") =>
		(value: string): ValidationResult => {
			return {
				valid: value.trim().length > 0,
				message: value.trim().length > 0 ? undefined : message,
			}
		},

	email:
		(message = "Please enter a valid email address") =>
		(value: string): ValidationResult => {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			return {
				valid: emailRegex.test(value),
				message: emailRegex.test(value) ? "Looks good!" : message,
			}
		},

	url:
		(message = "Please enter a valid URL") =>
		(value: string): ValidationResult => {
			try {
				new URL(value)
				return { valid: true, message: "Valid URL" }
			} catch {
				return { valid: false, message }
			}
		},

	minLength:
		(min: number, message?: string) =>
		(value: string): ValidationResult => {
			const isValid = value.length >= min
			return {
				valid: isValid,
				message: isValid ? undefined : message || `Must be at least ${min} characters`,
			}
		},

	maxLength:
		(max: number, message?: string) =>
		(value: string): ValidationResult => {
			const isValid = value.length <= max
			return {
				valid: isValid,
				message: isValid ? undefined : message || `Must be at most ${max} characters`,
			}
		},

	pattern:
		(regex: RegExp, message: string) =>
		(value: string): ValidationResult => {
			return {
				valid: regex.test(value),
				message: regex.test(value) ? undefined : message,
			}
		},

	/**
	 * Combine multiple validators
	 */
	combine:
		(...validators: Array<(value: string) => ValidationResult>) =>
		(value: string): ValidationResult => {
			for (const validator of validators) {
				const result = validator(value)
				if (!result.valid) {
					return result
				}
			}
			return { valid: true }
		},
}
