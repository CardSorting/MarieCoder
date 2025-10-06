# Tailwind CSS v3 Setup Guide

## ✅ Configuration Complete

This template is configured to use **Tailwind CSS v3.3.0** with proper Next.js integration.

## 📁 Configuration Files

### 1. Package Dependencies
```json
{
  "devDependencies": {
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 2. Tailwind Configuration (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
  // Explicitly ensure we're using Tailwind v3 syntax
  future: {
    hoverOnlyWhenSupported: true,
  },
}
```

### 3. PostCSS Configuration (`postcss.config.js`)
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### 4. CSS File (`app/globals.css`)
```css
/* Tailwind CSS v3 directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(to bottom, transparent, rgb(var(--background-end-rgb))) rgb(var(--background-start-rgb));
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

### 5. VS Code Configuration (`.vscode/settings.json`)
```json
{
  "tailwindCSS.version": "3.3.0",
  "tailwindCSS.experimental.configFile": "./tailwind.config.js",
  "css.validate": false,
  "tailwindCSS.emmetCompletions": true
}
```

## 🚀 Usage

### Development
```bash
# Start development server (Tailwind is automatically processed)
npm run dev

# Check Tailwind version
npm run tailwind:check

# Build Tailwind CSS manually (if needed)
npm run tailwind:build
```

### In Your Components
```tsx
export default function MyComponent() {
  return (
    <div className="bg-blue-500 text-white p-4 rounded-lg">
      <h1 className="text-2xl font-bold">Hello Tailwind!</h1>
      <p className="text-sm opacity-90">This is styled with Tailwind CSS v3</p>
    </div>
  )
}
```

## 🔧 Troubleshooting

### IntelliSense Issues
If you're seeing Tailwind v4 errors in your editor:

1. **Restart VS Code** - This ensures the Tailwind CSS extension picks up the new configuration
2. **Check Extension Version** - Make sure you have the Tailwind CSS IntelliSense extension installed
3. **Verify Configuration** - The `.vscode/settings.json` explicitly sets version 3.3.0

### Common Issues

**"@tailwind base is no longer available in v4"**
- This is a false positive from the Tailwind CSS IntelliSense extension
- The template is correctly configured for v3
- The CSS directives are correct for v3

**Classes not working**
- Make sure your component files are included in the `content` array in `tailwind.config.js`
- Check that `app/globals.css` is imported in your root layout

**Build errors**
- Ensure PostCSS is properly configured
- Check that Tailwind CSS is listed in `devDependencies`

## 📚 Tailwind v3 vs v4

This template uses **Tailwind CSS v3.3.0** for stability and compatibility:

### v3 Syntax (What we use)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### v4 Syntax (Not used)
```css
@import "tailwindcss/preflight";
@tailwind utilities;
```

## 🎯 Best Practices

1. **Use the provided configuration** - Don't modify the core Tailwind setup
2. **Extend the theme** - Add custom colors/utilities in `tailwind.config.js`
3. **Use CSS variables** - Leverage the existing CSS custom properties
4. **Follow the design system** - Use consistent spacing and colors
5. **Optimize for production** - Tailwind automatically purges unused styles

## 🔄 Upgrading to v4 (Future)

When Tailwind CSS v4 becomes stable, you can upgrade by:

1. Update package.json:
   ```json
   "tailwindcss": "^4.0.0"
   ```

2. Update CSS file:
   ```css
   @import "tailwindcss/preflight";
   @tailwind utilities;
   ```

3. Update configuration file for v4 syntax

For now, v3.3.0 provides the best stability and feature set for production applications.

---

**✅ Your Tailwind CSS v3 setup is complete and ready to use!**
