import Link from 'next/link'
import { prisma } from '../../../../../../lib/prisma'
import { getYouTubeVideoId } from '../../../../../../lib/youtube'

export default async function EditProduct({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id }, include: { categories: { select: { categoryId: true } } } }),
    prisma.category.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
  ])
  if (!product) return <div>Product not found</div>

  return (
    <section className="admin-product-form-page">
      <header className="admin-products-form-heading">
        <div><span className="admin-eyebrow">Store catalogue</span><h1>Edit Product</h1><p>Update product details, pricing, previews, files and publishing settings.</p></div>
        <Link href="/admin/products" className="admin-products-secondary-link">← Products</Link>
      </header>

      <form action={`/api/admin/products/${product.id}`} method="post" encType="multipart/form-data" className="admin-product-form">
        <fieldset className="admin-product-form-section">
          <legend>Basic Information</legend>
          <div className="admin-product-form-grid">
            <label><span>Product title</span><input name="title" defaultValue={product.title} required className="form-input" /></label>
            <label><span>Artist</span><input name="artist" defaultValue={product.artist} required className="form-input" /></label>
            <label><span>Slug</span><input name="slug" defaultValue={product.slug} className="form-input" /></label>
            <label><span>Tuning</span><input name="tuning" defaultValue={product.tuning ?? ''} placeholder="Standard, Drop D, DADGAD, Open G" className="form-input" /></label>
            <label><span>Difficulty</span><select name="difficulty" required defaultValue={product.difficulty ?? ''} className="form-input">
              {!product.difficulty && <option value="" disabled>Select difficulty</option>}
              {!['Beginner', 'Intermediate', 'Advanced'].includes(product.difficulty ?? '') && product.difficulty && <option value={product.difficulty}>{product.difficulty} (existing)</option>}
              <option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option>
            </select></label>
            <label className="admin-product-form-wide"><span>Description</span><textarea name="description" defaultValue={product.description ?? ''} rows={4} className="form-input" /></label>
            <fieldset className="admin-product-categories admin-product-form-wide">
              <legend>Categories <span>(select all that apply)</span></legend>
              {categories.length ? categories.map((category) => (
                <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={product.categories.some((assignment) => assignment.categoryId === category.id)} /><span>{category.name}</span>{!category.active && <small>Inactive</small>}</label>
              )) : <p>No categories yet. Create categories in Admin → Categories.</p>}
            </fieldset>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>Pricing</legend>
          <div className="admin-product-form-grid">
            <label><span>Price (KES)</span><input name="price" type="text" inputMode="numeric" pattern="[0-9]+" defaultValue={product.price} required className="form-input" /></label>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>Product Images</legend>
          <div className="admin-product-form-grid">
            <label><span>Cover image</span>{product.coverImage && <img src={product.coverImage} alt={`Current cover for ${product.title}`} className="admin-product-current-image" />}<small>Current image is kept unless a replacement is uploaded.</small><input name="coverImage" type="file" accept="image/*" className="admin-category-file" /></label>
            <label><span>YouTube video link (optional)</span><input name="youtubeUrl" type="url" defaultValue={getYouTubeVideoId(product.previewMedia) ? product.previewMedia ?? '' : ''} placeholder="https://youtu.be/..." className="form-input" /><small>Paste a video link or upload a preview video/audio below.</small></label>
            <label className="admin-product-form-wide"><span>Audio/video preview (optional)</span>{product.previewMedia && !getYouTubeVideoId(product.previewMedia) && <a href={product.previewMedia} className="admin-product-current-file" target="_blank" rel="noreferrer">Open current preview</a>}<small>Current preview is kept unless a replacement is uploaded.</small><input name="previewMedia" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,video/mp4,video/webm" className="admin-category-file" /></label>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>PDF Files</legend>
          <div className="admin-product-form-grid">
            <label><span>Preview PDF (optional)</span>{product.previewPdf && <a href={product.previewPdf} className="admin-product-current-file" target="_blank" rel="noreferrer">Open current preview PDF</a>}<small>Current preview is kept unless a replacement is uploaded.</small><input name="previewPdf" type="file" accept="application/pdf" className="admin-category-file" /></label>
            <label><span>Full PDF (protected)</span>{product.fullPdf ? <small>Uploaded and protected. Current file is kept unless a replacement is uploaded.</small> : <small>No full PDF uploaded. A protected full PDF is required before publishing.</small>}<input name="fullPdf" type="file" accept="application/pdf" className="admin-category-file" /></label>
            <label className="admin-product-form-wide"><span>MuseScore file (protected, optional)</span>{product.fullMuseScore ? <small>Uploaded. Current file is kept unless a replacement is uploaded.</small> : <small>No MuseScore file uploaded yet.</small>}<input name="fullMuseScore" type="file" accept=".mscz,.mscx" className="admin-category-file" /><small>Only .mscz and .mscx files are accepted (maximum 4 MB).</small></label>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>Publishing and Featured Settings</legend>
          <div className="admin-product-form-switches">
            <label><input type="checkbox" name="featured" defaultChecked={product.featured} /><span><strong>Featured arrangement</strong><small>Show this product in Featured Arrangements.</small></span></label>
            <label><input type="checkbox" name="published" defaultChecked={product.published} /><span><strong>Published</strong><small>Make this product available in the shop.</small></span></label>
          </div>
        </fieldset>

        <div className="admin-product-form-actions">
          <Link href="/admin/products" className="admin-products-secondary-link">Cancel</Link>
          <button type="submit" className="admin-products-add-button">Save Changes</button>
        </div>
      </form>
    </section>
  )
}
