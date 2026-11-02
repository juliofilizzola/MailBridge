export const optional = (value: string | undefined): string | undefined => {
  return value && value.trim().length > 0 ? value.trim() : undefined;
};
