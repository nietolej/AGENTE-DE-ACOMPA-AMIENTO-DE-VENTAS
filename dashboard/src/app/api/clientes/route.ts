import { NextResponse } from 'next/server';
import { parseTxtFile } from '@/lib/queries/parser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json([]);
  }

  const term = query.toUpperCase();
  try {
    const clientes = await parseTxtFile('clientes.txt');
    
    // Filtramos clientes que coincidan con el término, limitamos a 10 resultados
    const results = clientes.filter(c => {
      return (c.nomcli && c.nomcli.toUpperCase().includes(term)) ||
             (c.codcli && c.codcli.includes(term)) ||
             (c.codcli && parseInt(c.codcli).toString().includes(term));
    }).slice(0, 10);

    return NextResponse.json(results);
  } catch (err) {
    console.error("Error en API /api/clientes:", err);
    return NextResponse.json([]);
  }
}
