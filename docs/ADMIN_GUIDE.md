# Administration

This build has no agency accounts, operational jobs or external delivery. The Sites deployment is private by default. Watch data lives in browser localStorage and is unsuitable for shared agency administration.

Development: install Node dependencies from package-lock.json and optional Python dependencies in a virtual environment. Store keys only as environment variables; .env is ignored. The example downloader reads FIRMS_MAP_KEY from the environment and keeps authenticated URLs out of errors. Check quota and API source availability manually before backfilling.

Raw and Parquet files are ignored by Git. Back up real data volumes before running future ingestion jobs. Browser watch areas are not server-backed and have no administrative recovery path. Production roles, audit logging, delivery retries and retention policies remain to be implemented.

The Sites deployment now stores FIRMS_MAP_KEY as a secret and serves a Worker for observed recent data. The user can trigger bounded regional refreshes; no automatic schedule is enabled. The Python downloader reads process env, and the Node development server can read an ignored .env. Current hosting must remain owner-private until refresh authorization is reconsidered.
