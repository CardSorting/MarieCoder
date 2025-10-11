# Phase 4: OpenRouterModelPicker.tsx Refactoring

**File**: `/webview-ui/src/components/settings/OpenRouterModelPicker.tsx`  
**Current Size**: 606 lines  
**Priority**: 🟡 Medium  
**Estimated Effort**: 2 sessions

---

## 🎯 Goal

Separate the model picker into focused components for search, filtering, display, and model information rendering.

---

## 📋 Current Responsibilities Analysis

### Primary Concerns
1. **Model Search & Filtering** (Lines 69-177)
   - Search term state management
   - Fuzzy search with Fuse.js
   - Favorites filtering
   - Model list filtering (exclude Cline-specific)

2. **Dropdown Interaction** (Lines 71-118, 179-229)
   - Dropdown visibility management
   - Click outside detection
   - Keyboard navigation (Arrow keys, Enter, Escape)
   - Selected index tracking

3. **Model Selection** (Lines 77-93)
   - Model change handling
   - Field updates via gRPC
   - Model info validation

4. **UI Components** (Lines 244-393)
   - Search input field
   - Featured model cards
   - Dropdown list with items
   - Star icon for favorites
   - Context window switcher
   - Thinking budget slider
   - Model info view

5. **Styled Components** (Lines 395-606)
   - Dropdown wrapper, list, items
   - Markdown rendering with expand/collapse
   - Custom styling

---

## 🗂️ Proposed Module Structure

```
components/settings/open_router_model_picker/
├── OpenRouterModelPicker.tsx          # Main component (orchestrator)
│
├── components/                        # UI Components
│   ├── ModelSearchInput.tsx           # Search input with clear button
│   ├── ModelDropdown.tsx              # Dropdown wrapper + list
│   ├── ModelDropdownItem.tsx          # Individual model item with star
│   ├── StarIcon.tsx                   # Lines 22-40
│   ├── FeaturedModelCard.tsx          # Already exists
│   ├── ModelDescriptionMarkdown.tsx   # Lines 499-606 (extract)
│   └── ModelInfoView.tsx              # Already exists (common/)
│
├── hooks/                             # Custom hooks
│   ├── use_model_search.ts            # Search state + fuzzy search
│   ├── use_model_dropdown.ts          # Dropdown visibility + keyboard nav
│   └── use_model_selection.ts         # Model change handling
│
└── utils/                             # Pure functions
    ├── model_filter_utils.ts          # Filtering logic
    └── featured_models_config.ts      # Featured models data
```

---

## 📝 Step-by-Step Refactoring Plan

### **Step 1: Extract Featured Models Configuration** (10 min)
**File to create**: `open_router_model_picker/utils/featured_models_config.ts`

```typescript
export interface FeaturedModel {
  id: string
  description: string
  label: string
}

export const featuredModels: FeaturedModel[] = [
  {
    id: "anthropic/claude-sonnet-4.5",
    description: "Recommended for agentic coding in Cline",
    label: "New",
  },
  {
    id: "x-ai/grok-code-fast-1",
    description: "Advanced model with 262K context for complex coding",
    label: "Free",
  },
  {
    id: "cline/code-supernova-1-million",
    description: "Stealth coding model with image support",
    label: "Free",
  },
]
```

**Validation**: Import and use

---

### **Step 2: Extract Model Filter Utilities** (15 min)
**File to create**: `open_router_model_picker/utils/model_filter_utils.ts`

```typescript
export const filterModelIds = (
  openRouterModels: Record<string, ModelInfo>,
  apiProvider?: string
): string[] => {
  const unfilteredModelIds = Object.keys(openRouterModels).sort((a, b) => a.localeCompare(b))
  
  // Exclude Cline-specific models for OpenRouter provider
  return unfilteredModelIds.filter((id) => !id.startsWith("cline/"))
}

export const createSearchableItems = (modelIds: string[]) => {
  return modelIds.map((id) => ({ id, html: id }))
}

export const applyFavoritesFilter = (
  items: Array<{ id: string; html: string }>,
  searchResults: Array<{ id: string; html: string }>,
  favoritedModelIds: string[]
): Array<{ id: string; html: string }> => {
  const favoritedModels = items.filter((item) => favoritedModelIds.includes(item.id))
  const nonFavoritedResults = searchResults.filter((item) => !favoritedModelIds.includes(item.id))
  return [...favoritedModels, ...nonFavoritedResults]
}
```

**Validation**: Test filtering logic

---

### **Step 3: Extract Star Icon Component** (10 min)
**File to create**: `open_router_model_picker/components/StarIcon.tsx`

```typescript
interface StarIconProps {
  isFavorite: boolean
  onClick: (e: React.MouseEvent) => void
}

export const StarIcon: React.FC<StarIconProps> = ({ isFavorite, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        color: isFavorite 
          ? "var(--vscode-terminal-ansiBlue)" 
          : "var(--vscode-descriptionForeground)",
        marginLeft: "8px",
        fontSize: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {isFavorite ? "★" : "☆"}
    </div>
  )
}
```

**Validation**: Test star toggle

---

### **Step 4: Extract Model Search Hook** (35 min)
**File to create**: `open_router_model_picker/hooks/use_model_search.ts`

```typescript
export const useModelSearch = (
  modelIds: string[],
  favoritedModelIds: string[]
) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [FuseConstructor, setFuseConstructor] = useState<typeof Fuse | null>(null)
  
  const searchableItems = useMemo(() => createSearchableItems(modelIds), [modelIds])
  
  // Lazy load Fuse.js
  useEffect(() => {
    if (searchTerm && !FuseConstructor) {
      import("fuse.js/min-basic").then((module) => {
        setFuseConstructor(() => module.default)
      })
    }
  }, [searchTerm, FuseConstructor])
  
  const fuse = useMemo(() => {
    if (!FuseConstructor) return null
    return new FuseConstructor(searchableItems, {
      keys: ["html"],
      threshold: 0.6,
      shouldSort: true,
      isCaseSensitive: false,
      ignoreLocation: false,
      includeMatches: true,
      minMatchCharLength: 1,
    })
  }, [searchableItems, FuseConstructor])
  
  const searchResults = useMemo(() => {
    const results = searchTerm && fuse 
      ? highlight(fuse.search(searchTerm), "model-item-highlight")
      : searchableItems
    
    return applyFavoritesFilter(searchableItems, results, favoritedModelIds)
  }, [searchableItems, searchTerm, fuse, favoritedModelIds])
  
  return {
    searchTerm,
    setSearchTerm,
    searchResults,
  }
}
```

**Validation**: Test search functionality

---

### **Step 5: Extract Dropdown Management Hook** (40 min)
**File to create**: `open_router_model_picker/hooks/use_model_dropdown.ts`

```typescript
export const useModelDropdown = (
  searchResults: Array<{ id: string; html: string }>,
  onSelectModel: (modelId: string) => void
) => {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownListRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  
  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  
  // Reset selection when search results change
  useEffect(() => {
    setSelectedIndex(-1)
    if (dropdownListRef.current) {
      dropdownListRef.current.scrollTop = 0
    }
  }, [searchResults])
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      })
    }
  }, [selectedIndex])
  
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownVisible) return
    
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        setSelectedIndex(prev => prev < searchResults.length - 1 ? prev + 1 : prev)
        break
      case "ArrowUp":
        event.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case "Enter":
        event.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          onSelectModel(searchResults[selectedIndex].id)
          setIsDropdownVisible(false)
        }
        break
      case "Escape":
        setIsDropdownVisible(false)
        setSelectedIndex(-1)
        break
    }
  }, [isDropdownVisible, selectedIndex, searchResults, onSelectModel])
  
  return {
    isDropdownVisible,
    setIsDropdownVisible,
    selectedIndex,
    setSelectedIndex,
    dropdownRef,
    dropdownListRef,
    itemRefs,
    handleKeyDown,
  }
}
```

**Validation**: Test dropdown keyboard navigation

---

### **Step 6: Extract Model Selection Hook** (25 min)
**File to create**: `open_router_model_picker/hooks/use_model_selection.ts`

```typescript
export const useModelSelection = (
  openRouterModels: Record<string, ModelInfo>,
  currentMode: Mode
) => {
  const { handleModeFieldsChange } = useApiConfigurationHandlers()
  
  const handleModelChange = useCallback((newModelId: string) => {
    handleModeFieldsChange(
      {
        openRouterModelId: { 
          plan: "planModeOpenRouterModelId", 
          act: "actModeOpenRouterModelId" 
        },
        openRouterModelInfo: { 
          plan: "planModeOpenRouterModelInfo", 
          act: "actModeOpenRouterModelInfo" 
        },
      },
      {
        openRouterModelId: newModelId,
        openRouterModelInfo: openRouterModels[newModelId],
      },
      currentMode
    )
  }, [handleModeFieldsChange, openRouterModels, currentMode])
  
  return { handleModelChange }
}
```

**Validation**: Test model selection updates

---

### **Step 7: Extract Model Dropdown Item** (20 min)
**File to create**: `open_router_model_picker/components/ModelDropdownItem.tsx`

```typescript
interface ModelDropdownItemProps {
  item: { id: string; html: string }
  isSelected: boolean
  isFavorite: boolean
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string) => void
  onMouseEnter: () => void
  itemRef: (el: HTMLDivElement | null) => void
}

export const ModelDropdownItem: React.FC<ModelDropdownItemProps> = ({
  item,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onMouseEnter,
  itemRef,
}) => {
  return (
    <div
      ref={itemRef}
      onMouseEnter={onMouseEnter}
      onClick={() => onSelect(item.id)}
      className={`p-[5px_10px] cursor-pointer break-all whitespace-normal hover:bg-[var(--vscode-list-activeSelectionBackground)] ${
        isSelected ? "bg-[var(--vscode-list-activeSelectionBackground)]" : ""
      }`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span dangerouslySetInnerHTML={{ __html: item.html }} />
        <StarIcon
          isFavorite={isFavorite}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(item.id)
          }}
        />
      </div>
    </div>
  )
}
```

**Validation**: Test item selection and favorite toggle

---

### **Step 8: Extract Model Dropdown Component** (30 min)
**File to create**: `open_router_model_picker/components/ModelDropdown.tsx`

```typescript
interface ModelDropdownProps {
  isVisible: boolean
  searchResults: Array<{ id: string; html: string }>
  selectedIndex: number
  favoritedModelIds: string[]
  onSelectModel: (modelId: string) => void
  onToggleFavorite: (modelId: string) => void
  onSetSelectedIndex: (index: number) => void
  dropdownListRef: React.RefObject<HTMLDivElement>
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
}

export const ModelDropdown: React.FC<ModelDropdownProps> = ({
  isVisible,
  searchResults,
  selectedIndex,
  favoritedModelIds,
  onSelectModel,
  onToggleFavorite,
  onSetSelectedIndex,
  dropdownListRef,
  itemRefs,
}) => {
  if (!isVisible) return null
  
  return (
    <DropdownList ref={dropdownListRef}>
      {searchResults.map((item, index) => (
        <ModelDropdownItem
          key={item.id}
          item={item}
          isSelected={index === selectedIndex}
          isFavorite={favoritedModelIds.includes(item.id)}
          onSelect={onSelectModel}
          onToggleFavorite={onToggleFavorite}
          onMouseEnter={() => onSetSelectedIndex(index)}
          itemRef={(el) => { itemRefs.current[index] = el }}
        />
      ))}
    </DropdownList>
  )
}
```

**Validation**: Test dropdown display

---

### **Step 9: Extract Model Search Input** (20 min)
**File to create**: `open_router_model_picker/components/ModelSearchInput.tsx`

```typescript
interface ModelSearchInputProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onFocus: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}

export const ModelSearchInput: React.FC<ModelSearchInputProps> = ({
  searchTerm,
  onSearchChange,
  onFocus,
  onKeyDown,
}) => {
  return (
    <VSCodeTextField
      id="model-search"
      placeholder="Search and select a model..."
      value={searchTerm}
      onInput={(e) => onSearchChange((e.target as HTMLInputElement)?.value.toLowerCase() || "")}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      style={{
        width: "100%",
        zIndex: OPENROUTER_MODEL_PICKER_Z_INDEX,
        position: "relative",
      }}
    >
      {searchTerm && (
        <div
          aria-label="Clear search"
          className="input-icon-button codicon codicon-close"
          onClick={() => onSearchChange("")}
          slot="end"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        />
      )}
    </VSCodeTextField>
  )
}
```

**Validation**: Test search input

---

### **Step 10: Extract Model Description Markdown** (Already exists but move)
**File**: Already at lines 499-606, just extract to separate file

**File to create**: `open_router_model_picker/components/ModelDescriptionMarkdown.tsx`

Move the existing `ModelDescriptionMarkdown` component and its `StyledMarkdown` wrapper.

**Validation**: Verify markdown rendering with expand/collapse

---

### **Step 11: Refactor Main OpenRouterModelPicker** (35 min)
**Update**: `OpenRouterModelPicker.tsx` to orchestrate

```typescript
const OpenRouterModelPicker: React.FC<OpenRouterModelPickerProps> = ({ isPopup, currentMode }) => {
  const { apiConfiguration, favoritedModelIds, openRouterModels, refreshOpenRouterModels } = useExtensionState()
  const modeFields = getModeSpecificFields(apiConfiguration, currentMode)
  const { selectedModelId, selectedModelInfo } = useMemo(
    () => normalizeApiConfiguration(apiConfiguration, currentMode),
    [apiConfiguration, currentMode]
  )
  
  useMount(refreshOpenRouterModels)
  
  // Filter model IDs
  const modelIds = useMemo(
    () => filterModelIds(openRouterModels, modeFields.apiProvider),
    [openRouterModels, modeFields.apiProvider]
  )
  
  // Use extracted hooks
  const modelSearch = useModelSearch(modelIds, favoritedModelIds)
  const modelSelection = useModelSelection(openRouterModels, currentMode)
  const dropdown = useModelDropdown(modelSearch.searchResults, (modelId) => {
    modelSelection.handleModelChange(modelId)
    modelSearch.setSearchTerm(modelId)
  })
  
  // Sync external changes
  useEffect(() => {
    const currentModelId = modeFields.openRouterModelId || openRouterDefaultModelId
    modelSearch.setSearchTerm(currentModelId)
  }, [modeFields.openRouterModelId])
  
  const hasInfo = useMemo(() => {
    return modelIds.some((id) => id.toLowerCase() === modelSearch.searchTerm.toLowerCase())
  }, [modelIds, modelSearch.searchTerm])
  
  const showBudgetSlider = useMemo(() => {
    // Logic for showing budget slider
  }, [selectedModelId])
  
  const handleToggleFavorite = useCallback((modelId: string) => {
    StateServiceClient.toggleFavoriteModel(StringRequest.create({ value: modelId }))
      .catch((error) => debug.error("Failed to toggle favorite model:", error))
  }, [])
  
  return (
    <div style={{ width: "100%" }}>
      <style>{/* ... */}</style>
      
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="model-search">
          <span style={{ fontWeight: 500 }}>Model</span>
        </label>
        
        <DropdownWrapper ref={dropdown.dropdownRef}>
          <ModelSearchInput
            searchTerm={modelSearch.searchTerm}
            onSearchChange={(value) => {
              modelSearch.setSearchTerm(value)
              dropdown.setIsDropdownVisible(true)
            }}
            onFocus={() => dropdown.setIsDropdownVisible(true)}
            onKeyDown={dropdown.handleKeyDown}
          />
          
          <ModelDropdown
            isVisible={dropdown.isDropdownVisible}
            searchResults={modelSearch.searchResults}
            selectedIndex={dropdown.selectedIndex}
            favoritedModelIds={favoritedModelIds}
            onSelectModel={(modelId) => {
              modelSelection.handleModelChange(modelId)
              modelSearch.setSearchTerm(modelId)
              dropdown.setIsDropdownVisible(false)
            }}
            onToggleFavorite={handleToggleFavorite}
            onSetSelectedIndex={dropdown.setSelectedIndex}
            dropdownListRef={dropdown.dropdownListRef}
            itemRefs={dropdown.itemRefs}
          />
        </DropdownWrapper>
        
        {/* Context window switchers */}
        <ContextWindowSwitcher ... />
        <ContextWindowSwitcher ... />
      </div>
      
      {hasInfo ? (
        <>
          {showBudgetSlider && <ThinkingBudgetSlider currentMode={currentMode} />}
          <ModelInfoView 
            isPopup={isPopup} 
            modelInfo={selectedModelInfo} 
            selectedModelId={selectedModelId} 
          />
        </>
      ) : (
        <p style={{ ... }}>
          {/* Helper text */}
        </p>
      )}
    </div>
  )
}
```

**Validation**: Full regression test

---

## ✅ Validation Checklist

- [ ] Model search works
- [ ] Fuzzy search highlighting displays
- [ ] Keyboard navigation works (arrows, enter, escape)
- [ ] Favorites appear at top
- [ ] Star icon toggles favorites
- [ ] Click outside closes dropdown
- [ ] Model selection updates configuration
- [ ] Context window switcher works
- [ ] Thinking budget slider appears when appropriate
- [ ] Model info displays correctly
- [ ] No TypeScript/linter errors

---

## 📊 Expected Outcome

### Before
- OpenRouterModelPicker.tsx: 606 lines
- Mixed UI and logic

### After
- OpenRouterModelPicker.tsx: ~150 lines (orchestrator)
- 6 components: ~30-100 lines each
- 3 custom hooks: ~50-100 lines each
- 2 utility files: ~20-40 lines each
- **Total**: Cleaner separation of concerns

---

## 🚨 Risks & Mitigation

### Risk: Fuse.js lazy loading breaks search
**Mitigation**: Test search immediately after typing

### Risk: Keyboard navigation state issues
**Mitigation**: Test all key combinations thoroughly

### Risk: Favorites state synchronization
**Mitigation**: Ensure gRPC calls update state correctly

---

*Dependencies: None*  
*Can be done in parallel with other phases*

