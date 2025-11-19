# Clean Architecture Test Strategy

> Tests as Feature Documentation: Every test describes what the system can do.

---

## Philosophy

1. **Tests are the source of truth** - Documentation drifts, tests don't (they fail)
2. **BDD style everywhere** - `describe('Feature: X')` makes tests scannable as feature inventory
3. **Layer isolation** - Each layer has its own test strategy and boundaries
4. **Trust the platform** - For UI, test what you control (data), trust the platform for rendering

---

## Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation    │ Commands, Views, Controllers              │
│                 │ Test: Data passed to platform APIs        │
├─────────────────────────────────────────────────────────────┤
│ Application     │ Use Cases, Orchestrators                  │
│                 │ Test: Business workflows, input/output    │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure  │ Repositories, Adapters, External Services │
│                 │ Test: Integration with real externals     │
├─────────────────────────────────────────────────────────────┤
│ Domain          │ Entities, Value Objects, Domain Services  │
│                 │ Test: Business rules, invariants          │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Domain Layer

**What to test:** Pure business rules, invariants, value object validation

**Test characteristics:**
- No mocks needed (pure functions/classes)
- Fast, deterministic
- Focus on edge cases and validation rules

**Pattern:**
```typescript
describe('Feature: Volume Control', () => {
  describe('Volume Value Object', () => {
    it('should accept values between 0 and 100', () => {
      expect(Volume.create(50).value).toBe(50);
    });

    it('should reject values above 100', () => {
      expect(() => Volume.create(101)).toThrow(SoundValidationError);
    });

    it('should convert to decimal for playback', () => {
      expect(Volume.create(50).toDecimal()).toBe(0.5);
    });
  });
});
```

**Coverage goals:**
- All validation rules
- All value object invariants
- Edge cases (boundaries, null, empty)

---

## 2. Application Layer (Use Cases)

**What to test:** Business workflows, orchestration logic, input/output contracts

**Test characteristics:**
- Mock all dependencies (ports/interfaces)
- Test success paths, error paths, edge cases
- Given-When-Then structure

**Pattern:**
```typescript
describe('Feature: Hook Installation', () => {
  describe('InstallHookUseCase', () => {
    // Setup mocks
    let useCase: InstallHookUseCase;
    let mockOrchestrator: MockHookInstallationOrchestrator;
    let mockConfigProvider: MockConfigProvider;

    beforeEach(() => {
      mockOrchestrator = new MockHookInstallationOrchestrator();
      mockConfigProvider = new MockConfigProvider();
      useCase = new InstallHookUseCase(mockOrchestrator, mockConfigProvider);
    });

    describe('Scenario: Successful installation', () => {
      it('should install hooks with current configuration', async () => {
        // Given
        mockConfigProvider.mockSoundConfig(defaultConfig);
        mockOrchestrator.mockInstallSuccess();

        // When
        await useCase.execute();

        // Then
        expect(mockOrchestrator.install).toHaveBeenCalledWith(defaultConfig);
      });
    });

    describe('Scenario: Installation fails', () => {
      it('should throw HookInstallationError when orchestrator fails', async () => {
        // Given
        mockOrchestrator.mockInstallFailure(new Error('Write failed'));

        // When/Then
        await expect(useCase.execute()).rejects.toThrow(HookInstallationError);
      });
    });
  });
});
```

**What to capture in tests:**
- Happy path behavior
- Error handling and mapping
- Side effects (what dependencies are called with)
- Preconditions and postconditions

---

## 3. Infrastructure Layer

**What to test:** Correct integration with external systems

**Test characteristics:**
- Integration tests with real externals (file system, APIs)
- May need setup/teardown (temp directories, test databases)
- Slower than unit tests

**Pattern:**
```typescript
describe('Feature: Hook Persistence', () => {
  describe('ClaudeCodeHookRepository', () => {
    let repository: ClaudeCodeHookRepository;
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDirectory();
      repository = new ClaudeCodeHookRepository(tempDir);
    });

    afterEach(async () => {
      await cleanupTempDirectory(tempDir);
    });

    describe('Scenario: Install hooks to settings.json', () => {
      it('should write hook configuration to file', async () => {
        // Given settings.json exists
        await writeFile(`${tempDir}/settings.json`, '{}');

        // When
        await repository.install('/path/to/script.sh');

        // Then
        const content = await readFile(`${tempDir}/settings.json`);
        expect(JSON.parse(content).hooks).toBeDefined();
      });
    });

    describe('Scenario: Handle missing settings file', () => {
      it('should create settings.json if not exists', async () => {
        // Given no settings.json

        // When
        await repository.install('/path/to/script.sh');

        // Then
        expect(await fileExists(`${tempDir}/settings.json`)).toBe(true);
      });
    });
  });
});
```

**When to use integration vs mocks:**
- Use integration tests for: file I/O, database, external APIs
- Use mocks when: external service is slow, flaky, or has side effects

---

## 4. Presentation Layer

**What to test:** Data passed to platform APIs, command handling logic

**Test characteristics:**
- Mock use cases (test presentation logic, not business logic)
- Verify correct data is passed to platform APIs

**Pattern:**
```typescript
describe('Feature: Status Bar Indicator', () => {
  describe('StatusBarView', () => {
    let view: StatusBarView;
    let mockStatusBarItem: MockStatusBarItem;
    let mockCheckStatusUseCase: MockCheckHookStatusUseCase;

    beforeEach(() => {
      mockStatusBarItem = new MockStatusBarItem();
      mockCheckStatusUseCase = new MockCheckHookStatusUseCase();
      view = new StatusBarView(mockStatusBarItem, mockCheckStatusUseCase);
    });

    describe('Scenario: Hooks are installed', () => {
      it('should display installed status with check icon', async () => {
        // Given
        mockCheckStatusUseCase.mockResult({ isInstalled: true });

        // When
        await view.update();

        // Then
        expect(mockStatusBarItem.text).toBe('$(check) CC Ring');
        expect(mockStatusBarItem.tooltip).toBe('Hooks installed');
      });
    });

    describe('Scenario: Hooks are not installed', () => {
      it('should display warning status', async () => {
        // Given
        mockCheckStatusUseCase.mockResult({ isInstalled: false });

        // When
        await view.update();

        // Then
        expect(mockStatusBarItem.text).toBe('$(warning) CC Ring');
      });
    });
  });
});

describe('Feature: Install Command', () => {
  describe('InstallHookCommand', () => {
    it('should invoke InstallHookUseCase and show success message', async () => {
      // Given
      mockUseCase.mockSuccess();

      // When
      await command.execute();

      // Then
      expect(mockUseCase.execute).toHaveBeenCalled();
      expect(mockWindow.showInformationMessage).toHaveBeenCalledWith('Hooks installed!');
    });
  });
});
```

---

## Test Organization

```
test/
├── unit/
│   ├── domain/           # Pure business logic tests
│   │   └── valueObjects/
│   ├── application/      # Use case tests with mocks
│   │   └── usecases/
│   └── presentation/     # Command & view tests with mocks
│       ├── commands/
│       └── views/
├── integration/
│   └── infrastructure/   # Real external system tests
│       ├── repositories/
│       └── adapters/
└── helpers/
    └── mocks/            # Reusable mock implementations
```

---

## Feature Inventory from Tests

Tests become your feature inventory when you follow this naming:

```typescript
describe('Feature: <Feature Name>', () => {
  describe('<Component/UseCase>', () => {
    describe('Scenario: <Specific Scenario>', () => {
      it('should <expected behavior>', () => {});
    });
  });
});
```

**Extract features with:**
```bash
grep -r "describe('Feature:" test/ | sed "s/.*Feature: //" | sed "s/'.*//"
```

---

## Summary Table

| Layer        | Test Type   | Dependencies | Speed  | Focus                    |
|--------------|-------------|--------------|--------|--------------------------|
| Domain       | Unit        | None         | Fast   | Business rules           |
| Application  | Unit        | Mocked       | Fast   | Workflows, orchestration |
| Infrastructure | Integration | Real       | Medium | External system behavior |
| Presentation | Unit        | Mocked       | Fast   | Data to platform APIs    |
