interface OrderEmailData {
    orderId: string;
    clientName: string;
    originAddress: string;
    destinationAddress: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    problemDescription?: string;
    trackingUrl?: string;
}

/**
 * Template de email para pedido coletado (PICKED_UP)
 */
export function getPickedUpEmailTemplate(data: OrderEmailData): { subject: string; html: string } {
    return {
        subject: `✅ Pedido #${data.orderId} foi coletado!`,
        html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido Coletado</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Pedido Coletado!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Olá <strong>${data.clientName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Boas notícias! Seu pedido foi coletado e está a caminho do destino.
            </p>
            
            <!-- Order Details Card -->
            <div style="background-color: #f9fafb; border-left: 4px solid #f97316; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">📦 Detalhes do Pedido</h3>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">ID do Pedido:</strong> 
                <span style="color: #1f2937;">#${data.orderId}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">📍 Origem:</strong> 
                <span style="color: #1f2937;">${data.originAddress}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">📍 Destino:</strong> 
                <span style="color: #1f2937;">${data.destinationAddress}</span>
              </div>
              
              ${data.deliveryPersonName ? `
                <div style="margin: 10px 0;">
                  <strong style="color: #6b7280;">🚗 Entregador:</strong> 
                  <span style="color: #1f2937;">${data.deliveryPersonName}</span>
                </div>
              ` : ''}
              
              ${data.deliveryPersonPhone ? `
                <div style="margin: 10px 0;">
                  <strong style="color: #6b7280;">📞 Contato:</strong> 
                  <span style="color: #1f2937;">${data.deliveryPersonPhone}</span>
                </div>
              ` : ''}
            </div>
            
            ${data.trackingUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.trackingUrl}" style="display: inline-block; background-color: #f97316; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  🔍 Rastrear Pedido
                </a>
              </div>
            ` : ''}
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; line-height: 1.6;">
              Fique tranquilo! Você receberá uma nova notificação assim que seu pedido for entregue.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              © ${new Date().getFullYear()} SB Entregas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    };
}

/**
 * Template de email para problema reportado (PROBLEM)
 */
export function getProblemEmailTemplate(data: OrderEmailData): { subject: string; html: string } {
    return {
        subject: `⚠️ Problema com pedido #${data.orderId}`,
        html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Problema na Entrega</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Atenção Necessária</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Olá <strong>${data.clientName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Detectamos um problema com a entrega do seu pedido #${data.orderId}. 
              Nossa equipe já foi notificada e está trabalhando para resolver.
            </p>
            
            <!-- Alert Box -->
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 16px;">⚠️ Detalhes do Problema</h3>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">ID do Pedido:</strong> 
                <span style="color: #1f2937;">#${data.orderId}</span>
              </div>
              
              ${data.problemDescription ? `
                <div style="margin: 15px 0; padding: 15px; background-color: white; border-radius: 6px;">
                  <strong style="color: #6b7280;">Descrição:</strong><br/>
                  <span style="color: #1f2937; display: block; margin-top: 8px;">${data.problemDescription}</span>
                </div>
              ` : ''}
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">📍 Origem:</strong> 
                <span style="color: #1f2937;">${data.originAddress}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">📍 Destino:</strong> 
                <span style="color: #1f2937;">${data.destinationAddress}</span>
              </div>
              
              ${data.deliveryPersonName ? `
                <div style="margin: 10px 0;">
                  <strong style="color: #6b7280;">🚗 Entregador:</strong> 
                  <span style="color: #1f2937;">${data.deliveryPersonName}</span>
                </div>
              ` : ''}
              
              ${data.deliveryPersonPhone ? `
                <div style="margin: 10px 0;">
                  <strong style="color: #6b7280;">📞 Contato:</strong> 
                  <span style="color: #1f2937;">${data.deliveryPersonPhone}</span>
                </div>
              ` : ''}
            </div>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6; margin-top: 25px;">
              <strong>O que fazer agora?</strong>
            </p>
            
            <ul style="font-size: 14px; color: #6b7280; line-height: 1.8;">
              <li>Nossa equipe está trabalhando para resolver o problema</li>
              <li>Você receberá uma atualização em breve</li>
              <li>Se necessário, entre em contato conosco pelo telefone ou WhatsApp</li>
            </ul>
            
            ${data.trackingUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.trackingUrl}" style="display: inline-block; background-color: #ef4444; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  📍 Ver Detalhes
                </a>
              </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              © ${new Date().getFullYear()} SB Entregas. Atendimento disponível 24/7.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    };
}

/**
 * Template de email para pedido entregue (DELIVERED)
 */
export function getDeliveredEmailTemplate(data: OrderEmailData): { subject: string; html: string } {
    return {
        subject: `🎉 Pedido #${data.orderId} foi entregue!`,
        html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido Entregue</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Entrega Concluída!</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Olá <strong>${data.clientName}</strong>,
            </p>
            
            <p style="font-size: 18px; color: #10b981; font-weight: 600; line-height: 1.6;">
              ✅ Seu pedido foi entregue com sucesso!
            </p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Esperamos que tudo tenha chegado em perfeito estado.
            </p>
            
            <!-- Success Card -->
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 16px;">📦 Resumo da Entrega</h3>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">ID do Pedido:</strong> 
                <span style="color: #1f2937;">#${data.orderId}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">📍 Origem:</strong> 
                <span style="color: #1f2937;">${data.originAddress}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">📍 Destino:</strong> 
                <span style="color: #1f2937;">${data.destinationAddress}</span>
              </div>
              
              ${data.deliveryPersonName ? `
                <div style="margin: 10px 0;">
                  <strong style="color: #6b7280;">🚗 Entregador:</strong> 
                  <span style="color: #1f2937;">${data.deliveryPersonName}</span>
                </div>
              ` : ''}
              
              <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #d1fae5;">
                <strong style="color: #6b7280;">⏱️ Status:</strong> 
                <span style="color: #10b981; font-weight: 600;">Entregue</span>
              </div>
            </div>
            
            <!-- Rating Section -->
            <div style="background-color: #fffbeb; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
              <p style="font-size: 16px; color: #92400e; margin: 0 0 15px 0; font-weight: 600;">
                ⭐ Como foi sua experiência?
              </p>
              <p style="font-size: 14px; color: #78350f; margin: 0 0 20px 0;">
                Sua avaliação nos ajuda a melhorar nosso serviço!
              </p>
              ${data.trackingUrl ? `
                <a href="${data.trackingUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  ⭐ Avaliar Entrega
                </a>
              ` : ''}
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; line-height: 1.6; text-align: center;">
              Obrigado por escolher a SB Entregas! 🚀
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              © ${new Date().getFullYear()} SB Entregas. Sempre à sua disposição.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    };
}

/**
 * Template de email para notificação do administrador
 */
export function getAdminNotificationTemplate(data: OrderEmailData, status: string): { subject: string; html: string } {
    const statusInfo = {
        PICKED_UP: { emoji: '✅', text: 'Coletado', color: '#f97316' },
        PROBLEM: { emoji: '⚠️', text: 'Problema', color: '#ef4444' },
        DELIVERED: { emoji: '🎉', text: 'Entregue', color: '#10b981' },
    }[status] || { emoji: '📦', text: status, color: '#6b7280' };

    return {
        subject: `[ADMIN] ${statusInfo.emoji} Pedido #${data.orderId} - ${statusInfo.text}`,
        html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificação Admin</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-top: 4px solid ${statusInfo.color};">
          <!-- Header -->
          <div style="padding: 30px; background-color: #f9fafb;">
            <h1 style="color: #1f2937; margin: 0; font-size: 20px;">
              ${statusInfo.emoji} Notificação do Sistema
            </h1>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">
              Atualização de Status - Pedido #${data.orderId}
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="background-color: #f9fafb; border-left: 4px solid ${statusInfo.color}; padding: 20px; margin: 20px 0; border-radius: 6px;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">📊 Detalhes</h3>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">Status:</strong> 
                <span style="color: ${statusInfo.color}; font-weight: 600;">${statusInfo.text}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">Pedido:</strong> 
                <span style="color: #1f2937;">#${data.orderId}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">Cliente:</strong> 
                <span style="color: #1f2937;">${data.clientName}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">Origem:</strong> 
                <span style="color: #1f2937;">${data.originAddress}</span>
              </div>
              
              <div style="margin: 10px 0;">
                <strong style="color: #6b7280;">Destino:</strong> 
                <span style="color: #1f2937;">${data.destinationAddress}</span>
              </div>
              
              ${data.deliveryPersonName ? `
                <div style="margin: 10px 0;">
                  <strong style="color: #6b7280;">Entregador:</strong> 
                  <span style="color: #1f2937;">${data.deliveryPersonName} ${data.deliveryPersonPhone ? `(${data.deliveryPersonPhone})` : ''}</span>
                </div>
              ` : ''}
              
              ${data.problemDescription ? `
                <div style="margin: 15px 0; padding: 15px; background-color: #fef2f2; border-radius: 6px;">
                  <strong style="color: #991b1b;">Problema Reportado:</strong><br/>
                  <span style="color: #1f2937; display: block; margin-top: 8px;">${data.problemDescription}</span>
                </div>
              ` : ''}
            </div>
            
            ${data.trackingUrl ? `
              <div style="text-align: center; margin: 25px 0;">
                <a href="${data.trackingUrl}" style="display: inline-block; background-color: ${statusInfo.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Ver Detalhes Completos
                </a>
              </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Notificação automática do sistema SB Entregas
            </p>
          </div>
        </div>
      </body>
      </html>
    `
    };
}
