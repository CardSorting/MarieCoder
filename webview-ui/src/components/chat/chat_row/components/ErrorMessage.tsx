import type { ClineMessage } from "@shared/ExtensionMessage"
import { memo } from "react"
import ErrorRow from "@/components/chat/ErrorRow"

/**
 * Props for ErrorMessage component
 */
interface ErrorMessageProps {
	message: ClineMessage
	errorType?: "error" | "diff_error" | "clineignore_error" | "mistake_limit_reached" | "auto_approval_max_req_reached"
}

/**
 * Error message component
 * Displays error messages with appropriate styling and formatting
 *
 * Features:
 * - Consistent error display across message types
 * - Support for different error types
 * - Delegatesto ErrorRow for rendering
 */
export const ErrorMessage = memo(({ message, errorType = "error" }: ErrorMessageProps) => {
	return <ErrorRow errorType={errorType} message={message} />
})

ErrorMessage.displayName = "ErrorMessage"
