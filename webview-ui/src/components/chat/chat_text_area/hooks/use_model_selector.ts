/**
 * Custom hook for model selector management
 */

import type { ApiConfiguration, ModelInfo } from "@shared/api"
import { EmptyRequest } from "@shared/proto/cline/common"
import { UpdateApiConfigurationRequest } from "@shared/proto/cline/models"
import { convertApiConfigurationToProto } from "@shared/proto-conversions/models/api-configuration-conversion"
import type { Mode } from "@shared/storage/types"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils"
import { ModelsServiceClient, StateServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { formatModelName } from "@/utils/format_model_name"
import { useClickAway, useWindowSize } from "@/utils/hooks"
import { validateApiConfiguration, validateModelId } from "@/utils/validate"

export interface UseModelSelectorOptions {
	apiConfiguration: ApiConfiguration
	mode: Mode
	openRouterModels: Record<string, ModelInfo>
	showModelSelector: boolean
	setShowModelSelector: (show: boolean) => void
}

export const useModelSelector = ({
	apiConfiguration,
	mode,
	openRouterModels,
	showModelSelector,
	setShowModelSelector,
}: UseModelSelectorOptions) => {
	const modelSelectorRef = useRef<HTMLDivElement>(null)
	const { width: viewportWidth, height: viewportHeight } = useWindowSize()
	const buttonRef = useRef<HTMLDivElement>(null)
	const [arrowPosition, setArrowPosition] = useState(0)
	const [menuPosition, setMenuPosition] = useState(0)
	const prevShowModelSelector = useRef(showModelSelector)

	// Separate the API config submission logic
	const submitApiConfig = useCallback(async () => {
		const apiValidationResult = validateApiConfiguration(mode, apiConfiguration)
		const modelIdValidationResult = validateModelId(mode, apiConfiguration, openRouterModels)

		if (!apiValidationResult && !modelIdValidationResult && apiConfiguration) {
			try {
				await ModelsServiceClient.updateApiConfigurationProto(
					UpdateApiConfigurationRequest.create({
						apiConfiguration: convertApiConfigurationToProto(apiConfiguration),
					}),
				)
			} catch (error) {
				debug.error("Failed to update API configuration:", error)
			}
		} else {
			StateServiceClient.getLatestState(EmptyRequest.create())
				.then(() => {
					debug.log("State refreshed")
				})
				.catch((error) => {
					debug.error("Error refreshing state:", error)
				})
		}
	}, [apiConfiguration, openRouterModels, mode])

	// Use an effect to detect menu close
	useEffect(() => {
		if (prevShowModelSelector.current && !showModelSelector) {
			// Menu was just closed
			submitApiConfig()
		}
		prevShowModelSelector.current = showModelSelector
	}, [showModelSelector, submitApiConfig])

	const handleModelButtonClick = useCallback(() => {
		setShowModelSelector(!showModelSelector)
	}, [showModelSelector, setShowModelSelector])

	const handleCloseModelSelector = useCallback(() => {
		setShowModelSelector(false)
	}, [setShowModelSelector])

	// Update click away handler to just close menu
	useClickAway(modelSelectorRef, handleCloseModelSelector)

	// Handle Escape key to close model selector
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && showModelSelector) {
				handleCloseModelSelector()
			}
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [showModelSelector, handleCloseModelSelector])

	// Get model display names (both full and formatted short version)
	const { modelDisplayName, modelFullName } = useMemo(() => {
		const { selectedProvider, selectedModelId } = normalizeApiConfiguration(apiConfiguration, mode)
		const unknownModel = "unknown"
		if (!apiConfiguration) {
			return { modelDisplayName: unknownModel, modelFullName: unknownModel }
		}
		const fullName = `${selectedProvider}:${selectedModelId}`
		const { short } = formatModelName(fullName)
		return { modelDisplayName: short, modelFullName: fullName }
	}, [apiConfiguration, mode])

	// Calculate arrow position and menu position based on button location
	useEffect(() => {
		if (showModelSelector && buttonRef.current) {
			const buttonRect = buttonRef.current.getBoundingClientRect()
			const buttonCenter = buttonRect.left + buttonRect.width / 2

			// Calculate distance from right edge of viewport using viewport coordinates
			const rightPosition = document.documentElement.clientWidth - buttonCenter - 5

			setArrowPosition(rightPosition)
			setMenuPosition(buttonRect.top + 1)
		}
	}, [showModelSelector, viewportWidth, viewportHeight])

	useEffect(() => {
		if (!showModelSelector) {
			// Reset any active styling by blurring the button
			const button = buttonRef.current?.querySelector("a")
			if (button) {
				button.blur()
			}
		}
	}, [showModelSelector])

	return {
		modelSelectorRef,
		buttonRef,
		arrowPosition,
		menuPosition,
		modelDisplayName,
		modelFullName,
		submitApiConfig,
		handleModelButtonClick,
	}
}
