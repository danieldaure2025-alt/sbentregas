import { Resend } from 'resend';
import { OrderStatus } from '@prisma/client';
import {
    getPickedUpEmailTemplate,
    getProblemEmailTemplate,
    getDeliveredEmailTemplate,
    getAdminNotificationTemplate,
} from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

interface OrderNotificationData {
    orderId: string;
    clientName: string;
    clientEmail: string;
    originAddress: string;
    destinationAddress: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    problemDescription?: string;
    status: OrderStatus;
}

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

/**
 * Função auxiliar para enviar email usando Resend
 */
async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY não configurado. Email não enviado.');
            return false;
        }

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject,
            html,
        });

        if (error) {
            console.error('Erro ao enviar email:', error);
            return false;
        }

        console.log(`✅ Email enviado com sucesso para ${to}:`, data?.id);
        return true;
    } catch (error) {
        console.error('Exceção ao enviar email:', error);
        return false;
    }
}

/**
 * Envia notificação por email sobre mudança de status do pedido
 * Notifica cliente e administrador conforme necessário
 */
export async function sendOrderStatusNotification(data: OrderNotificationData): Promise<void> {
    const { status, clientEmail, orderId } = data;

    // Verificar se é um status que requer notificação
    const notifiableStatuses: OrderStatus[] = [
        OrderStatus.PICKED_UP,
        'PROBLEM' as OrderStatus, // Será adicionado ao schema
        OrderStatus.DELIVERED,
    ];

    if (!notifiableStatuses.includes(status)) {
        console.log(`Status ${status} não requer notificações por email`);
        return;
    }

    // Preparar dados do email
    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${orderId}`;

    const emailData = {
        orderId,
        clientName: data.clientName,
        originAddress: data.originAddress,
        destinationAddress: data.destinationAddress,
        deliveryPersonName: data.deliveryPersonName,
        deliveryPersonPhone: data.deliveryPersonPhone,
        problemDescription: data.problemDescription,
        trackingUrl,
    };

    // Selecionar template baseado no status
    let clientEmailTemplate: { subject: string; html: string };

    switch (status) {
        case OrderStatus.PICKED_UP:
            clientEmailTemplate = getPickedUpEmailTemplate(emailData);
            break;
        case 'PROBLEM' as OrderStatus:
            clientEmailTemplate = getProblemEmailTemplate(emailData);
            break;
        case OrderStatus.DELIVERED:
            clientEmailTemplate = getDeliveredEmailTemplate(emailData);
            break;
        default:
            console.log(`Nenhum template disponível para status: ${status}`);
            return;
    }

    // Enviar email para o cliente (não bloquear em caso de falha)
    try {
        await sendEmail({
            to: clientEmail,
            subject: clientEmailTemplate.subject,
            html: clientEmailTemplate.html,
        });
    } catch (error) {
        console.error(`Erro ao enviar email para cliente ${clientEmail}:`, error);
        // Não lançar erro para não bloquear a atualização de status
    }

    // Enviar email para o administrador
    if (ADMIN_EMAIL) {
        try {
            const adminTemplate = getAdminNotificationTemplate(emailData, status);
            await sendEmail({
                to: ADMIN_EMAIL,
                subject: adminTemplate.subject,
                html: adminTemplate.html,
            });
        } catch (error) {
            console.error(`Erro ao enviar email para admin ${ADMIN_EMAIL}:`, error);
            // Não lançar erro para não bloquear a atualização de status
        }
    } else {
        console.warn('ADMIN_EMAIL não configurado. Notificação do admin não enviada.');
    }
}

/**
 * Envia notificações em batch (útil para múltiplos destinatários)
 */
export async function sendBatchNotifications(
    notifications: OrderNotificationData[]
): Promise<void> {
    const promises = notifications.map(data => sendOrderStatusNotification(data));

    // Executar em paralelo, mas não esperar conclusão
    Promise.allSettled(promises).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`📧 Batch de notificações: ${successful} sucesso, ${failed} falhas`);
    });
}

/**
 * Teste de configuração do serviço de email
 * Útil para verificar se RESEND_API_KEY está configurado corretamente
 */
export async function testEmailService(): Promise<boolean> {
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY não configurado');
        return false;
    }

    if (!ADMIN_EMAIL) {
        console.error('❌ ADMIN_EMAIL não configurado');
        return false;
    }

    try {
        const result = await sendEmail({
            to: ADMIN_EMAIL,
            subject: '🧪 Teste do Serviço de Email - SB Entregas',
            html: `
        <h1>Teste do Serviço de Email</h1>
        <p>Se você recebeu este email, o serviço está configurado corretamente!</p>
        <p><strong>Configuração:</strong></p>
        <ul>
          <li>RESEND_API_KEY: ✅ Configurado</li>
          <li>ADMIN_EMAIL: ${ADMIN_EMAIL}</li>
          <li>FROM_EMAIL: ${FROM_EMAIL}</li>
        </ul>
      `,
        });

        if (result) {
            console.log('✅ Teste de email enviado com sucesso!');
            return true;
        } else {
            console.error('❌ Falha ao enviar email de teste');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro no teste de email:', error);
        return false;
    }
}
