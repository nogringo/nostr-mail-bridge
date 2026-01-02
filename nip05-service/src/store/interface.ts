export interface User {
  name: string;
  pubkey: string;
}

export interface UserStore {
  findByName(name: string): Promise<User | null>;
  getAll(): Promise<User[]>;
}
