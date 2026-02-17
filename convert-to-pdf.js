const fs = require('fs');
const { spawn } = require('child_process');

// Script simples para converter MD to PDF usando browser
const mdContent = fs.readFileSync('./DOCUMENTACAO_COMPLETA.md', 'utf8');

console.log('Arquivo Markdown lido com sucesso!');
console.log('Total de caracteres:', mdContent.length);
console.log('\n✅ Documentação completa criada em DOCUMENTACAO_COMPLETA.md');
console.log('📄 Para converter para PDF, use uma das seguintes opções:');
console.log('\nOpção 1 - Online (Recomendado):');
console.log('  1. Acesse: https://www.markdowntopdf.com/');
console.log('  2. Ou: https://md2pdf.netlify.app/');
console.log('  3. Cole o conteúdo ou faça upload do arquivo');
console.log('  4. Clique em "Convert to PDF"');
console.log('\nOpção 2 - VS Code:');
console.log('  1. Instale a extensão "Markdown PDF"');
console.log('  2. Abra DOCUMENTACAO_COMPLETA.md no VS Code');
console.log('  3. Pressione Ctrl+Shift+P');
console.log('  4. Digite "Markdown PDF: Export (pdf)"');
console.log('\nOpção 3 - Pandoc (Terminal):');
console.log('  1. Instale Pandoc: winget install Pandoc.Pandoc');
console.log('  2. Execute: pandoc DOCUMENTACAO_COMPLETA.md -o DOCUMENTACAO_COMPLETA.pdf --pdf-engine=wkhtmltopdf');
