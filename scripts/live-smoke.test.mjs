import test from "node:test"
import assert from "node:assert/strict"
import { extractAssets, extractBrandAssets, LIVE } from "./live-smoke.mjs"

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

const branded = valid.replace('</head>',
  '<link rel="icon" type="image/png" sizes="32x32" href="/opportunity-dashboard/favicon-32.png?v=2">'+
  '<link rel="icon" type="image/svg+xml" sizes="any" href="/opportunity-dashboard/favicon.svg?v=2">'+
  '<link rel="apple-touch-icon" sizes="180x180" href="/opportunity-dashboard/apple-touch-icon.png?v=2">'+
  '</head>')

test("deployment smoke checks all versioned favicon formats",()=>{
  const icons=extractBrandAssets(branded)
  assert.deepEqual(icons,[
    {url:LIVE+"favicon.svg?v=2",mime:"image/svg+xml"},
    {url:LIVE+"favicon-32.png?v=2",mime:"image/png"},
    {url:LIVE+"apple-touch-icon.png?v=2",mime:"image/png"},
  ])
})
test("a missing, redirected or wrong-path favicon fails production smoke",()=>{
  assert.throws(()=>extractBrandAssets(valid),/Missing/)
  assert.throws(()=>extractBrandAssets(branded.replace('/opportunity-dashboard/favicon.svg','/favicon.svg')),/outside expected/)
  assert.throws(()=>extractBrandAssets(branded.replace('/opportunity-dashboard/favicon.svg','https://evil.example/favicon.svg')),/outside expected/)
  assert.throws(()=>extractBrandAssets(branded.replace('rel="apple-touch-icon"','rel="shortcut"')),/Missing/)
})
