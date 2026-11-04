// Reads <dir>/measure.json and prints the numbers the TB-218 critics asked for.
import { readFileSync } from 'node:fs';
const M = JSON.parse(readFileSync(`${process.argv[2] ?? 'previews/tb-218-mobile/r10'}/measure.json`, 'utf8'));
const p = (...a) => console.log(...a);
for (const k of ['915x412', '915x360', '915x320']) {
  const o = M[k]; p('==', k);
  p(' canvas text min', JSON.stringify(Object.fromEntries(Object.entries(o.grove.canvText ?? o.grove.canvasText ?? {}).map(([n, v]) => [n, v.min?.toFixed?.(1)]))));
  const tl = o.grove.treeLabels; p(' treeLabels', tl && { n: tl.n, minPx: tl.minPx, outside: tl.outside, worst: tl.worstMargin });
  const nd = o.grove.nodes; p(' nodes', nd && { disc: nd.discCssDiameter, z: nd.z, ui: nd.ui, under: nd.nodesUnderLegend, cut: nd.nodesCutByEdge, probe: nd.probe });
  p(' tree pane', JSON.stringify(o.grove.tree));
  p(' wornPad', JSON.stringify(o.satchel.wornPad), 'cols', o.satchel.cols, 'gap', o.satchel.gap, 'gridScroll', JSON.stringify(o.satchel.gridScroll), 'cells', o.satchel.cells);
  p(' picked: wornShift', o['satchel-picked'].wornShift, 'acts', JSON.stringify(o['satchel-picked'].acts));
  p(' camp minTagGap', o.camp.minTagGap, JSON.stringify(o.camp.tags));
  p(' live', JSON.stringify(o.runLive.scene), 'lowWall', JSON.stringify(o.lowWall));
  p(' fallen real', JSON.stringify(o.fallen.real), 'btnText', JSON.stringify(o.fallen.btnText), 'btn', JSON.stringify(o.fallen.btn));
  for (const n of ['replant', 'settings']) p(' ', n, 'scroll', JSON.stringify(o[n].scroll), 'end', JSON.stringify(o[n + '-end'].atEnd), 'off', JSON.stringify(o[n].off), 'clip', JSON.stringify(o[n].clip?.slice?.(0, 2)));
  p(' tapGaps sample', JSON.stringify(o.camp.tapGapSample?.slice?.(0, 3)), 'sat', JSON.stringify(o.satchel.tapGapSample?.slice?.(0, 3)));
  p(' dpr/canvas', JSON.stringify(o.run.canv), '| overlay', JSON.stringify(o.settingsOverlay.canv));
  if (o.opp) p(' opp run off/clip', o.opp.run.off.length, o.opp.run.clip.length);
}
for (const k of ['412x915', '360x800', '320x700']) { const o = M[k]; p('==', k, JSON.stringify(o.prompt0), o.verdict ? JSON.stringify(o.verdict) : ''); }
