import { NivelAcesso, ModuloAcesso } from '../models/usuario.interface';

export const NIVEIS_ACESSO: { value: NivelAcesso; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'editor', label: 'Editor' },
  { value: 'visualizador', label: 'Visualizador' }
];

export const MODULOS_DISPONIVEIS: { value: ModuloAcesso; label: string }[] = [
  { value: 'recepcao', label: 'Recepção' },
  { value: 'triagem', label: 'Triagem' },
  { value: 'medico', label: 'Médico' },
  { value: 'admin', label: 'Administração' },
  { value: 'ambulatorio', label: 'Ambulatório' }
];

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50],
  TABLE_HEIGHT: '612px'
} as const;

export const FORM_VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const;
