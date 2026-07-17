Set WshShell = CreateObject("WScript.Shell")
' Inicia el servidor de Next.js de forma totalmente invisible (parámetro 0)
WshShell.Run "cmd /c cd dashboard && npm run dev", 0, False

' Espera 4 segundos para darle tiempo al servidor de iniciar
WScript.Sleep 4000

' Abre el navegador web predeterminado
WshShell.Run "http://localhost:3000", 1, False
