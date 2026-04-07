import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../auth/roles.enum';

export class UserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: [String], example: ['CASHIER'] })
  roles: string[];

  @ApiProperty()
  createdAt: Date;
}