# Phase 2: HistoryView.tsx Refactoring

**File**: `/webview-ui/src/components/history/HistoryView.tsx`  
**Current Size**: 844 lines  
**Priority**: 🟡 High  
**Estimated Effort**: 2-3 sessions

---

## 🎯 Goal

Separate concerns in `HistoryView.tsx` by extracting filter logic, search functionality, and item rendering into focused modules.

---

## 📋 Current Responsibilities Analysis

### Primary Concerns
1. **Filter & Search Management** (Lines 52-165)
   - Search query state
   - Sort options (newest, oldest, most expensive, etc.)
   - Favorites filter
   - Workspace filter
   - Fuzzy search with Fuse.js

2. **Data Fetching & State** (Lines 64-155)
   - Task history loading via gRPC
   - Favorite toggle handling
   - Total tasks size tracking
   - Selected items management

3. **Task Item Rendering** (Lines 420-696)
   - Task metadata display
   - Tokens, cache, and cost information
   - Favorite star button
   - Delete button
   - Export button

4. **Bulk Operations** (Lines 173-202, 284-293, 709-736)
   - Select all/none
   - Batch delete
   - Delete all history

5. **Utility Functions** (Lines 757-842)
   - Fuzzy search highlighting
   - Date formatting
   - Region merging

---

## 🗂️ Proposed Module Structure

```
components/history/
├── HistoryView.tsx                    # Main component (orchestrator)
│
├── history_view/                      # Extracted modules
│   ├── components/                    # UI Components
│   │   ├── HistoryItem.tsx            # Lines 420-696
│   │   ├── HistoryItemMetadata.tsx    # Token/cost display
│   │   ├── ExportButton.tsx           # Lines 742-755
│   │   ├── CustomFilterRadio.tsx      # Lines 23-47
│   │   ├── SearchBar.tsx              # Search input with filters
│   │   └── BulkActionBar.tsx          # Select all/delete controls
│   │
│   ├── hooks/                         # Custom hooks
│   │   ├── use_history_filters.ts     # Filter state management
│   │   ├── use_history_search.ts      # Fuzzy search logic
│   │   ├── use_history_data.ts        # Data fetching & state
│   │   └── use_bulk_selection.ts      # Multi-select logic
│   │
│   └── utils/                         # Pure functions
│       ├── highlight_utils.ts         # Lines 757-842
│       ├── date_format_utils.ts       # Lines 204-217
│       └── sort_utils.ts              # Sorting logic
```

---

## 📝 Step-by-Step Refactoring Plan

### **Step 1: Extract Utility Functions** (20 min)
**Files to create**:
- `history_view/utils/highlight_utils.ts`
- `history_view/utils/date_format_utils.ts`
- `history_view/utils/sort_utils.ts`

```typescript
// highlight_utils.ts
export const highlight = (fuseSearchResult: FuseResult<any>[], highlightClassName?: string) => { ... }
const mergeRegions = (regions: [number, number][]): [number, number][] => { ... }
const generateHighlightedText = (inputText: string, regions: [number, number][]) => { ... }

// date_format_utils.ts
export const formatHistoryDate = (timestamp: number): string => { ... }

// sort_utils.ts
export const sortTaskHistory = (results: any[], sortOption: SortOption) => { ... }
```

**Validation**: Import and verify functions work correctly

---

### **Step 2: Extract Custom Filter Radio Component** (15 min)
**File to create**: `history_view/components/CustomFilterRadio.tsx`

```typescript
interface CustomFilterRadioProps {
  checked: boolean
  onChange: () => void
  icon: string
  label: string
}

export const CustomFilterRadio: React.FC<CustomFilterRadioProps> = ({ ... }) => {
  return (
    <div className="flex items-center cursor-pointer..." onClick={onChange}>
      {/* Radio button with icon */}
    </div>
  )
}
```

**Validation**: Test workspace and favorites filters

---

### **Step 3: Extract Export Button** (10 min)
**File to create**: `history_view/components/ExportButton.tsx`

```typescript
interface ExportButtonProps {
  itemId: string
}

export const ExportButton: React.FC<ExportButtonProps> = ({ itemId }) => { ... }
```

**Validation**: Test export functionality

---

### **Step 4: Extract History Filters Hook** (30 min)
**File to create**: `history_view/hooks/use_history_filters.ts`

```typescript
export type SortOption = "newest" | "oldest" | "mostExpensive" | "mostTokens" | "mostRelevant"

export const useHistoryFilters = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [lastNonRelevantSort, setLastNonRelevantSort] = useState<SortOption | null>("newest")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showCurrentWorkspaceOnly, setShowCurrentWorkspaceOnly] = useState(false)
  
  // Auto-switch to "mostRelevant" when searching
  useEffect(() => { ... }, [searchQuery, sortOption, lastNonRelevantSort])
  
  return {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    showFavoritesOnly,
    setShowFavoritesOnly,
    showCurrentWorkspaceOnly,
    setShowCurrentWorkspaceOnly,
  }
}
```

**Validation**: Test all filter combinations

---

### **Step 5: Extract History Search Hook** (35 min)
**File to create**: `history_view/hooks/use_history_search.ts`

```typescript
export const useHistorySearch = (
  tasks: any[],
  searchQuery: string,
  sortOption: SortOption
) => {
  const [FuseConstructor, setFuseConstructor] = useState<typeof Fuse | null>(null)
  
  // Lazy load Fuse.js
  useEffect(() => { ... }, [searchQuery, FuseConstructor])
  
  const fuse = useMemo(() => { ... }, [tasks, FuseConstructor])
  
  const searchResults = useMemo(() => {
    const results = searchQuery && fuse ? highlight(fuse.search(searchQuery)) : tasks
    sortTaskHistory(results, sortOption)
    return results
  }, [tasks, searchQuery, fuse, sortOption])
  
  return { searchResults }
}
```

**Validation**: Test fuzzy search with highlighting

---

### **Step 6: Extract History Data Hook** (40 min)
**File to create**: `history_view/hooks/use_history_data.ts`

```typescript
export const useHistoryData = (filters: {
  showFavoritesOnly: boolean
  showCurrentWorkspaceOnly: boolean
  searchQuery: string
  sortOption: SortOption
}) => {
  const [tasks, setTasks] = useState<any[]>([])
  const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null)
  const [pendingFavoriteToggles, setPendingFavoriteToggles] = useState<Record<string, boolean>>({})
  
  const loadTaskHistory = useCallback(async () => { ... }, [filters])
  const toggleFavorite = useCallback(async (taskId: string, currentValue: boolean) => { ... }, [...])
  const fetchTotalTasksSize = useCallback(async () => { ... }, [])
  
  useEffect(() => { loadTaskHistory() }, [loadTaskHistory])
  useEffect(() => { fetchTotalTasksSize() }, [fetchTotalTasksSize])
  
  return {
    tasks,
    totalTasksSize,
    pendingFavoriteToggles,
    toggleFavorite,
    fetchTotalTasksSize,
  }
}
```

**Validation**: Test data loading and favorite toggling

---

### **Step 7: Extract Bulk Selection Hook** (25 min)
**File to create**: `history_view/hooks/use_bulk_selection.ts`

```typescript
export const useBulkSelection = (
  tasks: any[],
  onDelete: (ids: string[]) => void
) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  const handleSelect = useCallback((itemId: string, checked: boolean) => { ... }, [])
  const handleSelectAll = useCallback(() => { ... }, [tasks])
  const handleSelectNone = useCallback(() => { ... }, [])
  const handleDeleteSelected = useCallback(() => { ... }, [selectedItems, onDelete])
  
  const selectedItemsSize = useMemo(() => { ... }, [selectedItems, tasks])
  
  return {
    selectedItems,
    handleSelect,
    handleSelectAll,
    handleSelectNone,
    handleDeleteSelected,
    selectedItemsSize,
  }
}
```

**Validation**: Test multi-select and batch delete

---

### **Step 8: Extract History Item Metadata Component** (30 min)
**File to create**: `history_view/components/HistoryItemMetadata.tsx`

```typescript
interface HistoryItemMetadataProps {
  tokensIn: number
  tokensOut: number
  cacheWrites?: number
  cacheReads?: number
  totalCost?: number
}

export const HistoryItemMetadata: React.FC<HistoryItemMetadataProps> = ({ ... }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <TokensDisplay tokensIn={tokensIn} tokensOut={tokensOut} />
      {(cacheWrites || cacheReads) && <CacheDisplay ... />}
      {totalCost && <CostDisplay totalCost={totalCost} />}
    </div>
  )
}
```

**Validation**: Verify metadata displays correctly

---

### **Step 9: Extract History Item Component** (45 min)
**File to create**: `history_view/components/HistoryItem.tsx`

```typescript
interface HistoryItemProps {
  item: TaskHistoryItem
  isSelected: boolean
  isFavorited: boolean
  onSelect: (id: string, checked: boolean) => void
  onShow: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string, currentValue: boolean) => void
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ ... }) => {
  return (
    <div className="history-item" style={...}>
      <VSCodeCheckbox checked={isSelected} onClick={...} />
      <div onClick={() => onShow(item.id)} style={...}>
        <HistoryItemHeader ... />
        <HistoryItemTask task={item.task} />
        <HistoryItemMetadata ... />
      </div>
    </div>
  )
}
```

**Validation**: Test item interaction (click, favorite, delete)

---

### **Step 10: Extract Search Bar Component** (25 min)
**File to create**: `history_view/components/SearchBar.tsx`

```typescript
interface SearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
  showFavoritesOnly: boolean
  onToggleFavorites: () => void
  showCurrentWorkspaceOnly: boolean
  onToggleWorkspace: () => void
}

export const SearchBar: React.FC<SearchBarProps> = ({ ... }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <VSCodeTextField ... />
      <VSCodeRadioGroup ...>
        {/* Sort options */}
      </VSCodeRadioGroup>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <CustomFilterRadio ... /> {/* Workspace */}
        <CustomFilterRadio ... /> {/* Favorites */}
      </div>
    </div>
  )
}
```

**Validation**: Test search and filter controls

---

### **Step 11: Extract Bulk Action Bar** (20 min)
**File to create**: `history_view/components/BulkActionBar.tsx`

```typescript
interface BulkActionBarProps {
  selectedCount: number
  selectedSize: number
  totalSize: number | null
  onSelectAll: () => void
  onSelectNone: () => void
  onDeleteSelected: () => void
  onDeleteAll: () => void
  isDeleteAllDisabled: boolean
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ ... }) => {
  return (
    <>
      <div className="flex justify-end gap-2.5">
        <VSCodeButton onClick={onSelectAll}>Select All</VSCodeButton>
        <VSCodeButton onClick={onSelectNone}>Select None</VSCodeButton>
      </div>
      <div style={{ padding: "10px 10px", borderTop: "1px solid ..." }}>
        {selectedCount > 0 ? (
          <Button onClick={onDeleteSelected} ...>
            Delete {selectedCount > 1 ? selectedCount : ""} Selected ...
          </Button>
        ) : (
          <Button onClick={onDeleteAll} ...>
            Delete All History ...
          </Button>
        )}
      </div>
    </>
  )
}
```

**Validation**: Test bulk actions UI

---

### **Step 12: Refactor Main HistoryView Component** (30 min)
**Update**: `HistoryView.tsx` to orchestrate extracted modules

```typescript
const HistoryView = ({ onDone }: HistoryViewProps) => {
  const filters = useHistoryFilters()
  const historyData = useHistoryData(filters)
  const { searchResults } = useHistorySearch(
    historyData.tasks,
    filters.searchQuery,
    filters.sortOption
  )
  const bulkSelection = useBulkSelection(searchResults, handleDeleteItems)
  const { onRelinquishControl } = useExtensionState()
  const [deleteAllDisabled, setDeleteAllDisabled] = useState(false)
  
  // Simplified render logic
  return (
    <>
      <style>{/* ... */}</style>
      <div style={{ position: "fixed", ... }}>
        <Header onDone={onDone} />
        <SearchBar {...filters} />
        <BulkActionBar ... />
        <Virtuoso
          data={searchResults}
          itemContent={(index, item) => (
            <HistoryItem
              item={item}
              isSelected={bulkSelection.selectedItems.includes(item.id)}
              isFavorited={historyData.pendingFavoriteToggles[item.id] ?? item.isFavorited}
              onSelect={bulkSelection.handleSelect}
              onShow={handleShowTaskWithId}
              onDelete={handleDeleteHistoryItem}
              onToggleFavorite={historyData.toggleFavorite}
            />
          )}
        />
      </div>
    </>
  )
}
```

**Validation**: Full regression test

---

## ✅ Validation Checklist

- [ ] Search functionality works
- [ ] All filter combinations work
- [ ] Fuzzy search highlighting appears
- [ ] Sort options function correctly
- [ ] Favorite toggling works
- [ ] Delete operations work
- [ ] Batch operations work
- [ ] Export functionality works
- [ ] Virtualized list scrolls smoothly
- [ ] No TypeScript/linter errors

---

## 📊 Expected Outcome

### Before
- HistoryView.tsx: 844 lines
- Mixed concerns

### After
- HistoryView.tsx: ~150 lines (orchestrator)
- 7 components: ~50-150 lines each
- 4 custom hooks: ~50-100 lines each
- 3 utility files: ~30-80 lines each
- **Total**: More maintainable and testable

---

## 🚨 Risks & Mitigation

### Risk: Virtuoso performance issues
**Mitigation**: Keep itemContent memoized, test with large lists

### Risk: Fuse.js lazy loading breaks
**Mitigation**: Test search immediately after mounting

### Risk: Filter state management complexity
**Mitigation**: Use single source of truth in custom hook

---

*Dependencies: None*  
*Start After: Phase 1 complete (optional)*

