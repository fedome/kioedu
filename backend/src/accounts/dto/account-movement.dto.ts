// account-movement.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class AccountMovementDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: ['SALE', 'TOPUP'] })
  type: TransactionType;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ description: 'Monto en centavos' })
  totalCents: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Descripción legible del movimiento (opcional)',
  })
  description?: string | null;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'FAILED', 'CANCELED', 'VOID'] })
  status: string;

  @ApiProperty({ required: false })
  paymentMethod?: string;

  @ApiProperty({
    required: false,
    description: 'Items del ticket en caso de ser un consumo',
  })
  items?: any[];
}
