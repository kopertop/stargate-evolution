# Styling Structure

This project uses SCSS for styling, organized in a modular way for better maintainability.

## Directory Structure

```
src/styles/
├── main.scss              # Main entry file that imports all other styles
├── base/                  # Basic styles, resets, typography
│   ├── _index.scss        # Forwards all files in the directory
│   └── _reset.scss        # CSS reset and base styles
├── components/            # UI component styles
│   ├── _index.scss        # Forwards all files in the directory
│   ├── _ui.scss           # Game UI element styles
│   └── _help.scss         # Help and tutorial styles
├── effects/               # Visual effects
│   ├── _index.scss        # Forwards all files in the directory
│   └── _wormhole.scss     # Wormhole travel effect styles
├── layout/                # Layout styles (currently empty)
└── variables/             # SCSS variables
    ├── _index.scss        # Forwards all files in the directory
    ├── _colors.scss       # Color variables
    └── _sizes.scss        # Size, spacing and z-index variables
```

## Usage

1. Import variables where needed using:
   ```scss
   @use '../styles/variables' as *;
   ```

2. Follow these principles when adding new styles:
   - Create component-specific styles in the components directory
   - Use the variables defined in the variables directory
   - Group related styles in appropriately named files
   - Update the corresponding _index.scss file when adding new files

## Best Practices

- Use nesting to maintain component hierarchy
- Keep nesting to a maximum of 3 levels deep
- Use variables for all colors, sizes, and z-indices
- Follow naming pattern of prefixing partial files with underscore (_)
- Group modifiers with the & parent selector 
