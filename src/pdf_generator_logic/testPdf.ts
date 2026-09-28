import { generateNotaPdf, NotaVentaInfo } from './generateNotaPdf';
import { jsPDF } from 'jspdf';
import fs from 'fs';

// Mocking jsPDF save for node environment
const originalSave = jsPDF.prototype.save;
(jsPDF.prototype as any).save = function(filename: string) {
    fs.writeFileSync(filename, (this as any).output('nodebuffer'));
    console.log(`Saved PDF to ${filename}`);
    return this;
};

const dummyData: NotaVentaInfo = {
  folio: 1234,
  es_recibo: true,
  cliente_nombre: "N/A",
  cliente_direccion: "N/A",
  cliente_telefono: "0",
  cliente_correo: "N/A",
  total: 0,
  subtotal: 0,
  descuento_especial: 0,
  aplica_iva: false,
  iva: 0,
  envio: 0,
  anticipo: 0,
  items: [
    {
      cantidad: 0,
      nombre: "N/A",
      precio_unitario: 0,
      total: 0
    }
  ],
  created_at: new Date().toISOString()
};

generateNotaPdf(dummyData).then(() => {
    console.log("PDF generation executed successfully.");
}).catch(err => {
    console.error("Error generating PDF:", err);
});
