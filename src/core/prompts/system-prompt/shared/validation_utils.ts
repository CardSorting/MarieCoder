/**
 * Shared Validation Utilities
 * 
 * Centralizes validation logic to reduce boilerplate and ensure consistency
 * across all variant configurations.
 */

import type { PromptVariant, ValidationOptions, ValidationResult } from "../types"

/**
 * Standard validation error messages
 */
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_COMPONENT_ORDER: "Component order must contain at least one component",
  INVALID_VERSION: "Version must be a positive integer",
  INVALID_TAGS: "Tags must be an array of non-empty strings",
  INVALID_LABELS: "Labels must be an object with string keys and number values",
  INVALID_TOOLS: "Tools must be an array of valid tool identifiers",
  INVALID_PLACEHOLDERS: "Placeholders must be an object with string keys and values",
  INVALID_CONFIG: "Config must be an object",
  INVALID_OVERRIDES: "Overrides must be objects with valid structure",
} as const

/**
 * Standard validation warnings
 */
export const VALIDATION_WARNINGS = {
  EMPTY_TOOLS: "No tools configured - variant may have limited functionality",
  EMPTY_COMPONENT_ORDER: "Empty component order - variant may not render properly",
  MISSING_DESCRIPTION: "Missing description - consider adding one for better documentation",
  MISSING_TAGS: "No tags configured - consider adding tags for better organization",
  MISSING_LABELS: "No labels configured - consider adding labels for versioning",
  LARGE_COMPONENT_ORDER: "Large component order - consider if all components are necessary",
  MANY_TOOLS: "Many tools configured - consider if all tools are necessary for this variant",
} as const

/**
 * Validate required fields
 */
export function validateRequiredFields(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!variant.id) {
    errors.push(VALIDATION_MESSAGES.REQUIRED_FIELD("id"))
  }

  if (!variant.family) {
    errors.push(VALIDATION_MESSAGES.REQUIRED_FIELD("family"))
  }

  if (!variant.description) {
    errors.push(VALIDATION_MESSAGES.REQUIRED_FIELD("description"))
  } else if (variant.description.trim().length === 0) {
    warnings.push(VALIDATION_WARNINGS.MISSING_DESCRIPTION)
  }

  if (!variant.componentOrder || variant.componentOrder.length === 0) {
    errors.push(VALIDATION_MESSAGES.INVALID_COMPONENT_ORDER)
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate version field
 */
export function validateVersion(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (typeof variant.version !== "number" || variant.version <= 0 || !Number.isInteger(variant.version)) {
    errors.push(VALIDATION_MESSAGES.INVALID_VERSION)
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate tags field
 */
export function validateTags(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (variant.tags) {
    if (!Array.isArray(variant.tags)) {
      errors.push(VALIDATION_MESSAGES.INVALID_TAGS)
    } else {
      const invalidTags = variant.tags.filter(tag => typeof tag !== "string" || tag.trim().length === 0)
      if (invalidTags.length > 0) {
        errors.push(VALIDATION_MESSAGES.INVALID_TAGS)
      }
      
      if (variant.tags.length === 0) {
        warnings.push(VALIDATION_WARNINGS.MISSING_TAGS)
      }
    }
  } else {
    warnings.push(VALIDATION_WARNINGS.MISSING_TAGS)
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate labels field
 */
export function validateLabels(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (variant.labels) {
    if (typeof variant.labels !== "object" || Array.isArray(variant.labels)) {
      errors.push(VALIDATION_MESSAGES.INVALID_LABELS)
    } else {
      const invalidEntries = Object.entries(variant.labels).filter(
        ([key, value]) => typeof key !== "string" || typeof value !== "number" || value <= 0
      )
      if (invalidEntries.length > 0) {
        errors.push(VALIDATION_MESSAGES.INVALID_LABELS)
      }
      
      if (Object.keys(variant.labels).length === 0) {
        warnings.push(VALIDATION_WARNINGS.MISSING_LABELS)
      }
    }
  } else {
    warnings.push(VALIDATION_WARNINGS.MISSING_LABELS)
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate tools field
 */
export function validateTools(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (variant.tools) {
    if (!Array.isArray(variant.tools)) {
      errors.push(VALIDATION_MESSAGES.INVALID_TOOLS)
    } else {
      if (variant.tools.length === 0) {
        warnings.push(VALIDATION_WARNINGS.EMPTY_TOOLS)
      } else if (variant.tools.length > 15) {
        warnings.push(VALIDATION_WARNINGS.MANY_TOOLS)
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate placeholders field
 */
export function validatePlaceholders(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (variant.placeholders) {
    if (typeof variant.placeholders !== "object" || Array.isArray(variant.placeholders)) {
      errors.push(VALIDATION_MESSAGES.INVALID_PLACEHOLDERS)
    } else {
      const invalidEntries = Object.entries(variant.placeholders).filter(
        ([key, value]) => typeof key !== "string" || typeof value !== "string"
      )
      if (invalidEntries.length > 0) {
        errors.push(VALIDATION_MESSAGES.INVALID_PLACEHOLDERS)
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate config field
 */
export function validateConfig(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (variant.config) {
    if (typeof variant.config !== "object" || Array.isArray(variant.config)) {
      errors.push(VALIDATION_MESSAGES.INVALID_CONFIG)
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate component order
 */
export function validateComponentOrder(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (variant.componentOrder) {
    if (variant.componentOrder.length === 0) {
      errors.push(VALIDATION_MESSAGES.INVALID_COMPONENT_ORDER)
    } else if (variant.componentOrder.length > 15) {
      warnings.push(VALIDATION_WARNINGS.LARGE_COMPONENT_ORDER)
    }
  }

  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Comprehensive validation function
 */
export function validateVariantComprehensive(
  variant: PromptVariant, 
  options: ValidationOptions = { strict: false }
): ValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  // Run all validation functions
  const validators = [
    validateRequiredFields,
    validateVersion,
    validateTags,
    validateLabels,
    validateTools,
    validatePlaceholders,
    validateConfig,
    validateComponentOrder,
  ]

  for (const validator of validators) {
    const result = validator(variant)
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)
  }

  // In strict mode, treat warnings as errors
  if (options.strict) {
    allErrors.push(...allWarnings)
    allWarnings.length = 0
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * Quick validation for common issues
 */
export function validateVariantQuick(variant: PromptVariant): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check most critical issues
  if (!variant.id) errors.push(VALIDATION_MESSAGES.REQUIRED_FIELD("id"))
  if (!variant.family) errors.push(VALIDATION_MESSAGES.REQUIRED_FIELD("family"))
  if (!variant.description) errors.push(VALIDATION_MESSAGES.REQUIRED_FIELD("description"))
  if (!variant.componentOrder?.length) errors.push(VALIDATION_MESSAGES.INVALID_COMPONENT_ORDER)

  return { isValid: errors.length === 0, errors, warnings }
}
