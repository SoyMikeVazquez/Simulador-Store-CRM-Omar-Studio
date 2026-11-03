# Lógica y Formato de Generación de PDF (Notas de Venta / Presupuesto)

Este documento extrae la lógica, formatos, variables y tablas utilizadas originalmente en el proyecto en Flutter (Dart) para generar los documentos PDF de "Notas de Venta" y "Presupuesto", para poder replicarlo en el entorno Web (Next.js/React).

## 1. Variables Requeridas por el Documento
Los datos necesarios para generar el PDF de una nota son:

- **`folio`** (Number): El número del folio de la nota.
- **`es_recibo`** (Boolean): Determina el título. Si es `true`, es "RECIBO DE CUENTA", sino "PRESUPUESTO".
- **`cliente_nombre`** (String): Nombre del cliente.
- **`cliente_direccion`** (String): Dirección del cliente.
- **`cliente_telefono`** (String): Teléfono del cliente.
- **`cliente_correo`** (String): Correo del cliente (Opcional).
- **`total`** (Number): Total general (con impuestos, envíos, descuentos).
- **`subtotal`** (Number): Subtotal antes de impuestos o extras.
- **`descuento_especial`** (Number): Descuento especial aplicado.
- **`aplica_iva`** (Boolean): Si requiere datos fiscales e IVA.
- **`iva`** (Number): Monto del IVA.
- **`envio`** (Number): Costo de envío.
- **`anticipo`** (Number): Anticipo dado.
- **`items`** (Array of Objects): Arreglo con los productos.
  - `cantidad` (Number)
  - `nombre` (String)
  - `precio_unitario` (Number)
  - `total` (Number)
- **`created_at`** (String / Date): Fecha de creación.

## 2. Tipografía y Estilos
En el documento original se utiliza la fuente tipográfica estándar **Helvetica**.

- **Título Principal**: Tamaño 20, Bold ("MAQUILA DE PRODUCTOS")
- **Subtítulo (Tipo doc / Folio)**: Tamaño 13, Bold
- **Texto Regular**: Tamaño 10
- **Texto en Negrita (Bold)**: Tamaño 10, Bold
- **Encabezados de Sección**: Tamaño 11, Bold
- **Totales (Grandes)**: Tamaño 13, Bold
- **Encabezado Bancario**: Tamaño 14, Bold (con fondo gris oscuro)
- **Cuerpo Bancario**: Tamaño 11, Bold
- **Letra pequeña (Condiciones)**: Tamaño 7.5

## 3. Estructura y Distribución de Páginas

El PDF se genera en tamaño carta/A4, con un máximo de **7 items por página**. Si hay más de 7 productos, el documento añade páginas subsecuentes.

### A. Elementos Gráficos Globales (En todas las páginas)
1. **Marca de Agua (`marcadeagua.png`)**: Centrada en la página, transparencia del 12% (0.12 alpha), escalada conservando el ratio (ancho máximo 340, alto máximo 340).
2. **Logotipo Superior (`logosuperior.png` o `logo.png`)**: En la esquina superior izquierda, máximo 90 de ancho por 72 de alto.
3. **Paginación**: Se muestra en la esquina superior derecha "Página X de Y" si hay más de 1 página.

### B. Encabezado de Documento
- En el centro (Y=0): "MAQUILA DE PRODUCTOS"
- En el centro debajo: "RECIBO DE CUENTA" o "PRESUPUESTO"
- A la derecha: "Folio: #XXXX"
- A la derecha debajo: "Fecha: DD/MM/YYYY HH:MM AM/PM"

### C. Sección de Datos
Si `aplica_iva` es `true`, se muestra la sección de Datos Fiscales antes de los del cliente:
- **DATOS FISCALES DEL EMISOR**
- NOMBRE: MARTIN OMAR CHAVEZ PEREZ
- RFC: CAPM880922I36 | CURP: CAPM880922HTSHRR04
- RÉGIMEN SIMPLIFICADO DE CONFIANZA | C.P. 89606

A continuación (o directamente si no aplica IVA):
- **DATOS DEL CLIENTE**
- NOMBRE: [cliente_nombre] (En mayúsculas)
- DIRECCIÓN: [cliente_direccion] (En mayúsculas)
- TELÉFONO: [cliente_telefono]
- CORREO: [cliente_correo] (Sólo si no está vacío)

### D. Tabla de Productos (Items)
Se dibuja una tabla con 4 columnas:
1. **CANT.** (Ancho: ~55, Alineación Centro)
2. **DESCRIPCIÓN** (Ancho fluido, Alineación Izquierda)
3. **PRECIO UNITARIO** (Ancho: ~115, Alineación Centro)
4. **TOTAL** (Ancho: ~100, Alineación Centro)

**Estilos de la Tabla:**
- Encabezados: Fondo gris muy oscuro (`#1E1E1E` rgb: 30,30,30), texto blanco, tamaño 10 Bold.
- Filas de celdas: Tamaño 9.5 Bold, con espaciado (padding) de 4px por lado.

### E. Sección de Totales (Únicamente en la última página)
Justificados a la derecha debajo de la tabla:
- **Subtotal:** $[subtotal]
- *(Opcional)* **Descuento Especial:** -$[descuento_especial]
- *(Opcional, si aplica_iva)* **IVA (16%):** $[iva]
- *(Opcional)* **Envío:** $[envio]
- **TOTAL GENERAL:** $[total] (Tamaño grande, Bold)

**Control de Anticipo / Estado:**
- Si es "Recibo de Cuenta" (Pagado):
  - *(Opcional)* Anticipo Registrado: $[anticipo]
  - **ESTADO: PAGADO ($0.00 PENDIENTE)** (Tamaño grande)
- Si es Presupuesto (y hay anticipo > 0):
  - Anticipo: $[anticipo]
  - **RESTANTE PENDIENTE:** $[restante] (Total - Anticipo) (Tamaño grande)

### F. Pie de Página (Últimos 150 pts de la hoja, en todas las páginas)
- **DATOS BANCARIOS (Cinta Gris Oscura)**: Un rectángulo sólido (`#1E1E1E`) con el texto en blanco, tamaño 11 Bold, centrado: `"DATOS BANCARIOS PARA TRANSFERENCIA O DEPÓSITO"`.
- **Detalles Bancarios en 2 Columnas**:
  - **Columna 1 (BBVA)**:
    - Banco: `BBVA`
    - Titular: `OMAR CHAVEZ` | Tel: `833 453 9727`
    - CLABE: `012 180 01536760721 4`
    - Tarjeta: `4152 3144 0280 6635`
  - **Columna 2 (AFIRME)**:
    - Banco: `AFIRME`
    - Titular: `OMAR CHAVEZ`
    - Cuenta: `852340789`
    - CLABE: `062580008523407899`
- **CONDICIONES DE PRODUCCIÓN**: Letra tamaño 6.8, texto centrado:
  _"UNA VEZ CONFIRMADO EL PAGO, EL PEDIDO ENTRARÁ A PROCESO DE MAQUILA. EL TIEMPO ESTIMADO DE PRODUCCIÓN ES DE 8 DÍAS HÁBILES. EL TIEMPO DE ENVÍO NO ESTÁ INCLUIDO EN ESTE PLAZO. AL SER UN PRODUCTO PERSONALIZADO/MAQUILADO, NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES UNA VEZ INICIADO EL PROCESO."_

## 4. Recomendación de Implementación (Web)
Para implementar esta lógica exacta en un proyecto Next.js/React, se recomienda:
1. Usar la librería `jspdf` para el dibujado de página, textos y gráficos.
2. Usar `jspdf-autotable` para generar la tabla de productos con estilos personalizados, gestionando los quiebres de página.
3. Precargar las imágenes adjuntas (`marcadeagua.png` y `logosuperior.png`) en base64 o desde la carpeta `public` para pintarlas con `doc.addImage()`.

*(Revisa el archivo `generateNotaPdf.ts` adjunto en esta carpeta como un template listo para usar).*
