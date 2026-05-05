import { execFileSync } from 'node:child_process'

async function migrate() {
  console.log('Starting KV metadata migration...')

  let listResultStr
  try {
    listResultStr = execFileSync('npx', ['wrangler', 'kv', 'key', 'list', '--binding', 'KV', '--prefix', 'link:'], { encoding: 'utf8' })
  }
  catch (err) {
    console.error('Failed to list keys:', err)
    process.exit(1)
  }

  // Find where the JSON array starts in case there are npm warnings before it
  const jsonStart = listResultStr.indexOf('[')
  if (jsonStart === -1) {
    console.error('Failed to find JSON array in list output:', listResultStr)
    process.exit(1)
  }

  const listResult = JSON.parse(listResultStr.substring(jsonStart))

  console.log(`Found ${listResult.length} keys with prefix 'link:'. Processing...`)

  let processedCount = 0
  let migratedCount = 0

  for (const item of listResult) {
    const key = item.name
    processedCount++

    // Check if metadata already exists and has 'url'
    if (item.metadata && item.metadata.url) {
      continue
    }

    // Get the value
    let getResultStr
    try {
      getResultStr = execFileSync('npx', ['wrangler', 'kv', 'key', 'get', '--binding', 'KV', key], { encoding: 'utf8' })
    }
    catch (err) {
      console.error(`Failed to get key ${key}:`, err)
      continue
    }

    // Find the first '{' to ignore warnings
    const valStart = getResultStr.indexOf('{')
    if (valStart === -1) {
      console.log(`Key ${key} does not contain valid JSON, skipping.`)
      continue
    }

    let link
    try {
      link = JSON.parse(getResultStr.substring(valStart))
    }
    catch (e) {
      console.error(`Failed to parse value for key ${key}:`, e)
      continue
    }

    if (link && link.url) {
      // Missing metadata, let's put it back with metadata
      const newMetadata = {
        ...(item.metadata || {}),
        url: link.url,
        comment: link.comment,
      }

      const putArgs = ['wrangler', 'kv', 'key', 'put', '--binding', 'KV', key, JSON.stringify(link), '--metadata', JSON.stringify(newMetadata)]

      try {
        execFileSync('npx', putArgs, { encoding: 'utf8' })
        migratedCount++
        console.log(`Migrated ${key}`)
      }
      catch (err) {
        console.error(`Failed to update key ${key}:`, err)
      }
    }
  }

  console.log(`Migration complete. Processed ${processedCount} keys, migrated ${migratedCount} keys.`)
}

migrate()
