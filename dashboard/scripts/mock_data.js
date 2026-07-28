const fs = require('fs');
const path = require('path');

const EXPORT_DIR = 'd:/Users/USUARIO/Documents/PROYECTOS IDE/AGENTE DE ACOMPAÑAMIENTO DE VENTAS/export';
const SOURCE_YEAR = '2026';
const TARGET_YEAR = '2023';

function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split('|').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('|');
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] ? values[j].trim() : '';
        }
        data.push(obj);
    }
    return data;
}

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(year) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0] + ' 00:00:00';
}

function generateMockData() {
    console.log(`Reading catalogs from ${SOURCE_YEAR}...`);
    
    const clientesTxt = fs.readFileSync(path.join(EXPORT_DIR, SOURCE_YEAR, 'clientes.txt'), 'utf-8');
    const vendedoresTxt = fs.readFileSync(path.join(EXPORT_DIR, SOURCE_YEAR, 'vendedores.txt'), 'utf-8');
    const inventarioTxt = fs.readFileSync(path.join(EXPORT_DIR, SOURCE_YEAR, 'inventario.txt'), 'utf-8');
    
    const clientes = parseCSV(clientesTxt);
    const vendedores = parseCSV(vendedoresTxt);
    const inventario = parseCSV(inventarioTxt);
    
    if (!clientes.length || !inventario.length || !vendedores.length) {
        console.error("Catalogs are empty. Cannot generate mock data.");
        return;
    }
    
    console.log(`Generating simulated invoices, collections, and movements for ${TARGET_YEAR}...`);
    
    const numInvoices = 8000;
    let facturasEncLines = ['numfac|cliente|nomcli|tipo|codven|emision|tot_fac|vence|numped'];
    let facturasRenLines = ['numfac|item|codart|descrip|cantidad|precio|desc|tot_ren|emision|grupo'];
    let cobranzasLines = ['codmovcli|numdoc|tipo|codven|emision|vence|importe|refer|concepto'];
    let movimientosLines = ['codmovart|fecha_mov|tipinv|cantidad|almacen|numdoc'];
    
    let baseInvoiceNumber = 100000;
    
    for (let i = 0; i < numInvoices; i++) {
        const cliente = getRandom(clientes);
        let vendedorCod = cliente.vendedor;
        if (!vendedorCod || vendedorCod.trim() === '') {
            vendedorCod = getRandom(vendedores).codven;
        }
        
        const numfac = (baseInvoiceNumber + i).toString();
        const emision = getRandomDate(TARGET_YEAR);
        
        const emisionDate = new Date(emision.split(' ')[0]);
        emisionDate.setDate(emisionDate.getDate() + 30);
        const vence = emisionDate.toISOString().split('T')[0] + ' 00:00:00';
        
        const numItems = Math.floor(Math.random() * 5) + 1;
        let tot_fac = 0;
        
        for (let j = 0; j < numItems; j++) {
            const articulo = getRandom(inventario);
            const cantidad = Math.floor(Math.random() * 10) + 1;
            let precio = parseFloat(articulo.precio_a);
            if (isNaN(precio)) precio = Math.random() * 100 + 10;
            
            const desc = 0;
            const tot_ren = cantidad * precio;
            tot_fac += tot_ren;
            
            // Factura Renglon
            const renLine = `${numfac}|${j+1}|${articulo.codart}|${articulo.nomart}|${cantidad}|${precio.toFixed(2)}|${desc}|${tot_ren.toFixed(2)}|${emision}|${articulo.grupo}`;
            facturasRenLines.push(renLine);
            
            // Movimiento de Almacen (Salida)
            // Tipinv 'S' means salida maybe? Or just SAL
            const codmovart = articulo.codart;
            const movLine = `${codmovart}|${emision}|SAL|${cantidad}|01|${numfac}`;
            movimientosLines.push(movLine);
        }
        
        // Factura Encabezado
        const encLine = `${numfac}|${cliente.codcli}|${cliente.nomcli}|FAC|${vendedorCod}|${emision}|${tot_fac.toFixed(2)}|${vence}|`;
        facturasEncLines.push(encLine);
        
        // Generar cobranza para el 90% de las facturas
        if (Math.random() < 0.90) {
            // El importe cobrado es igual al total de la factura
            // Pagado un poco despues de la emision
            const cobroDate = new Date(emision.split(' ')[0]);
            cobroDate.setDate(cobroDate.getDate() + Math.floor(Math.random() * 15) + 1);
            const cobroStr = cobroDate.toISOString().split('T')[0] + ' 00:00:00';
            
            // codmovcli = codcli
            // tipo = COB
            const cobLine = `${cliente.codcli}|${numfac}|COB|${vendedorCod}|${cobroStr}|${cobroStr}|${tot_fac.toFixed(2)}|${numfac}|Cobranza de Factura`;
            cobranzasLines.push(cobLine);
        }
    }
    
    const targetPath = path.join(EXPORT_DIR, TARGET_YEAR);
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }
    
    fs.writeFileSync(path.join(targetPath, 'facturas_enc.txt'), facturasEncLines.join('\n'));
    fs.writeFileSync(path.join(targetPath, 'facturas_ren.txt'), facturasRenLines.join('\n'));
    fs.writeFileSync(path.join(targetPath, 'cobranzas.txt'), cobranzasLines.join('\n'));
    fs.writeFileSync(path.join(targetPath, 'movimientos.txt'), movimientosLines.join('\n'));
    
    console.log(`Generated ${facturasEncLines.length - 1} invoices, ${cobranzasLines.length - 1} collections, and ${movimientosLines.length - 1} warehouse movements for ${TARGET_YEAR}.`);
}

generateMockData();
