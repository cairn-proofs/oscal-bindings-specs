#!/usr/bin/env bash
# usage: make.sh name 'python-replace-old' 'new' file
set -e
cd "$(dirname "$0")"
. build/env.sh
name=$1; old=$2; new=$3; file=$4
d=build/mutants/$name; rm -rf $d; mkdir -p $d/dafny; cp dafny/*.dfy $d/dafny/
python3 - "$d/dafny/$file" "$old" "$new" <<'PY'
import sys
p,old,new=sys.argv[1:4]
s=open(p).read()
assert s.count(old)==1,(old,s.count(old))
open(p,'w').write(s.replace(old,new))
PY
dafny translate js --no-verify --include-runtime -o $d/oscal $d/dafny/Api.dfy >/dev/null
head -n -1 $d/oscal.js > $d/lib.js; echo 'module.exports = { _dafny, Spec, Impl, Parser, Api };' >> $d/lib.js
echo "== $name"
OSCAL_JS_LIB=$PWD/$d/lib.js node harness/run.js --out build/mutants/$name.json 2>&1 | grep -E '"(total|agree)"|DISAGREE|language' | head -0
python3 - $name <<'PY'
import json,sys
r=json.load(open(f'build/mutants/{sys.argv[1]}.json'))
bad=[x for x in r['results'] if not x['ok']]
print(r['summary']); print(len(bad),'cases differ'); 
for x in bad[:4]: print('  ',x['id'],'exp',x['exp'],'got',x['got'])
PY
