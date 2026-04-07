import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform: 'android' | 'ios' | 'web';

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;
}
