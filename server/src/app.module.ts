import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { ClientModule } from "./client/client.module";
import { CoClientModule } from "./co-client/co-client.module";
import { CategoryModule } from "./category/category.module";
import { ProductModule } from "./product/product.module";
import { ProductPhotoModule } from "./product-photo/product-photo.module";
import { CommandModule } from "./command/command.module";
import { StatsModule } from "./stats/stats.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    ClientModule,
    CoClientModule,
    CategoryModule,
    ProductModule,
    ProductPhotoModule,
    CommandModule,
    StatsModule,
  ],
})
export class AppModule {}
