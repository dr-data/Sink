
## 2024-05-05 - Avoid Inline KV Migrations in Read Operations
**Learning:** Found that executing `KV.put` inline during a read (`GET`) operation (such as listing or searching links) to retroactively populate missing metadata caused severe performance degradation and excessive database write operations (over 66k/month). This pattern of "forward compatible" inline migration is an anti-pattern for serverless environments.
**Action:** Always prefer out-of-band/offline migration scripts for backfilling data or metadata. Ensure `GET` endpoints remain purely read-only to guarantee scalable performance.
