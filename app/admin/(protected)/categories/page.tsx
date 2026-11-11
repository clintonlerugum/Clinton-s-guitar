import { prisma } from '../../../../lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  })

  return (
    <section className="admin-category-management">
      <header className="admin-category-heading">
        <div>
          <span className="admin-eyebrow">Store organization</span>
          <h1>Categories</h1>
          <p>Create and manage the categories shown to customers. Existing products are not assigned automatically.</p>
        </div>
        <span className="admin-category-total">{categories.length} categories</span>
      </header>

      <form action="/api/admin/categories" method="post" encType="multipart/form-data" className="admin-category-form admin-category-create">
        <input type="hidden" name="_action" value="create" />
        <h2>Create a category</h2>
        <div className="admin-category-fields">
          <label>
            <span>Category name</span>
            <input name="name" required maxLength={80} className="form-input" placeholder="e.g. Fingerstyle" />
          </label>
          <label>
            <span>Description</span>
            <input name="description" required maxLength={240} className="form-input" placeholder="A short introduction for customers" />
          </label>
          <label>
            <span>Category image</span>
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required className="admin-category-file" />
          </label>
        </div>
        <label className="admin-category-active"><input type="checkbox" name="active" defaultChecked /> Active and visible on the homepage</label>
        <button type="submit" className="btn btn-primary">Create Category</button>
      </form>

      <div className="admin-category-list">
        {categories.length === 0 ? (
          <p className="admin-category-empty">No categories yet. Create your first category above.</p>
        ) : categories.map((category) => (
          <article className="admin-category-item" key={category.id}>
            <div className="admin-category-card-top">
              <img src={category.image} alt="" className="admin-category-preview" />
              <div className="admin-category-product-count">
                <strong>{category._count.products}</strong>
                <span>{category._count.products === 1 ? 'product' : 'products'}</span>
              </div>
            </div>
            <form action="/api/admin/categories" method="post" encType="multipart/form-data" className="admin-category-form">
              <input type="hidden" name="_action" value="update" />
              <input type="hidden" name="id" value={category.id} />
              <div className="admin-category-fields">
                <label>
                  <span>Category name</span>
                  <input name="name" required maxLength={80} defaultValue={category.name} className="form-input" />
                </label>
                <label>
                  <span>Description</span>
                  <input name="description" required maxLength={240} defaultValue={category.description} className="form-input" />
                </label>
                <label>
                  <span>Change image</span>
                  <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="admin-category-file" />
                </label>
              </div>
              <button type="submit" className="admin-category-save">Save Changes</button>
            </form>
            <div className="admin-category-actions">
              <span className={`admin-category-status${category.active ? ' is-active' : ''}`}>{category.active ? 'Active' : 'Inactive'}</span>
              <form action="/api/admin/categories" method="post">
                <input type="hidden" name="_action" value="toggle" />
                <input type="hidden" name="id" value={category.id} />
                <button type="submit" className="admin-category-action">{category.active ? 'Deactivate' : 'Activate'}</button>
              </form>
              <form action="/api/admin/categories" method="post">
                <input type="hidden" name="_action" value="delete" />
                <input type="hidden" name="id" value={category.id} />
                <button type="submit" className="admin-category-action is-delete" title="Deleting a category removes its assignments only, not its products">Delete</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
