## MODIFIED Requirements

### Requirement: PRS-005 Input uses OSCAL property keys, not internal field names

OSCAL input SHALL use the OSCAL property keys, for example `media-type` and `document-ids`. A key that matches an
implementation's internal field name, but not the OSCAL property key, MUST be rejected as an unknown field. This holds
in every input mode and at every depth.

#### Scenario: PRS-005.01 OSCAL property key is accepted

- **WHEN** the document uses the OSCAL key `media-type`
- **THEN** parsing accepts it

#### Scenario: PRS-005.02 Internal field name key is rejected

- **WHEN** the document uses an internal field name in place of the OSCAL property key
- **THEN** parsing reports a parse error and does not populate the field
