# Architecture Layer Findings

## Overview

This document captures architectural observations about layer responsibility violations discovered during a code review of the Clean Architecture implementation.

## Issue Location

**File**: `src/infrastructure/persistence/claude-settings/util.ts`

**Problem**: This file mixes infrastructure concerns with business logic that belongs in higher layers.

---

## Analysis

### Current State of `util.ts`

| Function                   | Current Layer  | Responsibility                            | Correct Layer                             |
| -------------------------- | -------------- | ----------------------------------------- | ----------------------------------------- |
| `HOOK_EVENT_TYPE_TO_KEY`   | Infrastructure | Maps domain enum → JSON property key      | ✅ Infrastructure                         |
| `isCCRingCommand()`        | Infrastructure | Business rule: identifies CC Ring hooks   | ❌ **Domain**                             |
| `isCCRingGroup()`          | Infrastructure | Business rule: identifies CC Ring groups  | ❌ **Domain**                             |
| `removeAllCCRingHooks()`   | Infrastructure | Orchestration: filters and removes hooks  | ❌ **Application**                        |
| `removeDuplicates()`       | Infrastructure | Data cleanup logic                        | ⚠️ Could stay, but has business knowledge |
| `cleanupEmptyStructures()` | Infrastructure | JSON cleanup                              | ✅ Infrastructure                         |
| `installCCRingHooks()`     | Infrastructure | Orchestration: installs hooks into DTO    | ❌ **Application**                        |
| `groupsEqual()`            | Infrastructure | Equality comparison with business meaning | ❌ **Domain**                             |
| `readSettingsInfraDTO()`   | Infrastructure | File I/O + parsing                        | ✅ Infrastructure                         |
| `writeSettingsInfraDTO()`  | Infrastructure | File I/O + serialization                  | ✅ Infrastructure                         |

### Why This Matters

> **Note**: The imports in `util.ts` (from `@domain` and `@application`) are valid — infrastructure is allowed to depend on inner layers. The issue is about **where logic lives**, not import direction.

1. **Misplaced Business Rules**: Functions like `isCCRingCommand()` define what makes something a "CC Ring hook" — this is domain knowledge, not file format knowledge.

2. **Testing Difficulty**: Business logic buried in infrastructure requires file system mocks to test, even though the logic itself has nothing to do with files.

3. **Unclear Boundaries**: When infrastructure contains business rules, it becomes unclear what can change independently.

---

## Clean Architecture Layers Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION                             │
│  Adapts user interface to application                       │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│                    APPLICATION                              │
│  Orchestrates use cases, defines ports (interfaces)         │
│  Contains: Use cases, orchestrators, port definitions       │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│                      DOMAIN                                 │
│  Core business rules, entities, value objects               │
│  Contains: Entities, value objects, domain services         │
└─────────────────────────────────────────────────────────────┘
        ▲
        │ implements ports
┌───────┴─────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE                             │
│  Technical implementations of ports                         │
│  Contains: Adapters, repositories, external service clients │
└─────────────────────────────────────────────────────────────┘
```

**Key Rule**: Dependencies point **inward**. Infrastructure implements interfaces defined by Application, not the other way around.

---

## Recommendations

### 1. Move to Domain Layer

Create domain logic for identifying CC Ring hooks:

```
src/domain/valueObjects/hook/CCRingHookIdentifier.ts
```

**Move these concepts**:

- `isCCRingCommand()` logic → Domain value object or domain service
- `groupsEqual()` → Part of `HookGroup` value object equality

**Rationale**: "What makes something a CC Ring hook?" is a business rule, not a serialization detail.

### 2. Move to Application Layer

Create an application service for hook manipulation:

```
src/application/services/HookSettingsManipulator.ts
```

**Move these functions**:

- `removeAllCCRingHooks()` → Application service method
- `installCCRingHooks()` → Application service method
- `removeDuplicates()` → Application service method (optional)

**Rationale**: Orchestrating changes to hook settings is application-level coordination, not infrastructure I/O.

### 3. Keep in Infrastructure Layer

These should remain in `util.ts` (or be renamed to `settingsMapper.ts`):

- `HOOK_EVENT_TYPE_TO_KEY` - Format translation
- `cleanupEmptyStructures()` - JSON cleanup (file format concern)
- `readSettingsInfraDTO()` - File I/O
- `writeSettingsInfraDTO()` - File I/O

---

## Proposed Structure After Refactoring

```
src/
├── domain/
│   └── valueObjects/
│       └── hook/
│           ├── HookGroup.ts          # Add equality method
│           └── CCRingHookSpec.ts     # NEW: "Is this a CC Ring hook?"
│
├── application/
│   └── services/
│       ├── HookInstallationOrchestrator.ts  # Existing
│       └── HookSettingsManipulator.ts       # NEW: install/remove logic
│
└── infrastructure/
    └── persistence/
        └── claude-settings/
            ├── ClaudeCodeHookRepository.ts
            ├── dto.ts                        # Unchanged
            └── settingsMapper.ts             # Renamed from util.ts
                                              # Only I/O and format translation
```

---

## Benefits of Refactoring

| Benefit           | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| **Testability**   | Domain/application logic can be unit tested without file system mocks |
| **Clarity**       | Each layer has a clear, single responsibility                         |
| **Flexibility**   | Business rules can change independently of file format                |
| **Cohesion**      | Related logic grouped together — business rules in domain, I/O in infrastructure |

---

## Related Files

- `src/infrastructure/persistence/claude-settings/util.ts` - Current location of mixed concerns
- `src/infrastructure/persistence/claude-settings/dto.ts` - Correctly placed DTO definitions
- `src/application/ports/IHookRepository.ts` - Port that repository implements
