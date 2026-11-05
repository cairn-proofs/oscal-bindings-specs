## MODIFIED Requirements

### Requirement: FAC-004 The assessment-period accessor is restricted to Assessment Plan and Assessment Results

The facade SHALL offer an assessment-period accessor for Assessment Plan and Assessment Results documents. The accessor
returns a start date and an end date. A call on any other document type MUST report an access error.

#### Scenario: FAC-004.04 Wrong document type reports an access error

- **WHEN** the caller requests the assessment period of a Catalog document
- **THEN** the accessor reports an access error

## ADDED Requirements

### Requirement: FAC-005 The assessment period of an Assessment Plan aggregates task timing

For an Assessment Plan, the accessor of [FAC-004] SHALL return the earliest start and the latest end of the timing of
each task, including each nested task:

1. An on-date gives one point in time, which is both a start and an end.
2. A within-date-range gives its start and its end.
3. An at-frequency timing gives no calendar date.

When no timing gives a calendar date, the accessor returns an empty start and an empty end.

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
- **THEN** the accessor returns that date as the start and as the end

### Requirement: FAC-006 The assessment period of Assessment Results aggregates result dates

For Assessment Results, the accessor of [FAC-004] SHALL return the earliest start and the latest end of the results.
When no result gives a calendar date, the accessor returns an empty start and an empty end.

#### Scenario: FAC-006.01 Assessment Results period aggregates result dates

- **WHEN** the caller requests the assessment period of an Assessment Results document
- **THEN** the accessor returns the earliest result start and the latest result end
