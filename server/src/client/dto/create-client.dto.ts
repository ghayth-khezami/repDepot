import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class CreateClientDto {
  @ApiProperty({ description: "First name", example: "John" })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ description: "Last name", example: "Doe" })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({ description: "Address", example: "123 Main St, City" })
  @IsString()
  @MinLength(1)
  address: string;

  @ApiProperty({
    description: "Email address",
    example: "john.doe@example.com",
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Phone number", example: "+1234567890" })
  @IsString()
  @MinLength(1)
  phoneNumber: string;
}
