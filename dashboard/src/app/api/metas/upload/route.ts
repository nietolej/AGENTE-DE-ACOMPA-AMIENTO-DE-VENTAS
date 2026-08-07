import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    
    // Parsear el archivo excel
    const workbook = xlsx.read(Buffer.from(buffer), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const data: any[] = xlsx.utils.sheet_to_json(sheet);
    
    if (data.length === 0) {
      return NextResponse.json({ error: 'El archivo Excel está vacío' }, { status: 400 });
    }

    // Validar columnas
    const requiredColumns = ['TIPO', 'CODIGO', 'ANIO', 'META_VENTA'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `El archivo no tiene el formato correcto. Faltan las columnas: ${missingColumns.join(', ')}` 
      }, { status: 400 });
    }

    // Convertir a formato texto separado por |
    const lines = [requiredColumns.join('|')];
    
    for (const row of data) {
      const tipo = String(row['TIPO']).trim().toUpperCase();
      const codigo = String(row['CODIGO']).trim().toUpperCase();
      const anio = String(row['ANIO']).trim();
      const meta = String(row['META_VENTA']).trim();
      
      lines.push(`${tipo}|${codigo}|${anio}|${meta}`);
    }

    const fileContent = lines.join('\n');
    
    // Guardar en el directorio export
    const exportDir = path.join(process.cwd(), process.env.DATA_DIR || '../export');
    const targetFile = path.join(exportDir, 'metas.txt');
    
    await fs.mkdir(exportDir, { recursive: true });
    await fs.writeFile(targetFile, fileContent, 'utf-8');

    return NextResponse.json({ success: true, count: data.length });
  } catch (error: any) {
    console.error('Error al subir metas:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
