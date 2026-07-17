import { NextResponse } from 'next/server';
import { parseTxtFile } from '@/lib/queries/parser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const clientes = await parseTxtFile('clientes.txt');
    const term = query.toUpperCase();
    
    // Filtrar coincidencias
    const matches = clientes.filter(c => 
      c.codcli.includes(term) || 
      (c.nomcli && c.nomcli.toUpperCase().includes(term))
    );

    // Formatear resultados y limitar a 10
    const results = matches.slice(0, 10).map(c => ({
      codcli: c.codcli,
      nomcli: c.nomcli
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error en API de clientes:", error);
    return NextResponse.json({ error: 'Error interno leyendo archivo' }, { status: 500 });
  }
}
