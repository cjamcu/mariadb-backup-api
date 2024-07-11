import express from 'express';

import { authenticateApiKey } from './middleware/auth';
import backupRoutes from './routes/backup';

const app = express();

app.use(express.json());
app.use(authenticateApiKey);
app.use('/api', backupRoutes);




app.listen(3000, '0.0.0.0', () => {
  console.log(`Server running on port ${3000}`);
});