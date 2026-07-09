export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  summary: string;
  photo?: string; // base64 data URL
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa?: string;
  description?: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  url?: string;
  technologies?: string;
  startDate?: string;
  endDate?: string;
}

export interface CVData {
  personal: PersonalInfo;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  projects: ProjectEntry[];
}

export type Template = 'professional' | 'minimal' | 'modern' | 'classic' | 'sidebar' | 'compact';

export interface AppState {
  cv: CVData;
  template: Template;
  accentColor: string;
}
