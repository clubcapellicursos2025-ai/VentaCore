"use server";

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}

const pdfParse = require("pdf-parse");

export type ParsedInvoice = {
  brand: string;
  mora: string;
  dueDate: string;
  invoiceNumber: string;
  issueDate: string;
  originalAmount: string;
  paymentAmount: string;
  balanceAmount: string;
  lastPaymentDate?: string;
  vendorCode?: string;
  observations?: string;
};

export type ParsedClient = {
  name: string;
  code: string;
  locality: string;
  address: string;
  identifier?: string;
  invoices: ParsedInvoice[];
};

export async function parsePdfAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the PDF
    const data = await pdfParse(buffer);
    const text = data.text;
    
    const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
    const clients: ParsedClient[] = [];
    let currentClient: ParsedClient | null = null;
    
    // Regex for the client header line.
    // Example: PEREZ BARBARA INES 10001 S.M. TUCUMAN Buenos Aires 85 * 24622154/ 27246221540
    // Example: BARRIONUEVO MYRIAM EV10024 S.M. TUCUMAN Monteagudo 747 Local 1 * 23178775/ 27231787750
    // Example: ARREGUEZ FATIMA 10035 S.M. TUCUMAN ITALIA 1426 * 25214882/ 0
    // Example: CANEPA ANDREA CECILIA10025 S.M. TUCUMAN            Salta 137 Local 1 * 23015943/ 27230159438 (no space before code)
    const clientHeaderRegex = /^(.+?)\s*(\d{5})\s+(.+?)\s+([A-Za-z0-9\s.]+?)\s*\*\s*([\d/]+)?(?:\s+0)?$/;

    // Regex for the invoice line.
    // Wella (0012) 10/06/26 A08000013 18/06/26 152134,66 0,00 152134,66 4 00
    // Farmavi *(PAG ) 05/09/25 A08041804 06/08/25 109048,83 110000,00 -951,17 301025 1 30
    const invoiceRegex = /^([A-Za-z]+)\s+(\*?\([\w\s]+\))\s+(\d{2}\/\d{2}\/\d{2})\s+([A-Za-z0-9]+)\s+(\d{2}\/\d{2}\/\d{2})\s+([\d.,-]+)\s+([\d.,-]+)\s+([\d.,-]+)(.*)$/;

    // (055) 230526 A08045176 080526 7.494,06 0,00 7.494,06 3
    // *(119) 040426 02045813 050326 474.412,72 473.842,84 569,88 190526 3
    const invoiceRegexNew = /^(\*?\(\d{3}\))\s+(\d{6})\s+([A-Za-z0-9]+)\s+(\d{6})\s+([\d.,-]+)\s+([\d.,-]+)\s+([\d.,-]+)\s*(.*)$/;

    for (const line of lines) {
      // Check if it's a client header
      // We look for "* " which usually denotes the start of the identifier
      if (line.includes("* ") && !line.startsWith("Wella") && !line.startsWith("Sow") && !line.startsWith("Farmavi") && !line.startsWith("Loreal") && !line.startsWith("Matrix")) {
        // Try to parse client
        const match = line.match(clientHeaderRegex);
        if (match) {
          if (currentClient) {
            clients.push(currentClient);
          }
          currentClient = {
            name: match[1].trim(),
            code: match[2].trim(),
            locality: match[3].trim(),
            address: match[4].trim(),
            identifier: match[5] ? match[5].trim() : undefined,
            invoices: []
          };
        } else {
          // Fallback parsing if regex fails but it looks like a client
          const parts = line.split("*");
          if (parts.length >= 2) {
             const leftPart = parts[0].trim();
             const codeMatch = leftPart.match(/(\d{5})/);
             if (codeMatch) {
                if (currentClient) clients.push(currentClient);
                const code = codeMatch[1];
                const codeIndex = leftPart.indexOf(code);
                currentClient = {
                  name: leftPart.substring(0, codeIndex).trim(),
                  code: code,
                  locality: "UNKNOWN",
                  address: leftPart.substring(codeIndex + 5).trim(),
                  identifier: parts[1].trim(),
                  invoices: []
                };
             }
          }
        }
      } 
      // Check if it's an invoice line
      else if (currentClient) {
        let parsedInvoice = null;

        // Try original format
        if (invoiceRegex.test(line)) {
          const match = line.match(invoiceRegex);
          if (match) {
            const rest = match[9].trim().split(/\s+/);
            let ultPag, vd, obs;
            
            if (rest.length > 0) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) {
                ultPag = rest[0];
                vd = rest[1];
                obs = rest.slice(2).join(" ");
              } else {
                vd = rest[0];
                obs = rest.slice(1).join(" ");
              }
            }
            parsedInvoice = {
              brand: match[1],
              mora: match[2],
              dueDate: match[3],
              invoiceNumber: match[4],
              issueDate: match[5],
              originalAmount: match[6],
              paymentAmount: match[7],
              balanceAmount: match[8],
              lastPaymentDate: ultPag,
              vendorCode: vd,
              observations: obs
            };
          }
        } 
        // Try new format (without brand, dates as DDMMYY)
        else if (invoiceRegexNew.test(line)) {
          const match = line.match(invoiceRegexNew);
          if (match) {
            const rest = match[8].trim().split(/\s+/);
            let ultPag, vd, obs;
            
            if (rest.length > 0) {
              if (rest[0].length === 6 && !isNaN(Number(rest[0]))) {
                ultPag = rest[0];
                vd = rest[1];
                obs = rest.slice(2).join(" ");
              } else {
                vd = rest[0];
                obs = rest.slice(1).join(" ");
              }
            }
            parsedInvoice = {
              brand: "S/M", // Sin Marca (brand no viene en este formato)
              mora: match[1],
              dueDate: match[2],
              invoiceNumber: match[3],
              issueDate: match[4],
              originalAmount: match[5],
              paymentAmount: match[6],
              balanceAmount: match[7],
              lastPaymentDate: ultPag,
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

    return { success: true, clients, rawLinesRead: lines.length };
  } catch (error: any) {
    console.error("PDF parse error:", error);
    return { success: false, error: error.message };
  }
}
