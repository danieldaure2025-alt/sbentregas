import * as XLSX from 'xlsx';

interface ExportOptions {
    filename?: string;
    sheetName?: string;
}

/**
 * Exporta dados para arquivo Excel (.xlsx)
 * @param data - Array de objetos a serem exportados
 * @param options - Opções de exportação (filename, sheetName)
 */
export function exportToExcel(data: any[], options: ExportOptions = {}) {
    const { filename = 'exportacao', sheetName = 'Dados' } = options;

    // Criar workbook e worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Gerar arquivo
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
}

/**
 * Exporta dados para arquivo CSV
 * @param data - Array de objetos a serem exportados
 * @param options - Opções de exportação (filename)
 */
export function exportToCSV(data: any[], options: ExportOptions = {}) {
    const { filename = 'exportacao' } = options;

    // Criar worksheet e converter para CSV
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Criar blob e fazer download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${timestamp}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Formata dados financeiros para exportação
 * Converte valores monetários e datas para formatos legíveis
 */
export function formatFinancialData(data: any[]): any[] {
    return data.map(item => {
        const formatted: any = {};

        Object.keys(item).forEach(key => {
            const value = item[key];

            // Formatar valores monetários (campos com "amount", "fee", "price", "revenue", etc)
            if (typeof value === 'number' &&
                (key.toLowerCase().includes('amount') ||
                    key.toLowerCase().includes('fee') ||
                    key.toLowerCase().includes('price') ||
                    key.toLowerCase().includes('revenue') ||
                    key.toLowerCase().includes('total'))) {
                formatted[key] = `R$ ${value.toFixed(2).replace('.', ',')}`;
            }
            // Formatar datas (campos que terminam com "At")
            else if (typeof value === 'string' && key.endsWith('At')) {
                try {
                    const date = new Date(value);
                    formatted[key] = date.toLocaleString('pt-BR');
                } catch {
                    formatted[key] = value;
                }
            }
            // Formatar percentuais
            else if (typeof value === 'number' && key.toLowerCase().includes('percent')) {
                formatted[key] = `${value.toFixed(2)}%`;
            }
            // Outros valores
            else {
                formatted[key] = value;
            }
        });

        return formatted;
    });
}

/**
 * Traduz nomes de campos para português
 */
export function translateHeaders(data: any[], translations: Record<string, string>): any[] {
    return data.map(item => {
        const translated: any = {};

        Object.keys(item).forEach(key => {
            const translatedKey = translations[key] || key;
            translated[translatedKey] = item[key];
        });

        return translated;
    });
}
