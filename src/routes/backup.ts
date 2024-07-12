import express, { Request, Response } from 'express';
import Docker, { Container } from 'dockerode';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import path from 'path';
import * as tar from 'tar';

import {gzip} from 'node-gzip';
interface BackupRequestBody {
  containerName: string;
  rootPassword: string;
  databaseName: string;
}

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const ERROR_MESSAGES = {
  REQUIRED_FIELDS: 'Container name, root password, and database name are required',
  DB_CONNECTION_FAILED: 'Database connection failed',
  BACKUP_FAILED: 'Backup failed',
  RESTORE_FAILED: 'Restore failed',
};

async function testDatabaseConnection(container: Container, rootPassword: string): Promise<boolean> {
  const testExec = await container.exec({
    Cmd: ['mariadb', '-u', 'root', `-p${rootPassword}`, '-e', 'SELECT 1'],
    AttachStdout: true,
    AttachStderr: true,
  });

  const testStream = await testExec.start({});
  let successConnection = false;

  return new Promise((resolve, reject) => {
    testStream.on('data', (chunk: Buffer) => {
      const data = chunk.toString().trim();
      successConnection = !data.includes('ERROR');
    });

    testStream.on('end', () => {
      successConnection ? resolve(true) : reject(new Error(ERROR_MESSAGES.DB_CONNECTION_FAILED));
    });
  });
}

async function performBackup(container: Container, rootPassword: string, databaseName: string, backupFileName: string): Promise<void> {
  const exec = await container.exec({
    Cmd: ['mariadb-dump', '-u', 'root', `-p${rootPassword}`, databaseName],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({});
  const backupFile = fs.createWriteStream(backupFileName);

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => backupFile.write(chunk));
    stream.on('end', () => {
      backupFile.end();
      resolve();
    });
    stream.on('error', reject);
  });
}

async function handleFileUpload(container: Container, file: Express.Multer.File, rootPassword: string, databaseName: string): Promise<void> {
  const filePath = file.path;
  const containerFilePath = `/tmp/${path.basename(filePath)}`;
  const tarFilePath = `${filePath}.tar`;

  await tar.c(
    {
      file: tarFilePath,
      cwd: path.dirname(filePath),
    },
    [path.basename(filePath)]
  );

  await new Promise<void>((resolve, reject) => {
    container.putArchive(fs.createReadStream(tarFilePath), { path: '/tmp' }, (err) => {
      if (err) {
        console.error(`Error copying file to container: ${err}`);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const command = `mariadb -u root -p${rootPassword} ${databaseName} < ${containerFilePath}`;
  const commandIfGzip = `gunzip -c ${containerFilePath} | mariadb -u root -p${rootPassword} ${databaseName}`;

  const restoreExec = await container.exec({
    Cmd: ['bash', '-c', file.mimetype === 'application/gzip' ? commandIfGzip : command],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
  });

  const restoreStream = await restoreExec.start({});
  container.modem.demuxStream(restoreStream, process.stdout, process.stderr);

  return new Promise((resolve, reject) => {
    restoreStream.on('end', () => {
      container.exec({ Cmd: ['rm', containerFilePath] });
      fs.unlinkSync(filePath);
      fs.unlinkSync(tarFilePath);
      resolve();
    });
    restoreStream.on('error', reject);
  });
}

router.post('/backup', async (req: Request, res: Response) => {
  const { containerName, rootPassword, databaseName } = req.body as BackupRequestBody;
  if (!containerName || !rootPassword || !databaseName) {
    return res.status(400).json({ error: ERROR_MESSAGES.REQUIRED_FIELDS });
  }

  const container = docker.getContainer(containerName);
  try {
    await testDatabaseConnection(container, rootPassword);
    const backupFileName = `backup_${Date.now()}.sql`;
    await performBackup(container, rootPassword, databaseName, backupFileName);
    const file = fs.readFileSync(backupFileName);
    const compressedFile = await gzip(file);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename=${backupFileName}.gz`);
    res.send(compressedFile);
    fs.unlinkSync(backupFileName); 
  } catch (error) {
    console.error(`Backup error: ${error}`);
    return res.status(500).json({ error: ERROR_MESSAGES.BACKUP_FAILED });
  }
});

router.post('/restore', upload.single('file'), async (req: Request, res: Response) => {
  const { containerName, rootPassword, databaseName } = req.body as BackupRequestBody;
  const file = req.file;

  if (!containerName || !rootPassword || !databaseName || !file) {
    return res.status(400).json({ error: ERROR_MESSAGES.REQUIRED_FIELDS });
  }

  const container = docker.getContainer(containerName);
  try {
    await testDatabaseConnection(container, rootPassword);
    await handleFileUpload(container, file, rootPassword, databaseName);
    res.json({ message: 'Restore successful' });
  } catch (error) {
    console.error(`Restore error: ${error}`);
    return res.status(500).json({ error: ERROR_MESSAGES.RESTORE_FAILED });
  }
});


router.post('/clone', async (req: Request, res: Response) => {
  return res.status(200).json({ error: 'Not implemented' });

});



export default router;