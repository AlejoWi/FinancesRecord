import { api } from './client.js';
// Fetch the category catalog from the API and return it.
export async function fetchCategories() {
  const { categories } = await api.get('/api/categories');
  return categories;
}
