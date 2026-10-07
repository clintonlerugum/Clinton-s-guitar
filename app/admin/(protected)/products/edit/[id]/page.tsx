import { prisma } from '../../../../../../lib/prisma'

export default async function EditProduct({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return <div>Product not found</div>

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Edit Tab</h1>
      <form action={`/api/admin/products/${product.id}`} method="post" encType="multipart/form-data" className="grid grid-cols-1 gap-3 max-w-xl">
        <input name="title" defaultValue={product.title} required className="px-3 py-2 bg-gray-800 rounded" />
        <input name="artist" defaultValue={product.artist} required className="px-3 py-2 bg-gray-800 rounded" />
        <input name="slug" defaultValue={product.slug} className="px-3 py-2 bg-gray-800 rounded" />
        <textarea name="description" defaultValue={product.description ?? ''} className="px-3 py-2 bg-gray-800 rounded"></textarea>
        <input name="price" type="number" min="1" step="1" defaultValue={product.price} required className="px-3 py-2 bg-gray-800 rounded" />
        <div>
          <label htmlFor="tuning" className="text-sm text-gray-400 block mb-1">Tuning</label>
          <input id="tuning" name="tuning" defaultValue={product.tuning ?? ''} placeholder="e.g. Standard (E A D G B E), Drop D, DADGAD, Open G" className="px-3 py-2 bg-gray-800 rounded" />
        </div>
        <div>
          <label htmlFor="difficulty" className="text-sm text-gray-400 block mb-1">Difficulty</label>
          <select id="difficulty" name="difficulty" required defaultValue={product.difficulty ?? ''} className="px-3 py-2 bg-gray-800 rounded">
            {!product.difficulty && <option value="" disabled>Select difficulty</option>}
            {!['Beginner', 'Intermediate', 'Advanced'].includes(product.difficulty ?? '') && product.difficulty && (
              <option value={product.difficulty}>{product.difficulty} (existing)</option>
            )}
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div>
          <div className="text-sm text-gray-400">Current cover</div>
          {product.coverImage && <img src={product.coverImage} className="w-32 mt-2" />}
          <input name="coverImage" type="file" accept="image/*" />
        </div>

        <div>
          <div className="text-sm text-gray-400">Current preview</div>
          {product.previewPdf && <a href={product.previewPdf} className="text-accent">Preview PDF</a>}
          <input name="previewPdf" type="file" accept="application/pdf" />
        </div>

        <div>
          <div className="text-sm text-gray-400">Current audio/video preview</div>
          {product.previewMedia && <a href={product.previewMedia} className="text-accent">Open preview</a>}
          <input name="previewMedia" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,video/mp4,video/webm" />
        </div>

        <div>
          <div className="text-sm text-gray-400">Full PDF (protected)</div>
          {product.fullPdf && <div className="text-sm text-gray-400">Uploaded (protected)</div>}
          <input name="fullPdf" type="file" accept="application/pdf" />
        </div>

        <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={product.featured} /> Featured</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={product.published} /> Published</label>

        <button type="submit" className="px-4 py-2 bg-accent text-black rounded">Save Changes</button>
      </form>
    </section>
  )
}