# Back-matter resource keys

This document gives guidance for the key of the resource builder in `backmatter-builders`. It has
no normative rules. [BMB-004] states the rule that derives the identifier from a key.

## The purpose of a key

A resource can occur in more than one document. For example, each SSP of an organization can cite
the same reference. The `uuid` of each copy of the resource must be the same, so that the
references to the resource agree across the documents.

A caller gives the builder a key that names the resource. The builder derives the `uuid` from the
key. Each binding and each tool that follows the contract then gives the same `uuid` for the same
key.

## The namespace

The derivation uses a UUID version 5 (RFC 9562, Section 5.5). The namespace of the UUID is
`3942257f-e1cf-5e06-9c6f-eeb97ecabe77`. It is the UUID version 5 of this URL:

`https://oscalregistry.org/ns/oscal/back-matter-resource`

The namespace for the URL is the URL namespace of RFC 9562, `6ba7b811-9dad-11d1-80b4-00c04fd430c8`.
[BMB-004] states the namespace UUID. A binding does not derive it again. The URL is only the record
of its source.

The URL has these parts:

1. `oscal`: the standard.
2. `back-matter-resource`: the kind of object. A key then cannot give the same identifier to a
   resource and to an object of another kind.
3. No version. A version of OSCAL in the URL would give two identifiers to one resource in two
   versions of OSCAL. The identifier of a resource must not change.

The site `oscalregistry.org` is not a NIST site. The namespace is not a NIST namespace.

## The choice of a key

The contract does not restrict the form of a key. Use these guidelines:

1. A key names the subject, not one copy or one revision of it. Examples are a URL of the subject,
   the number of a published standard, and an identifier that the organization assigns.
2. Do not make a key from a title, an rlink `href`, a hash, or a document identifier of one
   revision. These values can change while the subject stays the same.
3. Start a key with a domain that the organization controls. Two organizations then do not use the
   same key for two subjects.
4. Two resources in one back-matter must not have the same key. The two resources would have the
   same `uuid`, and OSCAL does not allow that in one back-matter.

[BMB-004]: ../openspec/specs/backmatter-builders/spec.md
