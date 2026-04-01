export interface User {
  id: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
}

export interface Cattle {
  id: string;
  userId: string;
  name: string;
  breed: string;
  birthDate: string;
  gender: 'male' | 'female';
  status: 'active' | 'sold' | 'deceased';
  notes?: string;
  createdAt: string;
}

export interface BreedingRecord {
  id: string;
  cattleId: string;
  userId: string;
  date: string;
  partnerId?: string;
  result?: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description?: string;
  cattleId?: string; // Optional: link to specific cattle
  createdAt: string;
}
