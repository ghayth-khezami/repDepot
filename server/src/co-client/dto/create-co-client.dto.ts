import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateCoClientDto {
  @ApiProperty({ description: 'First name', example: 'Jane' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Smith' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({ description: 'Address', example: '456 Oak Ave, City' })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiProperty({ description: 'Email address', example: 'jane.smith@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number', example: '+1234567891' })
  @IsString()
  @MinLength(1)
  phoneNumber: string;

  @ApiProperty({ description: 'RIB (Bank account number)', example: 'FR1420041010050500013M02606' })
  @IsString()
  @MinLength(1)
  RIB: string;
}
