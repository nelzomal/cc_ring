# Change Log

All notable changes to the "cc-ring" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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