# Diff.ts Refactoring Plan

**Target File**: `src/core/assistant-message/diff.ts`  
**Current Size**: 831 lines (monolithic)  
**Status**: Planning Phase  
**Date**: October 11, 2025

---

## 🎯 Refactoring Goals

### Primary Objectives
1. **Reduce Complexity** - Break down 831-line monolithic file into focused modules
2. **Improve Maintainability** - Separate parsing strategies, matching algorithms, and state management
3. **Enhance Testability** - Isolate concerns for easier unit testing
4. **Maintain Compatibility** - Preserve public API to avoid cascading changes

### Success Criteria
- ✅ Main facade < 200 lines
- ✅ All modules < 200 lines each
- ✅ Zero linting/TypeScript errors
- ✅ 100% backward compatible
- ✅ Clear separation of concerns

---

## 📊 Current Analysis

### File Structure Overview
```
diff.ts (831 lines)
├── Constants & Regex Patterns (30 lines)
├── Helper Functions (20 lines)
├── Matching Strategies (150 lines)
│   ├── lineTrimmedFallbackMatch
│   ├── blockAnchorFallbackMatch
├── V1 Implementation (220 lines)
│   └── constructNewFileContentV1
├── V2 Implementation (430 lines)
│   ├── NewFileContentConstructor class
│   └── constructNewFileContentV2
└── Public API (5 lines)
    └── constructNewFileContent
```

### Key Responsibilities Identified

1. **Pattern Matching** (Lines 1-31)
   - Constants for block markers
   - Regex patterns for flexible matching
   - Pattern validation helpers

2. **Line Matching Algorithms** (Lines 40-92)
   - Line-trimmed fallback matching
   - Character position calculation

3. **Block Anchor Matching** (Lines 121-174)
   - First/last line anchor matching
   - Multi-line block identification

4. **V1 Constructor** (Lines 255-474)
   - Original streaming implementation
   - Out-of-order replacement handling
   - Incremental processing

5. **V2 State Machine** (Lines 476-801)
   - Class-based implementation
   - State management with bitwise flags
   - Error recovery and validation

6. **Version Coordination** (Lines 234-254)
   - Version selection
   - Facade pattern implementation

---

## 🏗️ Proposed Architecture

### Module Structure

```
diff.ts (Facade - ~150 lines)
├── types/
│   └── diff_types.ts (~50 lines)
│       ├── Block markers & constants
│       ├── ProcessingState enum
│       ├── Replacement interface
│       └── Constructor options
│
├── matchers/
│   ├── line_matcher.ts (~100 lines)
│   │   ├── lineTrimmedFallbackMatch
│   │   ├── Character position calculation
│   │   └── Line splitting utilities
│   │
│   ├── block_matcher.ts (~100 lines)
│   │   ├── blockAnchorFallbackMatch
│   │   ├── Anchor extraction
│   │   └── Block size validation
│   │
│   └── exact_matcher.ts (~80 lines)
│       ├── Exact string matching
│       ├── Index calculation
│       └── Match validation
│
├── validators/
│   └── block_validator.ts (~120 lines)
│       ├── Pattern validation (isSearchBlockStart, etc.)
│       ├── Marker detection
│       ├── Partial marker handling
│       └── State transition validation
│
├── constructors/
│   ├── v1_constructor.ts (~220 lines)
│   │   ├── constructNewFileContentV1
│   │   ├── Replacement tracking
│   │   └── Out-of-order handling
│   │
│   └── v2_constructor.ts (~250 lines)
│       ├── NewFileContentConstructor class
│       ├── State machine implementation
│       └── Error recovery logic
│
└── coordinators/
    └── match_coordinator.ts (~150 lines)
        ├── Match strategy orchestration
        ├── Fallback cascade (exact → line → block)
        ├── Error message generation
        └── Match result formatting
```

### Total Distribution
- **Facade**: ~150 lines (82% reduction)
- **7 Modules**: ~1,070 lines total (average 153 lines each)
- **System Total**: ~1,220 lines (distributed, organized)

---

## 📋 Implementation Plan

### Phase 1: Foundation - Types & Validators (~2 hours)

#### Step 1.1: Create Type Definitions
**File**: `src/core/assistant-message/types/diff_types.ts`

```typescript
// Constants for block markers
export const SEARCH_BLOCK_START = "------- SEARCH"
export const SEARCH_BLOCK_END = "======="
export const REPLACE_BLOCK_END = "+++++++ REPLACE"

// Regex patterns
export const SEARCH_BLOCK_START_REGEX = /^[-]{3,} SEARCH>?$/
export const LEGACY_SEARCH_BLOCK_START_REGEX = /^[<]{3,} SEARCH>?$/
export const SEARCH_BLOCK_END_REGEX = /^[=]{3,}$/
export const REPLACE_BLOCK_END_REGEX = /^[+]{3,} REPLACE>?$/
export const LEGACY_REPLACE_BLOCK_END_REGEX = /^[>]{3,} REPLACE>?$/

// Processing state enum
export enum ProcessingState {
    Idle = 0,
    StateSearch = 1 << 0,
    StateReplace = 1 << 1,
}

// Replacement tracking
export interface Replacement {
    start: number
    end: number
    content: string
}

// Match result
export type MatchResult = [number, number] | false

// Version types
export type DiffVersion = "v1" | "v2"
```

#### Step 1.2: Create Block Validator
**File**: `src/core/assistant-message/validators/block_validator.ts`

```typescript
import {
    SEARCH_BLOCK_START_REGEX,
    LEGACY_SEARCH_BLOCK_START_REGEX,
    SEARCH_BLOCK_END_REGEX,
    REPLACE_BLOCK_END_REGEX,
    LEGACY_REPLACE_BLOCK_END_REGEX,
} from "../types/diff_types"

export class BlockValidator {
    static isSearchBlockStart(line: string): boolean {
        return SEARCH_BLOCK_START_REGEX.test(line) || 
               LEGACY_SEARCH_BLOCK_START_REGEX.test(line)
    }

    static isSearchBlockEnd(line: string): boolean {
        return SEARCH_BLOCK_END_REGEX.test(line)
    }

    static isReplaceBlockEnd(line: string): boolean {
        return REPLACE_BLOCK_END_REGEX.test(line) || 
               LEGACY_REPLACE_BLOCK_END_REGEX.test(line)
    }

    static isPartialMarker(line: string): boolean {
        // Detect incomplete marker lines
        const markerChars = ["-", "<", "=", "+", ">"]
        return markerChars.some(char => line.startsWith(char)) &&
               !this.isSearchBlockStart(line) &&
               !this.isSearchBlockEnd(line) &&
               !this.isReplaceBlockEnd(line)
    }

    static validateStateTransition(
        currentState: ProcessingState,
        newState: ProcessingState
    ): void {
        const isValid =
            (currentState === ProcessingState.Idle && 
             newState === ProcessingState.StateSearch) ||
            (currentState === ProcessingState.StateSearch && 
             newState === ProcessingState.StateReplace)

        if (!isValid) {
            throw new Error(
                `Invalid state transition.\n` +
                "Valid transitions are:\n" +
                "- Idle → StateSearch\n" +
                "- StateSearch → StateReplace"
            )
        }
    }
}
```

---

### Phase 2: Matchers - Matching Algorithms (~3 hours)

#### Step 2.1: Exact Matcher
**File**: `src/core/assistant-message/matchers/exact_matcher.ts`

```typescript
import type { MatchResult } from "../types/diff_types"

export class ExactMatcher {
    static findMatch(
        originalContent: string,
        searchContent: string,
        startIndex: number
    ): MatchResult {
        const exactIndex = originalContent.indexOf(searchContent, startIndex)
        
        if (exactIndex === -1) {
            return false
        }

        return [exactIndex, exactIndex + searchContent.length]
    }

    static findMatchAnywhere(
        originalContent: string,
        searchContent: string
    ): MatchResult {
        return this.findMatch(originalContent, searchContent, 0)
    }
}
```

#### Step 2.2: Line Matcher
**File**: `src/core/assistant-message/matchers/line_matcher.ts`

```typescript
import type { MatchResult } from "../types/diff_types"

export class LineMatcher {
    static findLineTrimmedMatch(
        originalContent: string,
        searchContent: string,
        startIndex: number
    ): MatchResult {
        const originalLines = originalContent.split("\n")
        const searchLines = this.prepareSearchLines(searchContent)

        const startLineNum = this.findStartLineNumber(
            originalLines,
            startIndex
        )

        for (let i = startLineNum; i <= originalLines.length - searchLines.length; i++) {
            const match = this.tryMatchAtLine(originalLines, searchLines, i)
            if (match) {
                return this.calculateCharacterPositions(
                    originalLines,
                    i,
                    searchLines.length
                )
            }
        }

        return false
    }

    private static prepareSearchLines(searchContent: string): string[] {
        const lines = searchContent.split("\n")
        // Trim trailing empty line if exists
        if (lines[lines.length - 1] === "") {
            lines.pop()
        }
        return lines
    }

    private static findStartLineNumber(
        originalLines: string[],
        startIndex: number
    ): number {
        let startLineNum = 0
        let currentIndex = 0
        while (currentIndex < startIndex && startLineNum < originalLines.length) {
            currentIndex += originalLines[startLineNum].length + 1
            startLineNum++
        }
        return startLineNum
    }

    private static tryMatchAtLine(
        originalLines: string[],
        searchLines: string[],
        startLine: number
    ): boolean {
        for (let j = 0; j < searchLines.length; j++) {
            const originalTrimmed = originalLines[startLine + j].trim()
            const searchTrimmed = searchLines[j].trim()

            if (originalTrimmed !== searchTrimmed) {
                return false
            }
        }
        return true
    }

    private static calculateCharacterPositions(
        originalLines: string[],
        startLine: number,
        lineCount: number
    ): [number, number] {
        let matchStartIndex = 0
        for (let k = 0; k < startLine; k++) {
            matchStartIndex += originalLines[k].length + 1
        }

        let matchEndIndex = matchStartIndex
        for (let k = 0; k < lineCount; k++) {
            matchEndIndex += originalLines[startLine + k].length + 1
        }

        return [matchStartIndex, matchEndIndex]
    }
}
```

#### Step 2.3: Block Matcher
**File**: `src/core/assistant-message/matchers/block_matcher.ts`

```typescript
import type { MatchResult } from "../types/diff_types"

export class BlockMatcher {
    private static readonly MIN_BLOCK_SIZE = 3

    static findBlockAnchorMatch(
        originalContent: string,
        searchContent: string,
        startIndex: number
    ): MatchResult {
        const originalLines = originalContent.split("\n")
        const searchLines = this.prepareSearchLines(searchContent)

        // Only use this approach for blocks of 3+ lines
        if (searchLines.length < this.MIN_BLOCK_SIZE) {
            return false
        }

        const anchors = this.extractAnchors(searchLines)
        const startLineNum = this.findStartLineNumber(originalLines, startIndex)

        return this.findMatchUsingAnchors(
            originalLines,
            searchLines.length,
            anchors,
            startLineNum
        )
    }

    private static prepareSearchLines(searchContent: string): string[] {
        const lines = searchContent.split("\n")
        if (lines[lines.length - 1] === "") {
            lines.pop()
        }
        return lines
    }

    private static extractAnchors(searchLines: string[]): {
        first: string
        last: string
    } {
        return {
            first: searchLines[0].trim(),
            last: searchLines[searchLines.length - 1].trim(),
        }
    }

    private static findStartLineNumber(
        originalLines: string[],
        startIndex: number
    ): number {
        let startLineNum = 0
        let currentIndex = 0
        while (currentIndex < startIndex && startLineNum < originalLines.length) {
            currentIndex += originalLines[startLineNum].length + 1
            startLineNum++
        }
        return startLineNum
    }

    private static findMatchUsingAnchors(
        originalLines: string[],
        blockSize: number,
        anchors: { first: string; last: string },
        startLineNum: number
    ): MatchResult {
        for (let i = startLineNum; i <= originalLines.length - blockSize; i++) {
            // Check if first line matches
            if (originalLines[i].trim() !== anchors.first) {
                continue
            }

            // Check if last line matches at expected position
            if (originalLines[i + blockSize - 1].trim() !== anchors.last) {
                continue
            }

            // Calculate exact character positions
            return this.calculatePositions(originalLines, i, blockSize)
        }

        return false
    }

    private static calculatePositions(
        originalLines: string[],
        startLine: number,
        blockSize: number
    ): [number, number] {
        let matchStartIndex = 0
        for (let k = 0; k < startLine; k++) {
            matchStartIndex += originalLines[k].length + 1
        }

        let matchEndIndex = matchStartIndex
        for (let k = 0; k < blockSize; k++) {
            matchEndIndex += originalLines[startLine + k].length + 1
        }

        return [matchStartIndex, matchEndIndex]
    }
}
```

---

### Phase 3: Coordinator - Match Orchestration (~2 hours)

#### Step 3.1: Match Coordinator
**File**: `src/core/assistant-message/coordinators/match_coordinator.ts`

```typescript
import { ExactMatcher } from "../matchers/exact_matcher"
import { LineMatcher } from "../matchers/line_matcher"
import { BlockMatcher } from "../matchers/block_matcher"
import type { MatchResult } from "../types/diff_types"

export class MatchCoordinator {
    /**
     * Attempts to find a match using multiple strategies in order:
     * 1. Exact match
     * 2. Line-trimmed match
     * 3. Block anchor match (for 3+ line blocks)
     * 
     * @throws Error if no match is found
     */
    static findMatch(
        originalContent: string,
        searchContent: string,
        startIndex: number
    ): [number, number] {
        // Strategy 1: Exact match
        const exactMatch = ExactMatcher.findMatch(
            originalContent,
            searchContent,
            startIndex
        )
        if (exactMatch) {
            return exactMatch
        }

        // Strategy 2: Line-trimmed match
        const lineMatch = LineMatcher.findLineTrimmedMatch(
            originalContent,
            searchContent,
            startIndex
        )
        if (lineMatch) {
            return lineMatch
        }

        // Strategy 3: Block anchor match
        const blockMatch = BlockMatcher.findBlockAnchorMatch(
            originalContent,
            searchContent,
            startIndex
        )
        if (blockMatch) {
            return blockMatch
        }

        // All strategies failed
        throw new Error(
            `The SEARCH block:\n${searchContent.trimEnd()}\n...does not match anything in the file.`
        )
    }

    /**
     * Attempts to find a match anywhere in the file (for out-of-order handling)
     */
    static findMatchAnywhere(
        originalContent: string,
        searchContent: string
    ): MatchResult {
        return ExactMatcher.findMatchAnywhere(originalContent, searchContent)
    }

    /**
     * Handles empty search content scenarios
     */
    static handleEmptySearch(originalContent: string): [number, number] {
        if (originalContent.length === 0) {
            // New file scenario
            return [0, 0]
        } else {
            // Complete file replacement
            return [0, originalContent.length]
        }
    }
}
```

---

### Phase 4: Constructors - V1 & V2 Implementations (~4 hours)

#### Step 4.1: V1 Constructor
**File**: `src/core/assistant-message/constructors/v1_constructor.ts`

```typescript
import { BlockValidator } from "../validators/block_validator"
import { MatchCoordinator } from "../coordinators/match_coordinator"
import type { Replacement } from "../types/diff_types"
import {
    SEARCH_BLOCK_CHAR,
    REPLACE_BLOCK_CHAR,
    LEGACY_SEARCH_BLOCK_CHAR,
    LEGACY_REPLACE_BLOCK_CHAR,
} from "../types/diff_types"

export async function constructNewFileContentV1(
    diffContent: string,
    originalContent: string,
    isFinal: boolean
): Promise<string> {
    let result = ""
    let lastProcessedIndex = 0

    let currentSearchContent = ""
    let currentReplaceContent = ""
    let inSearch = false
    let inReplace = false

    let searchMatchIndex = -1
    let searchEndIndex = -1

    const replacements: Replacement[] = []
    let pendingOutOfOrderReplacement = false

    const lines = diffContent.split("\n")

    // Remove partial markers from last line
    const lastLine = lines[lines.length - 1]
    if (lines.length > 0 && BlockValidator.isPartialMarker(lastLine)) {
        lines.pop()
    }

    for (const line of lines) {
        if (BlockValidator.isSearchBlockStart(line)) {
            inSearch = true
            currentSearchContent = ""
            currentReplaceContent = ""
            continue
        }

        if (BlockValidator.isSearchBlockEnd(line)) {
            inSearch = false
            inReplace = true

            if (!currentSearchContent) {
                ;[searchMatchIndex, searchEndIndex] = 
                    MatchCoordinator.handleEmptySearch(originalContent)
            } else {
                try {
                    ;[searchMatchIndex, searchEndIndex] = 
                        MatchCoordinator.findMatch(
                            originalContent,
                            currentSearchContent,
                            lastProcessedIndex
                        )
                } catch (error) {
                    // Try finding anywhere (out-of-order)
                    const anywhereMatch = MatchCoordinator.findMatchAnywhere(
                        originalContent,
                        currentSearchContent
                    )
                    if (anywhereMatch) {
                        ;[searchMatchIndex, searchEndIndex] = anywhereMatch
                        if (searchMatchIndex < lastProcessedIndex) {
                            pendingOutOfOrderReplacement = true
                        }
                    } else {
                        throw error
                    }
                }
            }

            // Check if out-of-order
            if (searchMatchIndex < lastProcessedIndex) {
                pendingOutOfOrderReplacement = true
            }

            // For in-order, output up to match
            if (!pendingOutOfOrderReplacement) {
                result += originalContent.slice(lastProcessedIndex, searchMatchIndex)
            }
            continue
        }

        if (BlockValidator.isReplaceBlockEnd(line)) {
            if (searchMatchIndex === -1) {
                throw new Error(
                    `The SEARCH block:\n${currentSearchContent.trimEnd()}\n...is malformatted.`
                )
            }

            replacements.push({
                start: searchMatchIndex,
                end: searchEndIndex,
                content: currentReplaceContent,
            })

            if (!pendingOutOfOrderReplacement) {
                lastProcessedIndex = searchEndIndex
            }

            // Reset
            inSearch = false
            inReplace = false
            currentSearchContent = ""
            currentReplaceContent = ""
            searchMatchIndex = -1
            searchEndIndex = -1
            pendingOutOfOrderReplacement = false
            continue
        }

        // Accumulate content
        if (inSearch) {
            currentSearchContent += line + "\n"
        } else if (inReplace) {
            currentReplaceContent += line + "\n"
            if (searchMatchIndex !== -1 && !pendingOutOfOrderReplacement) {
                result += line + "\n"
            }
        }
    }

    // Finalization
    if (isFinal) {
        // Handle incomplete block
        if (inReplace && searchMatchIndex !== -1) {
            replacements.push({
                start: searchMatchIndex,
                end: searchEndIndex,
                content: currentReplaceContent,
            })

            if (!pendingOutOfOrderReplacement) {
                lastProcessedIndex = searchEndIndex
            }
        }

        // Apply all replacements in order
        replacements.sort((a, b) => a.start - b.start)

        result = ""
        let currentPos = 0

        for (const replacement of replacements) {
            result += originalContent.slice(currentPos, replacement.start)
            result += replacement.content
            currentPos = replacement.end
        }

        result += originalContent.slice(currentPos)
    }

    return result
}
```

#### Step 4.2: V2 Constructor (NewFileContentConstructor class)
**File**: `src/core/assistant-message/constructors/v2_constructor.ts`

```typescript
// Implementation of NewFileContentConstructor class
// (Similar structure but cleaner organization)
// [Implement based on current lines 476-831]
```

---

### Phase 5: Facade - Public API (~1 hour)

#### Step 5.1: Create Main Facade
**File**: `src/core/assistant-message/diff.ts` (New version)

```typescript
import { constructNewFileContentV1 } from "./constructors/v1_constructor"
import { constructNewFileContentV2 } from "./constructors/v2_constructor"
import type { DiffVersion } from "./types/diff_types"

// Re-export types for backward compatibility
export type { DiffVersion, Replacement, MatchResult } from "./types/diff_types"
export { ProcessingState } from "./types/diff_types"

// Version mapping
const constructNewFileContentVersionMapping: Record<
    string,
    (diffContent: string, originalContent: string, isFinal: boolean) => Promise<string>
> = {
    v1: constructNewFileContentV1,
    v2: constructNewFileContentV2,
} as const

/**
 * Reconstructs file content by applying a streamed diff to the original content.
 * 
 * The diff format uses SEARCH/REPLACE blocks:
 * 
 *   ------- SEARCH
 *   [Content to find]
 *   =======
 *   [Content to replace with]
 *   +++++++ REPLACE
 * 
 * @param diffContent - The diff content (may be partial or complete)
 * @param originalContent - The original file content
 * @param isFinal - Whether this is the final chunk
 * @param version - Version of the constructor to use (v1 or v2)
 */
export async function constructNewFileContent(
    diffContent: string,
    originalContent: string,
    isFinal: boolean,
    version: DiffVersion = "v1"
): Promise<string> {
    const constructor = constructNewFileContentVersionMapping[version]
    if (!constructor) {
        throw new Error(`Invalid version '${version}' for file content constructor`)
    }
    return constructor(diffContent, originalContent, isFinal)
}
```

---

## 🎓 Key Patterns Applied

### From StateManager & TaskCheckpointManager Success:

1. **Bottom-Up Implementation**
   - Types first (foundation)
   - Validators & Matchers (utilities)
   - Coordinators (orchestration)
   - Constructors (implementations)
   - Facade last (integration)

2. **Clear Separation of Concerns**
   - **Types**: Shared interfaces and constants
   - **Validators**: Block pattern validation
   - **Matchers**: Search algorithms (exact, line, block)
   - **Coordinators**: Match strategy orchestration
   - **Constructors**: V1 and V2 implementations

3. **Facade Pattern**
   - Maintains backward compatibility
   - Single entry point
   - Version selection logic
   - Re-exports for convenience

4. **Single Responsibility**
   - Each matcher has one matching strategy
   - Coordinator orchestrates, doesn't implement
   - Validators only validate, don't process

---

## ✅ Quality Checklist

### Before Implementation:
- [x] Understand current diff.ts structure
- [x] Identify clear module boundaries
- [x] Plan error handling strategy
- [x] Design backward-compatible API
- [x] Estimate module sizes

### During Implementation:
- [ ] Strict TypeScript (no casual `any`)
- [ ] Self-documenting names
- [ ] Comprehensive JSDoc
- [ ] Input validation
- [ ] Actionable error messages

### After Implementation:
- [ ] All modules < 200 lines
- [ ] Zero linting errors
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] Backward compatible
- [ ] Documentation complete

---

## 📈 Expected Results

### Before:
- **1 file**: 831 lines
- **Complexity**: High (mixed concerns)
- **Testability**: Difficult (tight coupling)

### After:
- **Facade**: ~150 lines (82% reduction)
- **7 Modules**: ~1,070 lines (avg 153 lines each)
- **Complexity**: Low (clear separation)
- **Testability**: High (isolated concerns)

---

## 🚀 Next Steps

1. **Create types module** - Foundation for all other modules
2. **Build validators** - Pattern validation logic
3. **Implement matchers** - Three matching strategies
4. **Create coordinator** - Orchestrate match strategies
5. **Extract V1 constructor** - Preserve existing logic
6. **Extract V2 constructor** - Class-based implementation
7. **Build facade** - Integration and public API
8. **Test & validate** - Ensure compatibility
9. **Document** - Update completion summary

---

## 🙏 Philosophy Application

### OBSERVE
The diff.ts file evolved to handle complex streaming diff parsing with multiple fallback strategies and two implementation versions.

### APPRECIATE
This code solved real problems: exact matching, whitespace tolerance, block anchoring, out-of-order edits, and streaming support.

### LEARN
We learned the importance of multiple matching strategies, state management for streaming, and version flexibility.

### EVOLVE
We'll separate matching strategies, isolate state management, and create clear boundaries between versions.

### RELEASE
The monolithic structure served us well. Now we refactor with gratitude.

### SHARE
This plan documents our approach for the team and future refactorings.

---

*Plan created following MarieCoder Development Standards*  
*Estimated time: 12-15 hours*  
*Ready for implementation*

