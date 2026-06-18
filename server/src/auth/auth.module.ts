import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { UserModule } from "../user/user.module";
import { getJwtSecret } from "../config/security.config";

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        expiresIn: "1d",
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
