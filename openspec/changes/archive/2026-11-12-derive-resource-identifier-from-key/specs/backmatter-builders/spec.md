## MODIFIED Requirements

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

## ADDED Requirements

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
