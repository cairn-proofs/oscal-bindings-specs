#!/usr/bin/env bash
# Verify, then compile to JavaScript and Python. Outputs go to pilot/build/. See REPORT.md.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$PATH:$HOME/.dotnet/tools"
Z3="${Z3:-$PWD/.venv-z3/bin/z3}"

# 1. Full verification of every file (included files are not verified by default).
( time { dafny verify --solver-path "$Z3" --verify-included-files dafny/Api.dfy; dafny verify --solver-path "$Z3" dafny/SpecProps.dfy; } ) 2>&1 | tee build/verify.log

# 2. Translate. The runtime is included so that each output stands alone.
rm -rf build/js build/py
mkdir -p build/js build/py
dafny translate js --no-verify --include-runtime -o build/js/oscal dafny/Api.dfy
dafny translate py --no-verify --include-runtime -o build/py/oscal dafny/Api.dfy

# 3. The JS output runs Main when loaded and exports nothing: cut the last line, export the modules.
head -n -1 build/js/oscal.js > build/js/oscal_lib.js
echo 'module.exports = { _dafny, Spec, Impl, Parser, Api };' >> build/js/oscal_lib.js

# 4. JS runtime dependency
[ -d node_modules/bignumber.js ] || npm install --no-audit --no-fund --silent bignumber.js@9.1.2
