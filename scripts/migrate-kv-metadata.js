import { execFileSync } from 'node:child_process'

const namespaceBinding = process.argv[2] || 'KV'

console.log(`Starting KV metadata migration for binding: ${namespaceBinding}`)

try {
  const listOutput = execFileSync('npx', ['wrangler', 'kv:key', 'list', '--binding', namespaceBinding], { encoding: 'utf-8' })
  const keys = JSON.parse(listOutput)

  let migratedCount = 0

  for (const key of keys) {
    if (key.name.startsWith('link:') && (!key.metadata || !key.metadata.url)) {
      console.log(`Migrating key: ${key.name}`)

      const valueOutput = execFileSync('npx', ['wrangler', 'kv:key', 'get', key.name, '--binding', namespaceBinding], { encoding: 'utf-8' })

      let link
      try {
        link = JSON.parse(valueOutput)
      }
      catch {
        console.error(`Failed to parse value for ${key.name}, skipping. Value:`, valueOutput)
        continue
      }

      if (link) {
        const metadata = {
          ...key.metadata,
          url: link.url,
          comment: link.comment,
        }

        const putArgs = [
          'wrangler',
          'kv:key',
          'put',
          key.name,
          JSON.stringify(link),
          '--binding',
          namespaceBinding,
          '--metadata',
          JSON.stringify(metadata),
        ]

        if (key.expiration) {
          putArgs.push('--expiration', key.expiration.toString())
        }

        execFileSync('npx', putArgs, { encoding: 'utf-8' })
        migratedCount++
      }
    }
  }

  console.log(`Migration completed. Migrated ${migratedCount} keys.`)
}
catch (err) {
  console.error('Error during migration:', err)
  process.exit(1)
}
