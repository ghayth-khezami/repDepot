import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LikesService } from "./likes.service";
import { CheckLikesDto } from "./dto/check-likes.dto";
import { LikesQueryDto } from "./dto/likes-query.dto";

type AuthedRequest = Request & { user: { id: string; email: string; username?: string | null } };

@ApiTags("likes")
@ApiBearerAuth()
@Controller("likes")
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post("check")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Which of these products are liked by the current user" })
  check(@Req() req: AuthedRequest, @Body() dto: CheckLikesDto) {
    return this.likesService.check(req.user.id, dto.productIds);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Paginated liked products (articles préférés)" })
  listMine(@Req() req: AuthedRequest, @Query() q: LikesQueryDto) {
    return this.likesService.listMine(req.user.id, q.page, q.limit);
  }

  @Post(":productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Like a product" })
  add(@Req() req: AuthedRequest, @Param("productId") productId: string) {
    return this.likesService.add(req.user.id, productId);
  }

  @Delete(":productId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Unlike a product" })
  remove(@Req() req: AuthedRequest, @Param("productId") productId: string) {
    return this.likesService.remove(req.user.id, productId);
  }
}
