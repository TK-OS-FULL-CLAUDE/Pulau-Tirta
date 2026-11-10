import{describe,it,expect}from'vitest';
import{readFileSync}from'node:fs';
import{BASELINES,isWorldPreservationFile,scopedBaselines,verifyWorldHashes}from'../scripts/scope-world-baselines.mjs';

const read=file=>readFileSync(file);
describe('PR #9 World preservation scope extended to polish snapshots',()=>{
 it('excludes UI/backend/content/package files and retains World sources and regression tests',()=>{
  for(const file of['src/style.css','src/main.ts','src/ui/aktivitas/puncak.ts','src/tiko/panel.ts','server/index.ts','shared/missions.ts','content/misi.json','package.json','package-lock.json','tests/jurnal.test.ts'])expect(isWorldPreservationFile(file),file).toBe(false);
  for(const file of['world/maps/a.tmj','world/assets/a.png','public/maps/a.json','public/assets/world/a.png','src/game/map-data.ts','scripts/design-lembah-v37.mjs','tests/forest-v38-r3.test.ts'])expect(isWorldPreservationFile(file),file).toBe(true);
 });
 it('keeps all nine committed snapshots normalized, nonempty and internally consistent',()=>{
  const planned=scopedBaselines(read);expect(planned.size).toBe(9);
  for(const file of BASELINES){expect(planned.get(file),file).toBe(read(file).toString());const hashes=JSON.parse(planned.get(file)).hashes;
   expect(Object.keys(hashes).length).toBeGreaterThan(90);
   for(const prefix of['world/maps/','world/assets/','public/maps/','scripts/','src/game/'])expect(Object.keys(hashes).some(f=>f.startsWith(prefix)),file+':'+prefix).toBe(true);
  }
  expect(()=>verifyWorldHashes(planned,read)).not.toThrow();
 });
 it('never reads or freezes CSS and mission UI when checking World preservation',()=>{
  const readWithoutUi=file=>{if(file==='src/style.css'||file.startsWith('src/ui/'))throw Error('UI must not be frozen by World: '+file);return read(file);};
  expect(()=>verifyWorldHashes(scopedBaselines(readWithoutUi),readWithoutUi)).not.toThrow();
 });
 // In-memory mutation controls: no real map, asset or engine file is edited by these tests.
 it.each(['world/maps/pulau_tirta_v37_r1.tmj','world/assets/kenney_tiny_battle/tilemap_packed.png','src/game/map-data.ts','scripts/design-lembah-v37.mjs'])(
  'still rejects a forbidden World change to %s without refreshing its stored hash',file=>{
   const planned=scopedBaselines(read),changedRead=path=>path===file?Buffer.concat([read(path),Buffer.from('\nforbidden mutation')]):read(path);
   expect(scopedBaselines(changedRead)).toEqual(planned);
   expect(()=>verifyWorldHashes(planned,changedRead)).toThrow(`World integrity mismatch for ${file}`);
  });
 it('does not silently accept later arbitrary changes to the baseline approved by PR #9',()=>{
  const file='world/village-a5-baseline.json',changedRead=path=>path===file?Buffer.concat([read(path),Buffer.from(' ')]):read(path);
  expect(()=>verifyWorldHashes(scopedBaselines(changedRead),changedRead)).toThrow(`World integrity mismatch for ${file}`);
 });
});
