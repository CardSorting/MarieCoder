/**
 * Constants for ChatTextArea component
 */

import { CHAT_CONSTANTS } from "@/components/chat/chat-view/constants"
import { ContextMenuOptionType, getContextMenuOptionIndex } from "@/utils/chat"

// Color constants for Plan/Act modes
export const PLAN_MODE_COLOR = "var(--vscode-activityWarningBadge-background)"
export const ACT_MODE_COLOR = "var(--vscode-focusBorder)"

// Maximum images and files per message
export const { MAX_IMAGES_AND_FILES_PER_MESSAGE } = CHAT_CONSTANTS

// Default context menu option (File option)
export const DEFAULT_CONTEXT_MENU_OPTION = getContextMenuOptionIndex(ContextMenuOptionType.File)

// Accepted image types
export const ACCEPTED_IMAGE_TYPES = ["png", "jpeg", "webp"]

// Maximum image dimensions
export const MAX_IMAGE_DIMENSION = 7500

// Search debounce delay in milliseconds
export const SEARCH_DEBOUNCE_DELAY = 200

// Error message display duration in milliseconds
export const ERROR_MESSAGE_DURATION = 3000
