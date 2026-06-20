import { Module } from "@nestjs/common";
import { SubSubCategory1Controller } from "./sub-sub-category-1.controller";
import { SubSubCategory2Controller } from "./sub-sub-category-2.controller";
import { SubSubCategory3Controller } from "./sub-sub-category-3.controller";
import { SubSubCategoryService } from "./sub-sub-category.service";

@Module({
  controllers: [SubSubCategory1Controller, SubSubCategory2Controller, SubSubCategory3Controller],
  providers: [SubSubCategoryService],
  exports: [SubSubCategoryService],
})
export class SubSubCategoryModule {}
