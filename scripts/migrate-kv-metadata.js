import { execFileSync } from 'node:child_process'

const namespaceBinding = process.argv[2] || 'KV'
console.log(`Using KV namespace binding: ${namespaceBinding}`)

let migratedCount = 0

try {
  const args = ['wrangler', 'kv', 'key', 'list', '--binding', namespaceBinding, '--prefix', 'link:']

  console.log('Fetching keys...')
  // We execute wrangler kv key list. Note that this might fail if no KV namespace is configured in wrangler.toml or via env vars.
  const listOutput = execFileSync('npx', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
  const keys = JSON.parse(listOutput)

  for (const key of keys) {
    if (!key.metadata || !key.metadata.url) {
      console.log(`Migrating key: ${key.name}`)
      try {
        const getOutput = execFileSync('npx', ['wrangler', 'kv', 'key', 'get', key.name, '--binding', namespaceBinding], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
        const link = JSON.parse(getOutput)

        if (link && link.url) {
          const metadata = {
            url: link.url,
            comment: link.comment,
          }

          execFileSync('npx', [
            'wrangler',
            'kv',
            'key',
            'put',
            key.name,
            JSON.stringify(link),
            '--binding',
            namespaceBinding,
            '--metadata',
            JSON.stringify(metadata),
          ], { stdio: 'inherit' })

          migratedCount++
        }
      }
      catch (err) {
        console.error(`Failed to migrate key ${key.name}: ${err.message}`)
      }
    }
  }
  console.log(`Migration complete. Migrated ${migratedCount} keys.`)
}
catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
}
