# Simplified Console.log Migration Plan

## 🎯 Goal

Replace 728+ direct `console.log/error/warn` calls with a controlled output wrapper that prevents rapid scrolling while maintaining simplicity.

---

## 📊 Current State

**Total Console Calls:** 756 across 24 files

### Top Offenders (65% of all calls)
1. `cli_slash_commands.ts` - 159 calls (21%)
2. `index.ts` - 126 calls (17%)
3. `cli_setup_wizard.ts` - 106 calls (14%)
4. `cli_task_history_manager.ts` - 62 calls (8%)
5. `cli_mcp_manager.ts` - 38 calls (5%)

**Total in top 5:** 491 calls (65%)

### Medium Usage (25% of calls)
6. `cli_config_manager.ts` - 33 calls
7. `cli_console_proxy.ts` - 27 calls
8. `cli_webview_provider.ts` - 26 calls
9. `cli_task_monitor.ts` - 25 calls
10. `cli_workflow_manager.ts` - 23 calls

### Low Usage (10% of calls)
11-24. Various files with <22 calls each

---

## 🚀 Simplified Solution

### Strategy: Wrapper + Throttling

Instead of complex buffering, use a **simple throttled wrapper** that:
1. Limits output rate (e.g., 1 output per 20ms)
2. Queues excess outputs
3. Groups rapid calls into batches
4. **No code changes needed** - drop-in replacement

### Why This Approach?

✅ **Simple** - One small wrapper file (~100 lines)  
✅ **Fast** - Quick to implement and migrate  
✅ **Effective** - Prevents rapid scrolling  
✅ **Transparent** - Works like console.log  
✅ **Reversible** - Easy to undo if needed  

---

## 📝 Implementation Plan

### Phase 1: Create Simple Wrapper (1 hour)

**File:** `src/cli/cli_output.ts`

```typescript
/**
 * Simple throttled console wrapper
 * Prevents rapid scrolling with minimal overhead
 */

class CliOutput {
  private queue: Array<{ fn: Function; args: any[] }> = []
  private processing = false
  private lastOutput = 0
  private readonly MIN_INTERVAL = 20 // 20ms = 50 outputs/sec max

  log(...args: any[]) {
    this.enqueue(console.log, args)
  }

  error(...args: any[]) {
    this.enqueue(console.error, args)
  }

  warn(...args: any[]) {
    this.enqueue(console.warn, args)
  }

  private enqueue(fn: Function, args: any[]) {
    this.queue.push({ fn, args })
    this.processQueue()
  }

  private async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastOutput = now - this.lastOutput

      if (timeSinceLastOutput < this.MIN_INTERVAL) {
        await this.sleep(this.MIN_INTERVAL - timeSinceLastOutput)
      }

      const { fn, args } = this.queue.shift()!
      fn(...args)
      this.lastOutput = Date.now()
    }

    this.processing = false
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const output = new CliOutput()
```

**Effort:** 1 hour  
**Lines:** ~100  

---

### Phase 2: Create Migration Script (30 minutes)

**File:** `scripts/migrate-console-logs.mjs`

Automated script to replace:
- `console.log` → `output.log`
- `console.error` → `output.error`
- `console.warn` → `output.warn`

Plus add import: `import { output } from './cli_output'`

**Effort:** 30 minutes

---

### Phase 3: Migrate Top 5 Files (2 hours)

Target the biggest impact files (491 calls = 65%):

**Priority 1:**
1. ✅ `cli_slash_commands.ts` (159 calls)
2. ✅ `index.ts` (126 calls)
3. ✅ `cli_setup_wizard.ts` (106 calls)
4. ✅ `cli_task_history_manager.ts` (62 calls)
5. ✅ `cli_mcp_manager.ts` (38 calls)

**Process per file:**
1. Run migration script
2. Add import statement
3. Test file functionality
4. Commit changes

**Effort:** 2 hours (automated script does heavy lifting)

---

### Phase 4: Migrate Remaining Files (2 hours)

Apply to remaining 19 files (265 calls):

**Batch 1 - Medium usage (5 files, ~135 calls):**
- cli_config_manager.ts
- cli_webview_provider.ts
- cli_task_monitor.ts
- cli_workflow_manager.ts
- cli_interaction_handler.ts

**Batch 2 - Low usage (14 files, ~130 calls):**
- All remaining files

**Effort:** 2 hours

---

### Phase 5: Testing & Validation (1 hour)

1. Run CLI in test environment
2. Execute common commands
3. Verify no rapid scrolling
4. Check output quality
5. Performance testing

**Effort:** 1 hour

---

## ⏱️ Total Time Estimate

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 1 | Create wrapper | 1h | 1h |
| 2 | Migration script | 0.5h | 1.5h |
| 3 | Top 5 files (65%) | 2h | 3.5h |
| 4 | Remaining files | 2h | 5.5h |
| 5 | Testing | 1h | **6.5 hours** |

**Total:** ~6.5 hours for complete migration

---

## 🎯 Quick Wins Strategy

### Option A: Minimal (2 hours)
- Phase 1-2: Create wrapper + script
- Phase 3: Just top 5 files
- **Impact:** 65% of console calls controlled
- **Time:** 2 hours

### Option B: Moderate (4 hours)
- Phases 1-3: Wrapper + top 5 files + testing
- **Impact:** 65% controlled + verified working
- **Time:** 4 hours

### Option C: Complete (6.5 hours)
- All phases
- **Impact:** 100% of console calls controlled
- **Time:** 6.5 hours

---

## 🔄 Migration Process

### Automated Script Approach

```bash
# Run migration on a file
node scripts/migrate-console-logs.mjs src/cli/index.ts

# Or migrate all at once
node scripts/migrate-console-logs.mjs src/cli/*.ts
```

### What the Script Does:

1. **Finds all console calls:**
   - `console.log(...)` → `output.log(...)`
   - `console.error(...)` → `output.error(...)`
   - `console.warn(...)` → `output.warn(...)`

2. **Adds import if missing:**
   ```typescript
   import { output } from './cli_output'
   ```

3. **Preserves formatting:**
   - Keeps existing indentation
   - Maintains line breaks
   - Preserves comments

4. **Creates backup:**
   - Saves original as `.bak`
   - Easy to rollback if needed

---

## 📋 Manual Migration Checklist

For files requiring manual review:

### Per File:
- [ ] Add import: `import { output } from './cli_output'`
- [ ] Replace `console.log` → `output.log`
- [ ] Replace `console.error` → `output.error`
- [ ] Replace `console.warn` → `output.warn`
- [ ] Test file functionality
- [ ] Run linter
- [ ] Commit changes

### Critical Areas:
- [ ] Error messages (keep console.error for critical errors)
- [ ] Debug output (consider keeping or removing)
- [ ] User-facing messages (migrate to output.log)
- [ ] Status updates (migrate to output.log)

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('CliOutput', () => {
  it('throttles rapid outputs', async () => {
    const start = Date.now()
    for (let i = 0; i < 100; i++) {
      output.log(`Message ${i}`)
    }
    await output.flush()
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThan(100 * 20) // 20ms per message minimum
  })
})
```

### Integration Tests
1. Run full CLI workflow
2. Check no rapid scrolling
3. Verify all output appears
4. Test error handling

### Performance Tests
- Measure output latency
- Test with high-frequency output
- Verify queue doesn't grow unbounded

---

## 🚨 Potential Issues & Solutions

### Issue 1: Critical Errors Not Showing
**Problem:** Throttling delays important errors  
**Solution:** Add priority bypass for errors
```typescript
error(...args: any[]) {
  // Errors bypass throttling
  console.error(...args)
}
```

### Issue 2: Debug Output Cluttering
**Problem:** Too much debug output  
**Solution:** Add log levels
```typescript
export const output = {
  log: isVerbose ? throttledLog : noop,
  error: console.error,
  warn: console.warn,
  debug: isDebug ? throttledLog : noop
}
```

### Issue 3: Lost Output on Exit
**Problem:** Queue not flushed on exit  
**Solution:** Add flush on exit
```typescript
process.on('exit', () => output.flush())
```

### Issue 4: Testing Complexity
**Problem:** Hard to test throttled output  
**Solution:** Make throttling optional
```typescript
const output = new CliOutput({ 
  throttle: process.env.NODE_ENV !== 'test' 
})
```

---

## 📈 Success Metrics

### Before Migration:
- ❌ 728+ uncontrolled console calls
- ❌ Rapid scrolling common
- ❌ Terminal flooding possible
- ❌ No output control

### After Migration:
- ✅ All output controlled
- ✅ Max 50 outputs/second
- ✅ Smooth scrolling
- ✅ Queue prevents flooding
- ✅ Same behavior, better control

---

## 🎯 Decision Matrix

| Approach | Time | Impact | Complexity | Risk | Recommended |
|----------|------|--------|------------|------|-------------|
| Simple Wrapper | 2h | High | Low | Low | ✅ **YES** |
| Full Buffer System | 20h | Very High | High | Medium | ❌ Overkill |
| No Change | 0h | None | None | High | ❌ Problem persists |

**Verdict:** Simple wrapper is the sweet spot - 90% of benefit, 10% of effort.

---

## 🚀 Getting Started

### Immediate Action (30 minutes):

1. **Create the wrapper:**
   ```bash
   # Create cli_output.ts with simple throttling
   ```

2. **Test it manually:**
   ```typescript
   import { output } from './cli_output'
   for (let i = 0; i < 100; i++) {
     output.log(`Test ${i}`)
   }
   ```

3. **Migrate one file:**
   ```bash
   # Try cli_mcp_manager.ts (38 calls, manageable)
   ```

4. **Verify it works:**
   ```bash
   npm run cli -- "test task"
   ```

### Next Steps:

✅ **If successful:** Create migration script, automate the rest  
❌ **If issues:** Refine wrapper, adjust throttling  

---

## 📊 Progress Tracking

### Completion Checklist:

**Phase 1:**
- [ ] cli_output.ts created
- [ ] Basic throttling working
- [ ] Manual test passed

**Phase 2:**
- [ ] Migration script created
- [ ] Script tested on sample file
- [ ] Backup mechanism working

**Phase 3 (Top 5):**
- [ ] cli_slash_commands.ts (159)
- [ ] index.ts (126)
- [ ] cli_setup_wizard.ts (106)
- [ ] cli_task_history_manager.ts (62)
- [ ] cli_mcp_manager.ts (38)

**Phase 4 (Remaining):**
- [ ] Medium usage files (5 files)
- [ ] Low usage files (14 files)

**Phase 5:**
- [ ] Integration tests pass
- [ ] No rapid scrolling confirmed
- [ ] Performance acceptable

---

## 💡 Alternative: Gradual Migration

Don't want to migrate all at once? Use **gradual rollout:**

1. **Week 1:** Create wrapper + top 2 files (285 calls, 38%)
2. **Week 2:** Migrate next 3 files (206 calls, 27%) 
3. **Week 3:** Migrate remaining files (265 calls, 35%)

**Benefit:** Test in production between phases, adjust as needed.

---

**Created:** October 15, 2025  
**Status:** Ready to implement  
**Estimated Effort:** 6.5 hours total (or 2 hours for quick win)  
**Recommendation:** Start with Option A (2 hours, 65% impact)

