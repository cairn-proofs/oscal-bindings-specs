## Purpose

Defines how an implementation validates a standalone OSCAL element against a named element type. A caller then validates
a fragment, such as an observation or a back-matter block, without parsing a whole document.

## ADDED Requirements

### Requirement: ELV-001 Validate a standalone element against a named type

The implementation SHALL provide an element-validation operation. It takes an element value and an element-type name, and
returns a result that states whether the element is valid. The result lists the failures when the element is not valid.
Each failure identifies a location and a message. The operation validates the element against the named OSCAL type's
constraints.

#### Scenario: ELV-001.01 Valid element returns a valid result

- **WHEN** the caller validates a well-formed observation element against the observation type
- **THEN** the result reports valid with no failures

#### Scenario: ELV-001.02 Invalid element returns failures

- **WHEN** the caller validates an element that violates the named type's constraints
- **THEN** the result reports invalid and lists each failing location with a message

### Requirement: ELV-002 Element-type names are kebab-case and derived from the type names

The element-type names SHALL be the kebab-case forms of the canonical type names from the model-derivation capability.
For example, the back-matter type has the element-type name `back-matter`. The implementation SHALL provide an operation
that returns the full sorted list of supported element-type names.

#### Scenario: ELV-002.01 Supported types are listed

- **WHEN** the caller requests the supported element types
- **THEN** the operation returns a sorted list of kebab-case names

#### Scenario: ELV-002.02 A canonical type name maps to its kebab-case element type

- **WHEN** a canonical type name is a multi-word PascalCase name
- **THEN** its element-type name is the kebab-case form of that name

### Requirement: ELV-003 An unknown element type is reported, not silently accepted

When the caller names an element type the binding does not recognize, the operation SHALL report the unknown-element-type
error from the error-model capability. It MUST NOT return a valid or invalid result for an unknown type.

#### Scenario: ELV-003.01 Unknown element type is rejected

- **WHEN** the caller validates an element against a type name the binding does not recognize
- **THEN** the operation reports the unknown-element-type error
