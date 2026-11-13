# backmatter-builders Specification

## Purpose

Defines constructor helpers for OSCAL back-matter `hash`, `rlink`, and `resource` values. A caller then builds valid
back-matter elements without filling in idiomatic defaults or restating property keys by hand. A resource can occur in more than one document. A key gives each copy of the resource the same
identifier ([Back-matter resource keys](../../../docs/back-matter-keys.md)).

## Requirements

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

The implementation SHALL provide a resource builder for inclusion in a back-matter resource list. It
accepts an optional title, description, list of rlinks, identifier, key, and list of document
identifiers, and returns a validated resource. When the caller omits the identifier and the key, the
builder SHALL generate a fresh unique identifier. Omitted optional inputs MUST be absent from the
result. An empty list or an invalid item where a list is given MUST report a validation error.

#### Scenario: BMB-003.01 Resource gets a generated identifier when none is given

- **WHEN** the caller builds a resource without an identifier or a key
- **THEN** the builder generates a fresh unique identifier for the resource

#### Scenario: BMB-003.02 Omitted optional inputs are absent

- **WHEN** the caller builds a resource and omits the document identifiers
- **THEN** the resource does not carry a document-identifiers field

#### Scenario: BMB-003.03 Invalid list item reports a validation error

- **WHEN** the caller supplies a document-identifiers list containing an item that is not a valid
  document identifier
- **THEN** the builder reports a validation error

### Requirement: BMB-004 A key gives the resource identifier

When the caller gives the key of [BMB-003] and omits the identifier, the resource builder SHALL set
the identifier to a UUID version 5. The UUID follows RFC 9562, Section 5.5, with these inputs:

1. The namespace `3942257f-e1cf-5e06-9c6f-eeb97ecabe77`.
2. The name, which is the UTF-8 bytes of the key.

The identifier thus depends only on the key. An empty key, or a key with an identifier, MUST report
a validation error.

#### Scenario: BMB-004.01 A key gives the derived identifier

- **WHEN** the caller builds a resource with the key `https://example.org/policies/access-control`
  and no identifier
- **THEN** the identifier of the resource is `51beb3e9-30bb-535f-ba49-e68d4661aaa9`

#### Scenario: BMB-004.02 The other inputs do not change the identifier

- **WHEN** the caller builds two resources with the same key and no identifier, and the two
  resources have different titles
- **THEN** the two resources have the same identifier

#### Scenario: BMB-004.03 The name is the UTF-8 bytes of the key

- **WHEN** the caller builds a resource with the key `https://example.org/policies/données` and no
  identifier
- **THEN** the identifier of the resource is `daa01937-2576-5dc8-9fb0-4da240946a5e`

#### Scenario: BMB-004.04 A key with an identifier reports a validation error

- **WHEN** the caller builds a resource with a key and an identifier
- **THEN** the builder reports a validation error

#### Scenario: BMB-004.05 An empty key reports a validation error

- **WHEN** the caller builds a resource with an empty key
- **THEN** the builder reports a validation error
