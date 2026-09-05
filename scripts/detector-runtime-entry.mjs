import * as htmlparser2 from 'htmlparser2';
import * as cssSelect from 'css-select';
import * as csstree from 'css-tree';
import * as domutils from 'domutils';

// The skill payload runs without the CLI package's node_modules. The build
// bundles this entry for provider artifacts, while the source CLI keeps its
// lazy imports and degraded fallback below.
globalThis.__impeccableStaticHtmlModules = {
  parseDocument: htmlparser2.parseDocument,
  selectAll: cssSelect.selectAll,
  selectOne: cssSelect.selectOne,
  is: cssSelect.is,
  csstree,
  domutils,
};

export * from '../cli/engine/detect-antipatterns.mjs';
