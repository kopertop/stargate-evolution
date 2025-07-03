# Claude Code Hooks

This directory contains custom hooks for Claude Code that enforce project-specific conventions and prevent common issues.

## Available Hooks

### 1. `use-preferred-tools.ts`
**Purpose**: Enforces the use of preferred tools over alternatives
**Trigger**: `PreToolUse` event on `Bash` commands

**Mappings**:
- `npm/bun/yarn` → `pnpm` (for better performance and disk usage)
- `grep/rg/find` → `ack` (for better code searching)

**Example**: If you try to run `npm install`, the hook will block it and suggest `pnpm install` instead.

### 2. `block-dev-server.ts`
**Purpose**: Prevents accidentally starting multiple dev servers
**Trigger**: `PreToolUse` event on `Bash` commands

**Blocked Commands**:
- `pnpm start`
- `pnpm dev`
- `pnpm run start`
- `pnpm run dev`

**Behavior**: When these commands are detected, the hook blocks execution and suggests asking the user to verify the dev server status first.

## Configuration

To activate these hooks in Claude Code, you need to configure them in your settings. You can do this by:

1. Running the `/hooks` slash command in Claude Code
2. Select `PreToolUse` hook event
3. Add matchers and hook commands for each script

### Configuration Example

Add this to your `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/absolute/path/to/stargate-evolution/.claude/hooks/use-preferred-tools.ts",
            "timeout": 10
          },
          {
            "type": "command",
            "command": "/absolute/path/to/stargate-evolution/.claude/hooks/block-dev-server.ts",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

**Note**: Replace `/absolute/path/to/stargate-evolution` with the actual absolute path to your project directory.

## How It Works

1. **Input**: Each hook receives JSON input via stdin containing session info and tool details
2. **Processing**: The hook parses the command and checks against its rules
3. **Output**: 
   - Exit code 0: Allow command to proceed
   - Exit code 2: Block command and show suggestions to Claude

## Testing

You can test these hooks manually by providing sample JSON input:

```bash
# Test the preferred tools hook
echo '{"session_id":"test","transcript_path":"test","tool_name":"Bash","tool_input":{"command":"npm install"}}' | ./.claude/hooks/use-preferred-tools.ts

# Test the dev server block hook
echo '{"session_id":"test","transcript_path":"test","tool_name":"Bash","tool_input":{"command":"pnpm dev"}}' | ./.claude/hooks/block-dev-server.ts
```

## Requirements

- Node.js with TypeScript support (tsx)
- Executable permissions on hook files (`chmod +x`)
- Proper configuration in Claude Code settings

## Troubleshooting

If hooks aren't working:
1. Check that files are executable: `ls -la .claude/hooks/`
2. Verify the absolute paths in your configuration
3. Test hooks manually with sample input
4. Use `claude --debug` to see hook execution details
5. Check Claude Code logs for any error messages 
