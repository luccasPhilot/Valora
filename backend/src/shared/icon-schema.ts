import { z } from 'zod';

const MAX_ICON_LENGTH = 50;
// Nome de ícone Lucide em kebab-case ("shopping-cart"). A tela só desenha os que conhece.
const ICON_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const iconNameSchema = z.string().max(MAX_ICON_LENGTH).regex(ICON_NAME_PATTERN);
