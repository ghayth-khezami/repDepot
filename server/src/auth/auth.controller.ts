import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyDto } from "./dto/verify.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @Throttle({ auth: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post("register")
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Demander un code d'inscription (email)" })
  @ApiResponse({ status: 200, description: "Code envoyé par email" })
  @ApiResponse({ status: 409, description: "Email déjà utilisé" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.requestRegisterCode(dto.email, dto.password, dto.username);
  }

  @Post("verify")
  @Throttle({ auth: { limit: 15, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Vérifier le code et créer le compte" })
  @ApiResponse({ status: 201, description: "Compte vérifié et créé" })
  @ApiResponse({ status: 400, description: "Code invalide/expiré" })
  async verify(@Body() dto: VerifyDto) {
    return this.authService.verifyRegisterCode(dto.email, dto.code);
  }

  @Post("google")
  @Throttle({ auth: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion / inscription via Google" })
  @ApiResponse({ status: 200, description: "Connexion Google réussie" })
  async google(@Body() dto: GoogleAuthDto) {
    return this.authService.googleSignIn(dto.idToken, dto.intent);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current authenticated user" })
  me(@Req() req: { user: { id: string; email: string; username?: string; role: string } }) {
    return { user: req.user };
  }
}
