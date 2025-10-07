/**
 * No-op Feature Flags Service
 *
 * This is a stub implementation that provides the feature flags interface without
 * actually using any feature flag provider. All flags return false by default.
 */

class FeatureFlagsService {
	async poll(): Promise<void> {}

	getWorkOsAuthEnabled(): boolean {
		return false
	}

	getFeatureFlag(_flag: string): boolean {
		return false
	}

	dispose(): void {}
}

export const featureFlagsService = new FeatureFlagsService()
