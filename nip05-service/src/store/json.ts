import fs from 'fs/promises';
import path from 'path';
import { User, UserStore } from './interface';

interface UsersFile {
  users: User[];
}

export class JsonUserStore implements UserStore {
  private filePath: string;
  private cache: User[] | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async load(): Promise<User[]> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed: UsersFile = JSON.parse(data);
      this.cache = parsed.users || [];
      return this.cache;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await this.ensureFileExists();
        return [];
      }
      throw error;
    }
  }

  private async ensureFileExists(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify({ users: [] }, null, 2));
    this.cache = [];
  }

  async findByName(name: string): Promise<User | null> {
    const users = await this.load();
    return users.find(u => u.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async getAll(): Promise<User[]> {
    return this.load();
  }
}
