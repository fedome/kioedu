import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
    @ApiProperty()
    @IsNumber()
    fromChildId: number;

    @ApiProperty()
    @IsNumber()
    toChildId: number;

    @ApiProperty()
    @IsNumber()
    @IsPositive()
    amountCents: number;
}
