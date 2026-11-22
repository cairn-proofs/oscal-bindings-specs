## ADDED Requirements

### Requirement: SER-006 The valid corpus uses each listed key pair

The valid corpus SHALL use each key pair that the file `required-keys.json` of the release lists. A pair `a>b` is used
when a JSON document in `documents/valid/` has the key `b` in an object that is the value of the key `a`, or in an item
of an array that is the value of `a`. The corpus check MUST fail when a listed pair is not used.

#### Scenario: SER-006.01 A listed key pair that no valid document uses fails the check

- **WHEN** no JSON document in `documents/valid/` uses a pair that `required-keys.json` lists
- **THEN** the corpus check fails and names the pair
