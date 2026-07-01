"use server";

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}

const pdfParse = require("pdf-parse");

import type { ParseResult, ParsedClient, ParsedInvoice } from "./importTypes";
import { differenceInDays } from "date-fns";

// Helper to parse dates from PDF strings (DD/MM/YY or DDMMYY or YYYY-MM-DD)
function parsePdfDate(val?: string): string {
  if (!val) return "";
  const cleaned = val.replace(/[^\d/]/g, "");
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    if (parts.length === 3) {
      let yy = parts[2];
      if (yy.length === 2) yy = "20" + yy;
      return `${yy}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  } else if (cleaned.length === 6) {
    const dd = cleaned.slice(0, 2);
    const mm = cleaned.slice(2, 4);
    let yy = cleaned.slice(4, 6);
    yy = "20" + yy;
    return `${yy}-${mm}-${dd}`;
  }
  return val;
}

// Helper to parse numbers safely
function parsePdfNumber(strVal?: string): number {
  if (!strVal) return 0;
  const cleaned = strVal.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export async function parsePdfAction(formData: FormData): Promise<ParseResult> {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the PDF
    const data = await pdfParse(buffer);
    const text = data.text;
    
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    if (lines.length === 0) throw new Error("El archivo PDF está vacío o no se pudo leer el texto.");
    
    const clients: ParsedClient[] = [];
    let currentClient: ParsedClient | null = null;
    
    const clientHeaderRegex = /^(.+?)\s*(\d{5})\s+(.+?)\s+([A-Za-z0-9\s.]+?)\s*\*\s*([\d/]+)?(?:\s+0)?$/;
    const invoiceRegex = /^([A-Za-z]+)\s+(\*?\([\w\s]+\))\s+(\d{2}\/\d{2}\/\d{2})\s+([A-Za-z0-9]+)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.,-]+)\s+([\d.,-]+)\s+([\d.,-]+)(.*)$/;
    const invoiceRegexNew = /^(\*?\(\d{3}\))\s+(\d{6})\s+([A-Za-z0-9]+)\s+(\d{6})\s+([\d.,-]+)\s+([\d.,-]+)\s+([\d.,-]+)\s*(.*)$/;

    for (const line of lines) {
      if (line.includes("* ") && !line.startsWith("Wella") && !line.startsWith("Sow") && !line.startsWith("Farmavi") && !line.startsWith("Loreal") && !line.startsWith("Matrix")) {
        const match = line.match(clientHeaderRegex);
        let name = "", code = "", locality = "", address = "", idStr = "";

        if (match) {
          name = match[1].trim();
          code = match[2].trim();
          locality = match[3].trim();
          address = match[4].trim();
          idStr = match[5] ? match[5].trim() : "";
        } else {
          const parts = line.split("*");
          if (parts.length >= 2) {
             const leftPart = parts[0].trim();
             const codeMatch = leftPart.match(/(\d{5})/);
             if (codeMatch) {
                code = codeMatch[1];
                const codeIndex = leftPart.indexOf(code);
                name = leftPart.substring(0, codeIndex).trim();
                locality = "UNKNOWN";
                address = leftPart.substring(codeIndex + 5).trim();
                idStr = parts[1].trim();
             }
          }
        }

        if (code) {
          if (currentClient) clients.push(currentClient);

          let dni = "";
          let cuitCuil = "";
          if (idStr) {
            const parts = idStr.split(/[\s/|-]+/);
            for (const p of parts) {
              const clean = p.replace(/\D/g, "");
              if (clean.length >= 10 && clean.length <= 11) cuitCuil = clean;
              else if (clean.length >= 7 && clean.length <= 9) dni = clean;
            }
          }

          currentClient = {
            code,
            name,
            dni,
            cuitCuil,
            identifier: idStr || cuitCuil || dni,
            locality,
            address,
            invoices: []
          };
        }
      } 
      else if (currentClient) {
        let parsedInvoice: ParsedInvoice | null = null;

        if (invoiceRegex.test(line)) {
          const match = line.match(invoiceRegex);
          if (match) {
            const rest = match[9].trim().split(/\s+/).filter(Boolean);
            let ultPag = "", vd = "", obs = "";
            if (rest.length === 1) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) ultPag = rest[0];
              else vd = rest[0];
            } else if (rest.length === 2) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) {
                ultPag = rest[0];
                vd = rest[1];
              } else {
                vd = rest[0];
                obs = rest[1];
              }
            } else if (rest.length >= 3) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) {
                ultPag = rest[0];
                vd = rest[1];
                obs = rest.slice(2).join(" ");
              } else {
                vd = rest[0];
                obs = rest.slice(1).join(" ");
              }
            }
            
            const originalAmount = parsePdfNumber(match[6]);
            const paymentAmount = parsePdfNumber(match[7]);
            const balanceAmount = parsePdfNumber(match[8]);
            const issueDate = parsePdfDate(match[3]);
            const dueDate = parsePdfDate(match[5]);
            
            let mora = 0;
            if (balanceAmount > 0 && dueDate) {
               mora = differenceInDays(new Date(), new Date(dueDate));
               if (mora < 0) mora = 0;
            }

            parsedInvoice = {
              brand: match[1],
              invoiceType: "Factura",
              invoiceNumber: match[4],
              issueDate,
              dueDate,
              mora,
              originalAmount,
              paymentAmount,
              creditNoteAmount: 0,
              balanceAmount,
              lastPaymentDate: parsePdfDate(ultPag),
              vendorCode: vd,
              observations: obs
            };
          }
        } 
        else if (invoiceRegexNew.test(line)) {
          const match = line.match(invoiceRegexNew);
          if (match) {
            const rest = match[8].trim().split(/\s+/).filter(Boolean);
            let ultPag = "", vd = "", obs = "";
            if (rest.length === 1) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) ultPag = rest[0];
              else vd = rest[0];
            } else if (rest.length === 2) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) {
                ultPag = rest[0];
                vd = rest[1];
              } else {
                vd = rest[0];
                obs = rest[1];
              }
            } else if (rest.length >= 3) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) {
                ultPag = rest[0];
                vd = rest[1];
                obs = rest.slice(2).join(" ");
              } else {
                vd = rest[0];
                obs = rest.slice(1).join(" ");
              }
            }
            
            const originalAmount = parsePdfNumber(match[5]);
            const paymentAmount = parsePdfNumber(match[6]);
            const balanceAmount = parsePdfNumber(match[7]);
            const issueDate = parsePdfDate(match[2]);
            const dueDate = parsePdfDate(match[4]);

            let mora = 0;
            if (balanceAmount > 0 && dueDate) {
               mora = differenceInDays(new Date(), new Date(dueDate));
               if (mora < 0) mora = 0;
            }

            parsedInvoice = {
              brand: "Wella / Farmavi",
              invoiceType: "Factura",
              invoiceNumber: match[3],
              issueDate,
              dueDate,
              mora,
              originalAmount,
              paymentAmount,
              creditNoteAmount: 0,
              balanceAmount,
              lastPaymentDate: parsePdfDate(ultPag),
              vendorCode: vd,
              observations: obs
            };
          }
        }

        if (parsedInvoice) {
          currentClient.invoices.push(parsedInvoice);
        }
      }
    }
    
    if (currentClient) {
      clients.push(currentClient);
    }

    const validClients = clients.filter(c => c.invoices.length > 0);

    return { 
      success: true, 
      brandDetected: "Wella / Farmavi (PDF)", 
      clients: validClients, 
      rawRowsRead: lines.length 
    };
  } catch (error: any) {
    console.error("PDF parse error:", error);
    return { success: false, error: error.message };
  }
}
