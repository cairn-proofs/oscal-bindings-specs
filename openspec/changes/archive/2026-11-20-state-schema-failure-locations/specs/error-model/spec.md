# Spec Delta

## MODIFIED Requirements

### Requirement: ERR-003 Parse errors expose structured validation detail

A parse error for a document that does not conform to the schema, or does not meet the constraint manifest of
[CNS-017], SHALL carry a structured list of the individual validation failures, each identifying the failing location.
This lets a caller present each failure, except as [PRS-012] permits, rather than only the first. The container shape
is language-specific, but the per-failure location MUST be present. [PRS-015] and [PRS-022] state when several
failures identify the same location.

#### Scenario: ERR-003.01 Multiple failures are all exposed

- **WHEN** a document fails schema validation with several faults, and the parse error identifies no limit
- **THEN** the parse error exposes one structured entry for each fault
