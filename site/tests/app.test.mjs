import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('visitor workspace is private and supports portable data',()=>{
  assert.match(app,/localStorage\.getItem\('rdmo-visitor-v1'/);
  assert.match(app,/Export all JSON/); assert.match(app,/Import JSON/); assert.match(app,/data-new/);
  assert.match(app,/immutable published reference dataset/);
  assert.match(app,/function currentRows\(/);
  assert.match(app,/baseline:\{status:'immutable'/);
});
test('adjudicator exposes functional top actions and editable coding fields',()=>{
  for(const label of ['Approve','Reject','Export all','data-row-prev','data-row-next']) assert.match(app,new RegExp(label));
  for(const field of ['process_type','actor','affected_participant','agency_voice','modality','institutional_priority','social_actor_representation']) assert.match(app,new RegExp(field));
  assert.match(app,/\/api\/approve/);
});
test('uses the workbook codebook and makes imported links inert unless safe',()=>{
  assert.match(app,/process_type:\['material','relational','mental','verbal','existential','behavioural','unclear','not_applicable'\]/);
  assert.match(app,/agency_voice:\['active','passive','non_finite','unclear','not_applicable'\]/);
  assert.match(app,/modality:\['probability','usuality','obligation','commitment','capacity','none','unclear','not_applicable'\]/);
  assert.match(app,/function safeURL/); assert.match(app,/username/); assert.match(app,/function csv/);
});
test('fixed viewport keeps document scrolling inside panels',()=>{
  assert.match(css,/body\{overflow:hidden/); assert.match(css,/\.shell\{height:100dvh/); assert.match(css,/\.panel\{[^}]*min-height:0/);
});
