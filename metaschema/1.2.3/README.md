# OSCAL 1.2.3 Metaschema
This directory holds the OSCAL 1.2.3 Metaschema modules and the Metaschema datatypes XSD, byte-for-byte as their
publishers publish them. Do not edit them. `SHA256SUMS` records the `sha256` of each file. `SOURCE.md` records where
each file comes from.
The directories of the store are organized by the kind of content that they hold, not by the repository that the
content comes from. This directory holds Metaschema files. `schemas/1.2.3/` holds JSON Schema files. The modules here
and the JSON Schema files there come from the same OSCAL release. The XSD here comes from `usnistgov/metaschema`.
The store generates `manifest/1.2.3/constraints.json` from these files.
