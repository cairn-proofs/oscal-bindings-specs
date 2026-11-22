# Spec Delta

## MODIFIED Requirements

### Requirement: VER-002 A binding is generated from exactly one active OSCAL release

Each binding set SHALL be generated from exactly one vendored OSCAL release at a time. An explicit identifier selects
the active release, not a scan or a "newest wins" rule. The binding MUST record the exact release it was generated from.
This makes the strict-coverage boundary visible to a consumer: a binding supports the vendored release and earlier.

#### Scenario: VER-002.01 Active release is explicit

- **WHEN** more than one OSCAL release is vendored
- **THEN** the active release is the one named by the explicit identifier, not the newest directory present

#### Scenario: VER-002.02 Recorded release is discoverable

- **WHEN** a consumer inspects a binding
- **THEN** the exact OSCAL release the binding was generated from is readable

## REMOVED Requirements

### Requirement: VER-003 The shared spec artifact uses Semantic Versioning for its own compatibility

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-001] instead of [VER-003].

### Requirement: VER-004 The OSCAL release is recorded as Semantic Versioning build metadata

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-002] instead of [VER-004].

### Requirement: VER-006 Dependencies run from bindings to the store, never back

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-003] instead of [VER-006].

### Requirement: VER-008 The version is the latest release or one step above it

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-004] instead of [VER-008].
