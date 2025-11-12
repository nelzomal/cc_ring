# Change Log

All notable changes to the "cc-ring" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.2.6] - 2025-11-12

### Fixed
- Fixed English localization displaying keys instead of actual messages
- English messages now display correctly in all notifications and UI elements

### Changed
- Refactored localization system to use English messages as keys (proper VS Code l10n approach)
- Updated Chinese translations to match new localization structure
- Removed outdated l10nTestHelper test mock (tests now use real l10n behavior)

### Added
- Added TypeScript-based l10n validation script using compiler API (`npm run l10n-check`)
- Script validates all l10n strings are defined in translation bundles
- Detects missing translations and unused keys automatically
- Configured ts-node to compile in-memory without emitting build artifacts

## [0.2.5] - 2025-11-12

### Fixed
- Added robust JSON validation to prevent extension from modifying malformed Claude Code settings
- Implemented duplicate key detection using @prantlf/jsonlint library
- Extension now properly rejects settings.json with duplicate "Stop" hook keys
- Consistent error handling across install/uninstall operations for all JSON parsing errors

### Changed
- All malformed JSON (including duplicate keys) is now treated consistently as corrupted settings
- Install operations fail fast without creating files when settings are malformed
- Uninstall operations delete hook files but skip settings cleanup with clear warning message

## [0.2.4] - 2025-11-12

### Fixed
- Fixed Chinese localization for command palette entries by adding category field
- Commands now display properly in Chinese VSCode (e.g., "CC Ring: 测试通知声音")

### Changed
- Reorganized hook files into dedicated `~/.claude/hooks/cc_ring/` directory
- Added comprehensive logging system with two log files:
  - `error.log`: Captures all errors (config issues, file not found, playback failures)
  - `hook.log`: Records normal operations and execution flow
- Both logs auto-rotate to keep last 2000 lines to prevent unlimited growth

## [0.2.3] - 2025-11-12

### Added
- Extension icon/logo featuring VS Code logo and notification bell

## [0.2.2] - 2025-11-12

### Added
- Language navigation links in README files
- Marketplace download links in both English and Chinese README

### Fixed
- Fixed quote escaping in Chinese localization strings

## [0.2.1] - 2025-11-12

### Fixed
- Fixed quote escaping in Chinese localization strings

## [0.2.0] - 2025-11-11

### Added
- Chinese (Simplified) localization support for UI and marketplace
  - All extension UI strings now support Chinese translation
  - Chinese README (README.zh-cn.md)
  - Chinese CHANGELOG (CHANGELOG.zh-cn.md)
  - Automatic language detection based on VS Code language settings
- Localization infrastructure using VS Code's modern l10n API
  - English and Chinese bundle files in l10n/ directory
  - Package.nls.json files for marketplace localization

## [0.1.1] - 2025-11-11

### Fixed
- Improved error handling for corrupted settings.json files
- Better handling of duplicate hook installations
- Proper preservation of existing Claude Code hooks during install/uninstall
- Fixed hook identification with consistent UUID
- Enhanced error messages with appropriate warning vs error classification
- Robust handling of malformed hook structures in settings.json

### Added
- Comprehensive test suite (42 passing tests)

## [0.1.0] - 2025-11-11

### Added
- Initial release of CC Ring extension
- Sound notifications when Claude Code completes tasks
- Configurable volume control (0-100%)
- Multiple built-in sound options:
  - Complete: Standard completion sound
  - Subtle: Quiet subtle sound
  - Notification: Alert notification sound
- Custom sound file support
- Commands:
  - Test Notification Sound: Preview the selected sound
  - Select Custom Sound File: Choose a custom sound file
  - Install/Reinstall Hook: Set up Claude Code integration
  - Uninstall Hook: Remove Claude Code integration
  - Show Status: Display current hook installation status
- Configuration settings:
  - Enable/disable notifications
  - Volume control
  - Sound selection
  - Custom sound file path
- Automatic hook management for Claude Code integration