/** Extend PR #9's World-only preservation scope to the nine polish snapshots.
 * Run normally to normalize metadata, or --check to verify without writing.
 * Asset/map/engine/generator hashes are NEVER regenerated from the working tree. */
import{createHash}from'node:crypto';
import{readFileSync,writeFileSync}from'node:fs';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';

export const BASELINES=[
 'world/forest-v38-baseline.json','world/forest-v38-r1-baseline.json',
 'world/forest-v38-r2-baseline.json','world/forest-v38-r3-baseline.json',
 'world/forest-v38-r4-baseline.json','world/mountain-v36-r1-baseline.json',
 'world/mountain-v36-r2-baseline.json','world/valley-v37-r1-baseline.json',
 'world/valley-v37-r2-baseline.json',
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const PR9_BASELINE='world/village-a5-baseline.json';
const BEFORE_PR9='06bd426e4d7109e06466cd075b9d3fb3d2d3194a305fe58e4ca5d2d9add4403c';
const AFTER_PR9='00389b5ebbc026fc1e72200826ebc70994fb81e619191f188c2ca5a96d167163';

export function isWorldPreservationFile(file){
 if(file.split('/').includes('..'))return false;
 return['world/','public/maps/','public/assets/world/','src/game/','scripts/'].some(p=>file.startsWith(p))||
  /^tests\/(?:world|forest|mountain|valley|coast|village|living-world)[\w.-]*\.test\.[cm]?[jt]s$/.test(file);
}

export function scopedBaselines(read){
 const result=new Map(),pending=new Set();
 function visit(file){
  if(result.has(file))return result.get(file);
  if(pending.has(file))throw Error('Cyclic World baseline reference: '+file);
  pending.add(file);
  const baseline=JSON.parse(read(file).toString());
  baseline.hashes=Object.fromEntries(Object.entries(baseline.hashes).filter(([path])=>isWorldPreservationFile(path)));
  for(const[path,hash]of Object.entries(baseline.hashes)){
   // Only descendant snapshot metadata is rehashed, not any protected World source.
   if(BASELINES.includes(path))baseline.hashes[path]=sha(visit(path));
   // PR #9 legitimately changed this older snapshot's scope. Accept ONLY its audited digest.
   else if(path===PR9_BASELINE&&hash===BEFORE_PR9&&sha(read(path))===AFTER_PR9)baseline.hashes[path]=AFTER_PR9;
  }
  const bytes=JSON.stringify(baseline,null,2)+'\n';result.set(file,bytes);pending.delete(file);return bytes;
 }
 for(const file of BASELINES)visit(file);
 return result;
}

export function verifyWorldHashes(baselines,read){
 for(const[file,bytes]of baselines)for(const[path,expected]of Object.entries(JSON.parse(bytes).hashes)){
  if(!isWorldPreservationFile(path))throw Error(`${file}: out-of-scope hash ${path}`);
  const actual=sha(baselines.get(path)??read(path));
  if(actual!==expected)throw Error(`${file}: World integrity mismatch for ${path}: expected ${expected}, actual ${actual}`);
 }
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.some(a=>a!=='--check'))throw Error('Usage: node scripts/scope-world-baselines.mjs [--check]');
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=file=>readFileSync(resolve(root,file));
 const baselines=scopedBaselines(read);
 // Fail before writing anything if an actual World file has changed.
 verifyWorldHashes(baselines,read);
 const changed=[...baselines].filter(([file,bytes])=>!read(file).equals(Buffer.from(bytes)));
 if(args.includes('--check')&&changed.length)throw Error('World baseline scope/references need normalization: '+changed.map(([f])=>f).join(', '));
 for(const[file,bytes]of changed)writeFileSync(resolve(root,file),bytes);
 console.log(`${BASELINES.length} World baselines verified; ${changed.length} metadata files ${args.includes('--check')?'need changes':'updated'}. World source hashes preserved.`);
}
