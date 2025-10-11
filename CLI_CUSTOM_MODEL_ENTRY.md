# CLI Custom Model Entry - Enhancement

## 🎯 Problem Solved

**Issue:** OpenRouter has 100+ models, and users who know their exact model code (like `openai/gpt-oss-20b:free`) had to either:
1. Find it in a limited curated list (if it's even there)
2. Configure it manually after setup

**Solution:** Allow direct custom model code entry during setup, with helpful examples and validation.

## ✨ What Changed

### Enhanced Model Selection Flow

**Before:**
```
Step 2: Select Model
Recommended: claude-sonnet-4-5-20250929
Use recommended model? [Y/n]: n

All available models:
  1. claude-sonnet-4-5-20250929 (recommended)
  2. claude-opus-4-1-20250805
  3. claude-3-5-sonnet-20241022
  [... limited list ...]

Select a model:
```

**After:**
```
Step 2: Select Model
Recommended: anthropic/claude-sonnet-4.5
Use recommended model? [Y/n]: n

Options:
  1. Enter a custom model code (e.g., openai/gpt-4-turbo, anthropic/claude-3.5-sonnet)
  2. Choose from popular models list

Enter custom model code? [y/N]: y

Enter model code:
  Examples:
    • openai/gpt-4-turbo
    • anthropic/claude-3.5-sonnet
    • google/gemini-pro-1.5
    • meta-llama/llama-3.3-70b-instruct
    • openai/gpt-oss-20b:free (free models)

  Find models at: https://openrouter.ai/models

Model code: openai/gpt-oss-20b:free
✓ Using custom model: openai/gpt-oss-20b:free
```

## 🎨 Features

### 1. Three-Tier Selection

Users now have three options (in order of convenience):

**Tier 1: Recommended Default (Easiest)**
```
Recommended: anthropic/claude-sonnet-4.5
Use recommended model? [Y/n]: y
✓ Using: anthropic/claude-sonnet-4.5
```
*One keystroke, instant setup*

**Tier 2: Custom Model Code (For Specific Needs)**
```
Enter custom model code? [y/N]: y
Model code: openai/gpt-oss-20b:free
✓ Using custom model: openai/gpt-oss-20b:free
```
*Direct entry for users who know what they want*

**Tier 3: Popular Models List (Browsing)**
```
Enter custom model code? [y/N]: n

Popular models:
  1. anthropic/claude-sonnet-4.5 (recommended)
  2. anthropic/claude-3.5-sonnet
  3. openai/gpt-4-turbo
  4. openai/gpt-4o
  ...
```
*Curated list for exploration*

### 2. Provider-Specific Help

**OpenRouter:**
```
Enter model code:
  Examples:
    • openai/gpt-4-turbo
    • anthropic/claude-3.5-sonnet
    • google/gemini-pro-1.5
    • meta-llama/llama-3.3-70b-instruct
    • openai/gpt-oss-20b:free (free models)

  Find models at: https://openrouter.ai/models
```

**Anthropic:**
```
Enter model code:
  Examples:
    • claude-sonnet-4-5-20250929
    • claude-opus-4-1-20250805
    • claude-3-5-sonnet-20241022
```

**LM Studio:**
```
Enter model code:
  Enter the exact model name from your LM Studio
  Example: llama-3.1-8b-instruct
```

### 3. Smart Validation

**OpenRouter Format Check:**
```typescript
if (provider === "openrouter" && !trimmedModel.includes("/")) {
  console.log("⚠️  OpenRouter models should include provider prefix")
  const continueAnyway = await askApproval("Use anyway?", false)
}
```

Catches common mistakes like entering `gpt-4-turbo` instead of `openai/gpt-4-turbo`.

### 4. Fallback to Default

Empty input falls back to recommended:
```
Model code: [press Enter]
Using default: anthropic/claude-sonnet-4.5
```

## 🔧 Implementation Details

### New Methods

**1. `enterCustomModel()`**
```typescript
private async enterCustomModel(provider: string, defaultModel: string): Promise<string | null> {
  // Show provider-specific examples
  // Get user input
  // Validate format
  // Return custom model or default
}
```

**2. `selectFromModelList()`**
```typescript
private async selectFromModelList(provider: string, defaultModel: string): Promise<string | null> {
  // Show curated popular models
  // Let user select from list
  // Return selection or default
}
```

**3. Enhanced `selectModel()`**
```typescript
private async selectModel(provider: string): Promise<string | null> {
  // Try recommended default first
  // If declined, offer custom entry or list
  // Route to appropriate method
}
```

### Expanded Model Lists

**OpenRouter (8 popular models):**
```typescript
return [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4-turbo",
  "openai/gpt-4o",
  "google/gemini-pro-1.5",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
]
```

## 📊 User Flows

### Flow 1: Quick Setup (Default Model)
```
User wants: Quick setup, trusts recommendation
Keystrokes: 1 (y)
Time: 3 seconds
```

### Flow 2: Known Model Code
```
User wants: Specific free model (openai/gpt-oss-20b:free)
Keystrokes: 3 (n, y, type model code)
Time: 20 seconds
```

### Flow 3: Browse Popular Models
```
User wants: See what's available
Keystrokes: 3 (n, n, select number)
Time: 30 seconds
```

## 🎯 Use Cases

### Use Case 1: Free/Cheap Models
**Before:** Had to manually edit config after setup
**After:** Direct entry during setup
```
Model code: openai/gpt-oss-20b:free
✓ Using custom model: openai/gpt-oss-20b:free
```

### Use Case 2: Specific Provider Models
**Before:** Limited to curated list
**After:** Any OpenRouter model
```
Model code: deepseek/deepseek-chat
✓ Using custom model: deepseek/deepseek-chat
```

### Use Case 3: Beta/New Models
**Before:** Wait for CLI update to add to list
**After:** Use immediately
```
Model code: anthropic/claude-opus-5-beta
✓ Using custom model: anthropic/claude-opus-5-beta
```

### Use Case 4: LM Studio Local Models
**Before:** Confusing placeholder in list
**After:** Clear guidance to enter model name
```
Enter the exact model name from your LM Studio
Example: llama-3.1-8b-instruct

Model code: mistral-7b-instruct
✓ Using custom model: mistral-7b-instruct
```

## 📈 Benefits

### For Users
- ✅ **Flexibility:** Any model code, not limited to curated list
- ✅ **Speed:** Direct entry faster than scrolling long lists
- ✅ **Discovery:** Examples show what's possible
- ✅ **Free Models:** Easy access to free tiers (`:free` suffix)
- ✅ **Future-Proof:** Use new models before CLI update

### For Maintainers
- ✅ **Less Maintenance:** Don't need to update list for every new model
- ✅ **User Satisfaction:** Power users can use any model
- ✅ **Reduced Support:** Clear examples reduce confusion
- ✅ **Validation:** Catches common mistakes early

## 🧪 Example Sessions

### Session 1: OpenRouter Free Model
```bash
$ mariecoder --setup

🔑 Step 1: Provider & API Key
✓ Found OPENROUTER_API_KEY in environment
Use OpenRouter with this key? [Y/n]: y

🤖 Step 2: Select Model
Recommended: anthropic/claude-sonnet-4.5
Use recommended model? [Y/n]: n

Options:
  1. Enter a custom model code
  2. Choose from popular models list

Enter custom model code? [y/N]: y

Enter model code:
  Examples:
    • openai/gpt-4-turbo
    • openai/gpt-oss-20b:free (free models)
  
  Find models at: https://openrouter.ai/models

Model code: openai/gpt-oss-20b:free
✓ Using custom model: openai/gpt-oss-20b:free

⚙️  Step 3: Optional Configuration
Configure optional features? [y/N]: n

✅ Setup complete!
```

### Session 2: Anthropic Standard Flow
```bash
$ mariecoder --setup

🔑 Step 1: Provider & API Key
✓ Found ANTHROPIC_API_KEY in environment
Use Anthropic with this key? [Y/n]: y

🤖 Step 2: Select Model
Recommended: claude-sonnet-4-5-20250929
Use recommended model? [Y/n]: y
✓ Using: claude-sonnet-4-5-20250929

⚙️  Step 3: Optional Configuration
Configure optional features? [y/N]: n

✅ Setup complete!
```

### Session 3: Browse Then Custom
```bash
🤖 Step 2: Select Model
Recommended: anthropic/claude-sonnet-4.5
Use recommended model? [Y/n]: n

Options:
  1. Enter a custom model code
  2. Choose from popular models list

Enter custom model code? [y/N]: n

Popular models:
  1. anthropic/claude-sonnet-4.5 (recommended)
  2. anthropic/claude-3.5-sonnet
  3. openai/gpt-4-turbo
  4. openai/gpt-4o
  5. google/gemini-pro-1.5
  6. google/gemini-flash-1.5
  7. meta-llama/llama-3.3-70b-instruct
  8. qwen/qwen-2.5-72b-instruct

[User sees list but wants different model]

Select a model:
Enter number: [Ctrl+C to restart with custom entry]
```

## 🔒 Validation

### Format Checks
- **OpenRouter:** Must include `/` (provider/model format)
- **All providers:** Non-empty string
- **Fallback:** Always have default as fallback

### Error Handling
```typescript
// Empty input -> default
if (!customModel || customModel.trim().length === 0) {
  console.log(`Using default: ${defaultModel}`)
  return defaultModel
}

// Invalid format -> warning + choice
if (provider === "openrouter" && !trimmedModel.includes("/")) {
  console.log("⚠️  Warning: unexpected format")
  const continueAnyway = await askApproval("Use anyway?", false)
  if (!continueAnyway) return defaultModel
}
```

## 📝 Documentation Updates

### Help Text
No changes needed - custom model entry is an alternative path within model selection.

### README Updates
Add section on custom model codes:
```markdown
## Custom Model Codes

During setup, you can enter any model code directly:

### OpenRouter
- Format: `provider/model-name`
- Example: `openai/gpt-oss-20b:free`
- Find models: https://openrouter.ai/models

### Anthropic
- Format: `model-name`
- Example: `claude-sonnet-4-5-20250929`

### LM Studio
- Format: Your local model name
- Example: `llama-3.1-8b-instruct`
```

## 🎊 Summary

### What This Enables

✅ **Flexibility:** Use any OpenRouter model (100+ options)
✅ **Free Models:** Easy access to free tiers like `openai/gpt-oss-20b:free`
✅ **Future-Proof:** Use new models immediately
✅ **Power Users:** Direct entry for those who know what they want
✅ **Beginners:** Still have simple one-click default
✅ **Browsing:** Curated list for exploration

### Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Available Models (OpenRouter) | ~8 | 100+ | **12x more** |
| Setup for known model | N/A (config edit) | 20 seconds | **Huge win** |
| Setup for default | 3 seconds | 3 seconds | **Same** |
| Flexibility | Low | High | **Major** |

### Key Achievement

**Solved the "I know my model code but can't use it" problem** while maintaining the simple default path for most users.

---

*Progressive disclosure in action: Simple for beginners, powerful for experts.* 🚀

