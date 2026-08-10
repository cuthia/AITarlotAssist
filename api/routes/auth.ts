import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
}

const users: Record<string, User> = {};

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  if (users[email]) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }
  
  const newUser: User = {
    id: uuidv4(),
    email,
    password,
    name,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    createdAt: new Date().toISOString(),
  };
  
  users[email] = newUser;
  
  res.status(201).json({
    token: `token-${newUser.id}`,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatarUrl: newUser.avatarUrl,
      createdAt: newUser.createdAt,
    },
  });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  const user = users[email];
  
  if (!user || user.password !== password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  
  res.json({
    token: `token-${user.id}`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
});

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  const userId = token.replace('token-', '');
  const user = Object.values(users).find(u => u.id === userId);
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
});

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true });
});

export default router;
