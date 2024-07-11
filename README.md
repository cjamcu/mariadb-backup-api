# MariaDB Backup API

This API allows performing backup and restore operations for MariaDB databases in Docker containers.

## Requirements
- Docker
- Docker Compose (optional, depending on the development environment)


## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/cjamcu/mariadb-backup-api.git
   cd mariadb-backup-api
   ```

2. **Environment setup:**
Copy the .env.example file to .env in the project root and adjust the variables as necessary.

3. **Start the server:**

   ```bash
   docker compose up
   ```


4. **Access the API:**

   The API will be available at `http://localhost:3000`.




## Api usage
  The API has two endpoints:
  - /api/backup
  - /api/restore

  Both endpoints require an API key to be passed in the header as `X-API-Key`. The API key is set in the .env file.

  The backup endpoint requires the following parameters:
  - containerName: The name of the container where the database is running.
  - rootPassword: The root password of the database.
  - databaseName: The name of the database to backup.


  The restore endpoint requires the following parameters:
  - containerName: The name of the container where the database is running.
  - rootPassword: The root password of the database.
  - databaseName: The name of the database to restore.
  - file: The backup file to restore. This should be a multipart form data file upload.

## Development

To run the server in development mode, you can use the following command:

```bash
pnpm dev
```

This will start the server in development mode with hot reloading enabled.




  