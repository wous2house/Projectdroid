
import express from 'express';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer(config = {}) {
  const app = express();
  const PORT = config.PORT || process.env.PORT || 3000;
  
  // Belangrijk: Gebruik de doorgegeven data path of fallback naar lokale map
  const DATA_DIR = config.PROJECTDROID_DATA_PATH || process.env.PROJECTDROID_DATA_PATH || __dirname;
  const DB_FILE = path.join(DATA_DIR, 'data.json');

  console.log(`[Projectdroid Server] Database: ${DB_FILE}`);

  app.use(cors());
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  // Database initialisatie
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      projects: [], activities: [], customers: [],
      users: [{
        id: 'u-wouter', 
        name: 'Wouter', 
        role: 'admin',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wouter',
        title: 'Hoofdbeheerder', 
        email: 'wouter@webdroids.nl',
        password: 'F$dgh7(bsh<Cdj2'
      }]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }

  const getData = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

  // Sync API Key middleware
  const checkApiKey = (req, res, next) => {
    const providedKey = req.headers['x-api-key'];
    const serverKey = process.env.PROJECTDROID_API_KEY || 'default-dev-key-123';
    
    if (!providedKey || providedKey !== serverKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
  };

  // API Routes
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const data = getData();
    const user = data.users.find(u => u.email === email && u.password === password);
    if (user) {
      res.json({ user, data });
    } else {
      res.status(401).json({ error: 'Onjuist e-mailadres of wachtwoord.' });
    }
  });

  app.get('/api/data', checkApiKey, (req, res) => res.json(getData()));
  
  app.post('/api/customers', (req, res) => {
    const data = getData();
    const newItem = { ...req.body, id: Math.random().toString(36).substring(2, 11), createdAt: new Date().toISOString() };
    data.customers.push(newItem);
    saveData(data);
    res.status(201).json(newItem);
  });

  app.put('/api/customers/:id', (req, res) => {
    const data = getData();
    data.customers = data.customers.map(c => c.id === req.params.id ? { ...c, ...req.body } : c);
    saveData(data);
    res.json({ message: 'OK' });
  });

  app.delete('/api/customers/:id', (req, res) => {
    const data = getData();
    data.customers = data.customers.filter(c => c.id !== req.params.id);
    saveData(data);
    res.status(204).send();
  });

  app.post('/api/projects', (req, res) => {
    const data = getData();
    const newItem = { ...req.body, id: Math.random().toString(36).substring(2, 11), createdAt: new Date().toISOString() };
    data.projects.push(newItem);
    saveData(data);
    res.status(201).json(newItem);
  });

  app.put('/api/projects/:id', (req, res) => {
    const data = getData();
    data.projects = data.projects.map(p => p.id === req.params.id ? req.body : p);
    saveData(data);
    res.json(req.body);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const data = getData();
    data.projects = data.projects.filter(p => p.id !== req.params.id);
    saveData(data);
    res.status(204).send();
  });

  app.put('/api/users/:id', (req, res) => {
    const data = getData();
    data.users = data.users.map(u => u.id === req.params.id ? { ...u, ...req.body } : u);
    saveData(data);
    res.json({ message: 'OK' });
  });

  app.post('/api/admin/restore', checkApiKey, (req, res) => {
    saveData(req.body);
    res.json({ message: 'Success' });
  });

  const distPath = path.join(__dirname, 'dist');
  
  const isProduction = config.isProduction || process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  } else {
    app.use(express.static(__dirname));
  }

  const portStr = String(PORT);
  const listenArgs = isNaN(Number(portStr)) 
    ? [portStr] 
    : [Number(portStr), '0.0.0.0'];

  const server = app.listen(...listenArgs, () => {
    console.log(`[Projectdroid Server] Actief op poort/pipe ${PORT}`);
  });

  return server;
}

// Start server if NOT running inside Electron
if (!process.versions?.electron) {
  startServer();
}
