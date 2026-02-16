/**
 * Utilitários para validação e formatação de documentos brasileiros (CPF e CNPJ)
 */

/**
 * Remove toda formatação de um documento (pontos, traços, barras)
 */
export function cleanDocument(doc: string): string {
  return doc.replace(/\D/g, '');
}

/**
 * Valida CPF usando algoritmo de dígitos verificadores
 * @param cpf - CPF com ou sem formatação
 * @returns true se CPF é válido
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cleanDocument(cpf);

  // CPF deve ter exatamente 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }

  // Rejeitar CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  // Validar primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) {
    return false;
  }

  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) {
    return false;
  }

  return true;
}

/**
 * Valida CNPJ usando algoritmo de dígitos verificadores
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se CNPJ é válido
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cleanDocument(cnpj);

  // CNPJ deve ter exatamente 14 dígitos
  if (cleaned.length !== 14) {
    return false;
  }

  // Rejeitar CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return false;
  }

  // Validar primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned.charAt(12))) {
    return false;
  }

  // Validar segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned.charAt(13))) {
    return false;
  }

  return true;
}

/**
 * Valida se um documento é CPF ou CNPJ válido (detecta automaticamente)
 * @param doc - Documento com ou sem formatação
 * @returns true se o documento é válido (CPF ou CNPJ)
 */
export function isValidDocument(doc: string): boolean {
  const cleaned = cleanDocument(doc);
  
  if (cleaned.length === 11) {
    return validateCPF(cleaned);
  } else if (cleaned.length === 14) {
    return validateCNPJ(cleaned);
  }
  
  return false;
}

/**
 * Formata CPF para exibição (000.000.000-00)
 * @param cpf - CPF com ou sem formatação
 * @returns CPF formatado ou string original se inválido
 */
export function formatCPF(cpf: string): string {
  const cleaned = cleanDocument(cpf);
  
  if (cleaned.length !== 11) {
    return cpf;
  }
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ para exibição (00.000.000/0000-00)
 * @param cnpj - CNPJ com ou sem formatação
 * @returns CNPJ formatado ou string original se inválido
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanDocument(cnpj);
  
  if (cleaned.length !== 14) {
    return cnpj;
  }
  
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata documento (CPF ou CNPJ) automaticamente baseado no tamanho
 * @param doc - Documento com ou sem formatação
 * @returns Documento formatado
 */
export function formatDocument(doc: string): string {
  const cleaned = cleanDocument(doc);
  
  if (cleaned.length === 11) {
    return formatCPF(cleaned);
  } else if (cleaned.length === 14) {
    return formatCNPJ(cleaned);
  }
  
  return doc;
}
