import express, { Express } from 'express';
import cors from 'cors';
import { authenticateApiKey } from './middleware/auth';
import backupRoutes from './routes/backup';

const app: Express = express();

const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

const corsOptions: cors.CorsOptions = {
  origin: function (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(authenticateApiKey);
app.use('/api', backupRoutes);

const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});