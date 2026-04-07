import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;

    constructor(
        private config: ConfigService,
        private prisma: PrismaService
    ) {
        const apiKey = this.config.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            // Usamos gemini-flash-latest (que es 1.5 flash estable)
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
            this.logger.log('🤖 Gemini AI initialized (gemini-flash-latest)');

            // Test the connection on startup
            this.testConnection();
        } else {
            this.logger.warn('⚠️ GEMINI_API_KEY not set — AI features will be disabled');
        }
    }

    private async testConnection() {
        try {
            const result = await this.model!.generateContent('Say "OK" in one word');
            this.logger.log(`✅ Gemini test passed: "${result.response.text().trim()}"`);
        } catch (error: any) {
            this.logger.error(`❌ Gemini test FAILED: ${error?.message}`);
            if (error?.status === 404 || error?.message?.includes('404')) {
                this.logger.error('   → Model not found. Check if the model name is correct for your region.');
            } else if (error?.status === 429 || error?.message?.includes('429')) {
                this.logger.error('   → Quota exceeded. Even if AI Studio says it is fine, check your RPM/RPD limits or Billing.');
            }
        }
    }

    isAvailable(): boolean {
        return !!this.model;
    }

    /**
     * Chat with KioAI. Accepts the user's message and optional conversation history.
     */
    async chat(
        message: string,
        history?: { role: 'user' | 'model'; content: string }[],
        userId?: number
    ): Promise<string> {
        if (!this.model) {
            return '⚠️ La IA no está configurada. Agregá tu GEMINI_API_KEY en el archivo .env del servidor.';
        }

        try {
            // Build dynamic context for the system prompt
            let posContext = '';
            if (userId) {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId },
                    include: { school: { include: { owners: true } } }
                });
                
                const ownerId = user?.school?.owners?.[0]?.id;
                if (ownerId) {
                    // Fetch low stock items
                    const lowStock = await this.prisma.product.findMany({
                        where: { ownerId, isActive: true, stockQuantity: { lt: 10 } },
                        select: { name: true, stockQuantity: true },
                        take: 10
                    });

                    // Fetch today's sales summary
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const todaysSales = await this.prisma.transaction.aggregate({
                        where: {
                            ownerId,
                            status: 'PAID',
                            type: 'SALE',
                            startedAt: { gte: today }
                        },
                        _sum: { totalCents: true },
                        _count: { id: true }
                    });

                    const salesItems = await this.prisma.transactionItem.groupBy({
                        where: {
                            transaction: {
                                ownerId,
                                status: 'PAID',
                                type: 'SALE',
                                startedAt: { gte: today }
                            }
                        },
                        by: ['description'],
                        _sum: { quantity: true },
                        orderBy: { _sum: { quantity: 'desc' } },
                        take: 3
                    });

                    posContext = `\nContexto actual de tu kiosco:\n`;
                    posContext += `- Ventas de hoy: ${todaysSales._count.id} ventas, total: $${(todaysSales._sum.totalCents || 0) / 100}.\n`;
                    if (salesItems.length > 0) {
                        posContext += `- Top 3 productos vendidos hoy: ${salesItems.map(s => s.description).join(', ')}.\n`;
                    }
                    if (lowStock.length > 0) {
                        posContext += `- Productos con bajo stock: ${lowStock.map(p => `${p.name} (${p.stockQuantity})`).join(', ')}.\n`;
                    }
                }
            }

            const systemInstruction = 'Eres KioAI, un asistente de IA integrado en el POS KioEdu (KioEdu). Tu función es ayudar al kiosquero escolar con gestión de ventas, stock, consejos de marketing y uso del sistema. Sé conciso y amigable. Responde siempre en español.' + posContext;

            const chatHistory = [
                {
                    role: 'user' as const,
                    parts: [{ text: systemInstruction }],
                },
                {
                    role: 'model' as const,
                    parts: [{ text: 'Entendido. Soy KioAI, he leído mi contexto y estoy listo para ayudar al kiosquero.' }],
                },
                ...(history || []).map(m => ({
                    role: m.role as 'user' | 'model',
                    parts: [{ text: m.content }],
                })),
            ];

            const chat: ChatSession = this.model.startChat({ history: chatHistory });
            const result = await chat.sendMessage(message);
            return result.response.text().trim();
        } catch (error: any) {
            this.logger.error('Gemini chat error:', error?.message);

            if (error?.message?.includes('404')) {
                return '⚠️ Error 404: Modelo no disponible. Verificá la API Key y el proyecto en Google Cloud Console.';
            }
            if (error?.message?.includes('429')) {
                return '⚠️ Error 429: Cuota excedida. Tu cuenta no tiene créditos gratuitos disponibles.';
            }
            return '❌ Error al comunicarse con la IA. Intenta nuevamente.';
        }
    }
}
