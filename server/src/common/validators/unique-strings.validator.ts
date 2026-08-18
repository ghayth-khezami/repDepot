import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/** Rejects duplicate entries in string arrays (e.g. productIds). */
export function IsUniqueStrings(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isUniqueStrings",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) return false;
          return new Set(value).size === value.length;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not contain duplicate values`;
        },
      },
    });
  };
}
