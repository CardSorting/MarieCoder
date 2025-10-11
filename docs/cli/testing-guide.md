# CLI Testing Guide

## Quick Start Testing

### 1. Build the CLI
```bash
npm run cli:build
```

### 2. Test Basic Commands

#### Help Command
```bash
node dist-cli/mariecoder.js --help
```
**Expected:** Display comprehensive help text with all options and examples

#### Version Command
```bash
node dist-cli/mariecoder.js --version
```
**Expected:** Display version number (e.g., MarieCoder CLI v3.32.6)

#### Config Command
```bash
node dist-cli/mariecoder.js --config
```
**Expected:** Display current configuration (will show "not set" for first-time users)

### 3. Test First-Time Setup Flow

#### Reset Configuration (if you have existing config)
```bash
node dist-cli/mariecoder.js --reset-config
```

#### Run Setup Wizard
```bash
node dist-cli/mariecoder.js --setup
```

**Expected Flow:**
1. Welcome message with step-by-step setup
2. Provider selection (Anthropic, OpenAI, OpenRouter, Custom)
3. API key configuration with format validation
4. Model selection with recommendations
5. Optional advanced settings
6. .clinerules directory creation offer
7. Setup summary
8. Option to start interactive session

**Test Inputs:**
- Select provider: `1` (Anthropic)
- Enter API key: Use a real or test key (format: `sk-ant-...`)
- Select model: `1` (recommended)
- Advanced settings: `n` (no)
- Create .clinerules: `y` (yes)
- Start session: `n` (no, to test later)

### 4. Test Configuration Loading

#### With Environment Variable
```bash
export ANTHROPIC_API_KEY=sk-ant-your-test-key
node dist-cli/mariecoder.js --config
```
**Expected:** Shows API key from environment (masked)

#### With Command-Line Option
```bash
node dist-cli/mariecoder.js -k sk-ant-test-key --config
```
**Expected:** Shows API key from command line (masked)

### 5. Test Interactive Mode Commands

```bash
node dist-cli/mariecoder.js
```

**Commands to test:**
1. Type `config` - Should display current configuration
2. Type `help` - Should show interactive mode help
3. Type `clear` - Should clear the screen
4. Type `exit` or `quit` - Should exit gracefully

### 6. Test Error Handling

#### Missing API Key
```bash
# Make sure no config or env vars are set
node dist-cli/mariecoder.js "Test task"
```
**Expected:** Helpful error message with multiple configuration options

#### Invalid API Key Format
During setup, try entering an invalid key like `invalid-key-123`
**Expected:** Warning about unusual format, option to continue or cancel

### 7. Test .clinerules Creation

```bash
cd /tmp/test-project
node /path/to/MarieCoder/dist-cli/mariecoder.js --setup
# Accept .clinerules creation
ls -la .clinerules/
cat .clinerules/standards.md
```
**Expected:** 
- `.clinerules/` directory created
- `standards.md` file with example content

## Manual Testing Checklist

### Setup Flow ✓
- [ ] First-time welcome message displays
- [ ] Setup wizard launches automatically on first run
- [ ] Provider selection works
- [ ] API key validation works
- [ ] Model selection shows recommendations
- [ ] Advanced settings optional
- [ ] .clinerules creation optional
- [ ] Setup summary displays correctly
- [ ] Configuration saved to correct location

### Configuration Management ✓
- [ ] Config file created at `~/.mariecoder/cli/config.json`
- [ ] Secrets file created at `~/.mariecoder/cli/secrets.json`
- [ ] Secrets file has 0600 permissions (Unix-like systems)
- [ ] API keys are masked in display
- [ ] `--config` shows current configuration
- [ ] `--reset-config` clears configuration
- [ ] Environment variables override file config
- [ ] Command-line options override environment variables

### Interactive Mode ✓
- [ ] `config` command works
- [ ] `help` command works
- [ ] `clear` command works
- [ ] `exit` and `quit` commands work
- [ ] Empty input doesn't crash
- [ ] Unknown commands handled gracefully

### Error Handling ✓
- [ ] Missing API key shows helpful error
- [ ] Invalid configuration shows specific errors
- [ ] Failed setup can be retried
- [ ] Unknown options show warning
- [ ] Cancelled setup provides next steps

### Visual Feedback ✓
- [ ] Banner displays correctly
- [ ] Progress indicators (✓, ✅, ❌) show
- [ ] Separators render properly
- [ ] Colors/emojis display correctly
- [ ] Help text is readable and well-formatted

## Integration Testing

### Test with Real API (Optional)

If you have a real API key:

```bash
# Setup with real key
node dist-cli/mariecoder.js --setup
# Use your real API key

# Run a simple task
node dist-cli/mariecoder.js "Create a simple hello.txt file with 'Hello World'"
```

**Expected:**
- Task initializes successfully
- Workspace detected
- Rules loaded (if any)
- Task execution begins
- Approval prompts work
- Task completes or can be interrupted

### Test Configuration Persistence

```bash
# Run setup
node dist-cli/mariecoder.js --setup
# Complete setup

# Exit and run again
node dist-cli/mariecoder.js
```

**Expected:**
- No setup wizard on second run
- Previous configuration loaded
- Ready to accept tasks immediately

## Known Issues and Limitations

### Current
- None identified in core setup flow

### Future Enhancements Needed
- Multi-profile support
- Configuration validation before save
- API key connectivity test
- Interactive config editor

## Troubleshooting

### Build Errors
```bash
npm run clean
npm install
npm run cli:build
```

### Permission Errors
```bash
chmod +x dist-cli/mariecoder.js
```

### Config Not Loading
```bash
# Check config exists
ls -la ~/.mariecoder/cli/

# View config
cat ~/.mariecoder/cli/config.json

# Reset and retry
node dist-cli/mariecoder.js --reset-config
node dist-cli/mariecoder.js --setup
```

### Import Errors
Make sure you've built the CLI:
```bash
npm run cli:build
```

## Test Results

### ✅ Passing Tests (Verified)
- Build succeeds without errors
- Help command displays correctly
- Config command works
- Version command works
- Banner displays correctly
- All new files compile without linter errors

### 🔄 Manual Testing Required
- Full setup wizard flow
- API key validation
- .clinerules creation
- Interactive mode commands
- First-time user experience
- Configuration persistence
- Error message clarity

### 📝 User Acceptance Testing
- First-time user onboarding smoothness
- Help text clarity
- Error message actionability
- Overall UX satisfaction

## Next Steps for Full Testing

1. **Reset your local config:**
   ```bash
   node dist-cli/mariecoder.js --reset-config
   ```

2. **Experience first-run flow:**
   ```bash
   node dist-cli/mariecoder.js
   ```

3. **Test all interactive commands:**
   - config, help, clear, exit

4. **Test with real API key:**
   - Run setup with actual key
   - Execute a simple task
   - Verify task execution

5. **Test configuration methods:**
   - Environment variables
   - Command-line options
   - Config file loading

6. **Verify .clinerules:**
   - Creation during setup
   - Loading on initialization
   - Content correctness

## Reporting Issues

If you find any issues during testing:

1. **Describe the issue:** What went wrong?
2. **Steps to reproduce:** How can it be recreated?
3. **Expected behavior:** What should have happened?
4. **Actual behavior:** What actually happened?
5. **Environment:** OS, Node version, CLI version
6. **Logs:** Any error messages or stack traces

---

*Happy testing! 🧪*

