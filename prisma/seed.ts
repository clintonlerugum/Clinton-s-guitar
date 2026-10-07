import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true }
  })

  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword || adminPassword.length < 16) {
      throw new Error('Set ADMIN_PASSWORD to a securely generated password of at least 16 characters before creating the initial admin.')
    }

    const password = await bcrypt.hash(adminPassword, 10)
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: 'Admin',
        password,
        role: 'ADMIN'
      }
    })
  }

  // Sample products
  const samples = [
    {
      title: 'Unanifaa',
      slug: 'unanifaa',
      artist: 'Iyaani',
      description: 'Sample arrangement for Unanifaa',
      price: 300,
      currency: 'KES',
      difficulty: 'Intermediate',
      category: 'Afropop',
      coverImage: '/placeholders/cover1.jpg',
      previewPdf: '/placeholders/preview1.pdf',
      fullPdf: 'supabase://clintons-guitar-private/protected/full1.pdf',
      featured: true,
      published: true
    },
    {
      title: 'Coming Home',
      slug: 'coming-home',
      artist: 'Sauti Sol',
      description: 'Coming Home arrangement',
      price: 400,
      currency: 'KES',
      difficulty: 'Easy',
      category: 'Soul',
      coverImage: '/placeholders/cover2.jpg',
      previewPdf: '/placeholders/preview2.pdf',
      fullPdf: 'supabase://clintons-guitar-private/protected/full2.pdf',
      featured: false,
      published: true
    },
    {
      title: 'Midnight Train',
      slug: 'midnight-train',
      artist: 'Sauti Sol',
      description: 'Midnight Train arrangement',
      price: 350,
      currency: 'KES',
      difficulty: 'Advanced',
      category: 'Rock',
      coverImage: '/placeholders/cover3.jpg',
      previewPdf: '/placeholders/preview3.pdf',
      fullPdf: 'supabase://clintons-guitar-private/protected/full3.pdf',
      featured: false,
      published: true
    }
  ]

  for (const p of samples) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
