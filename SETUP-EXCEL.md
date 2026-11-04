# Conectar Laventrix con Google Sheets (Excel online)

Para que los datos se guarden en una hoja de cálculo compartida y funcionen en cualquier momento:

1. Abre https://sheets.google.com y crea una hoja nueva (llámala "Laventrix").
2. En la hoja: **Extensiones → Apps Script**.
3. Borra el código por defecto y pega el contenido de `apps-script.gs`.
4. Guarda (Ctrl+S).
5. Clic en **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquiera**
   - Clic **Implementar** y autoriza los permisos.
6. Copia la **URL de la aplicación web** (termina en `/exec`).
7. Abre tu sitio Laventrix → sección **"Base de datos"** → pega la URL → **Guardar conexión**.

A partir de ahí:
- Los mensajes del formulario de contacto se guardan en la pestaña "Mensajes".
- El seguimiento de prendas consulta la pestaña "Prendas".
- El login de administradores valida contra la pestaña "Usuarios" (se crea sola). El usuario por defecto es admin / laventrix123.
- Los QR de trabajadores se guardan en la pestaña "Trabajadores" (se crea sola).
- Si no configuras la URL, se usa almacenamiento local del navegador (solo en ese dispositivo).

Para agregar prendas, inserta filas en la pestaña "Prendas" con columnas: Codigo, Estado, Casillero, Trabajador, Fecha.
