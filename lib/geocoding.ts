/**
 * Geocoding utilities for extracting neighborhood information from addresses
 */

export async function extractNeighborhood(address: string): Promise<string | null> {
    try {
        // Usar OpenStreetMap Nominatim API (free, no API key required)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&q=${encodeURIComponent(address)}&` +
            `addressdetails=1&limit=1&` +
            `countrycodes=br`,  // Limitar ao Brasil
            {
                headers: {
                    'User-Agent': 'DeliveryApp/1.0'  // Required by Nominatim
                }
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        if (!data || data.length === 0) return null;

        // Retornar bairro/subúrbio do endereço
        const place = data[0];
        const neighborhood =
            place.address?.neighbourhood ||
            place.address?.suburb ||
            place.address?.quarter ||
            place.address?.district ||
            null;

        return neighborhood;
    } catch (error) {
        console.error('Error extracting neighborhood:', error);
        return null;
    }
}

/**
 * Verifica se o endereço contém apenas rua + número (sem bairro mencionado)
 * Exemplos que retornam true:
 * - "Rua X, 123"
 * - "Av Y, 456"
 * - "Travessa Z, 789"
 */
export function hasOnlyStreetAndNumber(address: string): boolean {
    // Remove espaços extras
    const cleaned = address.trim();

    // Padrão: começa com tipo de logradouro, seguido de nome e número
    // Não deve conter palavras-chave de bairro
    const hasBairroKeyword = /bairro|centro|jardim|vila|conjunto|residencial/i.test(cleaned);

    if (hasBairroKeyword) {
        return false; // Já tem bairro mencionado
    }

    // Verifica se parece com "Tipo Logradouro + Nome + Número"
    // e não tem vírgulas extras indicando informações adicionais
    const parts = cleaned.split(',');

    // Se tem 2 partes: "Rua X, 123" = apenas rua + número
    // Se tem 3+ partes: "Rua X, 123, Bairro Y" = tem bairro
    return parts.length <= 2 && /\d+/.test(cleaned);
}

/**
 * Extrai cidade do endereço completo
 */
export function extractCity(address: string): string | null {
    // Procurar padrões comuns de cidade no formato brasileiro
    const cityPattern = /,\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ\s]+)(?:\s*-\s*[A-Z]{2})?$/i;
    const match = address.match(cityPattern);

    if (match && match[1]) {
        return match[1].trim();
    }

    return null;
}
