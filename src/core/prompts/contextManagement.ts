/**
 * Context Management Prompts
 *
 * Prompts related to context window management
 */

export const continuationPrompt = (summary: string) => `Continue from this point using the following summary:\n\n${summary}`
