export async function action<T>(body: Record<string,unknown>): Promise<T> {
  const response = await fetch('/api/action', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Save failed. Please try again.');
  return json.data as T;
}
