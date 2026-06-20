import { PartialType } from "@nestjs/swagger";
import {
  CreateSubSubCategory1Dto,
  CreateSubSubCategory2Dto,
  CreateSubSubCategory3Dto,
} from "./create-sub-sub-category.dto";

export class UpdateSubSubCategory1Dto extends PartialType(CreateSubSubCategory1Dto) {}
export class UpdateSubSubCategory2Dto extends PartialType(CreateSubSubCategory2Dto) {}
export class UpdateSubSubCategory3Dto extends PartialType(CreateSubSubCategory3Dto) {}
