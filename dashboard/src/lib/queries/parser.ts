import fs from 'fs/promises';
import path from 'path';

// Utilidad para mantener un cache en memoria por request/tiempo para no leer el archivo cientos de veces
const cache = new Map<string, { time: number, data: any[] }>();
const CACHE_TTL = 0; // Force re-read every time (no cache)

export async function parseTxtFile(filename: string): Promise<any[]> {
  const exportDir = path.join(process.cwd(), process.env.DATA_DIR || '../export');
  
  if (cache.has(filename)) {
    const cached = cache.get(filename)!;
    if (Date.now() - cached.time < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    let subdirs: string[] = [];
    try {
      const items = await fs.readdir(exportDir, { withFileTypes: true });
      subdirs = items
        .filter(item => item.isDirectory() && (item.name === '2025' || item.name === '2026'))
        .map(item => item.name);
    } catch(e) {
      console.warn("Could not read export directory:", e);
    }
    
    const pathsToTry = subdirs.map(dir => path.join(exportDir, dir, filename));
    pathsToTry.push(path.join(exportDir, filename)); // Siempre intentar la raíz también

    const fileContents = await Promise.all(
      pathsToTry.map(async (filepath) => {
        try {
          return await fs.readFile(filepath, 'utf-8');
        } catch (err: any) {
          if (err.code !== 'ENOENT') {
            console.error(`Error reading ${filepath}:`, err);
          }
          return null;
        }
      })
    );

    let allData: any[] = [];
    let headers: string[] | null = null;
    let foundAny = false;

    for (const content of fileContents) {
      if (!content) continue;
      
      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) continue;

      foundAny = true;
      const currentHeaders = lines[0].split('|').map(h => h.trim().toLowerCase());
      
      if (!headers) {
          headers = currentHeaders;
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('|');
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = values[j] ? values[j].trim() : '';
        }
        allData.push(obj);
      }
    }
    
    if (!foundAny) {
        console.warn(`File ${filename} not found in root or year subdirectories.`);
        return [];
    }

    // Deduplicate master files by primary key, keeping the latest (2026 overrides 2023)
    const primaryKeys: Record<string, string> = {
      'clientes.txt': 'codcli',
      'vendedores.txt': 'codven',
      'marcas.txt': 'codmar',
      'grupos.txt': 'codgrup',
      'proveedores.txt': 'codpro',
      'almacenes.txt': 'codalm',
      'inventario.txt': 'codart'
    };
    
    const pk = primaryKeys[filename];
    if (pk && headers?.includes(pk)) {
      const uniqueMap = new Map();
      for (const item of allData) {
        uniqueMap.set(item[pk], item); // Latest year will overwrite previous years
      }
      allData = Array.from(uniqueMap.values());
    }

    cache.set(filename, { time: Date.now(), data: allData });
    return allData;
  } catch (err) {
    console.error(`Error processing ${filename}:`, err);
    return [];
  }
}
