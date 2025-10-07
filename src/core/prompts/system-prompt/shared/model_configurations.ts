/**
 * Shared Configuration Utilities
 * 
 * Centralizes common configuration patterns to eliminate duplication
 * across variant configurations and reduce technical debt.
 */

import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { SystemPromptSection } from "../templates/placeholders"
import type { ConfigOverride } from "../types"

/**
 * Standard component order configurations for different model families
 */
export const COMPONENT_ORDERS = {
  /**
   * Full-featured component order for advanced models
   */
  FULL: [
    SystemPromptSection.AGENT_ROLE,
    SystemPromptSection.TOOL_USE,
    SystemPromptSection.TODO,
    SystemPromptSection.MCP,
    SystemPromptSection.EDITING_FILES,
    SystemPromptSection.ACT_VS_PLAN,
    SystemPromptSection.TASK_PROGRESS,
    SystemPromptSection.CAPABILITIES,
    SystemPromptSection.FEEDBACK,
    SystemPromptSection.RULES,
    SystemPromptSection.SYSTEM_INFO,
    SystemPromptSection.OBJECTIVE,
    SystemPromptSection.USER_INSTRUCTIONS,
  ] as const,

  /**
   * Standard component order for most models
   */
  STANDARD: [
    SystemPromptSection.AGENT_ROLE,
    SystemPromptSection.TOOL_USE,
    SystemPromptSection.TASK_PROGRESS,
    SystemPromptSection.MCP,
    SystemPromptSection.EDITING_FILES,
    SystemPromptSection.ACT_VS_PLAN,
    SystemPromptSection.TODO,
    SystemPromptSection.CAPABILITIES,
    SystemPromptSection.RULES,
    SystemPromptSection.SYSTEM_INFO,
    SystemPromptSection.OBJECTIVE,
    SystemPromptSection.USER_INSTRUCTIONS,
  ] as const,

  /**
   * Minimal component order for lightweight models
   */
  MINIMAL: [
    SystemPromptSection.AGENT_ROLE,
    SystemPromptSection.RULES,
    SystemPromptSection.ACT_VS_PLAN,
    SystemPromptSection.CAPABILITIES,
    SystemPromptSection.EDITING_FILES,
    SystemPromptSection.OBJECTIVE,
    SystemPromptSection.SYSTEM_INFO,
    SystemPromptSection.USER_INSTRUCTIONS,
  ] as const,
} as const

/**
 * Standard tool configurations for different model families
 */
export const TOOL_CONFIGS = {
  /**
   * Full tool set for advanced models
   */
  FULL: [
    ClineDefaultTool.BASH,
    ClineDefaultTool.FILE_READ,
    ClineDefaultTool.FILE_NEW,
    ClineDefaultTool.FILE_EDIT,
    ClineDefaultTool.SEARCH,
    ClineDefaultTool.LIST_FILES,
    ClineDefaultTool.LIST_CODE_DEF,
    ClineDefaultTool.BROWSER,
    ClineDefaultTool.WEB_FETCH,
    ClineDefaultTool.MCP_USE,
    ClineDefaultTool.MCP_ACCESS,
    ClineDefaultTool.ASK,
    ClineDefaultTool.ATTEMPT,
    ClineDefaultTool.NEW_TASK,
    ClineDefaultTool.PLAN_MODE,
    ClineDefaultTool.MCP_DOCS,
    ClineDefaultTool.TODO,
  ] as const,

  /**
   * Standard tool set for most models
   */
  STANDARD: [
    ClineDefaultTool.BASH,
    ClineDefaultTool.FILE_READ,
    ClineDefaultTool.FILE_NEW,
    ClineDefaultTool.FILE_EDIT,
    ClineDefaultTool.SEARCH,
    ClineDefaultTool.LIST_FILES,
    ClineDefaultTool.LIST_CODE_DEF,
    ClineDefaultTool.BROWSER,
    ClineDefaultTool.MCP_USE,
    ClineDefaultTool.MCP_ACCESS,
    ClineDefaultTool.ASK,
    ClineDefaultTool.ATTEMPT,
    ClineDefaultTool.NEW_TASK,
    ClineDefaultTool.PLAN_MODE,
    ClineDefaultTool.MCP_DOCS,
    ClineDefaultTool.TODO,
  ] as const,

  /**
   * Minimal tool set for lightweight models
   */
  MINIMAL: [
    ClineDefaultTool.BASH,
    ClineDefaultTool.FILE_READ,
    ClineDefaultTool.FILE_NEW,
    ClineDefaultTool.FILE_EDIT,
    ClineDefaultTool.SEARCH,
    ClineDefaultTool.LIST_FILES,
    ClineDefaultTool.ASK,
    ClineDefaultTool.ATTEMPT,
    ClineDefaultTool.NEW_TASK,
    ClineDefaultTool.PLAN_MODE,
  ] as const,
} as const

/**
 * Standard tag configurations for different model families
 */
export const TAG_CONFIGS = {
  /**
   * Tags for advanced/next-gen models
   */
  ADVANCED: ["next-gen", "advanced", "production"] as const,

  /**
   * Tags for standard models
   */
  STANDARD: ["fallback", "stable"] as const,

  /**
   * Tags for lightweight models
   */
  LIGHTWEIGHT: ["local", "xs", "compact"] as const,
} as const

/**
 * Standard label configurations for different model families
 */
export const LABEL_CONFIGS = {
  /**
   * Labels for advanced/next-gen models
   */
  ADVANCED: {
    stable: 1,
    production: 1,
    advanced: 1,
  } as const,

  /**
   * Labels for standard models
   */
  STANDARD: {
    stable: 1,
    fallback: 1,
  } as const,

  /**
   * Labels for lightweight models
   */
  LIGHTWEIGHT: {
    stable: 1,
    production: 1,
    advanced: 1,
  } as const,
} as const

/**
 * Model family to configuration mapping
 */
export const MODEL_FAMILY_CONFIGS = {
  [ModelFamily.NEXT_GEN]: {
    componentOrder: COMPONENT_ORDERS.FULL,
    tools: TOOL_CONFIGS.FULL,
    tags: TAG_CONFIGS.ADVANCED,
    labels: LABEL_CONFIGS.ADVANCED,
  },
  [ModelFamily.GENERIC]: {
    componentOrder: COMPONENT_ORDERS.STANDARD,
    tools: TOOL_CONFIGS.STANDARD,
    tags: TAG_CONFIGS.STANDARD,
    labels: LABEL_CONFIGS.STANDARD,
  },
  [ModelFamily.XS]: {
    componentOrder: COMPONENT_ORDERS.MINIMAL,
    tools: TOOL_CONFIGS.MINIMAL,
    tags: TAG_CONFIGS.LIGHTWEIGHT,
    labels: LABEL_CONFIGS.LIGHTWEIGHT,
  },
} as const

/**
 * Get standard configuration for a model family
 */
export function getStandardConfig(family: ModelFamily) {
  const config = MODEL_FAMILY_CONFIGS[family as keyof typeof MODEL_FAMILY_CONFIGS]
  if (!config) {
    throw new Error(`No standard configuration found for model family: ${family}`)
  }
  return config
}

/**
 * Create placeholder configuration for a model family
 */
export function createPlaceholderConfig(family: ModelFamily): Record<string, string> {
  return {
    MODEL_FAMILY: family,
  }
}

/**
 * Standard validation options
 */
export const STANDARD_VALIDATION_OPTIONS = {
  strict: true,
} as const

/**
 * Common component override patterns
 */
export const COMMON_OVERRIDES = {
  /**
   * Override for rules component with custom template
   */
  rulesTemplate: (template: string): Partial<Record<SystemPromptSection, ConfigOverride>> => ({
    [SystemPromptSection.RULES]: {
      template,
    },
  }),

  /**
   * Disable specific tools
   */
  disableTools: (...tools: ClineDefaultTool[]): Record<ClineDefaultTool, ConfigOverride> => {
    return tools.reduce((acc, tool) => {
      acc[tool] = { enabled: false }
      return acc
    }, {} as Record<ClineDefaultTool, ConfigOverride>)
  },
} as const
