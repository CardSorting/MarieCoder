# NormieDev ⚡

**Community-driven AI coding assistant**

[![Discord](https://img.shields.io/badge/Discord-Join-7289da?logo=discord)](https://discord.gg/VPxMugw2g9) • [![GitHub](https://img.shields.io/badge/GitHub-Star-blue?logo=github)](https://github.com/CardSorting/NormieDev) • [![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](./LICENSE)

---

## What is NormieDev?

NormieDev is a community fork of [Cline](https://github.com/cline/cline), the open-source AI coding assistant that's democratizing AI-assisted development. We're building on their incredible foundation to explore additional features and workflows that serve our community's needs.

**Part of the democratic development movement** - AI coding tools should be open, transparent, and controlled by users, not corporations.

### Why "NormieDev"?

It's a fun name. AI coding for normal devs. That's it.

## What It Does

Chat with an AI that can:
- Create and edit files in your codebase
- Run terminal commands (with your approval)
- Browse and test your web apps
- Fix bugs with full context
- Extend itself with custom tools

Every action requires your approval. You're always in control.

## Quick Start

```bash
1. Install NormieDev in VS Code
2. Add your AI API key (or use free local models)
3. Start chatting about what you want to build
4. Review and approve changes
5. Ship it
```

## Standing on the Shoulders of Giants

The [Cline project](https://github.com/cline/cline) pioneered something revolutionary: proving that powerful AI coding assistants don't need to be proprietary black boxes. They can be:
- **Open source** - fully transparent codebase
- **User controlled** - you approve every action
- **Model agnostic** - use any AI provider you want
- **Community driven** - built with and for developers

NormieDev carries forward this mission. We're not replacing Cline - we're contributing to the ecosystem they created. Both projects share the same core values and vision for democratic development.

**Huge respect to the Cline team** for making this possible. Their openness and commitment to user autonomy inspired us to build alongside them.

## Core Features

### 💬 Smart Conversations
Talk to your codebase in natural language. NormieDev understands context, patterns, and project structure.

### 📝 File Operations
Create, edit, and refactor files. See diffs before accepting. Give feedback and iterate until it's right.

### ⚡ Terminal Integration
Execute commands, install packages, run tests, start servers. NormieDev monitors output and adapts as it works.

### 🌐 Browser Testing
Launch browsers, interact with your UI, capture screenshots, read console logs. Perfect for web development.

### 🔌 MCP Integration
Connect to databases, APIs, and external services using Model Context Protocol. Create custom tools for your workflow.

### 🎯 Context Control
Use `@file`, `@folder`, `@url`, and `@problems` to give NormieDev exactly what it needs.

### 📸 Visual Development
Drop in screenshots or mockups. NormieDev recreates them as working code.

### 💾 Checkpoints
Every step is saved. Compare versions, restore any previous state, experiment freely.

## Choose Your AI

NormieDev works with any AI provider:

**Cloud Providers:**
- Anthropic Claude (high quality)
- OpenAI GPT (well-rounded)
- Google Gemini (fast & affordable)
- OpenRouter (200+ models)
- AWS Bedrock, Azure, GCP Vertex

**Local & Private:**
- Ollama (free, runs on your machine)
- LM Studio (user-friendly local interface)

Switch between them anytime. Use what fits your budget and privacy needs.

## Real Examples

**"Build a React dashboard with charts"**  
Creates components, adds visualization library, implements data flow. Fast.

**"This form validation isn't working"**  
Analyzes the code, finds the logic error, fixes it, tests it. Done.

**"Refactor this to use async/await"**  
Updates functions, handles errors properly, maintains behavior. Clean.

**"Add dark mode throughout the app"**  
Updates styles, adds toggle, persists preference. Works everywhere.

## Context Tools

Give NormieDev exactly what it needs:

```
@file src/components/Header.tsx    → Include specific file
@folder src/utils/                  → Include entire folder  
@url https://api-docs.example.com   → Fetch external docs
@problems                           → Include all VS Code errors
```

Efficient and precise.

## How We Work

**User Control First**  
Every file change, terminal command, and browser action requires approval. No surprises.

**See Everything**  
Full diffs for file changes. Clear explanations for actions. Complete transparency.

**Iterate Freely**  
Don't like something? Give feedback. NormieDev adapts and tries again.

**Save Checkpoints**  
Restore to any previous state. Experiment without risk.

## Getting Started

### Installation
```
VS Code → Extensions → Search "NormieDev" → Install
```

### Configuration
Click NormieDev icon → Settings → Choose AI provider → Add API key

### Start Building
Open chat → Describe what you want → Review changes → Approve → Done

## Tips for Success

**Be specific:** "Add pagination to the user table" beats "improve the UI"

**Use context:** `@file` and `@folder` help NormieDev understand your project

**Iterate quickly:** Fast feedback loops get better results

**Break it down:** Smaller, focused tasks work best

**Mix models:** Use cheaper models for simple tasks, powerful ones for complex work

## Community

We're building together:

- 💬 [Discord](https://discord.gg/VPxMugw2g9) - Daily discussions and support
- 🐛 [GitHub Issues](https://github.com/CardSorting/NormieDev/issues) - Bug reports
- 💡 [Discussions](https://github.com/CardSorting/NormieDev/discussions) - Ideas and feedback
- ⭐ [Star the Project](https://github.com/CardSorting/NormieDev) - Show support

Both NormieDev and Cline communities welcome you. We're all building the future of democratic development together.

## FAQ

**How much does it cost?**  
Extension is free. AI usage costs vary ($0 with Ollama to ~$3/hour with Claude Sonnet).

**Is my code private?**  
Depends on AI provider. Cloud services process your code. Use Ollama for complete privacy.

**What can it build?**  
Anything you can build in VS Code. Works with all languages and frameworks.

**How is this different from Copilot?**  
Copilot autocompletes. NormieDev plans, builds, tests, debugs, and iterates with you.

**Can I use both Cline and NormieDev?**  
Yes! Both are part of the same ecosystem. Try both and use what works for you.

**Why fork instead of contribute to Cline?**  
We're exploring different features and approaches while maintaining the same core mission. Both projects benefit from diverse experimentation.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

Whether you contribute to NormieDev, Cline, or both - you're helping build the democratic development movement.

## License & Attribution

**NormieDev** is licensed under [Apache 2.0](./LICENSE)  
Built by the NormieDev community

**Built on [Cline](https://github.com/cline/cline)** - Apache 2.0 © Cline Bot Inc.  
Cline pioneered democratic AI-assisted development and made it open source.

We're deeply grateful to the Cline team for:
- Creating an incredible foundation
- Championing open-source AI tools  
- Proving that users should control their AI assistants
- Inspiring a movement toward democratic development

Their vision made projects like NormieDev possible.

---

<div align="center">

**Democratic development for everyone** ⚡

*Join the movement. Build openly. Ship freely.*

[Try NormieDev](https://github.com/CardSorting/NormieDev) • [Try Cline](https://github.com/cline/cline)

</div>
