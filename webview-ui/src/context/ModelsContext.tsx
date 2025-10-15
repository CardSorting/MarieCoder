/**
 * ModelsContext - Manages AI model configurations
 *
 * This context handles:
 * - Model lists for all providers
 * - Model refresh operations
 * - Model subscriptions
 *
 * Benefits:
 * - Components only re-render when model lists change
 * - Isolated model-related logic
 * - Better organization of provider-specific models
 */

import {
	basetenDefaultModelId,
	basetenModels,
	groqDefaultModelId,
	groqModels,
	type ModelInfo,
	openRouterDefaultModelId,
	openRouterDefaultModelInfo,
	requestyDefaultModelId,
	requestyDefaultModelInfo,
	vercelAiGatewayDefaultModelId,
	vercelAiGatewayDefaultModelInfo,
} from "@shared/api"
import { EmptyRequest } from "@shared/proto/cline/common"
import type { OpenRouterCompatibleModelInfo } from "@shared/proto/cline/models"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createContextSelector } from "@/hooks/use_context_selector"
import { debug, logError } from "@/utils/debug_logger"
import { ModelsServiceClient } from "../services/grpc-client"

export interface ModelsContextType {
	// Model lists
	openRouterModels: Record<string, ModelInfo>
	openAiModels: string[]
	requestyModels: Record<string, ModelInfo>
	groqModels: Record<string, ModelInfo>
	basetenModels: Record<string, ModelInfo>
	huggingFaceModels: Record<string, ModelInfo>
	vercelAiGatewayModels: Record<string, ModelInfo>

	// Setters
	setRequestyModels: (value: Record<string, ModelInfo>) => void
	setGroqModels: (value: Record<string, ModelInfo>) => void
	setBasetenModels: (value: Record<string, ModelInfo>) => void
	setHuggingFaceModels: (value: Record<string, ModelInfo>) => void
	setVercelAiGatewayModels: (value: Record<string, ModelInfo>) => void

	// Refresh functions
	refreshOpenRouterModels: () => void
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined)

export const ModelsContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	const [openRouterModels, setOpenRouterModels] = useState<Record<string, ModelInfo>>({
		[openRouterDefaultModelId]: openRouterDefaultModelInfo,
	})
	const [openAiModels, _setOpenAiModels] = useState<string[]>([])
	const [requestyModels, setRequestyModels] = useState<Record<string, ModelInfo>>({
		[requestyDefaultModelId]: requestyDefaultModelInfo,
	})
	const [groqModelsState, setGroqModels] = useState<Record<string, ModelInfo>>({
		[groqDefaultModelId]: groqModels[groqDefaultModelId],
	})
	const [basetenModelsState, setBasetenModels] = useState<Record<string, ModelInfo>>({
		[basetenDefaultModelId]: basetenModels[basetenDefaultModelId],
	})
	const [huggingFaceModels, setHuggingFaceModels] = useState<Record<string, ModelInfo>>({})
	const [vercelAiGatewayModels, setVercelAiGatewayModels] = useState<Record<string, ModelInfo>>({
		[vercelAiGatewayDefaultModelId]: vercelAiGatewayDefaultModelInfo,
	})

	// Subscription refs
	const openRouterModelsUnsubscribeRef = useRef<(() => void) | null>(null)

	// Refresh OpenRouter models
	const refreshOpenRouterModels = useCallback(() => {
		ModelsServiceClient.refreshOpenRouterModels(EmptyRequest.create({}))
			.then((response: OpenRouterCompatibleModelInfo) => {
				const models = response.models
				setOpenRouterModels({
					[openRouterDefaultModelId]: openRouterDefaultModelInfo,
					...models,
				})
			})
			.catch((error: Error) => logError("Failed to refresh OpenRouter models:", error))
	}, [])

	// Subscribe to model updates
	useEffect(() => {
		// Subscribe to OpenRouter models updates
		openRouterModelsUnsubscribeRef.current = ModelsServiceClient.subscribeToOpenRouterModels(EmptyRequest.create({}), {
			onResponse: (response: OpenRouterCompatibleModelInfo) => {
				debug.log("[DEBUG] Received OpenRouter models update from gRPC stream")
				const models = response.models
				setOpenRouterModels({
					[openRouterDefaultModelId]: openRouterDefaultModelInfo,
					...models,
				})
			},
			onError: (error) => {
				logError("Error in OpenRouter models subscription:", error)
			},
			onComplete: () => {
				debug.log("OpenRouter models subscription completed")
			},
		})

		// Clean up subscription
		return () => {
			if (openRouterModelsUnsubscribeRef.current) {
				openRouterModelsUnsubscribeRef.current()
				openRouterModelsUnsubscribeRef.current = null
			}
		}
	}, [])

	const contextValue: ModelsContextType = {
		openRouterModels,
		openAiModels,
		requestyModels,
		groqModels: groqModelsState,
		basetenModels: basetenModelsState,
		huggingFaceModels,
		vercelAiGatewayModels,
		setRequestyModels,
		setGroqModels,
		setBasetenModels,
		setHuggingFaceModels,
		setVercelAiGatewayModels,
		refreshOpenRouterModels,
	}

	return <ModelsContext.Provider value={contextValue}>{children}</ModelsContext.Provider>
}

/**
 * Hook to access models state
 *
 * @example
 * ```typescript
 * const { openRouterModels, refreshOpenRouterModels } = useModelsState()
 * ```
 */
export const useModelsState = () => {
	const context = useContext(ModelsContext)
	if (context === undefined) {
		throw new Error("useModelsState must be used within a ModelsContextProvider")
	}
	return context
}

/**
 * Optimized selector hook for models state
 * Reduces re-renders by only updating when selected model lists change
 *
 * @example
 * ```typescript
 * // Single provider:
 * const openRouterModels = useModelsStateSelector(state => state.openRouterModels)
 *
 * // Multiple providers:
 * const { openRouterModels, groqModels } = useModelsStateSelector(
 *   state => ({
 *     openRouterModels: state.openRouterModels,
 *     groqModels: state.groqModels,
 *   })
 * )
 *
 * // Computed value:
 * const modelCount = useModelsStateSelector(
 *   state => Object.keys(state.openRouterModels).length
 * )
 * ```
 */
export const useModelsStateSelector = createContextSelector(useModelsState)
