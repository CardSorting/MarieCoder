/**
 * Hook for mode toggle functionality
 */

import { PlanActMode, TogglePlanActModeRequest } from "@shared/proto/cline/state"
import type { Mode } from "@shared/storage/types"
import { useCallback } from "react"
import { StateServiceClient } from "@/services/grpc-client"

export interface UseModeToggleOptions {
	mode: Mode
	showModelSelector: boolean
	submitApiConfig: () => Promise<void>
	inputValue: string
	selectedImages: string[]
	selectedFiles: string[]
	setInputValue: (value: string) => void
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
}

export const useModeToggle = ({
	mode,
	showModelSelector,
	submitApiConfig,
	inputValue,
	selectedImages,
	selectedFiles,
	setInputValue,
	textAreaRef,
}: UseModeToggleOptions) => {
	const onModeToggle = useCallback(() => {
		let changeModeDelay = 0
		if (showModelSelector) {
			submitApiConfig()
			changeModeDelay = 250
		}
		setTimeout(async () => {
			const convertedProtoMode = mode === "plan" ? PlanActMode.ACT : PlanActMode.PLAN
			const response = await StateServiceClient.togglePlanActModeProto(
				TogglePlanActModeRequest.create({
					mode: convertedProtoMode,
					chatContent: {
						message: inputValue.trim() ? inputValue : undefined,
						images: selectedImages,
						files: selectedFiles,
					},
				}),
			)
			setTimeout(() => {
				if (response.value) {
					setInputValue("")
				}
				textAreaRef.current?.focus()
			}, 100)
		}, changeModeDelay)
	}, [mode, showModelSelector, submitApiConfig, inputValue, selectedImages, selectedFiles, setInputValue, textAreaRef])

	return { onModeToggle }
}
