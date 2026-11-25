# generated-models Specification

## Purpose
Defines what a binding does when it generates types from the naming manifest. A consumer is a program that reads the
manifest, for example the code generator of a binding.

## Requirements

### Requirement: GEN-001 The manifest matches the format version and the OSCAL release of the consumer

The manifest SHALL also meet these rules to be valid under [STO-019]:

1. The format version is a version that the consumer supports.
2. The OSCAL release is the release of the schema that the consumer uses.

#### Scenario: GEN-001.01 Unknown format version is rejected

- **WHEN** a consumer reads a manifest whose format version it does not support
- **THEN** the consumer rejects the manifest

#### Scenario: GEN-001.02 Manifest of another OSCAL release is rejected

- **WHEN** a consumer uses the complete schema of OSCAL 1.2.3 and reads a manifest that describes another OSCAL
  release
- **THEN** the consumer rejects the manifest

### Requirement: GEN-002 A consumer writes a manifest string into code only as a name or an escaped literal

A consumer MUST write a string from the manifest into generated code only as a name that matches [STO-019] or as an
escaped string literal.

#### Scenario: GEN-002.01 Body field is written as an escaped literal

- **WHEN** a consumer writes the body field `system-security-plan` into generated code as a string
- **THEN** the generated code holds the value as an escaped string literal

### Requirement: GEN-003 A consumer checks the format version before the other checks of the manifest

A consumer MUST read `format` before it checks the manifest against a JSON Schema of [STO-021]. When the consumer does
not support the value, it MUST reject the manifest and state that the format version is not supported. A consumer MUST
apply the other checks of [STO-019], [STO-021], [GEN-001], and [STO-022] only to a manifest whose format version it
supports.

#### Scenario: GEN-003.01 Consumer states the unsupported format version

- **WHEN** a consumer supports only format 1, and it reads a manifest that holds `format` 2
- **THEN** the consumer rejects the manifest and states that format 2 is not supported

#### Scenario: GEN-003.02 Format version is the first check

- **WHEN** a consumer supports only format 1, and it reads a manifest that holds `format` 2 and an unknown member
- **THEN** the consumer states that format 2 is not supported, and it reports no JSON Schema failure
