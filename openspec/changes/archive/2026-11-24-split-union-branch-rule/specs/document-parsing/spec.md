# Spec Delta

## ADDED Requirements

### Requirement: PRS-024 An object without an optional distinguishing property conforms to each branch

An object of a nested union conforms to a branch when it meets the schema of that branch. When each branch defines its
distinguishing property as optional, an object that holds none of them conforms to each branch ([STO-040]). Parsing
SHALL accept such an object when it meets the other rules of the schema, and SHALL NOT select a branch for it
([PRS-014]).

#### Scenario: PRS-024.01 Group without a distinguishing property

- **WHEN** each branch of the catalog group union defines its distinguishing property as optional, and a group object
  holds `title` and neither `groups` nor `controls`
- **THEN** the object conforms to both `CatalogGroupWithGroups` and `CatalogGroupWithControls`, and parsing reports no
  failure for it
