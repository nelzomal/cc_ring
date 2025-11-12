# CC Ring - Claude Code Sound Notifier

[中文文档](https://github.com/nelzomal/cc_ring/blob/master/README.zh-cn.md)
[Download Link](https://marketplace.visualstudio.com/items?itemName=nelzomal.cc-ring)

Never miss when Claude Code completes a task! CC Ring plays customizable notification sounds when Claude Code finishes executing tasks, helping you stay productive without constantly watching your screen.

## Features

- **Sound Notifications**: Get instant audio feedback when Claude Code completes tasks
- **Customizable Volume**: Adjust notification volume from 0-100%
- **Multiple Sound Options**: Choose from built-in sounds or use your own
  - Complete: Standard completion sound
  - Subtle: Quiet, gentle notification
  - Notification: Clear alert sound
  - Custom: Use your own sound file (WAV, MP3, or other audio formats)
- **Easy Setup**: Automatic hook installation for Claude Code integration
- **Flexible Configuration**: Enable/disable notifications on the fly

## Requirements

- **Claude Code**: This extension requires [Claude Code](https://claude.com/claude-code) to be installed and configured in VS Code
- **VS Code**: Version 1.105.0 or higher

## Installation

1. Install the extension from the VS Code Marketplace (or install from VSIX)
2. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
3. Run: `CC Ring: Install/Reinstall Hook`
4. The extension will automatically set up integration with Claude Code

## Configuration

This extension contributes the following settings (accessible via Settings UI or `settings.json`):

### `cc-ring.enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable or disable sound notifications when Claude Code completes tasks

### `cc-ring.volume`
- **Type**: `number`
- **Default**: `50`
- **Range**: `0-100`
- **Description**: Volume level for notification sounds (0 = mute, 100 = maximum)

### `cc-ring.sound`
- **Type**: `string`
- **Default**: `"complete"`
- **Options**: `"complete"`, `"subtle"`, `"notification"`, `"custom"`
- **Description**: Choose which sound to play on task completion

### `cc-ring.customSoundPath`
- **Type**: `string`
- **Default**: `""`
- **Description**: Path to your custom sound file (only used when `cc-ring.sound` is set to `"custom"`)

## Commands

Access these commands via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

### `CC Ring: Test Notification Sound`
Preview your currently selected sound and volume setting

### `CC Ring: Select Custom Sound File`
Open a file picker to choose a custom sound file for notifications

### `CC Ring: Install/Reinstall Hook`
Set up or repair the Claude Code integration hook

### `CC Ring: Uninstall Hook`
Remove the Claude Code integration hook

### `CC Ring: Show Status`
Display current hook installation status and configuration

## Usage

1. **Basic Setup**:
   - Install the extension
   - Run `CC Ring: Install/Reinstall Hook` command
   - Notifications will now play when Claude Code completes tasks

2. **Adjust Volume**:
   - Open Settings (`Cmd+,` / `Ctrl+,`)
   - Search for "cc-ring"
   - Adjust the "Volume" slider

3. **Change Sound**:
   - In Settings, change the "Sound" dropdown to your preferred option
   - Use `CC Ring: Test Notification Sound` to preview

4. **Use Custom Sound**:
   - Run `CC Ring: Select Custom Sound File`
   - Choose your audio file
   - The sound setting will automatically change to "custom"

## How It Works

CC Ring integrates with Claude Code using VS Code's hook system. When Claude Code completes a task, it triggers a hook that CC Ring listens for, then plays your configured notification sound. The integration is seamless and doesn't interfere with Claude Code's normal operation.

## Troubleshooting

**No sound playing?**
- Check that `cc-ring.enabled` is set to `true`
- Verify volume is not set to 0
- Run `CC Ring: Show Status` to check hook installation
- Try `CC Ring: Install/Reinstall Hook` to repair integration

**Custom sound not working?**
- Ensure the file path is correct and accessible
- Verify the audio file format is supported by your system
- Try testing with one of the built-in sounds first

## Privacy & Permissions

This extension:
- Only monitors Claude Code task completion events
- Does not collect, transmit, or store any user data
- Runs entirely locally on your machine
- Only accesses audio files you explicitly select

## License

This extension is licensed under the [MIT License](LICENSE).

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/nelzomal/cc_ring/issues).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and updates.

---

**Enjoy productive coding with Claude Code!**
