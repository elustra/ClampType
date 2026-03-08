// ============================================================================
// ClampType — code.js  (Figma Plugin Sandbox)
// ============================================================================
// COMPATIBILITY RULES (all applied in this file):
//
// 1. documentAccess: "dynamic-page" requires ASYNC for all READ operations:
//      figma.variables.getLocalVariableCollections()  →  getLocalVariableCollectionsAsync()
//      figma.variables.getLocalVariables()            →  getLocalVariablesAsync()
//    WRITE operations (createVariableCollection, createVariable) stay sync — no Async variant exists.
//
// 2. NO spread operator { ...obj } — crashes the Figma sandbox JS engine.
//    Use solidA(col, alpha) helper instead.
//
// 3. NO shorthand property syntax { r, g, b } — use { r: rv, g: gv, b: bv }.
//
// 4. var instead of const/let — maximises sandbox engine compatibility.
//
// 5. No arrow functions in onmessage — use async function(msg) {}.
// ============================================================================

figma.showUI(__html__, { width: 560, height: 620, title: 'ClampType' });

// ── Colour helpers ─────────────────────────────────────────────────────────────
function hex(h) {
  var rv = parseInt(h.slice(1, 3), 16) / 255;
  var gv = parseInt(h.slice(3, 5), 16) / 255;
  var bv = parseInt(h.slice(5, 7), 16) / 255;
  return { r: rv, g: gv, b: bv };   // explicit keys — NOT shorthand
}

var RED         = hex('#D46026');
var INK         = hex('#2D1208');
var INK2        = hex('#7A3920');
var INK3        = hex('#B07054');
var WHITE       = { r: 1, g: 1, b: 1 };
var BGPAGE      = hex('#FFF8F2');
var BORDER      = hex('#FFEEDE');
var LITE        = hex('#FFF4EC');
var AMBER_LBL   = { r: 0.992, g: 0.588, b: 0.318 };
var VAR_LINE    = { r: 0.941, g: 0.722, b: 0.490 };

// ── Paint helpers ──────────────────────────────────────────────────────────────
function solid(col) {
  return { type: 'SOLID', color: col };
}
// solidA replaces { ...col, a: alpha } — spread not allowed in sandbox
function solidA(col, alpha) {
  return { type: 'SOLID', color: { r: col.r, g: col.g, b: col.b }, opacity: alpha };
}

// ── Load fonts ─────────────────────────────────────────────────────────────────
async function loadFonts() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

// ── Find or create Variable collection ────────────────────────────────────────
// getLocalVariableCollectionsAsync() is REQUIRED with documentAccess: dynamic-page
async function ensureCollection(name) {
  var list = await figma.variables.getLocalVariableCollectionsAsync();
  for (var i = 0; i < list.length; i++) {
    if (list[i].name === name) return list[i];
  }
  // createVariableCollection is a WRITE op — no Async variant, stays sync
  return figma.variables.createVariableCollection(name);
}

// ── Generate Figma Variables ───────────────────────────────────────────────────
async function generateVariables(vars) {
  var collection = await ensureCollection('ClampType / Typography Scale');
  var modeId = collection.modes[0].modeId;
  collection.renameMode(modeId, 'Default');

  // getLocalVariablesAsync() is REQUIRED with documentAccess: dynamic-page
  var existing = await figma.variables.getLocalVariablesAsync('FLOAT');

  for (var i = 0; i < vars.length; i++) {
    var v       = vars[i];
    var varName = v.name;  // e.g. "fs/h1"

    // Find pre-existing variable — plain for loop, no arrow .find()
    var found = null;
    for (var j = 0; j < existing.length; j++) {
      if (existing[j].variableCollectionId === collection.id &&
          existing[j].name === varName) {
        found = existing[j];
        break;
      }
    }

    // createVariable is a WRITE op — no Async variant, stays sync
    var variable = found || figma.variables.createVariable(varName, collection, 'FLOAT');

    variable.setValueForMode(modeId, v.minPx);

    variable.description =
      v.tag + ': ' + v.clamp +
      '\nMin: ' + v.minPx + 'px (' + v.minRem + 'rem)' +
      '\nMax: ' + v.maxPx + 'px (' + v.maxRem + 'rem)';

    variable.scopes = ['FONT_SIZE'];

    variable.setVariableCodeSyntax('WEB',     'var(--' + varName.replace('/', '-') + ')');
    variable.setVariableCodeSyntax('ANDROID', '@dimen/' + varName.replace('/', '_'));
    variable.setVariableCodeSyntax('iOS',     'ClampType.' + v.tag);
  }

  figma.notify('\u2713 Variables created in \u201CClampType / Typography Scale\u201D');
}

// ── Generate Typography Frame ──────────────────────────────────────────────────
async function generateFrame(payload) {
  await loadFonts();

  var vars    = payload.vars;
  var FRAME_W = 1280;
  var FRAME_H = 900;
  var PAD     = 48;
  var COL_GAP = 40;

  // Root frame
  var frame = figma.createFrame();
  frame.name = 'ClampType \u2014 Typography Scale';
  frame.resize(FRAME_W, FRAME_H);
  frame.fills = [solid(BGPAGE)];
  frame.cornerRadius = 16;
  frame.clipsContent = false;

  // Header band — solid accent colour (#D46026), no gradient
  var band = figma.createRectangle();
  band.name = 'Header Band';
  band.resize(FRAME_W, 80);
  band.x = 0;
  band.y = 0;
  band.fills = [solid(RED)];
  frame.appendChild(band);

  // Title
  var title = figma.createText();
  title.name = 'Title';
  title.fontName = { family: 'Inter', style: 'Bold' };
  title.characters = 'ClampType \u2014 Typography Scale';
  title.fontSize = 20;
  title.fills = [solid(WHITE)];
  title.x = PAD;
  title.y = 24;
  frame.appendChild(title);

  // Meta — white at 75% opacity, using solidA (no spread operator)
  var meta = figma.createText();
  meta.name = 'Meta';
  meta.fontName = { family: 'Inter', style: 'Regular' };
  meta.characters =
    'Base: ' + payload.base + 'px' +
    '  \u00B7  Ratio: ' + payload.ratio +
    '  \u00B7  Viewport: ' + payload.vpMin + '\u2013' + payload.vpMax + 'px';
  meta.fontSize = 12;
  meta.fills = [solidA(WHITE, 0.75)];
  meta.x = PAD;
  meta.y = 52;
  frame.appendChild(meta);

  // Table layout
  var ROW_H       = 72;
  var START_Y     = 104;
  var TAG_COL_W   = 80;
  var RANGE_COL_W = 120;
  var CLAMP_COL_W = 360;
  var hdX = [
    PAD,
    PAD + TAG_COL_W + COL_GAP,
    PAD + TAG_COL_W + RANGE_COL_W + (COL_GAP * 2),
    PAD + TAG_COL_W + RANGE_COL_W + CLAMP_COL_W + (COL_GAP * 3)
  ];

  // Column headers
  var colLabels = ['Level', 'Range (px)', 'clamp() value', 'Sample'];
  for (var hi = 0; hi < colLabels.length; hi++) {
    var ch = figma.createText();
    ch.fontName = { family: 'Inter', style: 'Bold' };
    ch.characters = colLabels[hi];
    ch.fontSize = 9;
    ch.fills = [solid(INK3)];
    ch.x = hdX[hi];
    ch.y = START_Y - 16;
    frame.appendChild(ch);
  }

  // Divider line
  var divLine = figma.createLine();
  divLine.x = PAD;
  divLine.y = START_Y - 2;
  divLine.resize(FRAME_W - (PAD * 2), 0);
  divLine.strokes = [solid(BORDER)];
  divLine.strokeWeight = 1;
  frame.appendChild(divLine);

  // Scale rows
  for (var ri = 0; ri < vars.length; ri++) {
    var v    = vars[ri];
    var rowY = START_Y + (ri * ROW_H);

    if (ri % 2 === 0) {
      var bg = figma.createRectangle();
      bg.resize(FRAME_W - PAD, ROW_H - 4);
      bg.x = PAD / 2;
      bg.y = rowY;
      bg.fills = [solid(LITE)];
      bg.cornerRadius = 6;
      frame.appendChild(bg);
    }

    var tagNode = figma.createText();
    tagNode.fontName = { family: 'Inter', style: 'Bold' };
    tagNode.characters = v.tag;
    tagNode.fontSize = 11;
    tagNode.fills = [solid(RED)];
    tagNode.x = PAD;
    tagNode.y = rowY + 8;
    frame.appendChild(tagNode);

    var rangeNode = figma.createText();
    rangeNode.fontName = { family: 'Inter', style: 'Regular' };
    rangeNode.characters = v.minPx.toFixed(0) + ' \u2013 ' + v.maxPx.toFixed(0) + ' px';
    rangeNode.fontSize = 11;
    rangeNode.fills = [solid(INK2)];
    rangeNode.x = hdX[1];
    rangeNode.y = rowY + 8;
    frame.appendChild(rangeNode);

    var clampNode = figma.createText();
    clampNode.fontName = { family: 'Inter', style: 'Regular' };
    clampNode.characters = v.clamp;
    clampNode.fontSize = 9;
    clampNode.fills = [solid(INK3)];
    clampNode.x = hdX[2];
    clampNode.y = rowY + 8;
    clampNode.textAutoResize = 'WIDTH_AND_HEIGHT';
    frame.appendChild(clampNode);

    var sampleSz = Math.min(Math.max(v.minPx, 10), 48);
    var sampleNode = figma.createText();
    sampleNode.fontName = { family: 'Inter', style: 'Bold' };
    sampleNode.characters = v.tag + ' \u2014 Aa';
    sampleNode.fontSize = sampleSz;
    sampleNode.fills = [solid(INK)];
    sampleNode.x = hdX[3];
    sampleNode.y = rowY + 4;
    sampleNode.textAutoResize = 'WIDTH_AND_HEIGHT';
    frame.appendChild(sampleNode);
  }

  // CSS block
  var cssY = START_Y + (vars.length * ROW_H) + 24;
  var cssBox = figma.createFrame();
  cssBox.name = 'CSS Variables';
  cssBox.resize(FRAME_W - (PAD * 2), 180);
  cssBox.x = PAD;
  cssBox.y = cssY;
  cssBox.fills = [solid(INK)];
  cssBox.cornerRadius = 10;
  cssBox.clipsContent = true;
  frame.appendChild(cssBox);

  var cssOpen = figma.createText();
  cssOpen.fontName = { family: 'Inter', style: 'Bold' };
  cssOpen.characters = ':root {';
  cssOpen.fontSize = 11;
  cssOpen.fills = [solid(AMBER_LBL)];
  cssOpen.x = 16;
  cssOpen.y = 16;
  cssBox.appendChild(cssOpen);

  var lineY = 36;
  for (var ci = 0; ci < vars.length; ci++) {
    var cv   = vars[ci];
    var ln   = figma.createText();
    ln.fontName = { family: 'Inter', style: 'Regular' };
    ln.characters = '  --fs-' + cv.name.replace('fs/', '') + ': ' + cv.clamp + ';';
    ln.fontSize = 9.5;
    ln.fills = [solid(VAR_LINE)];
    ln.x = 16;
    ln.y = lineY;
    cssBox.appendChild(ln);
    lineY += 14;
  }

  var cssClose = figma.createText();
  cssClose.fontName = { family: 'Inter', style: 'Bold' };
  cssClose.characters = '}';
  cssClose.fontSize = 11;
  cssClose.fills = [solid(AMBER_LBL)];
  cssClose.x = 16;
  cssClose.y = lineY + 4;
  cssBox.appendChild(cssClose);

  var totalH = Math.max(FRAME_H, cssY + 200 + 48);
  frame.resize(FRAME_W, totalH);

  var center = figma.viewport.center;
  frame.x = center.x - (FRAME_W / 2);
  frame.y = center.y - (totalH / 2);

  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.notify('\u2713 ClampType frame created on canvas');
}

// ── Message handler ────────────────────────────────────────────────────────────
figma.ui.onmessage = async function(msg) {
  try {
    switch (msg.type) {

      case 'generate-vars':
        await generateVariables(msg.vars);
        break;

      case 'generate-vars-and-frame':
        await generateVariables(msg.vars);
        await generateFrame(msg);
        break;

      case 'generate-frame-only':
        await generateFrame(msg);
        break;

      case 'lang-stress':
      case 'script-stress':
        break;

      default:
        break;
    }
  } catch (err) {
    var msg2 = (err instanceof Error) ? err.message : String(err);
    figma.notify('ClampType error: ' + msg2, { error: true });
    console.error('ClampType error:', err);
  }
};
