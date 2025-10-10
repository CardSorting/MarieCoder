/**
 * FormField Component
 *
 * Comprehensive form field with validation, accessibility, and visual feedback.
 *
 * Features:
 * - Real-time validation feedback
 * - Success/error/warning states
 * - Accessible error messages (ARIA)
 * - Icon indicators
 * - Helper text
 * - Required field indicator
 * - Loading state
 *
 * @example
 * ```typescript
 * <FormField
 *   label="Email"
 *   name="email"
 *   value={form.values.email}
 *   error={form.touched.email ? form.errors.email : undefined}
 *   onChange={(e) => form.setFieldValue('email', e.target.value)}
 *   onBlur={() => form.setFieldTouched('email')}
 *   required
 * />
 * ```
 */

import type { TextFieldType } from "@vscode/webview-ui-toolkit"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useId } from "react"

export interface FormFieldProps {
	/** Field label */
	label: string
	/** Field name */
	name: string
	/** Field type (text, email, url, password, number, etc.) */
	type?: TextFieldType
	/** Current value */
	value: string
	/** Change handler */
	onChange: (e: unknown) => void
	/** Blur handler */
	onBlur?: (e: unknown) => void
	/** Whether field is required */
	required?: boolean
	/** Whether field is disabled */
	disabled?: boolean
	/** Whether field is loading */
	isLoading?: boolean
	/** Placeholder text */
	placeholder?: string
	/** Error message */
	error?: string
	/** Warning message (non-blocking) */
	warning?: string
	/** Success message */
	success?: string
	/** Helper text (shown below field) */
	helperText?: string
	/** Maximum length */
	maxLength?: number
	/** Show character count */
	showCharacterCount?: boolean
	/** Custom class name */
	className?: string
}

/**
 * FormField component with validation and accessibility
 */
export function FormField({
	label,
	name,
	type = "text" as TextFieldType,
	value,
	onChange,
	onBlur,
	required = false,
	disabled = false,
	isLoading = false,
	placeholder,
	error,
	warning,
	success,
	helperText,
	maxLength,
	showCharacterCount = false,
	className,
}: FormFieldProps) {
	const fieldId = useId()
	const errorId = `${fieldId}-error`
	const helperId = `${fieldId}-helper`
	const charCountId = `${fieldId}-char-count`

	// Determine validation state
	const hasError = Boolean(error)
	const hasWarning = Boolean(warning && !error)
	const hasSuccess = Boolean(success && !error && !warning)

	// Character count
	const charCount = value?.length || 0
	const isNearLimit = maxLength && charCount > maxLength * 0.8

	// Accessibility attributes
	const ariaDescribedBy = [hasError ? errorId : null, helperText ? helperId : null, showCharacterCount ? charCountId : null]
		.filter(Boolean)
		.join(" ")

	return (
		<div className={`form-field ${className || ""}`}>
			{/* Label */}
			<div className="form-field-label-container" style={{ marginBottom: "4px" }}>
				<label
					className="form-field-label"
					htmlFor={fieldId}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
						fontSize: "12px",
						fontWeight: 500,
					}}>
					{label}
					{required && (
						<span
							aria-label="required"
							className="form-field-required"
							style={{ color: "var(--vscode-errorForeground)" }}>
							*
						</span>
					)}
					{isLoading && (
						<span aria-label="loading" className="form-field-loading" style={{ opacity: 0.7 }}>
							⋯
						</span>
					)}
				</label>
			</div>

			{/* Input Field */}
			<div className="form-field-input-container" style={{ position: "relative" }}>
				<VSCodeTextField
					aria-describedby={ariaDescribedBy || undefined}
					aria-invalid={hasError}
					aria-required={required}
					disabled={disabled || isLoading}
					id={fieldId}
					maxlength={maxLength}
					name={name}
					onBlur={onBlur}
					onChange={onChange}
					placeholder={placeholder}
					style={{
						width: "100%",
						borderColor: hasError
							? "var(--vscode-inputValidation-errorBorder)"
							: hasWarning
								? "var(--vscode-inputValidation-warningBorder)"
								: hasSuccess
									? "var(--vscode-terminal-ansiGreen)"
									: undefined,
					}}
					type={type}
					value={value}
				/>

				{/* Status Icon */}
				{(hasError || hasWarning || hasSuccess) && (
					<div
						aria-hidden="true"
						className="form-field-status-icon"
						style={{
							position: "absolute",
							right: "8px",
							top: "50%",
							transform: "translateY(-50%)",
							pointerEvents: "none",
							fontSize: "14px",
						}}>
						{hasError && <span style={{ color: "var(--vscode-errorForeground)" }}>✕</span>}
						{hasWarning && <span style={{ color: "var(--vscode-inputValidation-warningForeground)" }}>⚠</span>}
						{hasSuccess && <span style={{ color: "var(--vscode-terminal-ansiGreen)" }}>✓</span>}
					</div>
				)}
			</div>

			{/* Validation Messages */}
			{hasError && (
				<div
					className="form-field-error"
					id={errorId}
					role="alert"
					style={{
						color: "var(--vscode-errorForeground)",
						fontSize: "11px",
						marginTop: "4px",
						display: "flex",
						alignItems: "flex-start",
						gap: "4px",
					}}>
					<span aria-hidden="true">✕</span>
					<span>{error}</span>
				</div>
			)}

			{hasWarning && (
				<div
					className="form-field-warning"
					style={{
						color: "var(--vscode-inputValidation-warningForeground)",
						fontSize: "11px",
						marginTop: "4px",
						display: "flex",
						alignItems: "flex-start",
						gap: "4px",
					}}>
					<span aria-hidden="true">⚠</span>
					<span>{warning}</span>
				</div>
			)}

			{hasSuccess && (
				<div
					className="form-field-success"
					style={{
						color: "var(--vscode-terminal-ansiGreen)",
						fontSize: "11px",
						marginTop: "4px",
						display: "flex",
						alignItems: "flex-start",
						gap: "4px",
					}}>
					<span aria-hidden="true">✓</span>
					<span>{success}</span>
				</div>
			)}

			{/* Helper Text */}
			{helperText && !hasError && !hasWarning && (
				<div
					className="form-field-helper"
					id={helperId}
					style={{
						color: "var(--vscode-descriptionForeground)",
						fontSize: "11px",
						marginTop: "4px",
					}}>
					{helperText}
				</div>
			)}

			{/* Character Count */}
			{showCharacterCount && maxLength && (
				<div
					aria-live="polite"
					className="form-field-char-count"
					id={charCountId}
					style={{
						fontSize: "11px",
						marginTop: "4px",
						textAlign: "right",
						color: isNearLimit
							? "var(--vscode-inputValidation-warningForeground)"
							: "var(--vscode-descriptionForeground)",
					}}>
					{charCount} / {maxLength}
				</div>
			)}
		</div>
	)
}
