import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { PaymentRequestService } from "./payment-request.service";
import { SetPaymentRequestStatusDto } from "./dto/payment-request.dto";

/** Admin side of the déposants' payment requests. */
@ApiTags("payment-requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("payment-requests")
export class PaymentRequestController {
  constructor(private readonly service: PaymentRequestService) {}

  @Get()
  @ApiOperation({ summary: "Demandes de paiement (filtre status=PENDING|DONE|CANCELLED)" })
  list(@Query("status") status?: string) {
    return this.service.listAdmin(status && ["PENDING", "DONE", "CANCELLED"].includes(status) ? status : undefined);
  }

  @Patch(":id")
  @ApiOperation({ summary: "DONE = paiement remis (articles → Payé, déposant prévenu) · CANCELLED" })
  setStatus(@Param("id", ParseUUIDPipe) id: string, @Body() dto: SetPaymentRequestStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
