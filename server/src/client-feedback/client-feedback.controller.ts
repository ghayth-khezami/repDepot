import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ClientFeedbackService } from "./client-feedback.service";
import { CreateClientFeedbackDto } from "./dto/create-client-feedback.dto";
import { UpdateClientFeedbackDto } from "./dto/update-client-feedback.dto";
import { ClientFeedbackQueryDto } from "./dto/client-feedback-query.dto";

@ApiTags("client-feedbacks")
@Controller("client-feedbacks")
export class ClientFeedbackController {
  constructor(private readonly clientFeedbackService: ClientFeedbackService) {}

  @Get()
  @ApiOperation({ summary: "Published client feedbacks (public)" })
  findPublished() {
    return this.clientFeedbackService.findPublished();
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "All client feedbacks (admin)" })
  findAllAdmin(@Query() query: ClientFeedbackQueryDto) {
    return this.clientFeedbackService.findAllAdmin(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create client feedback (admin)" })
  create(@Body() dto: CreateClientFeedbackDto) {
    return this.clientFeedbackService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update client feedback (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateClientFeedbackDto) {
    return this.clientFeedbackService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete client feedback (admin)" })
  remove(@Param("id") id: string) {
    return this.clientFeedbackService.remove(id);
  }
}
