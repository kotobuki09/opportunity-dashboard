import test from "node:test"
import assert from "node:assert/strict"
import { extractAssets, LIVE } from "./live-smoke.mjs"

const valid = '<html><head><title>Opportunity Scout · Dashboard</title>'+
  '<script type="module" crossorigin src="/opportunity-dashboard/assets/index-123.js"></script>'+
  '<link rel="stylesheet" href="/opportunity-dashboard/assets/index-123.css">'+
  '</head><body><div id="root"></div></body></html>'

test("live monitor finds deployed JS/CSS only on GitHub Pages app path",()=>{
  const assets=extractAssets(valid)
  assert.equal(assets.length,2)
  assert.equal(assets[0].url,LIVE+"assets/index-123.js")
  assert.equal(assets[1].kind,"css")
})
test("missing scripts/styles or root fail availability gate",()=>{
  assert.throws(()=>extractAssets(valid.replace('<div id="root"></div>',"")))
  assert.throws(()=>extractAssets(valid.replace('index-123.css',"index-123.txt")))
  assert.throws(()=>extractAssets(valid.replace('/opportunity-dashboard/assets/index-123.js',
    '/other-app/assets/index-123.js')))
})
test("remote third-party assets are rejected",()=>{
  assert.throws(()=>extractAssets(valid.replace('/opportunity-dashboard/assets/index-123.js',
    'https://attacker.example/assets/index-123.js')))
})
