import { execFileSync } from 'node:child_process'

// Ensure KV_NAMESPACE_ID is provided
const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID

if (!KV_NAMESPACE_ID) {
  console.error('Error: KV_NAMESPACE_ID environment variable is required.')
  console.error('Usage: KV_NAMESPACE_ID=your_namespace_id node scripts/migrate-kv.mjs')
  process.exit(1)
}

console.log(`Starting KV migration for namespace: ${KV_NAMESPACE_ID}`)

try {
  let cursor = ''
  let hasMore = true
  let processedCount = 0
  let migratedCount = 0

  while (hasMore) {
    // 1. List keys
    const listArgs = ['wrangler', 'kv:key', 'list', '--binding', 'KV', '--namespace-id', KV_NAMESPACE_ID, '--prefix', 'link:']
    if (cursor) {
      listArgs.push('--cursor', cursor)
    }
    const listOutput = execFileSync('npx', listArgs, { encoding: 'utf8' })
    const keysData = JSON.parse(listOutput)

    // Fallback if Wrangler output format changes or is a direct array
    const keys = Array.isArray(keysData) ? keysData : (keysData.result || [])
    // Note: Wrangler currently might not support pagination/cursors natively via cli for list in the same way API does,
    // but typically it outputs an array directly. Let's handle both.

    for (const key of keys) {
      processedCount++
      const keyName = key.name

      // Check if metadata exists and has 'url'
      // Depending on wrangler version, metadata might be in the list output
      if (key.metadata && key.metadata.url) {
        continue // Already migrated
      }

      console.log(`Checking key: ${keyName}`)

      // 2. Get the value for the key
      try {
        const getArgs = ['wrangler', 'kv:key', 'get', '--binding', 'KV', '--namespace-id', KV_NAMESPACE_ID, keyName]
        const valueStr = execFileSync('npx', getArgs, { encoding: 'utf8' })

        if (!valueStr)
          continue

        const link = JSON.parse(valueStr)

        if (link && link.url) {
          // 3. Update the key with metadata
          // Preserve existing metadata and expiration if possible (though get via wrangler CLI might not easily fetch expiration)
          // We will put the existing value back, but attach metadata

          const metadata = {
            url: link.url,
            comment: link.comment,
          }

          // Construct the put command with metadata
          // Note: Wrangler CLI might not support setting metadata via CLI directly in older versions,
          // but recent versions support --metadata (JSON string)
          const metadataStr = JSON.stringify(metadata)

          const putArgs = ['wrangler', 'kv:key', 'put', '--binding', 'KV', '--namespace-id', KV_NAMESPACE_ID, keyName, valueStr, '--metadata', metadataStr]
          execFileSync('npx', putArgs, { stdio: 'ignore' }) // ignore output to reduce noise

          console.log(`Migrated: ${keyName}`)
          migratedCount++
        }
      }
      catch (err) {
        console.error(`Failed to process key ${keyName}:`, err.message)
      }
    }

    // Wrangler list command pagination (if supported by the CLI output)
    if (keysData.cursor) {
      cursor = keysData.cursor
    }
    else {
      hasMore = false
    }
  }

  console.log(`\nMigration completed!`)
  console.log(`Total keys processed: ${processedCount}`)
  console.log(`Keys migrated: ${migratedCount}`)
}
catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
}
