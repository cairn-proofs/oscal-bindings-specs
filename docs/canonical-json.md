# Canonical JSON for conformance comparison

This document defines the canonical form of an OSCAL JSON document. A conformance run compares the output of a
binding with the expected output in the corpus. The two are equivalent when their canonical forms are the same bytes.
The serialization and document-parsing specs use these rules ([SER-004], [SER-005], [PRS-008]).

These rules apply to comparison only. They do not set the key order, the whitespace, or the number format that a
binding writes.

## Rules

To make the canonical form of a document, apply these steps in this sequence:

1. Parse the document as JSON. A document with a duplicate object key is not valid input.
2. Normalize each datetime value, as [Datetimes](#datetimes) states.
3. Serialize the result with the JSON Canonicalization Scheme (JCS) of
   [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785). JCS sets these properties:
   1. Object members are sorted by the UTF-16 code units of their keys.
   2. Array items keep their order. OSCAL arrays are ordered.
   3. The output has no whitespace between tokens.
   4. Strings use the JCS escape rules.
   5. Numbers use the JCS number format, which is the ECMAScript number-to-string conversion.
4. Encode the result as UTF-8.

Two documents are equivalent when step 4 gives the same bytes for both.

## Datetimes

A string value is a datetime when the vendored schema gives its field the type `DateTimeWithTimezoneDatatype` or
`DateTimeDatatype`. Other strings, including `DateDatatype` values, stay as they are.

OSCAL bases these types on the XML Schema type `xs:dateTime`. The normalization below is the canonical form of
`xs:dateTime` from XML Schema 1.1, with one difference: the timezone offset stays as written.

1. Keep the date, the time, and the timezone offset. Do not convert the value to UTC.
2. Write a zero offset (`+00:00` or `-00:00`) as `Z`. Write each other offset as `+hh:mm` or `-hh:mm`.
3. Remove the trailing zeros of the fractional seconds. If all fraction digits are zero, remove the fraction and its
   `.`.
4. Do not remove or round other fraction digits. A binding that drops a fraction digit changes the instant, and the
   comparison fails.

Examples:

| Input                          | Canonical                     |
| ------------------------------ | ----------------------------- |
| `2024-01-02T03:04:05+00:00`    | `2024-01-02T03:04:05Z`        |
| `2024-01-02T03:04:05.120000Z`  | `2024-01-02T03:04:05.12Z`     |
| `2024-01-02T03:04:05.000-05:00` | `2024-01-02T03:04:05-05:00`  |
| `2024-01-02T03:04:05.1234567Z` | `2024-01-02T03:04:05.1234567Z` |

The offset is kept because two values with the same instant and different offsets are equal in `xs:dateTime`, but not
identical. A round trip keeps the identity.

## Numbers

OSCAL 1.2.3 uses `DecimalDatatype`, which is based on `xs:decimal`, only for the mapping model's confidence score and
coverage percentage. Both are values from 0 to 1. An `xs:decimal` has arbitrary precision. A JCS number is an IEEE 754
double. The two forms agree for each value with 15 or fewer significant digits. The corpus uses only such values. For
example, `0.50` and `0.5` have the same canonical form, `0.5`.
