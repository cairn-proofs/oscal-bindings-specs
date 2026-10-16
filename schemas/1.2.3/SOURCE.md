# Source

1. Publisher: NIST, repository `usnistgov/OSCAL`.
2. Release: `v1.2.3`, <https://github.com/usnistgov/OSCAL/releases/tag/v1.2.3>.
3. Files: the nine `oscal_*_schema.json` assets of that release, with their NIST file names unchanged. Download one
   file from `https://github.com/usnistgov/OSCAL/releases/download/v1.2.3/<file name>`.
4. Integrity: `SHA256SUMS` holds the `sha256` of each file. Each value equals the asset digest that GitHub reports for
   the release. To check the files, run `shasum -a 256 -c SHA256SUMS` in this directory.
