'use client';

interface CsvColumn<T> {
    header: string;
    accessor: (item: T) => string | number;
}

/**
 * Exporta dados para um arquivo CSV e faz download automático.
 * @param data - Array de objetos com os dados
 * @param columns - Definição das colunas (header + accessor)
 * @param filename - Nome do arquivo (sem extensão)
 */
export function exportToCSV<T>(
    data: T[],
    columns: CsvColumn<T>[],
    filename: string
): void {
    if (data.length === 0) return;

    const BOM = '\uFEFF'; // Para suporte a acentos no Excel
    const separator = ';'; // Excel BR usa ; como separador

    // Header
    const headerRow = columns.map((col) => `"${col.header}"`).join(separator);

    // Linhas de dados
    const dataRows = data.map((item) =>
        columns
            .map((col) => {
                const value = col.accessor(item);
                if (typeof value === 'number') return value.toString().replace('.', ',');
                return `"${String(value ?? '').replace(/"/g, '""')}"`;
            })
            .join(separator)
    );

    const csvContent = BOM + [headerRow, ...dataRows].join('\n');

    // Criar blob e fazer download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Formata data para exibição pt-BR
 */
export function formatDateBR(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formata valor monetário para CSV
 */
export function formatCurrencyCSV(value: number): string {
    return value?.toFixed(2)?.replace('.', ',') ?? '0,00';
}

/**
 * Traduz status do pedido
 */
export function translateStatus(status: string): string {
    const map: Record<string, string> = {
        AWAITING_PAYMENT: 'Aguardando Pagamento',
        PENDING: 'Pendente',
        ACCEPTED: 'Aceito',
        PICKED_UP: 'Coletado',
        IN_TRANSIT: 'Em Trânsito',
        DELIVERED: 'Entregue',
        CANCELLED: 'Cancelado',
        NO_COURIER_AVAILABLE: 'Sem Entregador',
    };
    return map[status] || status;
}

/**
 * Traduz método de pagamento
 */
export function translatePaymentMethod(method?: string): string {
    const map: Record<string, string> = {
        CREDIT_CARD: 'Cartão de Crédito',
        PIX: 'PIX',
        DEBIT_CARD: 'Cartão de Débito',
        CASH: 'Dinheiro',
        END_OF_DAY: 'Diária',
    };
    return method ? (map[method] || method) : '-';
}
