export const CLINIC_NAME = 'TeleConsult MedChat';
export const CLINIC_TAGLINE = 'Secure teleconsultations for modern care teams';
export const DEMO_PROVIDER_ID = 1;
export const DEMO_PATIENT_ID = 2;

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};