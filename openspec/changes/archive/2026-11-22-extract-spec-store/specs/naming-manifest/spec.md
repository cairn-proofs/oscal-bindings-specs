# Spec Delta

## REMOVED Requirements

### Requirement: NAM-001 A type is identified by JSON pointers into the complete schema

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-015] instead of [NAM-001].

### Requirement: NAM-009 Each pointer of an entry resolves and belongs to that entry only

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-048] instead of [NAM-009].

### Requirement: NAM-002 The manifest records each canonical type with its name, kind, and kind data

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-016] instead of [NAM-002].

### Requirement: NAM-010 Each kind of manifest entry adds fixed data

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-017] instead of [NAM-010].

### Requirement: NAM-020 A distinguishing property identifies a branch only when an object holds it

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-040] instead of [NAM-020].

### Requirement: NAM-011 The manifest records no field names, enum values, or enum member names

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-018] instead of [NAM-011].

### Requirement: NAM-003 Canonical names are unique PascalCase identifiers

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-019] instead of [NAM-003].

### Requirement: NAM-012 The manifest matches the format version and the OSCAL release of the consumer

**Reason**: A binding follows this rule when it generates types, so it belongs to the generated-models capability.

**Migration**: Cite [GEN-001] instead of [NAM-012].

### Requirement: NAM-021 Each manifest format holds its format version in the member `format`

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-020] instead of [NAM-021].

### Requirement: NAM-004 The store publishes a JSON Schema for each manifest file

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-021] instead of [NAM-004].

### Requirement: NAM-013 The JSON Schemas of the manifest files constrain every string

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-022] instead of [NAM-013].

### Requirement: NAM-022 A consumer checks the format version before the other checks of the manifest

**Reason**: A binding follows this rule when it generates types, so it belongs to the generated-models capability.

**Migration**: Cite [GEN-003] instead of [NAM-022].

### Requirement: NAM-014 A consumer writes a manifest string into code only as a name or an escaped literal

**Reason**: A binding follows this rule when it generates types, so it belongs to the generated-models capability.

**Migration**: Cite [GEN-002] instead of [NAM-014].

### Requirement: NAM-005 The override data is the only hand-edited naming input

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-023] instead of [NAM-005].

### Requirement: NAM-015 Each override resolves and has an effect

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-024] instead of [NAM-015].

### Requirement: NAM-006 The manifest is generated from fixed inputs and is reproducible

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-025] instead of [NAM-006].

### Requirement: NAM-016 The generation checks the manifest of the previous release before use

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-026] instead of [NAM-016].

### Requirement: NAM-007 Published names stay the same in later releases

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-027] instead of [NAM-007].

### Requirement: NAM-017 The generation reports each dropped name

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-028] instead of [NAM-017].

### Requirement: NAM-008 A changed released name needs a breaking version increment

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-029] instead of [NAM-008].

### Requirement: NAM-018 The latest released artifact is the release tag with the highest precedence

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-030] instead of [NAM-018].

### Requirement: NAM-019 The name check fails when it cannot read the release tags

**Reason**: The store runs this rule, so it belongs to the spec-store capability.

**Migration**: Cite [STO-031] instead of [NAM-019].
