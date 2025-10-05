// Simple style utilities for NormieDev
export const getVariantStyles = (variant: string) => {
  const variants = {
    default: 'normie-dev-subtle',
    accent: 'normie-dev-accent',
    brand: 'normie-dev-brand'
  }
  return variants[variant as keyof typeof variants] || variants.default
}

export const getSizeStyles = (size: string) => {
  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  }
  return sizes[size as keyof typeof sizes] || sizes.md
}

export const marieKondoClean = 'marie-kondo-clean'
