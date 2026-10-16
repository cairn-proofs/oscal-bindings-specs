## Purpose

Defines a uniform accessor over any of the eight OSCAL document types. A caller then reads common fields and the
assessment period without branching on the concrete document type.

## ADDED Requirements

### Requirement: FAC-001 A uniform facade wraps any document type

The implementation SHALL provide a facade that wraps any of the eight document wrappers, or the top-level document
value. The facade exposes uniform access to the wrapper, the body, the metadata block, the OSCAL version, and the
body-level unique identifier. The facade MUST reject a value that is not an OSCAL document wrapper.

#### Scenario: FAC-001.01 Facade wraps a parsed document

- **WHEN** the caller wraps a parsed Catalog document in the facade
- **THEN** the facade exposes the wrapper and the Catalog body

#### Scenario: FAC-001.02 Non-document value is rejected

- **WHEN** the caller passes an unrelated value to the facade
- **THEN** the facade reports a type error and does not wrap the value

### Requirement: FAC-002 The facade reads common fields without type branching

Every OSCAL top-level document carries a metadata block, an OSCAL version in that metadata, and a body-level unique
identifier. The path from the wrapper to the body differs by document type. The facade SHALL expose these fields through
a single uniform shape, so the caller does not branch on the document type. For a validly parsed document, these
accessors MUST NOT fail.

#### Scenario: FAC-002.01 Metadata is read uniformly

- **WHEN** the caller reads the metadata through the facade on any document type
- **THEN** the facade returns that document's metadata block

#### Scenario: FAC-002.02 Identifier and version are read uniformly

- **WHEN** the caller reads the body identifier and the OSCAL version through the facade
- **THEN** the facade returns the body-level identifier and the metadata OSCAL version for any document type

### Requirement: FAC-003 The facade can be built from text, bytes, or a file

The facade SHALL offer construction from an OSCAL document given as text, as raw bytes, or as a file path. Construction
reuses the parsing capability and its error behavior.

#### Scenario: FAC-003.01 Build the facade from bytes

- **WHEN** the caller builds the facade from raw OSCAL bytes
- **THEN** the facade wraps the parsed document

#### Scenario: FAC-003.02 Build the facade from a file

- **WHEN** the caller builds the facade from a file path
- **THEN** the facade wraps the parsed document and surfaces the parsing capability's not-found behavior for a missing
  path

### Requirement: FAC-004 The assessment-period accessor is restricted to Assessment Plan and Assessment Results

The facade SHALL offer an assessment-period accessor that returns a start date and an end date, defined only for
Assessment Plan and Assessment Results documents. Calling it on any other document type MUST report an access error. The
accessor returns an empty start and empty end when the document carries no calendar dates.

For an Assessment Plan, the accessor aggregates the task timing, including nested tasks:

1. An on-date contributes a single point in time to both the start and the end.
2. A within-date-range contributes its start and its end.
3. An at-frequency timing contributes no calendar date.

For Assessment Results, the accessor aggregates each result's start and end. When several date sources are present, the
earliest start and the latest end win.

#### Scenario: FAC-004.01 Assessment Plan period aggregates task timing

- **WHEN** the caller requests the assessment period of an Assessment Plan whose tasks carry on-date and
  within-date-range timing
- **THEN** the accessor returns the earliest start and the latest end across those timings, including nested tasks

#### Scenario: FAC-004.02 Assessment Results period aggregates result dates

- **WHEN** the caller requests the assessment period of an Assessment Results document
- **THEN** the accessor returns the earliest result start and the latest result end

#### Scenario: FAC-004.03 No calendar dates returns empty bounds

- **WHEN** an Assessment Plan has only at-frequency timing
- **THEN** the accessor returns an empty start and an empty end

#### Scenario: FAC-004.04 Wrong document type reports an access error

- **WHEN** the caller requests the assessment period of a Catalog document
- **THEN** the accessor reports an access error
