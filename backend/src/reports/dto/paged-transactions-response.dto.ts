import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from '../../common/dto/page-meta.dto';
import { ReportTransactionItemDto } from './report-transaction-item.dto';

export class PagedTransactionsResponseDto {
    @ApiProperty({ type: PageMetaDto })
    meta: PageMetaDto;

    @ApiProperty({ type: ReportTransactionItemDto, isArray: true })
    items: ReportTransactionItemDto[];
}
