# document-facade Specification

## Purpose

Defines a uniform accessor over any of the eight OSCAL document types. A caller then reads common fields and the
assessment period without branching on the concrete document type.

## Requirements

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

The facade SHALL offer an assessment-period accessor for Assessment Plan and Assessment Results documents. The accessor
returns a start and an end. A call on any other document type MUST report an access error.

#### Scenario: FAC-004.04 Wrong document type reports an access error

- **WHEN** the caller requests the assessment period of a Catalog document
- **THEN** the accessor reports an access error

### Requirement: FAC-005 The assessment period of an Assessment Plan aggregates task timing

For an Assessment Plan, the accessor of [FAC-004] SHALL return the earliest start and the latest end of the timing of
each task, including each nested task:

1. An on-date gives one datetime, which is both a start and an end.
2. A within-date-range gives its start and its end.
3. An at-frequency timing gives no datetime.

When no timing gives a datetime, the accessor returns an empty start and an empty end.

#### Scenario: FAC-005.01 Assessment Plan period aggregates task timing

- **WHEN** the caller requests the assessment period of an Assessment Plan whose tasks carry on-date and
  within-date-range timing
- **THEN** the accessor returns the earliest start and the latest end across those timings, including nested tasks

#### Scenario: FAC-005.02 No calendar dates returns empty bounds

- **WHEN** an Assessment Plan has only at-frequency timing
- **THEN** the accessor returns an empty start and an empty end

#### Scenario: FAC-005.03 On-date is both start and end

- **WHEN** the caller requests the assessment period of an Assessment Plan with one task, and the task has on-date
  timing
- **THEN** the accessor returns that datetime as the start and as the end

### Requirement: FAC-006 The assessment period of Assessment Results aggregates result dates

For Assessment Results, the accessor of [FAC-004] SHALL return the earliest start and the latest end of the results.
When no result gives a datetime, the accessor returns an empty start and an empty end.

#### Scenario: FAC-006.01 Assessment Results period aggregates result dates

- **WHEN** the caller requests the assessment period of an Assessment Results document
- **THEN** the accessor returns the earliest result start and the latest result end

### Requirement: FAC-007 The bounds of the assessment period are datetime values ordered by instant

Each start and end that [FAC-005] and [FAC-006] return SHALL be empty or a datetime value of the document, as [PRS-008]
keeps it:

1. One value is earlier than another when its instant is earlier. The comparison uses all fraction digits.
2. When two or more values have the earliest or the latest instant, the bound is the first of them in document order.
   In document order, array items keep their order, and each item comes before the items that it holds.

#### Scenario: FAC-007.01 Bounds are ordered by instant across offsets

- **WHEN** an Assessment Plan has two tasks with the on-date timings `2026-03-01T23:00:00-05:00` and
  `2026-03-02T01:00:00Z`
- **THEN** the start is `2026-03-02T01:00:00Z` and the end is `2026-03-01T23:00:00-05:00`

#### Scenario: FAC-007.02 An equal instant gives the first value in document order

- **WHEN** an Assessment Plan has one task with the on-date timing `2026-03-01T12:00:00Z`, and that task holds a
  nested task with the on-date timing `2026-03-01T07:00:00-05:00`
- **THEN** the start and the end are both `2026-03-01T12:00:00Z`

#### Scenario: FAC-007.03 The seventh fraction digit orders the bounds

- **WHEN** Assessment Results has a first result from `2026-03-01T10:00:00.1234568Z` to `2026-03-01T11:00:00Z`, and
  a second result from `2026-03-01T05:00:00.1234567-05:00` to `2026-03-01T06:00:00.0000001-05:00`
- **THEN** the start is `2026-03-01T05:00:00.1234567-05:00` and the end is `2026-03-01T06:00:00.0000001-05:00`
