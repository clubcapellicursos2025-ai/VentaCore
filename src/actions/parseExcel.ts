"use server";

import * as xlsx from "xlsx";
import { format, differenceInDays } from "date-fns";

import type { ParsedInvoice, ParsedClient, ParseResult } from "./importTypes";

// Helper to parse dates from Excel numbers or strings
function parseExcelDate(dateVal: any): string {
  if (!dateVal) return "";
  if (typeof dateVal === "number") {
    // Excel date (days since 1900-01-01)
    const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    return format(date, "yyyy-MM-dd");
  }
  
  if (typeof dateVal === "string") {
    // Try to parse DD/MM/YYYY or similar
    const parts = dateVal.split(/[-/.]/);
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY for argentine formats
      if (parts[2].length === 2) parts[2] = "20" + parts[2]; // handle YY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateVal;
  }
  return String(dateVal);
}

// Helper to parse numbers safely
function parseExcelNumber(numVal: any): number {
  if (typeof numVal === "number") return numVal;
  if (!numVal) return 0;
  if (typeof numVal === "string") {
    const cleaned = numVal.replace(/[^\d.,-]/g, "").replace(",", ".");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function parseExcelAction(formData: FormData): Promise<ParseResult> {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Parse to array of arrays first to find headers
    const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (rawData.length === 0) throw new Error("Empty file");

    // Detect format
    let formatType = "unknown";
    let headerRowIndex = 0;
    
    // Search for header row (check up to 150 rows down)
    for (let i = 0; i < Math.min(150, rawData.length); i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row)) continue;
      
      const cells = row.map(c => String(c || "").toUpperCase().trim());
      const rowStr = cells.join("|");
      
      // L'Oréal or Key Full keywords (CPBT, DATO1, CRDT3, DATO4, DATOSI2, ULTPAG)
      const hasCpbt = cells.some(c => c === "CPBT" || c.includes("CPBT"));
      const hasDato = cells.some(c => c === "DATO1" || c === "DATO4" || c === "CRDT3" || c.includes("DATO1") || c.includes("DATO4") || c.includes("CRDT3"));
      
      if (hasCpbt && (hasDato || cells.includes("FECHA") || cells.includes("VTO") || cells.includes("SALDO") || cells.includes("IMPORTE"))) {
        formatType = "LOREAL_KEYFULL";
        headerRowIndex = i;
        break;
      }

      // Wella keywords (FACTURA, SUPAGO, NCR, AMBOS, VD)
      const hasFactura = cells.some(c => c === "FACTURA" || c.includes("FACTURA") || c === "FACT." || c === "COMPROBANTE");
      const hasWellaSpecific = cells.some(c => c === "SUPAGO" || c === "NCR" || c === "AMBOS" || c === "VD" || c.includes("SUPAGO") || c.includes("NCR") || c.includes("AMBOS") || c === "VD.");
      
      if (hasFactura && (hasWellaSpecific || cells.includes("SALDO") || cells.includes("IMPORTE") || cells.includes("VENCIMTO") || cells.includes("VENCIMIENTO"))) {
        formatType = "WELLA";
        headerRowIndex = i;
        break;
      }
    }

    // Pass 2: Fallback search if still unknown (check any single strong indicator across all rows)
    if (formatType === "unknown") {
      for (let i = 0; i < Math.min(300, rawData.length); i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;
        const cells = row.map(c => String(c || "").toUpperCase().trim());
        if (cells.some(c => c === "CPBT" || c.includes("CPBT") || c === "DATO1" || c === "CRDT3")) {
          formatType = "LOREAL_KEYFULL";
          headerRowIndex = i;
          break;
        }
        if (cells.some(c => c === "SUPAGO" || c === "AMBOS" || c === "NCR" || c.includes("SUPAGO") || c.includes("AMBOS"))) {
          formatType = "WELLA";
          headerRowIndex = i;
          break;
        }
      }
    }

    if (formatType === "unknown") {
      // Gather sample rows for debugging
      const sampleRows = rawData.slice(0, 5).map((r, idx) => `Fila ${idx + 1}: ${Array.isArray(r) ? r.slice(0, 8).join(", ") : r}`).join(" | ");
      return { 
        success: false, 
        error: `No se pudo detectar el formato del archivo (L'Oréal, Key Full o Wella). Asegúrate de que contenga columnas como CPBT/DATO1 (L'Oréal/Key Full) o Factura/SuPago/AMBOS (Wella). Muestra del archivo leído: ${sampleRows}` 
      };
    }

    // Helper function to safely read cell values by matching possible column names
    const getCellVal = (row: any, possibleKeys: string[]): any => {
      if (!row || typeof row !== 'object') return undefined;
      const keys = Object.keys(row);
      for (const k of keys) {
        const cleanK = String(k).toUpperCase().trim();
        for (const target of possibleKeys) {
          const cleanTarget = target.toUpperCase().trim();
          if (cleanK === cleanTarget || cleanK.includes(cleanTarget)) {
            const val = row[k];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              return val;
            }
          }
        }
      }
      return undefined;
    };

    // Now re-parse as objects based on the header row found
    const data: any[] = xlsx.utils.sheet_to_json(sheet, { range: headerRowIndex });
    
    const clientsMap = new Map<string, ParsedClient>();
    let currentBrand = "Desconocido";

    if (formatType === "LOREAL_KEYFULL") {
      const fileName = file.name.toUpperCase();
      if (fileName.includes("KEY") || fileName.includes("KF")) currentBrand = "Key Full";
      else currentBrand = "L'Oréal";

      let currentClientCode = "";
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || Object.keys(row).length === 0) continue;

        const c_code = String(getCellVal(row, ["CODIGO", "CLIENTE", "COD", "ID"]) || currentClientCode);
        const c_name = String(getCellVal(row, ["RAZON SOCIAL", "NOMBRE", "TITULAR", "RAZON"]) || "");
        
        let dni = "";
        let cuit = "";
        
        const keys = Object.keys(row);
        const emptyKeys = keys.filter(k => k.startsWith("__EMPTY"));
        if (emptyKeys.length >= 2) {
           dni = String(row[emptyKeys[emptyKeys.length - 2]] || "");
           cuit = String(row[emptyKeys[emptyKeys.length - 1]] || "");
        } else if (emptyKeys.length === 1) {
           const val = String(row[emptyKeys[0]]);
           if (val.length > 10) cuit = val; else dni = val;
        }

        if (c_code && c_code !== "undefined" && c_code !== "null") {
          currentClientCode = c_code;
          if (!clientsMap.has(c_code)) {
            clientsMap.set(c_code, {
              code: c_code,
              name: c_name,
              dni: dni,
              cuitCuil: cuit,
              locality: String(getCellVal(row, ["LOCALIDAD", "CIUDAD"]) || ""),
              address: String(getCellVal(row, ["DOMICILIO", "DIRECCION"]) || ""),
              invoices: []
            });
          } else if (c_name && !clientsMap.get(c_code)?.name) {
            clientsMap.get(c_code)!.name = c_name;
          }
        }
        
        // Invoice extraction
        const cpbt = getCellVal(row, ["CPBT", "COMPROBANTE", "FACTURA", "NRO COMPROBANTE", "DOCUMENTO"]);
        if (cpbt) {
           const originalAmount = parseExcelNumber(getCellVal(row, ["DATO1", "IMPORTE ORIGINAL", "TOTAL ORIGINAL", "IMPORTE", "TOTAL"]));
           const payments = parseExcelNumber(getCellVal(row, ["CRDT3", "PAGOS APLICADOS", "PAGOS", "COBRADO", "ABONADO"]));
           const balance = parseExcelNumber(getCellVal(row, ["DATO4", "SALDO PENDIENTE", "SALDO", "ADEUDADO"]));
           
           const issueDate = parseExcelDate(getCellVal(row, ["FECHA", "EMISION", "F. EMISION"]));
           const dueDate = parseExcelDate(getCellVal(row, ["VTO", "VENCIMIENTO", "VENCIMTO", "FECHA VTO"]));
           const fp = parseExcelDate(getCellVal(row, ["FP", "ULTPAG", "ULT.PAG", "ULTIMO PAGO"]));
           
           let mora = 0;
           if (balance > 0 && dueDate) {
             mora = differenceInDays(new Date(), new Date(dueDate));
             if (mora < 0) mora = 0;
           }

           const invoice: ParsedInvoice = {
             brand: currentBrand,
             invoiceType: "Factura",
             invoiceNumber: String(cpbt),
             issueDate: issueDate,
             dueDate: dueDate,
             mora: mora,
             originalAmount: originalAmount,
             paymentAmount: payments,
             creditNoteAmount: 0,
             balanceAmount: balance,
             lastPaymentDate: fp,
             internalCode: String(getCellVal(row, ["DATOSI2", "DATOS 2", "INTERNAL CODE"]) || ""),
             internalIndicator: String(getCellVal(row, ["ULTPAG", "INDICADOR"]) || "")
           };
           
           if (clientsMap.has(currentClientCode)) {
             clientsMap.get(currentClientCode)?.invoices.push(invoice);
           }
        }
      }
    } else if (formatType === "WELLA") {
      currentBrand = "Wella";
      let currentClientCode = "";
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || Object.keys(row).length === 0) continue;

        const c_code = String(getCellVal(row, ["COD", "CODIGO", "CLIENTE", "ID"]) || currentClientCode);
        const c_name = String(getCellVal(row, ["NOMBRE", "RAZON SOCIAL", "TITULAR"]) || "");
        
        const ambos = String(getCellVal(row, ["AMBOS", "DNI/CUIT", "IDENTIFICACION"]) || "");
        let dni = "";
        let cuit = "";
        if (ambos) {
          const parts = ambos.split(/[\s/|-]+/);
          for (const p of parts) {
            const clean = p.replace(/\D/g, "");
            if (clean.length >= 10 && clean.length <= 11) cuit = clean;
            else if (clean.length >= 7 && clean.length <= 9) dni = clean;
          }
        }

        if (c_code && c_code !== "undefined" && c_code !== "null") {
          currentClientCode = c_code;
          if (!clientsMap.has(c_code)) {
            clientsMap.set(c_code, {
              code: c_code,
              name: c_name,
              dni: dni,
              cuitCuil: cuit,
              locality: String(getCellVal(row, ["LOCALIDAD", "CIUDAD"]) || ""),
              address: String(getCellVal(row, ["DOMICILIO", "DIRECCION"]) || ""),
              invoices: []
            });
          } else if (c_name && !clientsMap.get(c_code)?.name) {
            clientsMap.get(c_code)!.name = c_name;
          }
        }
        
        // Invoice extraction
        const factura = getCellVal(row, ["FACTURA", "COMPROBANTE", "FACT.", "FACT", "CPBT", "DOCUMENTO"]);
        if (factura) {
           const originalAmount = parseExcelNumber(getCellVal(row, ["IMPORTE", "ORIGINAL", "TOTAL ORIGINAL", "TOTAL"]));
           const payments = parseExcelNumber(getCellVal(row, ["SUPAGO", "SU PAGO", "PAGOS", "ABONADO"]));
           const balance = parseExcelNumber(getCellVal(row, ["SALDO", "SALDO PENDIENTE", "ADEUDADO", "PENDIENTE"]));
           const ncr = parseExcelNumber(getCellVal(row, ["NCR", "NOTA DE CREDITO", "NC"]));
           
           const issueDate = parseExcelDate(getCellVal(row, ["FECHA", "EMISION"]));
           const dueDate = parseExcelDate(getCellVal(row, ["VENCIMTO", "VENCIMIENTO", "VTO", "FECHA VTO"]));
           const ultPag = parseExcelDate(getCellVal(row, ["ULTPAG", "ULT.PAG", "FP", "ULTIMO PAGO"]));
           
           let mora = 0;
           if (balance > 0 && dueDate) {
             mora = differenceInDays(new Date(), new Date(dueDate));
             if (mora < 0) mora = 0;
           }

           const invoice: ParsedInvoice = {
             brand: currentBrand,
             invoiceType: "Factura",
             invoiceNumber: String(factura),
             issueDate: issueDate,
             dueDate: dueDate,
             mora: mora,
             originalAmount: originalAmount,
             paymentAmount: payments,
             creditNoteAmount: ncr,
             balanceAmount: balance,
             lastPaymentDate: ultPag,
             vendorCode: String(getCellVal(row, ["VD", "VENDEDOR", "VEND", "VEND."]) || ""),
             observations: String(getCellVal(row, ["OBSERVACIÓN", "OBSERVACION", "OBS", "OBSERVACIONES"]) || "")
           };
           
           if (clientsMap.has(currentClientCode)) {
             clientsMap.get(currentClientCode)?.invoices.push(invoice);
           }
        }
      }
    }

    const clients = Array.from(clientsMap.values()).filter(c => c.invoices.length > 0);

    return { 
      success: true, 
      brandDetected: currentBrand,
      clients, 
      rawRowsRead: data.length 
    };
  } catch (error: any) {
    console.error("Excel parse error:", error);
    return { success: false, error: error.message };
  }
}
