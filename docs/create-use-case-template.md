# Use Case Design Template

This template helps you systematically decide all architectural questions before writing a use case following clean architecture principles.

---

## 1. USE CASE IDENTITY

### 1.1 Name
**Question:** What is the use case name?
- **Pattern:** `[Action][Subject]UseCase` (e.g., `InstallHookUseCase`, `CheckHookStatusUseCase`)
- **Answer:** `___________________UseCase`

### 1.2 Purpose
**Question:** What is the single responsibility of this use case? (One sentence)
- **Answer:**

### 1.3 Type
**Question:** Is this a Command or Query?
- [ ] **Command** - Modifies state, returns `void` or simple confirmation
- [ ] **Query** - Read-only, returns data, no side effects

---

## 2. BUSINESS LOGIC & DOMAIN

### 2.1 Domain Entities
**Question:** Which aggregate roots or entities does this use case work with?
- **Examples:** `HooksConfiguration`
- **Answer:**
  - [ ] `___________________` (existing/new)
  - [ ] `___________________` (existing/new)

### 2.2 Value Objects
**Question:** Which value objects are involved?
- **Examples:** `HookCommand`, `HookGroup`
- **Answer:**
  - [ ] `___________________` (existing/new)
  - [ ] `___________________` (existing/new)

### 2.3 Business Rules
**Question:** What are the key business rules enforced?
- **Where enforced:** Should be in domain entities/value objects, not use case
- **Answer:**
  1.
  2.
  3.

### 2.4 Domain Logic Location
**Question:** Where does the business logic live?
- [ ] **Entities** - Logic delegated to entity methods (preferred)
- [ ] **Value Objects** - Logic in value object methods
- [ ] **Use Case** - Only orchestration, no business rules

**Specific entity/VO methods called:**
- `entity.method1()`
- `entity.method2()`

---

## 3. DEPENDENCIES

### 3.1 Repository Ports
**Question:** Which repositories are needed?
- **Pattern:** `I[Domain]Repository`
- **Answer:**
  - [ ] `IHookRepository` (existing)
  - [ ] `___________________` (new - requires interface + implementation)

### 3.2 Service Ports
**Question:** Which infrastructure services are needed?
- **Examples:** `IFileSystem`, `IConfigProvider`
- **Answer:**
  - [ ] `___________________` (existing)
  - [ ] `___________________` (new - requires interface + implementation)

### 3.3 Application Services
**Question:** Which application-layer services are needed?
- **Examples:** `SupportedHooksRegistry`
- **Note:** These are concrete classes, not ports
- **Answer:**
  - [ ] `___________________` (existing)
  - [ ] `___________________` (new - requires service class)

### 3.4 Runtime Values
**Question:** Are runtime constants needed?
- **Examples:** Script paths, script content, workspace paths
- **Pattern:** Computed in DI container, injected as primitives
- **Answer:**
  - [ ] `scriptPath: string` - Description: ___________________
  - [ ] `___________________: ___________________` - Description: ___________________

### 3.5 Dependency Summary
**Complete constructor signature:**
```typescript
constructor(
  @inject(TYPES.___) private readonly ___: ___,
  @inject(TYPES.___) private readonly ___: ___,
) {}
```

---

## 4. INPUT & OUTPUT

### 4.1 Execute Method Parameters
**Question:** What parameters does `execute()` accept?
- [ ] **No parameters** - `execute(): Promise<ReturnType>`
- [ ] **Simple parameters** - `execute(param1: Type1, param2: Type2): Promise<ReturnType>`
- [ ] **Parameter object** - `execute(params: ParamsInterface): Promise<ReturnType>`

**Parameter details:**
```typescript
execute(
  ___: ___,
  ___: ___,
): Promise<___>
```

### 4.2 Return Type
**Question:** What does the use case return?

**For Commands:**
- [ ] `Promise<void>` - No return value needed
- [ ] `Promise<boolean>` - Success indicator
- [ ] `Promise<Entity>` - Returns created/modified entity

**For Queries:**
- [ ] `Promise<Entity>` - Returns domain entity
- [ ] `Promise<CustomInterface>` - Returns data structure
- [ ] `Promise<Entity | null>` - May not exist

**Custom return interface (if needed):**
```typescript
export interface ___Result {
  ___: ___;
  ___: ___;
}
```

---

## 5. ERROR HANDLING

### 5.1 Domain Errors
**Question:** What domain validation errors can occur?
- **Pattern:** Thrown by entities/value objects during construction
- **Examples:** `HookValidationError`
- **Answer:**
  - [ ] `___________________` (existing)
  - [ ] `___________________` (new - create in `src/domain/errors/`)

### 5.2 Application Errors
**Question:** What application-level errors can occur?
- **Pattern:** Use case wraps lower-level errors
- **Examples:** `HookInstallationError`, `HookRepositoryError`
- **Answer:**
  - [ ] `___________________` (existing)
  - [ ] `___________________` (new - create in `src/application/errors/`)

### 5.3 Error Handling Strategy
**Question:** How should errors be handled?

- [ ] **No try-catch** - Let errors propagate (simple queries)
- [ ] **Wrap errors** - Convert infrastructure/domain errors to use-case errors
- [ ] **Conditional wrapping** - Re-throw use-case errors, wrap others

**Error handling pattern:**
```typescript
try {
  // Business logic
} catch (error) {
  if (error instanceof ___Error) {
    throw error; // Already correct type
  }
  if (error instanceof ___Error) {
    throw new ___Error(`Context: ${error.message}`, error);
  }
  throw new ___Error('Generic message', error as Error);
}
```

---

## 6. VALIDATION

### 6.1 Input Validation
**Question:** Where is input validation performed?

- [ ] **Domain layer** - Value objects validate in constructor (preferred)
- [ ] **Use case** - Simple null/undefined checks before calling domain
- [ ] **Both** - Use case checks preconditions, domain enforces invariants

**Validation details:**
```typescript
// Use case validates:
if (!param) {
  throw new ___Error('___');
}

// Domain validates:
// (in entity/VO constructor)
```

### 6.2 Business Rule Validation
**Question:** Which entity/value object enforces business rules?
- **Answer:** `___________________.validate()` (private method in domain object)

---

## 7. PERSISTENCE & SIDE EFFECTS

### 7.1 Read Operations
**Question:** What data needs to be loaded?

```typescript
const entity = await this.___Repository.load();
// Handle null case:
// - Return null if not found?
// - Create empty aggregate?
// - Throw error?
```

**Null handling strategy:**
- [ ] Return null to caller
- [ ] Create empty aggregate: `Entity.empty()`
- [ ] Throw not found error

### 7.2 Write Operations
**Question:** What needs to be persisted?

```typescript
await this.___Repository.save(entity);
// OR
await this.___Repository.delete(entity);
```

**Transaction considerations:**
- [ ] Single save operation
- [ ] Multiple saves (need transaction?)
- [ ] No persistence (query only)

### 7.3 Other Side Effects
**Question:** Are there non-persistence side effects?
- [ ] File system operations (via `IFileSystem`)
- [ ] External API calls
- [ ] Event notifications

**Details:**
-

---

## 8. EXECUTION FLOW

### 8.1 Step-by-step Logic
**Question:** What is the exact execution flow?

```typescript
async execute(___): Promise<___> {
  // Step 1: Validate inputs (if needed)

  // Step 2: Load domain objects

  // Step 3: Execute business logic (delegate to domain)

  // Step 4: Persist changes

  // Step 5: Return result (if any)
}
```

**Detailed flow:**
1.
2.
3.
4.
5.

---

## 9. DEPENDENCY INJECTION SETUP

### 9.1 Type Symbols
**Question:** What TYPES symbols need to be added to `src/shared/types.ts`?

```typescript
export const TYPES = {
  // Use Case
  ___UseCase: Symbol.for('___UseCase'),

  // New Ports (if any)
  I___: Symbol.for('I___'),

  // New Services (if any)
  ___: Symbol.for('___'),

  // Runtime Values (if any)
  ___: Symbol.for('___'),
};
```

### 9.2 Container Bindings
**Question:** What bindings are needed in `src/presentation/composition/container.ts`?

```typescript
// Use Case
container
  .bind<___UseCase>(TYPES.___UseCase)
  .to(___UseCase)
  .inSingletonScope();

// Port Implementation (if new)
container
  .bind<I___>(TYPES.I___)
  .to(___Implementation)
  .inSingletonScope();

// Runtime Value (if new)
container
  .bind<string>(TYPES.___)
  .toConstantValue(container.get(/* compute value */));
```

### 9.3 Where is the Use Case Invoked?
**Question:** Where will this use case be called from?
- [ ] VSCode command handler
- [ ] Status bar view
- [ ] Another use case (orchestration)
- [ ] Event listener

**Invocation code:**
```typescript
const useCase = container.get<___UseCase>(TYPES.___UseCase);
const result = await useCase.execute(___);
```

---

## 10. TESTING CONSIDERATIONS

### 10.1 Test Scenarios
**Question:** What are the key test cases?

**Happy path:**
1.

**Error cases:**
1.
2.

**Edge cases:**
1.

### 10.2 Mock Dependencies
**Question:** Which dependencies need to be mocked?
- [ ] `___Repository` - Mock with `jest.fn()`
- [ ] `___Service` - Mock with `jest.fn()`

---

## 11. ARCHITECTURAL COMPLIANCE

### 11.1 Dependency Rule Check
**Question:** Does this use case violate dependency rules?

- [ ] ✅ Use case (application) depends on domain (entities/VOs)
- [ ] ✅ Use case depends on ports (interfaces), not implementations
- [ ] ✅ No dependency on presentation layer
- [ ] ✅ No dependency on infrastructure implementations

**Run:** `npm run di-check` after implementation

### 11.2 Single Responsibility Check
**Question:** Does this use case do exactly one thing?
- [ ] ✅ Yes - has single, clear responsibility
- [ ] ❌ No - should be split into: `___UseCase` and `___UseCase`

---

## 12. DOCUMENTATION

### 12.1 Class Documentation
**Question:** What should the JSDoc comment say?

```typescript
/**
 * Use case: ___
 *
 * [Additional context if needed]
 */
@injectable()
export class ___UseCase {
```

### 12.2 Technical User Story
**Question:** Should this be documented in `docs/TECHNICAL_USER_STORIES.md`?
- [ ] Yes - complex feature requiring explanation
- [ ] No - straightforward implementation

---

## IMPLEMENTATION ROADMAP: Question Dependencies

This section shows **which questions must be answered** before you can start implementing each application layer component.

### When Can I Start Coding?

```
┌─────────────────────────────────────────────────────────────────┐
│  Component          │  Minimum Questions Required                │
├─────────────────────────────────────────────────────────────────┤
│  Errors             │  1.1, 5.2                                  │
│  Ports              │  2.1-2.2, 4.1-4.2                          │
│  Services           │  2.2, 3.3                                  │
│  Use Cases          │  1-9 (nearly all questions)                │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Breakdown

#### 1️⃣ Application Errors (`src/application/errors/`)

**Can implement after answering:**
- ✅ **1.1 Name** - To derive error class name (e.g., `InstallHook` → `HookInstallationError`)
- ✅ **5.2 Application Errors** - Identifies which errors are needed

**Dependencies:** None (only extends native `Error`)

**Implementation template:**
```typescript
export class [UseCaseName]Error extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = '[UseCaseName]Error';
    Object.setPrototypeOf(this, [UseCaseName]Error.prototype);
  }
}
```

**Example:** After deciding to create `InstallHookUseCase` and identifying that installation can fail, you can immediately create `HookInstallationError.ts`.

---

#### 2️⃣ Port Interfaces (`src/application/ports/`)

**Can implement after answering:**
- ✅ **2.1 Domain Entities** - Ports may reference entities (e.g., `HooksConfiguration`)
- ✅ **2.2 Value Objects** - Ports may reference VOs
- ✅ **4.1 Execute Method Parameters** - Defines what data port methods need
- ✅ **4.2 Return Type** - Defines what data port methods return

**Dependencies:** Domain entities and value objects (must exist first)

**Implementation template:**
```typescript
import { DomainEntity } from '../../domain/entities/DomainEntity';
import { ValueObject } from '../../domain/valueObjects/ValueObject';

export interface I[Domain]Repository {
  load(): Promise<DomainEntity | null>;
  save(entity: DomainEntity): Promise<void>;
}

export interface I[Service] {
  perform(vo: ValueObject): Promise<ReturnType>;
}
```

**Example:** After identifying that `InstallHookUseCase` needs to persist `HooksConfiguration` and write files, you know you need `IHookRepository` and `IFileSystem` ports.

---

#### 3️⃣ Application Services (`src/application/services/`)

**Can implement after answering:**
- ✅ **2.2 Value Objects** - Services work with domain VOs for metadata/registry
- ✅ **3.3 Application Services** - Identifies which services are needed

**Dependencies:** Domain value objects (for type references)

**Implementation template:**
```typescript
import { injectable } from 'inversify';
import 'reflect-metadata';
import { ValueObject } from '../../domain/valueObjects/ValueObject';

@injectable()
export class [Service]Registry {
  // Application-level metadata/registry logic
  findBy(criteria: ValueObject): Metadata | null {
    // ...
  }
}
```

**Example:** After identifying that the use case needs to look up supported hook metadata, you can create `SupportedHooksRegistry` that works with `HookEventType` value objects.

---

#### 4️⃣ Use Cases (`src/application/usecases/`)

**Can implement after answering (most questions):**

**Essential (must answer):**
- ✅ **1.1-1.3** - Use case identity (name, purpose, type)
- ✅ **2.1-2.4** - Business logic and domain interactions
- ✅ **3.1-3.5** - All dependencies (ports, services, runtime values)
- ✅ **4.1-4.2** - Input parameters and return type
- ✅ **5.1-5.3** - Error handling strategy
- ✅ **7.1-7.3** - Persistence and side effects
- ✅ **8.1** - Execution flow

**Helpful (should answer):**
- ✅ **6.1-6.2** - Validation approach
- ✅ **9.1-9.3** - DI setup (for correct integration)

**Optional (can defer):**
- ⚠️ **10.1-10.2** - Testing (implement after use case)
- ⚠️ **11.1-11.2** - Validation (verify after implementation)
- ⚠️ **12.1-12.2** - Documentation (write during/after coding)

**Dependencies:** Errors, ports, services, domain entities/VOs (all must exist)

**Implementation template:**
```typescript
import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '../../shared/types';
import { I[Port] } from '../ports/I[Port]';
import { [Error] } from '../errors/[Error]';
import { DomainEntity } from '../../domain/entities/DomainEntity';

/**
 * Use case: [Brief description from 1.2]
 */
@injectable()
export class [Name]UseCase {
  constructor(
    @inject(TYPES.I[Port]) private readonly port: I[Port],
    // ... other dependencies from 3.1-3.4
  ) {}

  async execute(/* params from 4.1 */): Promise</* return from 4.2 */> {
    try {
      // Execution flow from 8.1
      // 1. Validate inputs
      // 2. Load domain objects (7.1)
      // 3. Execute business logic (2.4)
      // 4. Persist changes (7.2)
      // 5. Return result
    } catch (error) {
      // Error handling from 5.3
    }
  }
}
```

**Example:** Only after answering questions 1-9 can you confidently write `InstallHookUseCase` with all its dependencies, error handling, and execution logic.

---

### Progressive Implementation Strategy

You can implement application components **progressively** as you answer questions:

```
Answer Q 1.1, 5.2
    ↓
┌───────────────────┐
│ Create Errors     │ ← Can start immediately
└───────────────────┘
    ↓
Answer Q 2.1-2.2, 4.1-4.2
    ↓
┌───────────────────┐
│ Create Ports      │ ← After domain types are known
└───────────────────┘
    ↓
Answer Q 2.2, 3.3
    ↓
┌───────────────────┐
│ Create Services   │ ← After domain VOs are known
└───────────────────┘
    ↓
Answer Q 1-9 (all essential questions)
    ↓
┌───────────────────┐
│ Create Use Case   │ ← After everything is ready
└───────────────────┘
```

### Quick Reference: Dependency Chain

```
Errors ──────────────────────────────────────┐
  ↑ (no dependencies)                        │
                                             │
Ports ────────────────┐                      │
  ↑ depends on        │                      │
  │                   │                      │
Domain Entities/VOs   │                      │
  │                   │                      │
  └──────────→ Services                      │
                ↑ depends on domain VOs      │
                │                            │
                └──────→ Use Cases ←─────────┘
                         ↑ orchestrates everything
```

**Key Insight:** You can start implementing errors and ports early while still thinking through the complete use case design. The use case itself should be implemented last, after all dependencies are clear.

---

## IMPLEMENTATION CHECKLIST

Once all questions are answered, implement in this order:

1. **Domain Layer** (if new entities/VOs needed)
   - [ ] Create/update entities in `src/domain/entities/`
   - [ ] Create/update value objects in `src/domain/valueObjects/`
   - [ ] Create domain errors in `src/domain/errors/`

2. **Application Layer**
   - [ ] Create port interfaces in `src/application/ports/` (if needed)
   - [ ] Create application services in `src/application/services/` (if needed)
   - [ ] Create application errors in `src/application/errors/` (if needed)
   - [ ] Create the use case in `src/application/usecases/`

3. **Infrastructure Layer** (if new ports created)
   - [ ] Create repository/service implementations in `src/infrastructure/`

4. **Dependency Injection**
   - [ ] Add TYPES symbols to `src/shared/types.ts`
   - [ ] Add bindings to `src/presentation/composition/container.ts`

5. **Presentation Layer**
   - [ ] Add invocation code in appropriate presenter/view/command

6. **Validation**
   - [ ] Run `npm run di-check`
   - [ ] Run `npm run compile`
   - [ ] Run `npm test`

---

## EXAMPLE: Filled Template

For reference, see how `InstallHookUseCase` would fill this template:

<details>
<summary>Click to expand example</summary>

### 1. USE CASE IDENTITY
- **Name:** `InstallHookUseCase`
- **Purpose:** Install the user-prompt-submit hook script and register hook configuration
- **Type:** ✅ Command

### 2. BUSINESS LOGIC & DOMAIN
- **Entities:** `HooksConfiguration` (existing)
- **Value Objects:** `HookGroup`, `HookCommand` (existing)
- **Business Rules:**
  1. Cannot install if script doesn't exist
  2. Configuration must be valid before saving
  3. Hook groups must be properly structured
- **Domain Logic Location:** Entity methods: `config.addHookGroup()`

### 3. DEPENDENCIES
- **Repositories:** `IHookRepository` (existing)
- **Services:** `IFileSystem` (existing)
- **Application Services:** `SupportedHooksRegistry` (existing)
- **Runtime Values:**
  - `scriptPath: string` - Path where hook script will be written
  - `scriptContent: string` - Content of the hook script

### 4. INPUT & OUTPUT
- **Parameters:** None - `execute(): Promise<void>`
- **Return Type:** `Promise<void>` (command)

### 5. ERROR HANDLING
- **Domain Errors:** `HookValidationError` (existing)
- **Application Errors:** `HookInstallationError` (existing)
- **Strategy:** ✅ Wrap errors - Convert repository/file errors to installation errors

### 6. VALIDATION
- **Input:** No parameters to validate
- **Business Rules:** Enforced in `HookGroup` and `HookCommand` constructors

### 7. PERSISTENCE & SIDE EFFECTS
- **Read:** `const config = await this.hookRepository.load() || HooksConfiguration.empty()`
- **Write:**
  - `await this.fileWriter.write(scriptPath, scriptContent)`
  - `await this.hookRepository.save(config)`

### 8. EXECUTION FLOW
1. Load existing configuration or create empty
2. Write hook script to file system
3. Get default hook groups from registry
4. Add hook groups to configuration
5. Save updated configuration

</details>

---

## NOTES

- Review existing use cases for patterns: `src/application/usecases/`
- Consult `docs/DEPENDENCY_INJECTION.md` for DI guidelines
- Use `docs/TECHNICAL_USER_STORIES.md` for complex feature planning
- Run `npm run di-check` to verify architecture compliance
