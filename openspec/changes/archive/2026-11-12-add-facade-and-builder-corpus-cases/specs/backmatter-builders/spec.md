## MODIFIED Requirements

### Requirement: BMB-001 Build a back-matter hash value

The implementation SHALL provide a hash builder that takes a digest value and an algorithm and returns a validated hash
element. The algorithm MAY be given as the named algorithm or as its string form, and SHALL default to SHA-256 when the
caller omits it. The builder SHALL accept each algorithm that the schema accepts, also one that is not a named
algorithm. Input is invalid when the schema rejects the hash element that it gives. Invalid input MUST report a
validation error.

#### Scenario: BMB-001.01 Build a hash with the default algorithm

- **WHEN** the caller builds a hash from a digest value and omits the algorithm
- **THEN** the builder returns a hash element whose algorithm is SHA-256

#### Scenario: BMB-001.02 Build a hash with an explicit algorithm string

- **WHEN** the caller builds a hash and passes the algorithm as a string
- **THEN** the builder accepts the string and returns a hash element with that algorithm

#### Scenario: BMB-001.03 Invalid algorithm reports a validation error

- **WHEN** the caller passes an algorithm string that the schema rejects, for example ` SHA-256` with a leading space
- **THEN** the builder reports a validation error

#### Scenario: BMB-001.04 An algorithm that is not a named algorithm is accepted

- **WHEN** the caller builds a hash and passes the algorithm string `SHA-999`
- **THEN** the builder returns a hash element whose algorithm is `SHA-999`
