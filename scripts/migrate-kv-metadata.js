import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

try {
  // Use KV bulk get or individual fetching - here we use the wrangler command to list keys, then bulk put
  console.log('Fetching keys from KV...')

  // NOTE: It's required to pass binding or namespace ID for specific envs, assuming default local/dev
  const listCommandOutput = execFileSync('npx', ['wrangler', 'kv', 'key', 'list', '--binding', 'KV'], { encoding: 'utf-8' })
  const keys = JSON.parse(listCommandOutput)

  if (!Array.isArray(keys)) {
    throw new TypeError('Keys is not an array.')
  }

  const updates = []

  for (const key of keys) {
    if (key.name.startsWith('link:')) {
      if (!key.metadata?.url) {
        console.log(`Processing key missing metadata: ${key.name}`)
        const getCommandOutput = execFileSync('npx', ['wrangler', 'kv', 'key', 'get', key.name, '--binding', 'KV'], { encoding: 'utf-8' })

        if (getCommandOutput) {
          try {
            const link = JSON.parse(getCommandOutput)
            if (link && link.url) {
              updates.push({
                key: key.name,
                value: JSON.stringify(link),
                metadata: {
                  ...(key.metadata || {}),
                  url: link.url,
                  comment: link.comment,
                },
              })
            }
          }
          catch (parseError) {
            console.error(`Error parsing JSON for key ${key.name}:`, parseError)
          }
        }
      }
    }
  }

  if (updates.length > 0) {
    console.log(`Found ${updates.length} keys to update.`)
    const bulkFile = 'kv-bulk-updates.json'
    writeFileSync(bulkFile, JSON.stringify(updates))

    console.log('Applying bulk update...')
    execFileSync('npx', ['wrangler', 'kv', 'bulk', 'put', bulkFile, '--binding', 'KV'], { stdio: 'inherit' })

    console.log('Migration completed successfully.')
  }
  else {
    console.log('No keys require metadata migration.')
  }
}
catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
}
