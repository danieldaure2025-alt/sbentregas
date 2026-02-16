/**
 * Gera um número de pedido único no formato #ABC12345
 * Combina letras aleatórias (3) + números (5)
 */
export function generateOrderNumber(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    // Gerar 3 letras aleatórias
    let letterPart = '';
    for (let i = 0; i < 3; i++) {
        letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Gerar 5 números aleatórios
    let numberPart = '';
    for (let i = 0; i < 5; i++) {
        numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return `#${letterPart}${numberPart}`;
}

/**
 * Gera um número de pedido único, verificando se já existe
 */
export async function generateUniqueOrderNumber(
    prisma: any
): Promise<string> {
    let orderNumber: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
        orderNumber = generateOrderNumber();

        // Verificar se já existe
        const existing = await prisma.order.findUnique({
            where: { orderNumber },
            select: { id: true },
        });

        if (!existing) {
            return orderNumber;
        }

        attempts++;
        if (attempts >= maxAttempts) {
            throw new Error('Não foi possível gerar número de pedido único');
        }
    } while (true);
}
