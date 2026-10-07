import bcrypt from 'bcrypt'

const adminEmail = 'clintonlerugum@gmail.com'
const { loadEnvConfig } = require('@next/env') as typeof import('@next/env')
loadEnvConfig(process.cwd())

function readHidden(prompt: string) {
  return new Promise<string>((resolve, reject) => {
    const input = process.stdin
    if (!input.isTTY) {
      reject(new Error('Run this command in an interactive terminal.'))
      return
    }

    const previousRawMode = input.isRaw
    input.setEncoding('utf8')
    input.setRawMode(true)
    input.resume()
    process.stdout.write(prompt)
    let value = ''

    const finish = (error?: Error) => {
      input.setRawMode(previousRawMode ?? false)
      input.pause()
      input.off('data', onData)
      process.stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }

    const onData = (chunk: string | Buffer) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          finish(new Error('Password reset cancelled.'))
          return
        }
        if (character === '\r' || character === '\n') {
          finish()
          return
        }
        if (character === '\u007f' || character === '\b') {
          value = [...value].slice(0, -1).join('')
          continue
        }
        if (character >= ' ') value += character
      }
    }

    input.on('data', onData)
  })
}

async function main() {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.')

  const { prisma } = require('../lib/prisma') as typeof import('../lib/prisma')
  try {
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, role: true }
    })
    if (!user) throw new Error(`No account found for ${adminEmail}. No changes were made.`)
    if (user.role !== 'ADMIN') throw new Error(`The account ${adminEmail} is not an ADMIN. No changes were made.`)

    const password = await readHidden('New password (input hidden): ')
    if (password.length < 12) throw new Error('Use a password with at least 12 characters. No changes were made.')
    if (Buffer.byteLength(password, 'utf8') > 72) throw new Error('Password must be no more than 72 UTF-8 bytes for bcrypt. No changes were made.')

    const confirmation = await readHidden('Confirm new password (input hidden): ')
    if (password !== confirmation) throw new Error('Passwords do not match. No changes were made.')

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: user.id }, data: { password: passwordHash } })
    console.log(`Password hash updated for ${adminEmail}. Email and role were not changed.`)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Password reset failed.')
    process.exitCode = 1
  })