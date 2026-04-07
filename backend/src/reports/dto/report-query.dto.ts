import { IsInt, IsOptional, Min, IsString, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class ReportQueryDto {
    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;

    @IsOptional()
    @IsString()
    tz?: string;

    @IsOptional()
    @IsString()
    net?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    pageSize?: number;

    @IsOptional()
    @Type(() => Number)
    kioskId?: number;

    @IsOptional()
    @Type(() => Number)
    cashierUserId?: number;

    @IsOptional()
    @IsString()
    referenceContains?: string;

    @IsOptional()
    @Type(() => Number)
    childId?: number;

    @IsOptional()
    @IsString()
    sortBy?: 'quantity' | 'margin' | 'revenue';
}