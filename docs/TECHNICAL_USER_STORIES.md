# Technical User Stories

This document provides technical specifications for each use case in the CC Ring extension. Each user story includes business context, technical acceptance criteria, BDD test scenarios, and non-functional requirements to guide both implementation and testing.

---

## US-1: Check Hook Installation Status

### User Story

**As a** CC Ring user

<!-- AI_FIX it's for gather info to show user not for developer -->

**I want to** verify if my hook installation is working correctly

<!-- AI_FIX user can know the status, also we can decide if to show the notification -->

**So that** I can troubleshoot when notifications aren't playing and understand the current state of my setup

### Business Value

- Enables self-service troubleshooting without developer intervention
- Provides diagnostic information for both users and extension internals
- Reduces support burden by surfacing installation issues clearly
- Supports status bar UI and command palette diagnostics

### Technical Acceptance Criteria

**Architecture:**

- Use case must be read-only (no side effects, no modifications to system state)
- Must depend on `IHookRepository` port for reading Claude Code settings
- Must depend on `IFileSystem` port for checking file existence
- Must receive `scriptPath` through dependency injection

**Return Value:**

<!-- AI_FIX only return isInstalled, as we can know other details in types.TYPES.SupportedHooks -->

- Returns `HookStatus` interface with:
  - `isInstalled: boolean` - true only if BOTH script exists AND hooks are registered
  - `scriptExists: boolean` - file system check result
  - `installedHooks: HookEvent[]` - array of currently registered hooks (may be empty)
  - `hookCount: number` - count of installed hooks (derived from array length)

**Domain Rules:**

<!-- AI_FIX also depends on SupportedHooks -->

- `HookEvent` is a domain value object with validated type, matcher, and config key
- Possible hook types: Stop, Notification, PreToolUse
- Each hook has immutable properties validated at construction time

**Dependencies:**

<!-- AI_FIX IHookRepository.isInstalled is enough   -->

- `IHookRepository.findInstalledHooks()` - queries Claude Code settings.json

- `IFileSystem.fileExists(path)` - checks if hook script file exists on disk
- Both operations are independent and can be executed in any order

### BDD Test Scenarios

#### Scenario 1: Hooks Fully Installed

```gherkin
Given the hook script file exists at the configured scriptPath
  And Claude Code settings.json contains 1 or more registered hooks
When CheckHookStatusUseCase.execute() is called
Then it should return HookStatus with:
  | isInstalled      | true                    |
  | scriptExists     | true                    |
  | installedHooks   | array of HookEvent[]    |
  | hookCount        | > 0                     |
```

**Technical Implementation Notes:**

- `fileWriter.fileExists(scriptPath)` returns `true`
- `hookRepository.findInstalledHooks()` returns non-empty array
- Each HookEvent in the array must be properly validated (value object invariants)

---

#### Scenario 2: Script Missing But Hooks Registered

```gherkin
Given the hook script file does NOT exist at scriptPath
  And Claude Code settings.json contains registered hooks
When CheckHookStatusUseCase.execute() is called
Then it should return HookStatus with:
  | isInstalled      | false                   |
  | scriptExists     | false                   |
  | installedHooks   | array of HookEvent[]    |
  | hookCount        | > 0                     |
```

**Technical Implementation Notes:**

- This is an inconsistent state (hooks registered but script missing)
- `isInstalled` correctly returns `false` because BOTH conditions must be true
- Useful for diagnosing partial uninstallation or manual file deletion

---

#### Scenario 3: Script Exists But No Hooks Registered

```gherkin
Given the hook script file exists at scriptPath
  And Claude Code settings.json contains NO registered hooks
When CheckHookStatusUseCase.execute() is called
Then it should return HookStatus with:
  | isInstalled      | false                   |
  | scriptExists     | true                    |
  | installedHooks   | empty array []          |
  | hookCount        | 0                       |
```

**Technical Implementation Notes:**

- Another inconsistent state (script exists but not registered)
- May occur if user manually edited settings.json or partial installation
- `isInstalled` is `false` because no hooks are registered

---

#### Scenario 4: Nothing Installed (Clean State)

```gherkin
Given the hook script file does NOT exist
  And Claude Code settings.json contains NO registered hooks
When CheckHookStatusUseCase.execute() is called
Then it should return HookStatus with:
  | isInstalled      | false                   |
  | scriptExists     | false                   |
  | installedHooks   | empty array []          |
  | hookCount        | 0                       |
```

**Technical Implementation Notes:**

- This is the expected state before first installation
- All fields indicate "not installed"

---

### Non-Functional Requirements

#### Error Handling

**Repository Errors:**

- If `hookRepository.findInstalledHooks()` throws an exception (e.g., corrupted settings.json):
  - Error should propagate to caller (use case does not catch)
  - Caller (e.g., command handler) is responsible for user-facing error messages
  - Log the error with sufficient context for debugging

**File System Errors:**

- If `fileWriter.fileExists()` throws unexpected error:
  - Should propagate to caller
  - In practice, `fileExists()` should return `false` for missing files, not throw
  - Only throw for actual I/O errors (permissions, disk errors, etc.)

**Domain Validation Errors:**

- If `HookEvent` objects in `installedHooks` are invalid:
  - This indicates corrupted data in settings.json
  - Repository layer should handle validation during deserialization
  - Use case assumes `HookEvent[]` received from repository is already validated

#### Edge Cases & Validations

**Empty Hook Arrays:**

- `installedHooks: []` is valid (represents no hooks installed)
- `hookCount` must equal `installedHooks.length` (derived, not independent)

**Null/Undefined Checks:**

- `scriptPath` is injected via DI - container ensures it's not null
- `hookRepository` and `fileWriter` are injected - container ensures instances exist
- `findInstalledHooks()` contract guarantees array return (never null/undefined)

**Script Path Edge Cases:**

- Script path may contain spaces, special characters, or Unicode
- `fileWriter.fileExists()` must handle these correctly (platform-specific)
- No validation of scriptPath format in use case (infrastructure concern)

#### Atomicity Requirements

**Read Consistency:**

- The two checks (file existence + settings query) are NOT atomic
- File system state may change between checks (race condition possible)
- This is acceptable for diagnostic purposes (not transactional)
- If precise consistency is needed, caller should recheck or lock

**No Side Effects:**

- Use case is pure query - MUST NOT modify any state
- No writes to file system, settings, or in-memory state
- Idempotent: calling multiple times returns same result (given no external changes)

#### Performance Constraints

**Execution Time:**

- Should complete in < 100ms for typical cases
- File existence check: O(1) file system call
- Settings query: O(n) where n = number of hooks in settings.json
  - Expected n < 10 in typical usage
  - If n > 100, consider warning about performance

**Resource Usage:**

- Memory: O(n) for storing `installedHooks` array
- No disk writes, no network calls
- Should not block UI thread (use async/await properly)

**Caching Considerations:**

- Results may be cached by caller for UI responsiveness
- Cache should be invalidated after install/uninstall operations
- Use case itself does not implement caching (single responsibility)

---

### Related Components

**Ports (Interfaces):**

- `IHookRepository` - src/application/ports/IHookRepository.ts
- `IFileSystem` - src/application/ports/IFileSystem.ts

**Domain Objects:**

- `HookEvent` - src/domain/valueObjects/hook/HookEvent.ts
- `HookEventType` - src/domain/valueObjects/hook/HookEventType.ts

**DI Configuration:**

- Registered in DI container with `TYPES.CheckHookStatusUseCase`
- Dependencies injected: `TYPES.IHookRepository`, `TYPES.IFileSystem`, `TYPES.ScriptPath`

**Callers:**

- Status bar provider (for UI indicator)
- Command handlers (for diagnostic commands)
- InstallHookUseCase (to check before installation)
- UninstallHookUseCase (to verify after uninstallation)

---
