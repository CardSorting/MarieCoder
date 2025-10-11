import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { Logger } from "@services/logging/Logger"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"

/**
 * Pending notification data structure
 */
export interface PendingNotification {
	serverName: string
	level: string
	message: string
	timestamp: number
}

/**
 * Notification callback type
 */
export type NotificationCallback = (serverName: string, level: string, message: string) => void

/**
 * Manages MCP server notifications
 *
 * This service handles notifications from MCP servers, including:
 * - Real-time notification forwarding to active tasks
 * - Pending notification storage when no task is active
 * - Notification callback registration
 * - Notification schema validation
 *
 * MCP servers can send notifications using the notifications/message method.
 * This manager receives those notifications and routes them appropriately.
 *
 * Responsibilities:
 * - Register notification handlers with MCP clients
 * - Route notifications to active tasks
 * - Store notifications when no active task
 * - Provide pending notification retrieval
 * - Handle notification schema validation
 *
 * @example
 * ```typescript
 * const notificationManager = new McpNotificationManager()
 * notificationManager.setCallback((server, level, msg) => { ... })
 * await notificationManager.setupNotificationHandlers(client, serverName)
 * ```
 */
export class McpNotificationManager {
	private pendingNotifications: PendingNotification[] = []
	private notificationCallback?: NotificationCallback

	/**
	 * Set up notification handlers for an MCP client
	 *
	 * Registers handlers for the notifications/message method and sets up
	 * a fallback handler for other notification types. Notifications are
	 * either forwarded to the active task callback or stored as pending.
	 *
	 * @param client - The MCP client to set up handlers for
	 * @param serverName - Name of the server (for logging and routing)
	 */
	async setupNotificationHandlers(client: Client, serverName: string): Promise<void> {
		try {
			// Import zod for schema validation
			const { z } = await import("zod")

			// Define the notification schema for notifications/message
			const NotificationMessageSchema = z.object({
				method: z.literal("notifications/message"),
				params: z
					.object({
						level: z.enum(["debug", "info", "warning", "error"]).optional(),
						logger: z.string().optional(),
						data: z.string().optional(),
						message: z.string().optional(),
					})
					.optional(),
			})

			// Set the notification handler for notifications/message
			client.setNotificationHandler(NotificationMessageSchema as any, async (notification: any) => {
				const params = notification.params || {}
				const level = params.level || "info"
				const data = params.data || params.message || ""
				const logger = params.logger || ""

				// Format the message
				const message = logger ? `[${logger}] ${data}` : data

				// Send notification directly to active task if callback is set
				if (this.notificationCallback) {
					this.notificationCallback(serverName, level, message)
				} else {
					// Fallback: store for later retrieval
					this.pendingNotifications.push({
						serverName,
						level,
						message,
						timestamp: Date.now(),
					})
				}
			})

			// Set a fallback handler for any other notification types
			client.fallbackNotificationHandler = async (notification: any) => {
				// Show in VS Code for visibility
				HostProvider.window.showMessage({
					type: ShowMessageType.INFORMATION,
					message: `MCP ${serverName}: ${notification.method || "unknown"} - ${JSON.stringify(notification.params || {})}`,
				})
			}
		} catch (error) {
			Logger.error(
				`Error setting notification handlers for ${serverName}`,
				error instanceof Error ? error : new Error(String(error)),
			)
		}
	}

	/**
	 * Set the notification callback for real-time notifications
	 *
	 * When a callback is set, notifications will be forwarded immediately
	 * to the callback instead of being stored as pending.
	 *
	 * @param callback - Function to call when notifications arrive
	 */
	setCallback(callback: NotificationCallback): void {
		this.notificationCallback = callback
	}

	/**
	 * Clear the notification callback
	 *
	 * After clearing, notifications will be stored as pending instead
	 * of being forwarded to a callback.
	 */
	clearCallback(): void {
		this.notificationCallback = undefined
	}

	/**
	 * Get and clear pending notifications
	 *
	 * Returns all pending notifications that were received while no
	 * callback was registered, and clears the pending list.
	 *
	 * @returns Array of pending notifications
	 */
	getPendingNotifications(): PendingNotification[] {
		const notifications = [...this.pendingNotifications]
		this.pendingNotifications = []
		return notifications
	}

	/**
	 * Check if a callback is currently registered
	 *
	 * @returns True if callback is registered, false otherwise
	 */
	hasCallback(): boolean {
		return this.notificationCallback !== undefined
	}

	/**
	 * Get count of pending notifications
	 *
	 * @returns Number of pending notifications
	 */
	getPendingCount(): number {
		return this.pendingNotifications.length
	}

	/**
	 * Clear all pending notifications without returning them
	 *
	 * Useful when you want to discard pending notifications.
	 */
	clearPendingNotifications(): void {
		this.pendingNotifications = []
	}
}
