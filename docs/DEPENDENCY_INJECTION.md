# Dependency Injection Guidelines

This document outlines the rules and best practices for dependency injection in this codebase.

## Overview

We use **InversifyJS** for dependency injection, following **Clean Architecture** principles. The composition root is located at `src/presentation/composition/container.ts`.

**Important architectural decisions:**
- **DI Symbols Location**: All TYPES symbols are defined in `src/shared/types.ts` (layer-agnostic)
- **Runtime Values**: Use `container.get()` instead of closures for dependency resolution
- **Layer Dependencies**: Inner layers never depend on outer layers (enforced by automated checks)

## Interface Usage Rules

### When to Use Interfaces

Following the Dependency Inversion Principle, use interfaces in these cases:

#### ✅ REQUIRED: Infrastructure Layer

All infrastructure implementations that cross architectural boundaries **MUST** implement interfaces:

- **Repositories** (data access)
  - ✅ `IHookRepository` → `ClaudeCodeHookRepository`
  - ✅ `IFileSystem` → `FileSystem`

- **Services** (external services/APIs)
  - ✅ `ISoundPlayer` → `AfplaySoundPlayer`
  - ✅ `IConfigProvider` → `VSCodeConfigProvider`

- **Adapters** (external system integrations)
  - ✅ `IFileSystemAdapter` → `FileSystemAdapter`

**Rationale:** These components interact with external systems (filesystem, VSCode API, system commands). Interfaces allow:
- Easy testing with mocks
- Swapping implementations (e.g., different sound players on different platforms)
- Protection from external changes

#### ⚠️ OPTIONAL: Infrastructure Helpers

Infrastructure utilities MAY have interfaces if there's a clear benefit:

- **Mappers** - Usually concrete is fine
  - Current: `HookEventMapper` (concrete)
  - Consider interface if: multiple mapping strategies needed

- **Generators** - Usually concrete is fine
  - Current: `HookScriptGenerator` (concrete)
  - Consider interface if: multiple template engines needed

- **Validators** - Usually concrete is fine
  - Current: `ClaudeSettingsValidator` (concrete)
  - Consider interface if: multiple validation strategies needed

**Rationale:** These are internal utilities with single responsibility. Interfaces add overhead without clear benefit unless you foresee multiple implementations.

#### ℹ️ NOT NEEDED: Application Layer Use Cases

Use cases are typically concrete classes (no interface):

- ✅ `InstallHookUseCase` (concrete)
- ✅ `UninstallHookUseCase` (concrete)
- ✅ `CheckHookStatusUseCase` (concrete)
- ✅ `PlaySoundUseCase` (concrete)

**Rationale:** Use cases represent business logic flows. They:
- Are not swapped at runtime
- Don't vary by platform
- Are tested through integration tests (not mocks)

**Exception:** Create an interface for a use case if:
- It's consumed by multiple presentation layer components
- You need to stub it in tests (rare)

#### ℹ️ NOT NEEDED: Domain Entities

Domain entities should be concrete:

- ✅ `HookRegistry` (concrete)
- ✅ `HookEvent` (concrete)

**Rationale:** Domain entities represent core business concepts and should not depend on abstractions.

#### ℹ️ NOT NEEDED: Presentation Layer

Commands and views are concrete:

- ✅ `InstallHookCommand` (concrete)
- ✅ `UninstallHookCommand` (concrete)
- ✅ `TestSoundCommand` (concrete)
- ✅ `StatusBarView` (concrete)

**Rationale:** Presentation components are UI-specific and framework-bound (VSCode). They:
- Are not reused across different UIs
- Are already abstracted from business logic (via use cases)

## Container Binding Guidelines

### Binding Syntax

```typescript
// WITH interface (infrastructure services/repositories/adapters)
container
  .bind<IHookRepository>(TYPES.IHookRepository)
  .to(ClaudeCodeHookRepository)
  .inSingletonScope();

// WITHOUT interface (use cases, commands, domain entities)
container
  .bind<InstallHookUseCase>(TYPES.InstallHookUseCase)
  .to(InstallHookUseCase)
  .inSingletonScope();
```

### Scope Guidelines

- **Singleton** (`.inSingletonScope()`): For stateful services, repositories, use cases
- **Transient** (default): For stateless commands that are created per invocation

## Layer Dependencies and TYPES Location

### Why src/shared/types.ts?

Previously, TYPES symbols were defined in `src/presentation/composition/types.ts`. This created a dependency direction violation where inner layers (domain, application, infrastructure) depended on the presentation layer.

**The Problem:**
```typescript
// ❌ BAD: Infrastructure depending on Presentation
// src/infrastructure/services/AfplaySoundPlayer.ts
import { TYPES } from '../../presentation/composition/types';  // Upward dependency!
```

**The Solution:**
```typescript
// ✅ GOOD: All layers import from shared
// src/infrastructure/services/AfplaySoundPlayer.ts
import { TYPES } from '../../shared/types';  // Layer-agnostic dependency
```

### Allowed Layer Dependencies

Following Clean Architecture, dependencies flow **inward only**:

```
Presentation → Infrastructure → Application → Domain
     ↓              ↓              ↓            ↓
   Shared  ←──── Shared  ←──── Shared  ←──── Shared
```

| Layer | Can Import From |
|-------|----------------|
| Domain | domain/, shared/ |
| Application | domain/, application/, shared/ |
| Infrastructure | domain/, application/, infrastructure/, shared/ |
| Presentation | domain/, application/, infrastructure/, presentation/, shared/ |

**Violations are caught by `npm run di-check`** and reported as errors.

## Runtime Value Best Practices

### Use container.get() Instead of Closures

When generating dynamic values in the container, resolve dependencies from the container rather than capturing local variables in closures.

**❌ Bad: Using Closures**
```typescript
const configPath = path.join(claudeDir, "config.json");
container.bind<string>(TYPES.ConfigPath).toConstantValue(configPath);

container.bind<string>(TYPES.ScriptContent)
  .toDynamicValue((ctx) => {
    return generator.generate({
      configPath,  // ❌ Closure over local variable
    });
  });
```

**✅ Good: Using container.get()**
```typescript
const configPath = path.join(claudeDir, "config.json");
container.bind<string>(TYPES.ConfigPath).toConstantValue(configPath);

container.bind<string>(TYPES.ScriptContent)
  .toDynamicValue((ctx) => {
    const configPath = ctx.container.get<string>(TYPES.ConfigPath);  // ✅ Resolve from container
    return generator.generate({
      configPath,
    });
  });
```

**Benefits:**
- Single source of truth (container)
- Test rebinding works correctly
- Explicit dependencies visible in container
- No hidden closures over local variables

## Verification

Run the DI verification script to check all architectural rules:

```bash
npm run di-check
```

This script will:
1. ✅ Verify all infrastructure services/repositories/adapters have interfaces
2. ✅ Verify all runtime values are used (via @inject or container.get())
3. ✅ Verify layer dependencies follow Clean Architecture rules
4. ⚠️ Warn about infrastructure helpers without interfaces
5. ℹ️ Note when use cases are concrete (which is OK)
6. 🔍 Find unregistered `@injectable` classes
7. 🔍 Find unused interfaces

## Quick Decision Tree

```
Does this class interact with external systems?
├─ YES → Infrastructure layer
│  ├─ Is it a Repository/Service/Adapter?
│  │  ├─ YES → ✅ MUST have interface
│  │  └─ NO → Is it a Mapper/Generator/Validator?
│  │     ├─ YES → ⚠️ Usually concrete is fine
│  │     └─ NO → Decide case-by-case
│  │
└─ NO → Application/Domain/Presentation layer
   ├─ Is it a Use Case?
   │  └─ Usually concrete (no interface)
   ├─ Is it a Domain Entity?
   │  └─ Always concrete (no interface)
   └─ Is it a Command/View?
      └─ Always concrete (no interface)
```

## Examples

### ✅ Good: Infrastructure Service with Interface

```typescript
// application/ports/ISoundPlayer.ts
export interface ISoundPlayer {
  play(config: SoundConfig): Promise<void>;
}

// infrastructure/services/AfplaySoundPlayer.ts
@injectable()
export class AfplaySoundPlayer implements ISoundPlayer {
  async play(config: SoundConfig): Promise<void> {
    // macOS-specific implementation
  }
}

// container.ts
container
  .bind<ISoundPlayer>(TYPES.ISoundPlayer)
  .to(AfplaySoundPlayer)
  .inSingletonScope();
```

**Why?** This allows for platform-specific implementations (WmicSoundPlayer for Windows, etc.)

### ✅ Good: Use Case without Interface

```typescript
// application/usecases/InstallHookUseCase.ts
@injectable()
export class InstallHookUseCase {
  constructor(
    @inject(TYPES.IHookRepository) private hookRepository: IHookRepository,
    @inject(TYPES.IFileSystem) private fileWriter: IFileSystem
  ) {}

  async execute(): Promise<void> {
    // Business logic
  }
}

// container.ts
container
  .bind<InstallHookUseCase>(TYPES.InstallHookUseCase)
  .to(InstallHookUseCase)
  .inSingletonScope();
```

**Why?** Use cases are business logic - they don't need abstraction.

### ⚠️ Acceptable: Infrastructure Helper without Interface

```typescript
// infrastructure/adapters/HookEventMapper.ts
@injectable()
export class HookEventMapper {
  toDTO(event: HookEvent): SettingsHookConfig {
    // Mapping logic
  }
}

// container.ts
container
  .bind<HookEventMapper>(TYPES.HookEventMapper)
  .to(HookEventMapper)
  .inSingletonScope();
```

**Why?** Mappers are simple utilities. Add an interface if you ever need multiple mapping strategies.

### ❌ Bad: Command with Unnecessary Interface

```typescript
// ❌ Don't do this
export interface IInstallHookCommand {
  execute(): Promise<void>;
}

@injectable()
export class InstallHookCommand implements IInstallHookCommand {
  // ...
}
```

**Why not?** Commands are presentation-layer and VSCode-specific. The interface adds no value.

## Checklist for Adding New Classes

Before adding a new injectable class, ask:

1. ☑️ Is this class marked with `@injectable()`?
2. ☑️ Are all dependencies injected via constructor with `@inject()`?
3. ☑️ Is this class registered in `container.ts`?
4. ☑️ Does this class need an interface? (See decision tree above)
5. ☑️ If interface needed, is it defined in the application layer?
6. ☑️ Run `npm run di-check` to verify

## Common Mistakes

### ❌ Binding to Concrete Type Instead of Interface

```typescript
// ❌ Bad
container
  .bind<ClaudeCodeHookRepository>(TYPES.IHookRepository)
  .to(ClaudeCodeHookRepository);

// ✅ Good
container
  .bind<IHookRepository>(TYPES.IHookRepository)
  .to(ClaudeCodeHookRepository);
```

### ❌ Creating Interface Symbols in types.ts

```typescript
// ❌ Bad - unused symbol
export const TYPES = {
  ClaudeCodeHookRepository: Symbol.for('ClaudeCodeHookRepository'),
  IHookRepository: Symbol.for('IHookRepository'),
};

// ✅ Good - only use interface symbol
export const TYPES = {
  IHookRepository: Symbol.for('IHookRepository'),
};
```

### ❌ Forgetting to Register Injectable Class

```typescript
// ❌ Bad - class has @injectable() but not registered
@injectable()
export class NewFeatureUseCase {
  // ...
}

// ✅ Good - registered in container
container
  .bind<NewFeatureUseCase>(TYPES.NewFeatureUseCase)
  .to(NewFeatureUseCase)
  .inSingletonScope();
```

## Testing

When testing, inject mocks for interfaces:

```typescript
// test/mocks/MockHookRepository.ts
export class MockHookRepository implements IHookRepository {
  async registerHook(hook: HookEvent): Promise<void> {
    // Mock implementation
  }
}

// test/usecases/InstallHookUseCase.test.ts
const mockHookRepository = new MockHookRepository();
container.rebind<IHookRepository>(TYPES.IHookRepository).toConstantValue(mockHookRepository);
```

## Further Reading

- [InversifyJS Documentation](https://inversify.io/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
