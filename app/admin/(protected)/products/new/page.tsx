import React from 'react'

export default function NewProductPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Add New Tab</h1>
      <form action="/api/admin/products" method="post" encType="multipart/form-data" className="grid grid-cols-1 gap-3 max-w-xl">
        <input name="title" placeholder="Song title" required className="form-input" />
        <input name="artist" placeholder="Artist" required className="form-input" />
        <input name="slug" placeholder="slug (leave blank to use title)" className="form-input" />
        <textarea name="description" placeholder="Description" className="form-input h-32"></textarea>
        <input name="price" type="number" min="1" step="1" required placeholder="Price (KES)" className="form-input" />
        <div>
          <label htmlFor="tuning" className="text-sm text-gray-400 block mb-1">Tuning</label>
          <input id="tuning" name="tuning" placeholder="e.g. Standard (E A D G B E), Drop D, DADGAD, Open G" className="form-input" />
        </div>
        <div>
          <label htmlFor="difficulty" className="text-sm text-gray-400 block mb-1">Difficulty</label>
          <select id="difficulty" name="difficulty" required defaultValue="" className="form-input">
            <option value="" disabled>Select difficulty</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Cover Image</label>
          <input name="coverImage" type="file" accept="image/*" />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Preview PDF</label>
          <input name="previewPdf" type="file" accept="application/pdf" />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Optional audio/video preview</label>
          <input name="previewMedia" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,video/mp4,video/webm" />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Full PDF (protected)</label>
          <input name="fullPdf" type="file" accept="application/pdf" />
        </div>

        <label className="flex items-center gap-2"><input type="checkbox" name="featured" /> Featured</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="published" /> Published</label>
        <button type="submit" className="btn btn-primary">Create &amp; Publish Tab</button>
      </form>
    </section>
  )
}