export interface Resource {
  id: string;
  name: string;
  available: number;
  description?: string;
  category?: string;
  lastUpdated?: string;
}