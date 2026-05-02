import { execFileSync } from 'node:child_process'

const BINDING = 'KV'

function runWrangler(args) {
  try {
    const output = execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8' })
    return output
  }
  catch (err) {
    console.error(`Error running wrangler command: npx wrangler ${args.join(' ')}`)
    console.error(err.stdout)
    console.error(err.stderr)
    throw err
  }
}

async function migrate() {
  console.log('Fetching keys...')
  let keys = []
  try {
    const listOutput = runWrangler(['kv', 'key', 'list', '--binding', BINDING, '--prefix', 'link:'])
    keys = JSON.parse(listOutput)
  }
  catch (err) {
    console.error('Failed to list keys.', err)
    process.exit(1)
  }

  console.log(`Found ${keys.length} total keys.`)

  let migratedCount = 0
  for (const key of keys) {
    if (!key.metadata || !key.metadata.url) {
      console.log(`Migrating key: ${key.name}`)
      try {
        const valueOutput = runWrangler(['kv', 'key', 'get', key.name, '--binding', BINDING])

        let link
        try {
          link = JSON.parse(valueOutput)
        }
        catch {
          console.error(`Could not parse JSON for ${key.name}: ${valueOutput}`)
          continue
        }

        if (link && link.url) {
          const newMetadata = {
            ...key.metadata,
            url: link.url,
            comment: link.comment,
          }

          const putArgs = [
            'kv',
            'key',
            'put',
            key.name,
            valueOutput,
            '--binding',
            BINDING,
            '--metadata',
            JSON.stringify(newMetadata),
          ]

          if (key.expiration) {
            putArgs.push('--expiration', key.expiration.toString())
          }

          runWrangler(putArgs)
          migratedCount++
          console.log(`Successfully migrated ${key.name}`)
        }
      }
      catch (err) {
        console.error(`Failed to migrate key: ${key.name}`, err)
      }
    }
  }

  console.log(`Migration complete. Migrated ${migratedCount} keys.`)
}

migrate().catch(console.error)
