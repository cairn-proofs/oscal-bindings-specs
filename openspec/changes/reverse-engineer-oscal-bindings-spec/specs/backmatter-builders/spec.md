## Purpose

Defines constructor helpers for OSCAL back-matter `hash`, `rlink`, and `resource` values. A caller then builds valid
back-matter elements without filling in idiomatic defaults or restating property keys by hand.

## ADDED Requirements

### Requirement: BMB-001 Build a back-matter hash value

The implementation SHALL provide a hash builder that takes a digest value and an algorithm and returns a validated hash
element. The algorithm MAY be given as the named algorithm or as its string form, and SHALL default to SHA-256 when the
caller omits it. Invalid input MUST report a validation error.

#### Scenario: BMB-001.01 Build a hash with the default algorithm

- **WHEN** the caller builds a hash from a digest value and omits the algorithm
- **THEN** the builder returns a hash element whose algorithm is SHA-256

#### Scenario: BMB-001.02 Build a hash with an explicit algorithm string

- **WHEN** the caller builds a hash and passes the algorithm as a string
- **THEN** the builder accepts the string and returns a hash element with that algorithm

#### Scenario: BMB-001.03 Invalid algorithm reports a validation error

- **WHEN** the caller passes an algorithm value that OSCAL does not define
- **THEN** the builder reports a validation error

### Requirement: BMB-002 Build a back-matter rlink value

The implementation SHALL provide an rlink builder. It takes a target reference, and optionally a media type and a list
of hashes, and returns a validated rlink element. Omitted optional inputs MUST be absent from the result rather than
present as null.

#### Scenario: BMB-002.01 Build an rlink with only a reference

- **WHEN** the caller builds an rlink from a target reference and omits the optional inputs
- **THEN** the builder returns an rlink with the reference set and no media type or hashes present

#### Scenario: BMB-002.02 Build an rlink with media type and hashes

- **WHEN** the caller builds an rlink and supplies a media type and a list of hashes
- **THEN** the builder returns an rlink carrying all three

### Requirement: BMB-003 Build a back-matter resource value

The implementation SHALL provide a resource builder for inclusion in a back-matter resource list. It accepts an optional
title, description, list of rlinks, identifier, and list of document identifiers, and returns a validated resource. When
the caller omits the identifier, the builder SHALL generate a fresh unique identifier. Omitted optional inputs MUST be
absent from the result. An empty list or an invalid item where a list is given MUST report a validation error.

#### Scenario: BMB-003.01 Resource gets a generated identifier when none is given

- **WHEN** the caller builds a resource without an identifier
- **THEN** the builder generates a fresh unique identifier for the resource

#### Scenario: BMB-003.02 Omitted optional inputs are absent

- **WHEN** the caller builds a resource and omits the document identifiers
- **THEN** the resource does not carry a document-identifiers field

#### Scenario: BMB-003.03 Invalid list item reports a validation error

- **WHEN** the caller supplies a document-identifiers list containing an item that is not a valid document identifier
- **THEN** the builder reports a validation error
