import { execSync } from 'node:child_process'

const namespaceId = process.env.KV_NAMESPACE_ID
if (!namespaceId) {
  console.error('KV_NAMESPACE_ID environment variable is required.')
  process.exit(1)
}

const accountId = process.env.CF_ACCOUNT_ID
const apiToken = process.env.CF_API_TOKEN

if (!accountId || !apiToken) {
  console.log('For large databases (>1000 items), CF_ACCOUNT_ID and CF_API_TOKEN are required for pagination. Falling back to Wrangler CLI for first 1000 items.')
}

async function migrate() {
  let migratedCount = 0

  if (accountId && apiToken) {
    // Use REST API for robust pagination
    let cursor = ''
    let hasMore = true

    while (hasMore) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys?prefix=link:${cursor ? `&cursor=${cursor}` : ''}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`API Error: ${response.statusText}`)
        break
      }

      const data = await response.json()
      const keys = data.result

      for (const keyObj of keys) {
        if (!keyObj.metadata || !keyObj.metadata.url) {
          const keyName = keyObj.name
          console.log(`Migrating ${keyName}...`)
          try {
            const getCommand = `npx wrangler kv:key get --binding KV --namespace-id ${namespaceId} "${keyName}"`
            const valueStr = execSync(getCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
            if (valueStr) {
              const link = JSON.parse(valueStr)
              const newMetadata = { ...(keyObj.metadata || {}), url: link.url, comment: link.comment }
              const metadataStr = JSON.stringify(newMetadata).replace(/'/g, '\'\\\'\'')
              const valueStrEscaped = JSON.stringify(link).replace(/'/g, '\'\\\'\'')
              let putCommand = `npx wrangler kv:key put --binding KV --namespace-id ${namespaceId} "${keyName}" '${valueStrEscaped}' --metadata '${metadataStr}'`
              if (keyObj.expiration) {
                putCommand += ` --expiration ${keyObj.expiration}`
              }
              execSync(putCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
              migratedCount++
            }
          }
          catch (e) {
            console.error(`Failed to migrate ${keyName}: ${e.message}`)
          }
        }
      }

      if (data.result_info && data.result_info.cursor) {
        cursor = data.result_info.cursor
      }
      else {
        hasMore = false
      }
    }
  }
  else {
    // Fallback to basic wrangler list
    const listCommand = `npx wrangler kv:key list --binding KV --namespace-id ${namespaceId} --prefix link:`
    const output = execSync(listCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
    const keys = JSON.parse(output)
    for (const keyObj of keys) {
      if (!keyObj.metadata || !keyObj.metadata.url) {
        const keyName = keyObj.name
        console.log(`Migrating ${keyName}...`)
        try {
          const getCommand = `npx wrangler kv:key get --binding KV --namespace-id ${namespaceId} "${keyName}"`
          const valueStr = execSync(getCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
          if (valueStr) {
            const link = JSON.parse(valueStr)
            const newMetadata = { ...(keyObj.metadata || {}), url: link.url, comment: link.comment }
            const metadataStr = JSON.stringify(newMetadata).replace(/'/g, '\'\\\'\'')
            const valueStrEscaped = JSON.stringify(link).replace(/'/g, '\'\\\'\'')
            let putCommand = `npx wrangler kv:key put --binding KV --namespace-id ${namespaceId} "${keyName}" '${valueStrEscaped}' --metadata '${metadataStr}'`
            if (keyObj.expiration) {
              putCommand += ` --expiration ${keyObj.expiration}`
            }
            execSync(putCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
            migratedCount++
          }
        }
        catch (e) {
          console.error(`Failed to migrate ${keyName}: ${e.message}`)
        }
      }
    }
  }

  console.log(`Migration complete. Migrated ${migratedCount} links.`)
}

migrate().catch(console.error)
