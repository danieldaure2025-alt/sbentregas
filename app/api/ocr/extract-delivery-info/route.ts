import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Call LLM API to extract delivery information
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em extrair informações de entrega de imagens.
Analise a imagem e extraia as seguintes informações se disponíveis:
- Endereços (origem e destino)
- Números de telefone
- Nomes de pessoas/destinatários
- Observações ou instruções de entrega
- CEP
- Bairro
- Cidade

Responda APENAS em formato JSON válido, sem markdown ou formatação adicional.
Se não encontrar alguma informação, deixe o campo como string vazia.

Formato de resposta:
{
  "originAddress": "endereço de origem completo",
  "destinationAddress": "endereço de destino completo",
  "phone": "número de telefone",
  "recipientName": "nome do destinatário",
  "notes": "observações ou instruções",
  "zipCode": "CEP",
  "neighborhood": "bairro",
  "city": "cidade"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia todas as informações de entrega desta imagem. Procure por endereços, telefones, nomes e qualquer instrução de entrega.'
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('LLM API error:', await response.text());
      return NextResponse.json({ error: 'Erro ao processar imagem' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'Não foi possível extrair informações' }, { status: 500 });
    }

    // Parse the JSON response
    let extractedInfo;
    try {
      extractedInfo = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse LLM response:', content);
      return NextResponse.json({ error: 'Erro ao processar resposta' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: extractedInfo,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
