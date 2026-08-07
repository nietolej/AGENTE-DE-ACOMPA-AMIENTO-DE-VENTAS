"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MetasPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus("idle");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/metas/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Metas cargadas correctamente");
        setCount(data.count);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        setStatus("error");
        setMessage(data.error || "Error al procesar el archivo");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Error de conexión con el servidor");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración de Metas</h1>
        <p className="text-muted-foreground">
          Carga masiva de metas de venta por Cliente, Producto o Vendedor mediante Excel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              Subir Archivo Excel
            </CardTitle>
            <CardDescription>
              Selecciona un archivo .xlsx para cargar y actualizar las metas del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input 
                id="file-upload" 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            {status === "success" && (
              <div className="rounded-lg border p-4 bg-green-500/10 text-green-600 border-green-500/20 flex flex-col gap-1">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Éxito</span>
                </div>
                <div className="text-sm opacity-90">
                  {message}. Se procesaron {count} registros exitosamente.
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="rounded-lg border p-4 bg-destructive/15 text-destructive border-destructive/20 flex flex-col gap-1">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  <span>Error</span>
                </div>
                <div className="text-sm opacity-90">
                  {message}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar Metas
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Estructura Requerida
            </CardTitle>
            <CardDescription>
              El archivo debe contener las siguientes columnas exactas en la primera fila.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>TIPO</TableHead>
                    <TableHead>CODIGO</TableHead>
                    <TableHead>ANIO</TableHead>
                    <TableHead className="text-right">META_VENTA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">VENDEDOR</TableCell>
                    <TableCell>01</TableCell>
                    <TableCell>2026</TableCell>
                    <TableCell className="text-right">150000</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">CLIENTE</TableCell>
                    <TableCell>J-123456</TableCell>
                    <TableCell>2026</TableCell>
                    <TableCell className="text-right">50000</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">PRODUCTO</TableCell>
                    <TableCell>ART-01</TableCell>
                    <TableCell>2026</TableCell>
                    <TableCell className="text-right">10000</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-sm text-muted-foreground space-y-2">
              <p><strong>TIPO:</strong> Debe ser <code className="bg-muted px-1 py-0.5 rounded">CLIENTE</code>, <code className="bg-muted px-1 py-0.5 rounded">VENDEDOR</code> o <code className="bg-muted px-1 py-0.5 rounded">PRODUCTO</code>.</p>
              <p><strong>CODIGO:</strong> El código exacto del ente (Ej: codcli, codven, codart).</p>
              <p><strong>ANIO:</strong> El año de la meta a 4 dígitos (Ej: 2026).</p>
              <p><strong>META_VENTA:</strong> El monto en valor monetario (sin formato de moneda, solo números y decimales).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
