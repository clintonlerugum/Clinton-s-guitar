import React from 'react'
import Link from 'next/link'
import { prisma } from '../../../../../lib/prisma'

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })

  return (
    <section className="admin-product-form-page">
      <header className="admin-products-form-heading">
        <div><span className="admin-eyebrow">Store catalogue</span><h1>Add New Product</h1><p>Add product details, pricing, previews and protected files.</p></div>
        <Link href="/admin/products" className="admin-products-secondary-link">← Products</Link>
      </header>

      <form action="/api/admin/products" method="post" encType="multipart/form-data" className="admin-product-form">
        <fieldset className="admin-product-form-section">
          <legend>Basic Information</legend>
          <div className="admin-product-form-grid">
            <label><span>Product title</span><input name="title" placeholder="Song title" required className="form-input" /></label>
            <label><span>Artist</span><input name="artist" placeholder="Artist name" required className="form-input" /></label>
            <label><span>Slug</span><input name="slug" placeholder="Leave blank to use title" className="form-input" /></label>
            <label><span>Tuning</span><input name="tuning" placeholder="Standard, Drop D, DADGAD, Open G" className="form-input" /></label>
            <label><span>Difficulty</span><select name="difficulty" required defaultValue="" className="form-input"><option value="" disabled>Select difficulty</option><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option></select></label>
            <label className="admin-product-form-wide"><span>Description</span><textarea name="description" rows={4} placeholder="Describe this arrangement" className="form-input" /></label>
            <fieldset className="admin-product-categories admin-product-form-wide">
              <legend>Categories <span>(optional; select all that apply)</span></legend>
              {categories.length ? categories.map((category) => (
                <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} /><span>{category.name}</span>{!category.active && <small>Inactive</small>}</label>
              )) : <p>No categories yet. Create categories in Admin → Categories.</p>}
            </fieldset>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>Pricing</legend>
          <div className="admin-product-form-grid">
            <label><span>Price (KES)</span><input name="price" type="number" min="1" step="1" required placeholder="Price in KES" className="form-input" /></label>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>Product Images</legend>
          <div className="admin-product-form-grid">
            <label><span>Cover image</span><input name="coverImage" type="file" accept="image/*" className="admin-category-file" /></label>
            <label><span>YouTube video link (optional)</span><input name="youtubeUrl" type="url" placeholder="https://youtu.be/..." className="form-input" /><small>Paste a video link or upload a preview video/audio below.</small></label>
            <label className="admin-product-form-wide"><span>Audio/video preview (optional)</span><input name="previewMedia" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,video/mp4,video/webm" className="admin-category-file" /></label>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>PDF Files</legend>
          <div className="admin-product-form-grid">
            <label><span>Preview PDF (optional)</span><input name="previewPdf" type="file" accept="application/pdf" className="admin-category-file" /></label>
            <label><span>Full PDF (protected)</span><input name="fullPdf" type="file" accept="application/pdf" className="admin-category-file" /><small>A protected full PDF is required before publishing.</small></label>
            <label className="admin-product-form-wide"><span>MuseScore file (optional)</span><input name="fullMuseScore" type="file" accept=".mscz,.mscx" className="admin-category-file" /><small>Only .mscz and .mscx files are accepted (maximum 4 MB).</small></label>
          </div>
        </fieldset>

        <fieldset className="admin-product-form-section">
          <legend>Publishing and Featured Settings</legend>
          <div className="admin-product-form-switches">
            <label><input type="checkbox" name="featured" /><span><strong>Featured arrangement</strong><small>Show this product in Featured Arrangements.</small></span></label>
            <label><input type="checkbox" name="published" /><span><strong>Published</strong><small>Make this product available in the shop.</small></span></label>
          </div>
        </fieldset>

        <div className="admin-product-form-actions">
          <Link href="/admin/products" className="admin-products-secondary-link">Cancel</Link>
          <button type="submit" className="admin-products-add-button">Create &amp; Publish Tab</button>
        </div>
      </form>
    </section>
  )
}
