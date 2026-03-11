import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Vérifie que la valeur du champ est identique à celle d'un autre champ.
 *
 * @param property - Nom du champ de référence
 * @param options  - Options class-validator optionnelles
 *
 * @example
 * @Match('newPassword', { message: 'Les mots de passe ne correspondent pas' })
 * confirmPassword: string;
 */
export function Match(
  property: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name:         'match',
      target:       object.constructor,
      propertyName: propertyName as string,
      constraints:  [property],
      options:      {
        message: `${String(propertyName)} doit correspondre à ${property}`,
        ...options,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return value === relatedValue;
        },
      },
    });
  };
}