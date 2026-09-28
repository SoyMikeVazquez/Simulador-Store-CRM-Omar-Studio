/**
 * TEMPLATE PARA GENERAR PDF DE NOTA DE VENTA/PRESUPUESTO EN LA WEB
 * 
 * Dependencias necesarias a instalar en el proyecto Demo omar:
 * npm install jspdf jspdf-autotable
 * 
 * Las imágenes (marcadeagua.png y logosuperior.png) deben colocarse en
 * la carpeta `public/` de Next.js para poder acceder a ellas mediante URL/fetch
 * o pueden importarse como base64.
 */


export interface NotaItem {
  cantidad: number;
  nombre: string;
  precio_unitario: number;
  total: number;
}

export interface NotaVentaInfo {
  folio: number;
  es_recibo: boolean;
  cliente_nombre: string;
  cliente_direccion: string;
  cliente_telefono: string;
  cliente_correo?: string;
  total: number;
  subtotal: number;
  descuento_especial?: number;
  aplica_iva: boolean;
  iva?: number;
  envio?: number;
  anticipo?: number;
  items: NotaItem[];
  created_at: string | Date;
}

// Función auxiliar para formatear fecha (D/M/YYYY HH:MM AM/PM)
const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(d).toUpperCase();
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export const generateNotaPdf = async (nota: NotaVentaInfo) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt', // Usamos puntos para mantener coincidencia con Flutter (1 pt = 1/72 inch)
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  // Variables de configuración de la nota
  const tituloDocumento = nota.es_recibo ? 'RECIBO DE CUENTA' : 'PRESUPUESTO';
  const folioFormateado = String(nota.folio || 1).padStart(4, '0');
  const itemsPerPage = 7;
  const totalPages = nota.items.length === 0 ? 1 : Math.ceil(nota.items.length / itemsPerPage);
  
  // Carga de imágenes (Requiere que estén en /public o transformadas a base64 previamente)
  // Como estamos en un entorno cliente, lo ideal es cargarlas con image/jpeg o png
  let logoBase64 = null;
  let watermarkBase64 = null;
  
  try {
    const logoRes = await fetch('/logosuperior.png');
    const logoBlob = await logoRes.blob();
    logoBase64 = await blobToBase64(logoBlob);
    
    const wmRes = await fetch('/marcadeagua.png');
    const wmBlob = await wmRes.blob();
    watermarkBase64 = await blobToBase64(wmBlob);
  } catch (e) {
    console.warn("No se pudieron cargar las imágenes", e);
  }

  // --- LÓGICA DE DIBUJADO DE PÁGINAS ---
  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();
    
    // 1. Marca de agua (Simulamos transparencia en jsPDF ajustando GState si está soportado,
    // o usando una versión pre-aclarada de la imagen)
    if (watermarkBase64) {
      doc.setGState(new (doc as any).GState({opacity: 0.12}));
      // Tamaño máximo 340x340 centrado
      const wmW = 340, wmH = 340;
      doc.addImage(watermarkBase64, 'PNG', (pageWidth - wmW) / 2, (pageHeight - wmH) / 2, wmW, wmH);
      doc.setGState(new (doc as any).GState({opacity: 1.0}));
    }

    // 2. Logo Superior
    if (logoBase64) {
      // Máximo 90x72 en la esquina superior izquierda
      doc.addImage(logoBase64, 'PNG', marginX, 20, 90, 72, undefined, 'FAST');
    }

    // 3. Encabezados Principales
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text('MAQUILA DE PRODUCTOS', pageWidth / 2, 40, { align: 'center' });
    
    doc.setFontSize(13);
    doc.text(tituloDocumento, pageWidth / 2, 60, { align: 'center' });
    
    doc.text(`Folio: #${folioFormateado}`, pageWidth - marginX, 85, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${formatDate(nota.created_at)}`, pageWidth - marginX, 105, { align: 'right' });

    if (totalPages > 1) {
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${p + 1} de ${totalPages}`, pageWidth - marginX, 120, { align: 'right' });
    }

    // 4. Datos Fiscales y del Cliente
    let yOffset = 135;

    if (nota.aplica_iva) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text('DATOS FISCALES DEL EMISOR', marginX, yOffset);
      yOffset += 16;
      doc.setFontSize(10);
      doc.text('NOMBRE: MARTIN OMAR CHAVEZ PEREZ', marginX, yOffset);
      yOffset += 14;
      doc.setFont("helvetica", "normal");
      doc.text('RFC: CAPM880922I36  |  CURP: CAPM880922HTSHRR04', marginX, yOffset);
      yOffset += 14;
      doc.text('RÉGIMEN SIMPLIFICADO DE CONFIANZA  |  C.P. 89606', marginX, yOffset);
      yOffset += 24;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text('DATOS DEL CLIENTE', marginX, yOffset);
    yOffset += 16;
    doc.setFontSize(10);
    doc.text(`NOMBRE: ${nota.cliente_nombre?.toUpperCase()}`, marginX, yOffset);
    yOffset += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`DIRECCIÓN: ${nota.cliente_direccion?.toUpperCase()}`, marginX, yOffset);
    yOffset += 14;
    doc.text(`TELÉFONO: ${nota.cliente_telefono}`, marginX, yOffset);
    yOffset += 14;
    if (nota.cliente_correo) {
      doc.text(`CORREO: ${nota.cliente_correo}`, marginX, yOffset);
      yOffset += 14;
    }

    yOffset += 15;

    // 5. Tabla de Productos (Usando jspdf-autotable manual por página)
    const startIndex = p * itemsPerPage;
    const pageItems = nota.items.slice(startIndex, startIndex + itemsPerPage);
    
    autoTable(doc, {
      startY: yOffset,
      margin: { left: marginX, right: marginX },
      head: [['CANT.', 'DESCRIPCIÓN', 'PRECIO UNITARIO', 'TOTAL']],
      body: pageItems.map(item => [
        item.cantidad > 0 ? item.cantidad : '',
        item.nombre?.toUpperCase(),
        `$${item.precio_unitario.toFixed(2)}`,
        `$${item.total.toFixed(2)}`
      ]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9.5,
        fontStyle: 'bold',
        cellPadding: 6,
        lineColor: [30, 30, 30],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        halign: 'center',
        valign: 'middle',
        fontSize: 10
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 55 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 115 },
        3: { halign: 'center', cellWidth: 100 }
      }
    });

    // @ts-ignore - Propiedad de autotable
    yOffset = doc.lastAutoTable.finalY + 20;

    // 6. Totales (Solo última página)
    if (p === totalPages - 1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const alignRight = pageWidth - marginX;

      doc.text(`Subtotal: $${nota.subtotal.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
      yOffset += 16;
      
      if (nota.descuento_especial && nota.descuento_especial > 0) {
        doc.text(`Descuento Especial: -$${nota.descuento_especial.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
        yOffset += 16;
      }
      if (nota.aplica_iva && nota.iva) {
        doc.text(`IVA (16%): $${nota.iva.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
        yOffset += 16;
      }
      if (nota.envio && nota.envio > 0) {
        doc.text(`Envío: $${nota.envio.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
        yOffset += 16;
      }
      
      doc.setFontSize(13);
      doc.text(`TOTAL GENERAL: $${nota.total.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
      yOffset += 20;

      const anticipo = nota.anticipo || 0;
      if (nota.es_recibo) {
        if (anticipo > 0) {
          doc.setFontSize(10);
          doc.text(`Anticipo Registrado: $${anticipo.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
          yOffset += 16;
        }
        doc.setFontSize(13);
        doc.text('ESTADO: PAGADO ($0.00 PENDIENTE)', alignRight, yOffset, { align: 'right' });
      } else if (anticipo > 0) {
        doc.setFontSize(10);
        const restante = Math.max(0, nota.total - anticipo);
        doc.text(`Anticipo: $${anticipo.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
        yOffset += 16;
        doc.setFontSize(13);
        doc.text(`RESTANTE PENDIENTE: $${restante.toFixed(2)}`, alignRight, yOffset, { align: 'right' });
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text('(Continúa en la siguiente página...)', pageWidth - marginX, pageHeight - 150, { align: 'right' });
    }

    // 7. Pie de Página y Datos Bancarios (Todas las páginas)
    let footerY = pageHeight - 135;
    
    // Rectángulo gris oscuro
    doc.setFillColor(30, 30, 30);
    doc.rect(marginX, footerY, pageWidth - (marginX * 2), 22, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('DATOS BANCARIOS', pageWidth / 2, footerY + 16, { align: 'center' });
    
    footerY += 40;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('NOMBRE: OMAR CHAVEZ   |   BANCO: BBVA   |   TEL: 833 453 9727', pageWidth / 2, footerY, { align: 'center' });
    footerY += 16;
    doc.text('CLABE: 012 180 01536760721 4   |   TARJETA: 4152 3144 0280 6635', pageWidth / 2, footerY, { align: 'center' });

    footerY += 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const condText = "UNA VEZ CONFIRMADO EL PAGO, EL PEDIDO ENTRARÁ A PROCESO DE MAQUILA. EL TIEMPO ESTIMADO DE PRODUCCIÓN ES DE 8 DÍAS HÁBILES. EL TIEMPO DE ENVÍO NO ESTÁ INCLUIDO EN ESTE PLAZO. AL SER UN PRODUCTO PERSONALIZADO/MAQUILADO, NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES UNA VEZ INICIADO EL PROCESO.";
    
    // Dividir en lineas si es necesario (splitTextToSize)
    const condLines = doc.splitTextToSize(condText, pageWidth - (marginX * 2));
    doc.text(condLines, pageWidth / 2, footerY, { align: 'center' });
  }

  // Guardar PDF
  const nombreArchivo = `${nota.es_recibo ? 'Nota_Venta' : 'Presupuesto'}_${folioFormateado}.pdf`;
  doc.save(nombreArchivo);
};
