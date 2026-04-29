## 2024-04-29 - [Inline KV.put Performance Bottleneck]
**Learning:** [Inline database migrations within read operations (GET requests) like `KV.put` cause excessive write operations and degradation in serverless/KV environments.]
**Action:** [Use offline migration scripts instead of adding `KV.put` statements to read handlers to keep write costs low and read performance high.]

## 2024-04-29 - [Node child_process execSync Security]
**Learning:** [Using `execSync` with string interpolation for `wrangler` CLI commands in node scripts introduces shell command injection vulnerabilities.]
**Action:** [Always use `execFileSync` from `node:child_process` and pass command line arguments as an array to ensure they are properly escaped.]