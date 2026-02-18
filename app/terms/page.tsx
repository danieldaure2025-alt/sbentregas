'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] p-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Link href="/auth/signup">
          <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao cadastro
          </Button>
        </Link>

        <Card className="shadow-2xl border-orange-500/20 bg-[hsl(220,20%,12%)]/95 backdrop-blur">
          <CardHeader className="text-center border-b border-gray-700">
            <div className="flex items-center justify-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-orange-500" />
              <CardTitle className="text-2xl font-bold text-white">
                Termos de Uso e Política de Privacidade
              </CardTitle>
            </div>
            <p className="text-gray-400">
              <span className="text-[#00a2ff]">Daure</span>{' '}
              <span className="text-orange-500">Express</span> - Última atualização: Fevereiro de 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none p-6 text-gray-300">
            <h2 className="text-xl font-bold text-white mt-6 mb-4">1. ACEITAÇÃO DOS TERMOS</h2>
            <p className="mb-4">
              Ao utilizar o aplicativo Daure Express, você concorda com estes Termos de Uso e nossa Política de Privacidade. 
              Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.
            </p>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">2. DESCRIÇÃO DO SERVIÇO</h2>
            <p className="mb-4">
              A Daure Express é uma plataforma de intermediação de serviços de entrega que conecta clientes 
              que necessitam de entregas a entregadores independentes. A plataforma oferece:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Solicitação de entregas em tempo real</li>
              <li>Acompanhamento de pedidos em tempo real</li>
              <li>Sistema de pagamento integrado (PIX, Cartão de Crédito e Dinheiro)</li>
              <li>Comunicação entre cliente e entregador</li>
              <li>Sistema de avaliação mútua</li>
            </ul>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">3. CADASTRO E CONTA</h2>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">3.1 Requisitos para Cadastro</h3>
            <p className="mb-4">
              Para utilizar nossos serviços, você deve ter pelo menos 18 anos de idade e fornecer informações 
              verdadeiras e atualizadas durante o cadastro.
            </p>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">3.2 Responsabilidade da Conta</h3>
            <p className="mb-4">
              Você é responsável por manter a confidencialidade de sua senha e por todas as atividades 
              realizadas em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
            </p>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">4. PARA ENTREGADORES</h2>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">4.1 Requisitos</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>CNH válida e compatível com o veículo utilizado</li>
              <li>Veículo em boas condições de uso</li>
              <li>Documentação regular do veículo</li>
              <li>Aprovação prévia pela administração da plataforma</li>
            </ul>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">4.2 Obrigações</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Manter localização ativa durante as entregas</li>
              <li>Tratar clientes com respeito e cordialidade</li>
              <li>Zelar pelos itens transportados</li>
              <li>Cumprir os prazos estabelecidos</li>
              <li>Comunicar qualquer problema imediatamente</li>
            </ul>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">4.3 Pagamentos</h3>
            <p className="mb-4">
              Os entregadores recebem o valor da entrega descontada a taxa da plataforma. Os saques 
              podem ser solicitados a qualquer momento, sujeitos a aprovação administrativa e 
              processamento em até 48 horas úteis.
            </p>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">5. PARA CLIENTES</h2>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">5.1 Obrigações</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Fornecer endereços corretos e completos</li>
              <li>Estar disponível para receber a entrega</li>
              <li>Efetuar o pagamento conforme acordado</li>
              <li>Tratar entregadores com respeito</li>
              <li>Não enviar itens proibidos por lei</li>
            </ul>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">5.2 Cancelamentos</h3>
            <p className="mb-4">
              Pedidos podem ser cancelados sem custo enquanto estiverem aguardando pagamento ou 
              antes de serem aceitos por um entregador. Após a aceitação, cancelamentos podem 
              gerar taxas conforme a situação.
            </p>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">6. ITENS PROIBIDOS</h2>
            <p className="mb-4">É expressamente proibido o transporte de:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Drogas ilícitas e substâncias controladas</li>
              <li>Armas de fogo e munições</li>
              <li>Materiais explosivos ou inflamáveis</li>
              <li>Produtos roubados ou de procedência duvidosa</li>
              <li>Animais vivos (exceto em casos específicos autorizados)</li>
              <li>Qualquer item proibido por lei</li>
            </ul>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">7. TAXAS E PAGAMENTOS</h2>
            <p className="mb-4">
              Os preços são calculados com base na distância, considerando uma taxa base fixa 
              mais um valor por quilômetro rodado. Paradas adicionais podem gerar custos extras. 
              A plataforma retém uma porcentagem do valor total como taxa de serviço.
            </p>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">8. POLÍTICA DE PRIVACIDADE</h2>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">8.1 Dados Coletados</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Informações de cadastro (nome, email, telefone)</li>
              <li>Dados de localização durante o uso do serviço</li>
              <li>Histórico de pedidos e transações</li>
              <li>Mensagens trocadas na plataforma</li>
              <li>Dados de pagamento (processados por terceiros seguros)</li>
            </ul>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">8.2 Uso dos Dados</h3>
            <p className="mb-4">Seus dados são utilizados para:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Prestação e melhoria dos serviços</li>
              <li>Comunicação sobre pedidos e atualizações</li>
              <li>Processamento de pagamentos</li>
              <li>Segurança e prevenção de fraudes</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
            <h3 className="text-lg font-semibold text-orange-400 mt-4 mb-2">8.3 Compartilhamento</h3>
            <p className="mb-4">
              Seus dados podem ser compartilhados com entregadores (para realização da entrega), 
              processadores de pagamento, e autoridades quando exigido por lei.
            </p>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">9. LIMITAÇÃO DE RESPONSABILIDADE</h2>
            <p className="mb-4">
              A Daure Express atua como intermediária e não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Danos causados por terceiros durante o transporte</li>
              <li>Atrasos causados por fatores externos (trânsito, clima, etc.)</li>
              <li>Conteúdo dos itens transportados</li>
              <li>Disputas entre clientes e entregadores</li>
            </ul>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">10. MODIFICAÇÕES</h2>
            <p className="mb-4">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. 
              Alterações significativas serão comunicadas por email ou notificação no aplicativo. 
              O uso continuado após alterações implica aceitação dos novos termos.
            </p>

            <h2 className="text-xl font-bold text-white mt-6 mb-4">11. CONTATO</h2>
            <p className="mb-4">
              Para dúvidas, sugestões ou reclamações, entre em contato através do WhatsApp 
              disponível no aplicativo ou pelo email de suporte.
            </p>

            <div className="mt-8 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-center text-white font-medium">
                Ao criar sua conta e utilizar nossos serviços, você declara ter lido, 
                compreendido e concordado com todos os termos acima.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/auth/signup">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8">
              Voltar ao cadastro
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
