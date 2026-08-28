export const PASSWORD_HINT =
  "Mínimo 8 caracteres, con mayúscula, minúscula y número; sin máximo definido.";

export function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
