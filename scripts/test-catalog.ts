// Smoke test — try importing the catalog pages
import('./src/features/catalog/CatalogPage.tsx').then(m => {
  console.log('CatalogPage OK:', typeof m.CatalogPage)
}).catch(e => {
  console.error('Import failed:', e.message)
  console.error(e.stack)
})
