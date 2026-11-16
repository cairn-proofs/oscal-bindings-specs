# Source
This directory holds two kinds of file. The module files come from the OSCAL release. The datatypes file comes from
another repository, because the release does not publish it.
1. Modules: the 14 `oscal_*_metaschema_RESOLVED.xml` assets of the release `v1.2.3` of `usnistgov/OSCAL`,
   <https://github.com/usnistgov/OSCAL/releases/tag/v1.2.3>, with their NIST file names unchanged. NIST resolves the
   entity references of each module, so no `.ent` file is needed. Download one file from
   `https://github.com/usnistgov/OSCAL/releases/download/v1.2.3/<file name>`. The release archive `oscal-1.2.3.tar.bz2`
   holds the same files in its `metaschema/` directory.
2. Datatypes: `metaschema-datatypes.xsd` of `usnistgov/metaschema`, at the path `schema/xml/` and the commit
   `37fd650b01610b274de60da261e4cbb77a404086`, which has the tag `v0.9.1`. The submodule `support/metaschema` of
   `usnistgov/metaschema-xslt` pins this commit at the commit `22387295d646425ff4f281c5cac6ff9a799f5a73`, and the
   submodule `build/metaschema-xslt` of OSCAL `v1.2.3` pins that commit. The file at the last commit of the `develop`
   branch differs: it escapes the dot in the IPv4 and IPv6 patterns, and this file does not. The XSD files of the
   OSCAL release define 6 of the 9 datatypes that the constraints use, with the same patterns. They do not define
   `integer`, `ip-v4-address` and `ip-v6-address`.
3. Function `has-oscal-namespace()`: the semantics come from `HasOscalNamespace.java` in `usnistgov/liboscal-java`
   (design D4). The commit `c9de4d6eb989d54776b29330fa000f11ffa3619b` is the state that the reference evaluator follows.
   The commit `1e62f849` is the last commit that changed that file.
4. Integrity: `SHA256SUMS` holds the `sha256` of each module and of the XSD. Each module digest equals the asset digest
   that GitHub reports for the release. To check the files, run `shasum -a 256 -c SHA256SUMS` in this directory.
