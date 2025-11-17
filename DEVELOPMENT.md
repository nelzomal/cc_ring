# Development Workflow Guide

**Approach**: Feature Slices (Vertical) + Middle-Out + BDD Testing

## Development Direction

```
    Presentation   ← Step 5: Wire dependencies
         ↑
  Infrastructure   ← Step 4: Implement adapters (mock external systems)
         ↑
   Application     ★ Step 1: START HERE - Write use case test
   (Use Case)
         ↑
      Domain       ← Step 2: Implement business logic (pure, no mocks)
```

---

## The 5-Step Development Cycle

### Step 1: Write Use Case Test (Red ❌)

**File**: `src/application/usecases/__tests__/[Feature]UseCase.spec.ts`

Define the contract:
- What inputs does the use case need?
- What repository interfaces are required?
- What is the expected business outcome?

**Pattern**:
```typescript
describe('FeatureUseCase', () => {
  it('should accomplish business goal', async () => {
    // Given: Mocked dependencies and initial state
    // When: Execute use case
    // Then: Expected outcome and side effects verified
  });
});
```

**Status**: Test fails (dependencies don't exist yet)

---

### Step 2: Implement Domain Logic (Green ✅)

**Files**:
- `src/domain/entities/[Entity].ts` + tests
- `src/domain/valueObjects/[ValueObject].ts` + tests

**What to implement**:
- Core business entities with validation
- Value objects with business rules
- Factory methods for controlled creation
- Domain has ZERO external dependencies

**Domain Test Pattern**:
```typescript
describe('Entity', () => {
  it('should enforce business rule', () => {
    // Given: Invalid input
    // When/Then: Expect validation error
  });

  it('should create valid entity', () => {
    // Given: Valid input
    // When: Create entity
    // Then: Verify state and behavior
  });
});
```

**Status**: Domain tests pass

---

### Step 3: Implement Use Case Logic (Green ✅)

**File**: `src/application/usecases/[Feature]UseCase.ts`

**Responsibilities**:
- Orchestrate workflow (don't implement business logic)
- Define interfaces (IRepository, IService)
- Handle errors and map to DTOs
- Depend only on interfaces, never concrete implementations

**Structure**:
```typescript
class FeatureUseCase {
  constructor(private repo: IRepository) {}

  async execute(input: DTO): Promise<Result> {
    const entity = Entity.create(input);  // Domain logic
    entity.applyBusinessRule();           // Domain logic
    await this.repo.save(entity);         // Interface
    return this.mapToDTO(entity);
  }
}
```

**Status**: Use case test passes (with mocked interfaces)

---

### Step 4: Implement Infrastructure Adapters (Green ✅)

**Files**:
- `src/infrastructure/repositories/[ConcreteRepo].ts` + tests
- `src/infrastructure/adapters/[Mapper].ts`

**What to implement**:
- Repository implementations (filesystem, database, API)
- Service adapters (external APIs, framework integrations)
- Data mappers (Domain ↔ External format)

**Infrastructure Test Pattern**:
```typescript
describe('ConcreteRepository', () => {
  it('should persist entity to external system', async () => {
    // Given: Entity and mock external system
    // When: Save via repository
    // Then: External system updated correctly
  });
});
```

**Mock**: File system, network, framework APIs

**Status**: Infrastructure tests pass

---

### Step 5: Wire Dependencies in Presentation

**File**: `src/presentation/composition/DependencyContainer.ts`

```typescript
class DependencyContainer {
  createFeatureUseCase(): FeatureUseCase {
    const repo = new ConcreteRepository(fileSystem);
    return new FeatureUseCase(repo);
  }
}
```

**Command/Controller**:
```typescript
class FeatureCommand {
  execute() {
    const useCase = container.createFeatureUseCase();
    const result = await useCase.execute(userInput);
    view.display(result);
  }
}
```

**Status**: All tests pass (feature complete ✅)

---

## Layer Testing Strategy

| Layer | What to Test | Mocking | Focus |
|-------|--------------|---------|-------|
| **Use Case** | Workflow orchestration | Mock all interfaces | Correct calls, error handling, DTO mapping |
| **Domain** | Business rules | NO mocks (pure logic) | Validation, invariants, state transitions |
| **Infrastructure** | External adapters | Mock external systems | Data transformation, integration |
| **Value Objects** | Immutable values | NO mocks | Validation boundaries, conversions |

---

## BDD Test Structure

### Given-When-Then Pattern

```typescript
describe('[Component]', () => {
  describe('[feature context]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Given: [preconditions and setup]

      // When: [action being tested]

      // Then: [expected outcome]
      // And: [additional assertions]
    });
  });
});
```

### Test Naming
- Use complete sentences describing behavior
- Test the "what", not the "how"
- Make tests readable by non-developers
- One business concept per test (multiple expects OK)

---

## Decision Framework

| Scenario | Direction | Start Layer | Reason |
|----------|-----------|-------------|---------|
| Clear business rules | Inner-First | Domain | Rules are well-understood |
| Unclear requirements | Outer-First | Presentation | Need UI exploration |
| Standard CRUD/workflow | **Middle-Out** | **Use Case** | **Balanced approach** |
| New integration | Middle-Out | Interface | Contract drives design |
| Extending existing | Inner-First | Domain | Pattern established |

**Default**: **Middle-Out** - Best balance of structure and flexibility

---

## Quick Reference

### Feature Development Checklist

1. ✅ Write use case test (define contract)
2. ✅ Identify domain needs (entities, rules)
3. ✅ Write domain tests (enforce invariants)
4. ✅ Implement domain (pure business logic)
5. ✅ Implement use case (orchestrate)
6. ✅ Define interfaces (dependencies)
7. ✅ Write infrastructure tests (mock external)
8. ✅ Implement adapters (connect external)
9. ✅ Wire presentation (dependency injection)
10. ✅ All tests pass (feature complete)

### Red-Green-Refactor Cycle

```
Write Test (Red ❌) → Implement (Green ✅) → Refactor (Clean 🧹) → Repeat
```

### Common Pitfalls

| ❌ Don't | ✅ Do |
|---------|------|
| Code without tests | Write use case test first |
| Business logic in use cases | Keep use cases thin, logic in domain |
| Depend on concrete classes | Depend only on interfaces |
| Mock domain in tests | Create real domain objects (pure) |
| Test implementation details | Test behavior and outcomes |

---

## Example: Save User Preferences Feature

```
1. Use Case Test (Red ❌)
   it('should save preferences') → Test fails

2. Domain (Green ✅)
   class UserPreferences + validation → Domain tests pass

3. Use Case (Green ✅)
   execute(input) → create entity → repo.save() → Use case test passes

4. Infrastructure (Green ✅)
   FilePrefsRepo → fs.writeFile() → Infrastructure test passes

5. Presentation (Wire ✅)
   DI container → new UseCase(repo) → All tests pass
```

---

## Key Principles

1. **Test-First**: Write tests before implementation
2. **Middle-Out**: Start from use case, work both directions
3. **Pure Domain**: No external dependencies in domain layer
4. **Interface-Driven**: Use cases depend on interfaces only
5. **BDD Style**: Given-When-Then for all tests
6. **One Slice**: Complete one feature vertically before next
7. **Fast Feedback**: Use case test tells you when done

---

## Benefits

✅ **Fast feedback** - Use case test drives completion
✅ **Clear contracts** - Interfaces defined upfront
✅ **Independent testing** - Each layer tested separately
✅ **Flexible** - Easy to swap implementations
✅ **Maintainable** - Changes isolated by layer
✅ **Living documentation** - Tests describe behavior
✅ **Safe refactoring** - Test coverage provides confidence

---

## Resources

- `ARCHITECTURE.md` - Layer structure and dependency rules
- `DOMAIN.md` - Domain modeling patterns
- Clean Architecture (Robert C. Martin)
- Growing Object-Oriented Software, Guided by Tests (Freeman & Pryce)
