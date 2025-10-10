/**
 * State Machines Index
 *
 * Central export for all state machine utilities and implementations.
 *
 * Note: Helper functions are NOT exported from this index to avoid naming conflicts.
 * Import them directly from their specific state machine files:
 *
 * @example
 * ```typescript
 * import { useStateMachine } from '@/hooks/state_machines'
 * import {
 *   createChatMessageStateMachine,
 *   getChatMessageStatus
 * } from '@/hooks/state_machines/chat_message_state_machine'
 *
 * const machine = useStateMachine(createChatMessageStateMachine())
 * const status = getChatMessageStatus(machine.state.value, machine.state.context)
 * ```
 */

// ============================================================================
// Core State Machine Hook
// ============================================================================
export * from "../use_state_machine"
export type { ActionButtonsContext, ActionButtonsEvent } from "./action_buttons_state_machine"
export { createActionButtonsStateMachine } from "./action_buttons_state_machine"
export type { ChatMessageContext, ChatMessageEvent } from "./chat_message_state_machine"
// ============================================================================
// State Machine Creators (only - helpers must be imported from specific files)
// ============================================================================
export { createChatMessageStateMachine } from "./chat_message_state_machine"
// ============================================================================
// Visualization and Debugging
// ============================================================================
export * from "./state_machine_visualizer"
export type { UserMessageEditContext, UserMessageEditEvent } from "./user_message_edit_state_machine"
export { createUserMessageEditStateMachine } from "./user_message_edit_state_machine"
export type { VoiceRecorderContext, VoiceRecorderEvent } from "./voice_recorder_state_machine"
export { createVoiceRecorderStateMachine } from "./voice_recorder_state_machine"
