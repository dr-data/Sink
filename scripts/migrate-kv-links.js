import { execFileSync } from 'node:child_process'

const KV_NAMESPACE_BINDING = 'KV' // Binding name used in wrangler

async function migrate() {
  console.log('Starting migration for KV links...')
  let count = 0

  try {
    // List keys
    const stdout = execFileSync('npx', ['wrangler', 'kv:key', 'list', `--binding=${KV_NAMESPACE_BINDING}`, '--prefix=link:'], { encoding: 'utf-8' })
    const keys = JSON.parse(stdout)

    for (const keyObj of keys) {
      if (!keyObj.metadata || !keyObj.metadata.url) {
        console.log(`Migrating key: ${keyObj.name}`)
        // Fetch value and existing metadata
        const getStdout = execFileSync('npx', ['wrangler', 'kv:key', 'get', `--binding=${KV_NAMESPACE_BINDING}`, keyObj.name], { encoding: 'utf-8' })
        const link = JSON.parse(getStdout)

        if (link) {
          const newMetadata = {
            ...(keyObj.metadata || {}),
            url: link.url,
            comment: link.comment,
          }

          // Note: `wrangler kv:key put` with metadata via CLI is tricky.
          // The metadata can be passed as a string JSON to --metadata.
          // Let's use `execFileSync`

          let expirationArg = []
          if (keyObj.expiration) {
            expirationArg = ['--expiration', keyObj.expiration.toString()]
          }

          execFileSync('npx', [
            'wrangler',
            'kv:key',
            'put',
            `--binding=${KV_NAMESPACE_BINDING}`,
            keyObj.name,
            JSON.stringify(link),
            '--metadata',
            JSON.stringify(newMetadata),
            ...expirationArg,
          ], { encoding: 'utf-8' })

          console.log(`Successfully migrated ${keyObj.name}`)
          count++
        }
      }
    }

    console.log(`Migration completed! Migrated ${count} links.`)
  }
  catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

migrate()
