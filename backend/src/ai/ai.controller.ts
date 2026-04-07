import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Get('status')
    @ApiOperation({ summary: 'Check if AI is available' })
    getStatus() {
        return { available: this.aiService.isAvailable() };
    }

    @UseGuards(JwtAuthGuard)
    @Post('chat')
    @ApiOperation({ summary: 'Chat with KioAI assistant' })
    async chat(@Body() dto: AiChatDto, @Req() req: any) {
        const userId = req.user.sub;
        const response = await this.aiService.chat(dto.message, dto.history, userId);
        return { response };
    }

}
