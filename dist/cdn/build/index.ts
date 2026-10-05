/**
 * Superficie de build para otros proyectos is-*.
 * Vendor: copiar `dist/cdn/build/*.ts`.
 * CDN: importar este modulo publicado. El runtime del kit sigue siendo `loader.min.js`.
 *
 *   import { bundleMinJs, bundleLoader, stampHashTexts, contentHash } from './index.ts';
 */
export { contentHash, ASSET_HASH_LEN } from './content-hash.js';
export { withAssetHash, lookupHash, routeThroughLoader } from './asset-url.js';
export {
  stampHashTexts,
  stampDirectory,
  hashFile,
  applyHashToHtml,
  rewriteHtmlTree,
  hashesJson,
  resolveRel,
  ASSET_HASHES_NAME,
} from './stamp-hashes.js';
export {
  bundleMinJs,
  bundleMinCss,
  bundleLoader,
  loaderDefines,
  docsBanner,
} from './bundle-min.js';
export type { BundleMinJsOptions, BundleLoaderOptions } from './bundle-min.js';
