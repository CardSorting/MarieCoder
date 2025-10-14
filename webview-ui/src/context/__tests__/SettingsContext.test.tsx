/**
 * SettingsContext Tests
 *
 * Tests for the Settings context provider
 */

import type { DictationSettings } from "@shared/DictationSettings"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SettingsContextProvider, useSettingsState } from "../SettingsContext"

describe("SettingsContext", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("Provider Initialization", () => {
		it("should provide initial settings state", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.didHydrateState).toBe(false)
			expect(result.current.autoApprovalSettings).toBeDefined()
			expect(result.current.browserSettings).toBeDefined()
			expect(result.current.dictationSettings).toBeDefined()
		})

		it("should have all setter functions defined", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.setDictationSettings).toBeDefined()
			expect(result.current.setGlobalClineRulesToggles).toBeDefined()
			expect(result.current.setLocalClineRulesToggles).toBeDefined()
			expect(result.current.setLocalCursorRulesToggles).toBeDefined()
			expect(result.current.setLocalWindsurfRulesToggles).toBeDefined()
			expect(result.current.setLocalWorkflowToggles).toBeDefined()
			expect(result.current.setUserInfo).toBeDefined()
		})

		it("should initialize with default values", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.mode).toBe("act")
			expect(result.current.planActSeparateModelsSetting).toBe(true)
			expect(result.current.enableCheckpointsSetting).toBe(true)
			expect(result.current.terminalReuseEnabled).toBe(true)
			expect(result.current.terminalOutputLineLimit).toBe(500)
			expect(result.current.shellIntegrationTimeout).toBe(4000)
		})
	})

	describe("Dictation Settings", () => {
		it("should update dictation settings", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const newSettings: DictationSettings = {
				dictationLanguage: "en",
				dictationEnabled: true,
				featureEnabled: true,
			}

			act(() => {
				result.current.setDictationSettings(newSettings)
			})

			await waitFor(() => {
				expect(result.current.dictationSettings).toEqual(newSettings)
			})
		})

		it("should not mutate other state when updating dictation settings", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const originalMode = result.current.mode
			const newSettings: DictationSettings = {
				dictationLanguage: "es",
				dictationEnabled: true,
				featureEnabled: true,
			}

			act(() => {
				result.current.setDictationSettings(newSettings)
			})

			await waitFor(() => {
				expect(result.current.mode).toBe(originalMode)
			})
		})
	})

	describe("Rules Toggles", () => {
		it("should update global Cline rules toggles", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const toggles = { rule1: true, rule2: false }

			act(() => {
				result.current.setGlobalClineRulesToggles(toggles)
			})

			await waitFor(() => {
				expect(result.current.globalClineRulesToggles).toEqual(toggles)
			})
		})

		it("should update local Cline rules toggles", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const toggles = { localRule1: true }

			act(() => {
				result.current.setLocalClineRulesToggles(toggles)
			})

			await waitFor(() => {
				expect(result.current.localClineRulesToggles).toEqual(toggles)
			})
		})

		it("should update local Cursor rules toggles", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const toggles = { cursorRule1: false }

			act(() => {
				result.current.setLocalCursorRulesToggles(toggles)
			})

			await waitFor(() => {
				expect(result.current.localCursorRulesToggles).toEqual(toggles)
			})
		})

		it("should update local Windsurf rules toggles", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const toggles = { windsurfRule1: true }

			act(() => {
				result.current.setLocalWindsurfRulesToggles(toggles)
			})

			await waitFor(() => {
				expect(result.current.localWindsurfRulesToggles).toEqual(toggles)
			})
		})

		it("should update local workflow toggles", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const toggles = { workflow1: true, workflow2: false }

			act(() => {
				result.current.setLocalWorkflowToggles(toggles)
			})

			await waitFor(() => {
				expect(result.current.localWorkflowToggles).toEqual(toggles)
			})
		})
	})

	describe("User Info", () => {
		it("should update user info", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const userInfo = {
				id: "user123",
				email: "test@example.com",
				name: "Test User",
			}

			act(() => {
				result.current.setUserInfo(userInfo as any)
			})

			await waitFor(() => {
				expect(result.current.userInfo).toEqual(userInfo)
			})
		})

		it("should clear user info when set to undefined", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			// First set user info
			act(() => {
				result.current.setUserInfo({ id: "user123" } as any)
			})

			// Then clear it
			act(() => {
				result.current.setUserInfo(undefined)
			})

			await waitFor(() => {
				expect(result.current.userInfo).toBeUndefined()
			})
		})
	})

	describe("Terminal Profiles", () => {
		it("should initialize with empty terminal profiles", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.availableTerminalProfiles).toEqual([])
		})

		it("should have default terminal profile setting", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.defaultTerminalProfile).toBe("default")
		})
	})

	describe("Error Handling", () => {
		it("should throw error when used outside provider", () => {
			expect(() => {
				renderHook(() => useSettingsState())
			}).toThrow("useSettingsState must be used within a SettingsContextProvider")
		})
	})

	describe("State Immutability", () => {
		it("should not mutate state when updating multiple settings", async () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			const initialBrowserSettings = result.current.browserSettings
			const initialAutoApprovalSettings = result.current.autoApprovalSettings

			act(() => {
				result.current.setDictationSettings({
					dictationLanguage: "fr",
					dictationEnabled: true,
					featureEnabled: true,
				})
			})

			act(() => {
				result.current.setGlobalClineRulesToggles({ rule1: true })
			})

			await waitFor(() => {
				// These settings should remain unchanged
				expect(result.current.browserSettings).toEqual(initialBrowserSettings)
				expect(result.current.autoApprovalSettings).toEqual(initialAutoApprovalSettings)
			})
		})
	})

	describe("Workspace Settings", () => {
		it("should have workspace root settings", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.workspaceRoots).toBeDefined()
			expect(result.current.primaryRootIndex).toBe(0)
			expect(result.current.isMultiRootWorkspace).toBe(false)
		})

		it("should have multi-root settings initialized", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.multiRootSetting).toEqual({
				user: false,
				featureFlag: false,
			})
		})
	})

	describe("Feature Flags", () => {
		it("should have checkpoint setting enabled by default", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.enableCheckpointsSetting).toBe(true)
		})

		it("should have plan/act separate models enabled by default", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.planActSeparateModelsSetting).toBe(true)
		})

		it("should have strict plan mode disabled by default", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.strictPlanModeEnabled).toBe(false)
		})

		it("should have yolo mode disabled by default", () => {
			const { result } = renderHook(() => useSettingsState(), {
				wrapper: SettingsContextProvider,
			})

			expect(result.current.yoloModeToggled).toBe(false)
		})
	})
})
