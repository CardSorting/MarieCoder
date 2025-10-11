/**
 * Diff parsing and file reconstruction facade
 * Refactored from monolithic 831-line file into focused modules
 *
 * This facade maintains backward compatibility while delegating to:
 * - types/diff_types.ts - Type definitions and constants
 * - validators/block_validator.ts - Block marker validation
 * - matchers/* - Three-tier matching strategy (exact, line, block)
 * - coordinators/match_coordinator.ts - Match orchestration
 * - constructors/* - V1 and V2 implementations
 */

import { constructNewFileContentV1 } from "./constructors/v1_constructor"
import { constructNewFileContentV2 } from "./constructors/v2_constructor"
import type { DiffConstructor, DiffVersion } from "./types/diff_types"

// Re-export types for backward compatibility
export type { DiffVersion, MatchResult, ProcessingState, Replacement } from "./types/diff_types"
export {
	LEGACY_REPLACE_BLOCK_CHAR,
	LEGACY_SEARCH_BLOCK_CHAR,
	REPLACE_BLOCK_CHAR,
	REPLACE_BLOCK_END,
	SEARCH_BLOCK_CHAR,
	SEARCH_BLOCK_END,
	SEARCH_BLOCK_START,
} from "./types/diff_types"

/**
 * Version mapping for diff constructors
 * Allows switching between V1 and V2 implementations
 */
const constructNewFileContentVersionMapping: Record<string, DiffConstructor> = {
	v1: constructNewFileContentV1,
	v2: constructNewFileContentV2,
} as const

/**
 * Reconstructs file content by applying a streamed diff to the original content
 *
 * The diff format uses SEARCH/REPLACE blocks:
 *
 *   ------- SEARCH
 *   [Content to find]
 *   =======
 *   [Content to replace with]
 *   +++++++ REPLACE
 *
 * Matching Strategy (three-tier fallback):
 * 1. Exact Match - Fast string matching (primary)
 * 2. Line-Trimmed Match - Tolerates whitespace differences (fallback)
 * 3. Block Anchor Match - Uses first/last lines as anchors (final fallback)
 *
 * Features:
 * - Streaming support (incremental chunks)
 * - Out-of-order replacement handling (V1)
 * - Error recovery for malformed blocks (V2)
 * - Legacy format support (<<< SEARCH >>> REPLACE)
 *
 * @param diffContent - The diff content (may be partial or complete)
 * @param originalContent - The original file content
 * @param isFinal - Whether this is the final chunk
 * @param version - Constructor version to use ("v1" or "v2", defaults to "v1")
 * @returns Reconstructed file content
 * @throws Error if constructor version is invalid or diff cannot be parsed
 *
 * @example
 * ```typescript
 * const result = await constructNewFileContent(
 *   diffChunk,
 *   originalFileContent,
 *   false, // not final yet
 *   "v1"   // use V1 constructor
 * )
 * ```
 */
export async function constructNewFileContent(
	diffContent: string,
	originalContent: string,
	isFinal: boolean,
	version: DiffVersion = "v1",
): Promise<string> {
	const constructor = constructNewFileContentVersionMapping[version]
	if (!constructor) {
		throw new Error(`Invalid version '${version}' for file content constructor`)
	}
	return constructor(diffContent, originalContent, isFinal)
}
