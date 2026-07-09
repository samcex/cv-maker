import { useState, useEffect } from 'react';
import { 
  Download, Upload, Trash2, Plus, X, FileText, Star, 
  Briefcase, GraduationCap, Award, User, ChevronDown,
  ZoomIn, ZoomOut, RotateCcw, Moon, Sun, Sparkles, LayoutGrid
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ImageRun } from 'docx';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { 
  CVData, PersonalInfo, ExperienceEntry, EducationEntry, 
  ProjectEntry, Template 
} from './types';

// Default / Example CV
const defaultCV: CVData = {
  personal: {
    fullName: "Alex Rivera",
    jobTitle: "Senior Product Designer",
    email: "alex.rivera@email.com",
    phone: "+1 (415) 555-0192",
    location: "San Francisco, CA",
    website: "alexrivera.design",
    linkedin: "linkedin.com/in/alexrivera",
    summary: "Product designer with 7+ years of experience crafting intuitive digital experiences for B2B SaaS and consumer platforms. Passionate about design systems, accessibility, and data-informed design. Previously led design at two venture-backed startups and contributed to products used by millions.",
    photo: undefined
  },
  experience: [
    {
      id: "exp1",
      company: "Notion Labs",
      position: "Senior Product Designer",
      startDate: "2022-03",
      endDate: "",
      current: true,
      bullets: [
        "Led the end-to-end redesign of the core editor and collaboration features, increasing weekly active usage by 42%",
        "Established the company's first design system and component library used across web, desktop and mobile",
        "Partnered with engineering and product to ship 6 major product initiatives in 2023"
      ]
    },
    {
      id: "exp2",
      company: "Figma",
      position: "Product Designer",
      startDate: "2019-06",
      endDate: "2022-02",
      current: false,
      bullets: [
        "Designed and shipped the Comments and FigJam widget platform used by 3M+ users",
        "Ran dozens of user research sessions that directly informed roadmap priorities",
        "Mentored 4 junior designers and contributed to hiring and onboarding processes"
      ]
    }
  ],
  education: [
    {
      id: "edu1",
      school: "Rhode Island School of Design",
      degree: "Bachelor of Fine Arts",
      field: "Graphic Design",
      startDate: "2014-09",
      endDate: "2018-05",
      current: false,
      gpa: "",
      description: ""
    }
  ],
  skills: [
    "Figma", "Design Systems", "User Research", "Prototyping", 
    "Accessibility (WCAG)", "Framer", "Webflow", "HTML/CSS", "Design Leadership"
  ],
  projects: [
    {
      id: "proj1",
      name: "Open Source Design System",
      description: "Built and maintain a fully accessible, open-source component library used by 180+ designers and developers.",
      url: "github.com/alexrivera/ds",
      technologies: "React, TypeScript, Tailwind, Storybook",
      startDate: "2023-01",
      endDate: ""
    }
  ]
};

const TEMPLATES: { id: Template; label: string; desc?: string }[] = [
  { id: 'professional', label: 'Professional', desc: 'Clean & timeless' },
  { id: 'minimal', label: 'Minimal', desc: 'Simple & spacious' },
  { id: 'modern', label: 'Modern', desc: 'Bold & contemporary' },
  { id: 'classic', label: 'Classic', desc: 'Traditional & elegant' },
  { id: 'sidebar', label: 'Executive', desc: 'Two-column layout' },
  { id: 'compact', label: 'Compact', desc: 'Dense & efficient' },
];

const ACCENT_COLORS = ['#6366f1', '#0ea47a', '#7c3aed', '#c2410f', '#334155'];

const translations = {
  en: {
    layout: 'Layout',
    themeAccent: 'Theme Accent',
    livePreview: 'LIVE PREVIEW',
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    projects: 'Projects',
    skills: 'Skills',
    downloadPDF: 'Download PDF',
    downloadDOCX: 'Word (DOCX)',
    a4Format: 'A4 format • Professional & ATS-ready',
  },
  de: {
    layout: 'Layout',
    themeAccent: 'Akzentfarbe',
    livePreview: 'LIVE VORSCHAU',
    summary: 'Zusammenfassung',
    experience: 'Berufserfahrung',
    education: 'Ausbildung',
    projects: 'Projekte',
    skills: 'Fähigkeiten',
    downloadPDF: 'PDF herunterladen',
    downloadDOCX: 'Word (DOCX)',
    a4Format: 'A4 Format • Professionell & ATS-optimiert',
  }
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function formatMonth(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + '-01');
    return format(date, 'MMM yyyy');
  } catch {
    return dateStr;
  }
}

function getDateRange(entry: { startDate: string; endDate: string; current: boolean }) {
  const start = formatMonth(entry.startDate);
  const end = entry.current ? 'Present' : formatMonth(entry.endDate);
  return start && end ? `${start} — ${end}` : start || end;
}

export default function CVMaker() {
  const [cv, setCv] = useState<CVData>(defaultCV);
  const [template, setTemplate] = useState<Template>('professional');
  const [accentColor, setAccentColor] = useState<string>('#6366f1');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [activeAccordion, setActiveAccordion] = useState<string>('personal');
  const [zoom, setZoom] = useState<number>(0.85);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('cv-maker-dark-mode') === 'true';
  });
  const [language, setLanguage] = useState<'en' | 'de'>(() => {
    return (localStorage.getItem('cv-maker-language') as 'en' | 'de') || 'en';
  });

  // Dark mode class toggle
  useEffect(() => {
    localStorage.setItem('cv-maker-dark-mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cv-maker-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.cv) setCv(parsed.cv);
        if (parsed.template) setTemplate(parsed.template);
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
      } catch (e) {
        console.error('Failed to load saved CV');
      }
    }
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    const data = { cv, template, accentColor, language };
    localStorage.setItem('cv-maker-data', JSON.stringify(data));
    localStorage.setItem('cv-maker-language', language);
  }, [cv, template, accentColor, language]);

  // Completion Progress calculator
  const getCompletionProgress = () => {
    let score = 0;
    let total = 0;
    
    // Personal Info (max 30 pts)
    total += 30;
    if (cv.personal.fullName) score += 10;
    if (cv.personal.email) score += 10;
    if (cv.personal.jobTitle) score += 5;
    if (cv.personal.summary) score += 5;
    
    // Experience (max 25 pts)
    total += 25;
    if (cv.experience.length > 0) {
      score += 15;
      if (cv.experience[0].company && cv.experience[0].position) score += 10;
    }
    
    // Education (max 20 pts)
    total += 20;
    if (cv.education.length > 0) {
      score += 12;
      if (cv.education[0].school && cv.education[0].degree) score += 8;
    }
    
    // Skills (max 15 pts)
    total += 15;
    if (cv.skills.length > 0) {
      score += 10;
      if (cv.skills.length >= 3) score += 5;
    }
    
    // Projects (max 10 pts)
    total += 10;
    if (cv.projects.length > 0 && cv.projects[0].name) {
      score += 10;
    }
    
    return Math.round((score / total) * 100);
  };

  const progress = getCompletionProgress();

  // Update personal info
  const updatePersonal = (field: keyof PersonalInfo, value: string | undefined) => {
    setCv(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  // Photo upload (stores as base64 data URL)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Photo must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updatePersonal('photo', base64);
      toast.success('Photo uploaded');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  const removePhoto = () => {
    updatePersonal('photo', undefined);
    toast.info('Photo removed');
  };

  // Experience handlers
  const addExperience = () => {
    const newExp: ExperienceEntry = {
      id: generateId(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: ['']
    };
    setCv(prev => ({ ...prev, experience: [...prev.experience, newExp] }));
    toast.success('Experience block added');
  };

  const updateExperience = (id: string, field: keyof ExperienceEntry, value: any) => {
    setCv(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (id: string) => {
    setCv(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
    toast.info('Experience block removed');
  };

  const addBullet = (expId: string) => {
    setCv(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
      )
    }));
  };

  const updateBullet = (expId: string, index: number, value: string) => {
    setCv(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.map((b, i) => (i === index ? value : b)) }
          : exp
      )
    }));
  };

  const removeBullet = (expId: string, index: number) => {
    setCv(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== index) }
          : exp
      )
    }));
  };

  // Education
  const addEducation = () => {
    const newEdu: EducationEntry = {
      id: generateId(),
      school: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      current: false,
      gpa: '',
      description: ''
    };
    setCv(prev => ({ ...prev, education: [...prev.education, newEdu] }));
    toast.success('Education block added');
  };

  const updateEducation = (id: string, field: keyof EducationEntry, value: any) => {
    setCv(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (id: string) => {
    setCv(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
    toast.info('Education block removed');
  };

  // Skills
  const [skillInput, setSkillInput] = useState('');

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (cv.skills.includes(trimmed)) {
      toast.error('Skill already added');
      return;
    }
    setCv(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setCv(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  // Projects
  const addProject = () => {
    const newProj: ProjectEntry = {
      id: generateId(),
      name: '',
      description: '',
      url: '',
      technologies: '',
      startDate: '',
      endDate: ''
    };
    setCv(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
    toast.success('Project block added');
  };

  const updateProject = (id: string, field: keyof ProjectEntry, value: any) => {
    setCv(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const removeProject = (id: string) => {
    setCv(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id)
    }));
    toast.info('Project block removed');
  };

  // Templates & color
  const changeTemplate = (t: Template) => {
    setTemplate(t);
    toast.success(`Switched to ${TEMPLATES.find(x => x.id === t)?.label} layout`);
  };

  const changeAccent = (color: string) => {
    setAccentColor(color);
  };

  // Load example / reset
  const loadExample = () => {
    setCv(defaultCV);
    setTemplate('professional');
    setAccentColor('#6366f1');
    toast.success('Loaded example CV');
  };

  const clearAll = () => {
    if (!confirm('Clear all data? This cannot be undone.')) return;
    const empty: CVData = {
      personal: { fullName: '', jobTitle: '', email: '', phone: '', location: '', website: '', linkedin: '', summary: '', photo: undefined },
      experience: [],
      education: [],
      skills: [],
      projects: []
    };
    setCv(empty);
    toast.info('CV cleared');
  };

  // Export JSON
  const exportJSON = () => {
    const data = { cv, template, accentColor };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cv.personal.fullName.replace(/\s+/g, '-') || 'cv'}-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CV data exported as JSON');
  };

  // Import JSON
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.cv) {
          setCv(parsed.cv);
          if (parsed.template) setTemplate(parsed.template);
          if (parsed.accentColor) setAccentColor(parsed.accentColor);
          toast.success('CV imported successfully');
        } else {
          toast.error('Invalid CV file format');
        }
      } catch (err) {
        toast.error('Failed to parse file');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  // Native print
  const printResume = () => {
    const resumeEl = document.getElementById('resume-preview');
    if (!resumeEl) return;
    document.body.classList.add('printing-resume');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-resume');
    }, 200);
  };

  // PDF Export - Robust version
  const exportPDF = async () => {
    const wrapper = document.querySelector('.resume-preview-wrapper') as HTMLElement;
    if (!wrapper) {
      toast.error('Preview not ready');
      return;
    }

    const name = cv.personal.fullName || 'My-CV';
    const filename = `${name.replace(/\s+/g, '-')}.pdf`;

    toast.loading('Generating PDF...', { id: 'pdf' });

    const originalTransform = wrapper.style.transform;
    const originalZoom = zoom;

    try {
      // Disable scale for clean high-res capture
      wrapper.style.transform = 'scale(1)';
      if (zoom !== 1) setZoom(1);

      await new Promise(r => setTimeout(r, 60));

      const canvas = await html2canvas(wrapper, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      });

      // Restore
      wrapper.style.transform = originalTransform;
      if (originalZoom !== 1) setZoom(originalZoom);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(filename);

      toast.success('PDF downloaded!', { id: 'pdf' });
    } catch (error) {
      wrapper.style.transform = originalTransform;
      if (originalZoom !== 1) setZoom(originalZoom);
      console.error(error);
      toast.error('PDF export failed', { id: 'pdf' });
    }
  };

  // DOCX Export
  const exportDOCX = async () => {
    const { personal, experience, education, skills, projects } = cv;
    const name = personal.fullName || 'My-CV';
    const filename = `${name.replace(/\s+/g, '-')}.docx`;

    toast.loading('Structuring DOCX file...', { id: 'docx' });

    try {
      const children: any[] = [];

      let photoImageRun: any = null;
      if (personal.photo) {
        try {
          const base64Data = personal.photo.split(',')[1];
          const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          photoImageRun = new ImageRun({
            type: 'png',
            data: imageBuffer,
            transformation: { width: 80, height: 80 }
          });
        } catch (e) {
          console.warn('Could not prepare photo for DOCX', e);
        }
      }

      const sectionHeader = (text: string) =>
        new Paragraph({
          spacing: { before: 220, after: 60 },
          children: [
            new TextRun({ text, bold: true, size: 22, color: accentColor.replace('#', '') }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: accentColor.replace('#', '') } }
        });

      if (photoImageRun) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [photoImageRun]
        }));
      }

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: personal.fullName || 'Your Name', bold: true, size: 32 })]
        })
      );
      if (personal.jobTitle) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: personal.jobTitle, size: 20, color: accentColor.replace('#', '') })]
          })
        );
      }

      const contactLine = [personal.email, personal.phone, personal.location, personal.website, personal.linkedin]
        .filter(Boolean).join('  |  ');
      if (contactLine) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: contactLine, size: 17, color: '555555' })]
          })
        );
      }

      if (personal.summary) {
        children.push(sectionHeader('PROFESSIONAL SUMMARY'));
        children.push(new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: personal.summary, size: 20 })]
        }));
      }

      if (experience.length > 0) {
        children.push(sectionHeader('EXPERIENCE'));
        experience.forEach(exp => {
          const dateStr = getDateRange(exp);
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 40 },
              children: [
                new TextRun({ text: exp.position || 'Position', bold: true, size: 20 }),
                new TextRun({ text: exp.company ? `  •  ${exp.company}` : '', size: 20 }),
                new TextRun({ text: dateStr ? `   |   ${dateStr}` : '', size: 18, color: '666666' }),
              ]
            })
          );
          exp.bullets.filter(b => b.trim()).forEach(bullet => {
            children.push(new Paragraph({
              spacing: { after: 40 },
              indent: { left: 360 },
              children: [new TextRun({ text: '• ' + bullet, size: 19 })]
            }));
          });
        });
      }

      if (education.length > 0) {
        children.push(sectionHeader('EDUCATION'));
        education.forEach(edu => {
          const dateStr = getDateRange(edu);
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: `${edu.degree || ''}${edu.field ? ' in ' + edu.field : ''}`, bold: true, size: 20 }),
                new TextRun({ text: edu.school ? `  •  ${edu.school}` : '', size: 19 }),
                new TextRun({ text: dateStr ? `   |   ${dateStr}` : '', size: 18, color: '666666' }),
              ]
            })
          );
          if (edu.description) {
            children.push(new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({ text: edu.description, size: 19, italics: true })]
            }));
          }
        });
      }

      if (projects.length > 0 && projects.some(p => p.name)) {
        children.push(sectionHeader('PROJECTS'));
        projects.filter(p => p.name).forEach(proj => {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: proj.name, bold: true, size: 20 }),
                proj.url ? new TextRun({ text: `  (${proj.url})`, size: 18, color: '2563eb' }) : new TextRun({ text: '' }),
              ]
            })
          );
          if (proj.technologies) {
            children.push(new Paragraph({
              spacing: { after: 20 },
              children: [new TextRun({ text: proj.technologies, size: 18, italics: true, color: '555555' })]
            }));
          }
          if (proj.description) {
            children.push(new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: proj.description, size: 19 })]
            }));
          }
        });
      }

      if (skills.length > 0) {
        children.push(sectionHeader('SKILLS'));
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: skills.join('  •  '), size: 19 })]
        }));
      }

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('DOCX downloaded!', { id: 'docx' });
    } catch (error) {
      console.error('DOCX export error:', error);
      toast.error('Failed to generate DOCX', { id: 'docx' });
    }
  };

  // Render preview component
  const renderPreview = () => {
    const { personal, experience, education, skills, projects } = cv;
    const accent = accentColor;
    const hasPhoto = !!personal.photo;
    const tr = translations[language];

    const contactItems = [
      personal.email, personal.phone, personal.location, 
      personal.website, personal.linkedin
    ].filter(Boolean);

    const NameHeader = (
      <>
        <h1 className="resume-name">{personal.fullName || "Your Name"}</h1>
        {personal.jobTitle && (
          <div className="resume-title" style={{ color: accent }}>{personal.jobTitle}</div>
        )}
      </>
    );

    const ContactBar = (
      <div className="resume-contact">
        {contactItems.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300 dark:text-slate-700 select-none">•</span>}
            {item}
          </span>
        ))}
      </div>
    );

    const Summary = personal.summary && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent, borderBottomColor: `${accent}20` }}>{tr.summary}</div>
        <p className="resume-summary">{personal.summary}</p>
      </div>
    );

    const ExperienceSection = experience.length > 0 && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent, borderBottomColor: `${accent}20` }}>{tr.experience}</div>
        {experience.map((exp) => (
          <div key={exp.id} className="experience-item">
            <div className="item-header">
              <div>
                <span className="item-title">{exp.position || 'Position'}</span>
                {exp.company && <span className="item-subtitle">  •  {exp.company}</span>}
              </div>
              <span className="item-date">{getDateRange(exp)}</span>
            </div>
            {exp.bullets.filter(b => b.trim()).length > 0 && (
              <ul className="item-bullets">
                {exp.bullets.filter(Boolean).map((bullet, i) => <li key={i}>{bullet}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    );

    const EducationSection = education.length > 0 && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent, borderBottomColor: `${accent}20` }}>Education</div>
        {education.map((edu) => (
          <div key={edu.id} className="education-item">
            <div className="item-header">
              <div>
                <span className="item-title">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
                {edu.school && <span className="item-subtitle">  •  {edu.school}</span>}
              </div>
              <span className="item-date">{getDateRange(edu)}</span>
            </div>
            {edu.description && <p className="text-[8.5pt] mt-0.5 text-[var(--resume-muted)] italic">{edu.description}</p>}
          </div>
        ))}
      </div>
    );

    const ProjectsSection = projects.length > 0 && projects.some(p => p.name) && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent, borderBottomColor: `${accent}20` }}>{tr.projects}</div>
        {projects.filter(p => p.name).map((proj) => (
          <div key={proj.id} className="project-item">
            <div className="item-header">
              <div>
                <span className="item-title">{proj.name}</span>
                {proj.url && (
                  <a href={`https://${proj.url.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="ml-1.5 text-[8.5pt] font-semibold" style={{ color: accent }}>↗</a>
                )}
              </div>
              {(proj.startDate || proj.endDate) && (
                <span className="item-date">{getDateRange({ startDate: proj.startDate || '', endDate: proj.endDate || '', current: false })}</span>
              )}
            </div>
            {proj.technologies && <div className="text-[8.2pt] text-[var(--resume-muted)] mb-0.5 font-medium">{proj.technologies}</div>}
            <p className="text-[8.5pt] leading-relaxed">{proj.description}</p>
          </div>
        ))}
      </div>
    );

    const SkillsSection = skills.length > 0 && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent, borderBottomColor: `${accent}20` }}>{tr.skills}</div>
        <div className="skills-list">
          {skills.map((skill, index) => (
            <span key={index} className="skill-tag" style={{ background: `${accent}12`, color: accent }}>{skill}</span>
          ))}
        </div>
      </div>
    );

    const PhotoEl = hasPhoto ? (
      <img src={personal.photo} alt="Profile" className="resume-photo" />
    ) : null;

    // ===== TEMPLATE LAYOUTS =====
    if (template === 'sidebar') {
      return (
        <div 
          id="resume-preview" 
          className="resume-paper resume-sidebar"
          style={{ '--resume-accent': accent } as React.CSSProperties}
        >
          <div className="sidebar">
            {hasPhoto && <div className="mb-2 flex justify-center">{PhotoEl}</div>}
            
            <div>
              <h1 className="resume-name" style={{ fontSize: '14pt' }}>{personal.fullName || "Your Name"}</h1>
              {personal.jobTitle && <div className="resume-title" style={{ color: accent, fontSize: '9pt' }}>{personal.jobTitle}</div>}
            </div>

            <div className="sidebar-section">
              <div className="sidebar-title" style={{ color: accent }}>Contact</div>
              {contactItems.map((c, i) => <div key={i} className="text-[8pt] text-slate-600 mb-0.5 break-all">{c}</div>)}
            </div>

            {skills.length > 0 && (
              <div className="sidebar-section">
                <div className="sidebar-title" style={{ color: accent }}>Skills</div>
                <div className="flex flex-wrap gap-1">
                  {skills.map((s, i) => (
                    <span key={i} className="skill-tag text-[7.5pt]" style={{ background: `${accent}15`, color: accent, padding: '1px 5px' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {personal.summary && (
              <div className="sidebar-section">
                <div className="sidebar-title" style={{ color: accent }}>Summary</div>
                <p className="text-[8pt] leading-normal text-slate-600">{personal.summary}</p>
              </div>
            )}
          </div>

          <div className="main">
            {ExperienceSection}
            {EducationSection}
            {ProjectsSection}
          </div>
        </div>
      );
    }

    if (template === 'compact') {
      return (
        <div 
          id="resume-preview" 
          className="resume-paper resume-compact"
          style={{ '--resume-accent': accent } as React.CSSProperties}
        >
          <div className="resume-header flex items-start gap-4 pb-2 mb-2 border-b-2" style={{ borderBottomColor: accent }}>
            {hasPhoto && PhotoEl}
            <div className="flex-1 min-w-0">
              {NameHeader}
              {ContactBar}
            </div>
          </div>
          {Summary}
          {ExperienceSection}
          {EducationSection}
          {ProjectsSection}
          {SkillsSection}
        </div>
      );
    }

    if (template === 'classic') {
      return (
        <div 
          id="resume-preview" 
          className="resume-paper resume-classic"
          style={{ '--resume-accent': accent } as React.CSSProperties}
        >
          <div className="text-center mb-3">
            {hasPhoto && <div className="flex justify-center mb-2"><img src={personal.photo} alt="" className="resume-photo" style={{ width: '60px', height: '60px' }} /></div>}
            <h1 className="resume-name" style={{ fontSize: '18pt' }}>{personal.fullName || "Your Name"}</h1>
            {personal.jobTitle && <div className="resume-title" style={{ color: accent, fontSize: '10pt' }}>{personal.jobTitle}</div>}
            <div className="text-[8pt] text-slate-500 mt-1 flex justify-center gap-3">
              {contactItems.map((item, i) => (
                <span key={i}>{item}</span>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `1.5px solid ${accent}`, margin: '4px 0 8px' }} />

          {Summary}
          {ExperienceSection}
          {EducationSection}
          {ProjectsSection}
          {SkillsSection}
        </div>
      );
    }

    const templateClass = template === 'minimal' ? 'minimal' : template === 'modern' ? 'modern' : 'professional';

    const headerWithPhoto = (
      <div className="resume-header flex gap-4 items-center pb-3 mb-3 border-b-2" style={{ borderBottomColor: accent }}>
        {hasPhoto && PhotoEl}
        <div className="flex-1 min-w-0">
          {NameHeader}
          {ContactBar}
        </div>
      </div>
    );

    return (
      <div 
        id="resume-preview" 
        className={`resume-paper resume-${templateClass}`}
        style={{ 
          '--resume-accent': accent
        } as React.CSSProperties}
      >
        {hasPhoto ? headerWithPhoto : (
          <div className="resume-header pb-3 mb-3 border-b-2" style={{ borderBottomColor: accent }}>
            {NameHeader}
            {ContactBar}
          </div>
        )}

        {Summary}
        {ExperienceSection}
        {EducationSection}
        {ProjectsSection}
        {SkillsSection}
      </div>
    );
  };

  // Render individual Accordion Items
  const renderAccordionItem = (
    id: string, 
    title: string, 
    icon: React.ReactNode, 
    completionText: string,
    children: React.ReactNode
  ) => {
    const isOpen = activeAccordion === id;
    return (
      <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm transition-all duration-300">
        <button 
          onClick={() => setActiveAccordion(isOpen ? '' : id)}
          className="w-full flex items-center justify-between p-4 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-md">
              {icon}
            </div>
            <div className="text-left">
              <div className="text-slate-800 dark:text-slate-200 text-sm font-bold normal-case tracking-normal">{title}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium normal-case tracking-normal">{completionText}</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key={`${id}-content`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 space-y-4">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="app-container flex flex-col">
      <Toaster position="top-center" richColors closeButton />

      {/* Modern Navbar */}
      <nav className="navbar px-5 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="logo-icon w-8 h-8 rounded-lg flex items-center justify-center text-white">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              CV Maker <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium -mt-0.5">Professional Resumes instantly</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex items-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-[0.98]"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Language switch */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs font-semibold">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 transition-colors ${language === 'en' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('de')}
              className={`px-2.5 py-1 transition-colors ${language === 'de' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              DE
            </button>
          </div>

          <button 
            onClick={loadExample} 
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-[0.985] hidden md:flex"
          >
            <Star className="w-4 h-4 text-indigo-500" /> Load Example
          </button>

          <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer transition-all active:scale-[0.985]">
            <Upload className="w-4 h-4" /> Import
            <input type="file" accept=".json" className="hidden" onChange={importJSON} />
          </label>

          <button onClick={exportJSON} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-[0.985] hidden sm:flex">
            <Download className="w-4 h-4" /> Export JSON
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button 
              onClick={exportPDF} 
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm hover:shadow-md transition-all active:scale-[0.985]"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button 
              onClick={exportDOCX} 
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow transition-all active:scale-[0.985] hidden sm:flex"
            >
              <Download className="w-4 h-4" /> DOCX
            </button>
          </div>

          <button onClick={printResume} className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-[0.985] hidden md:flex">Print</button>

          <button 
            onClick={clearAll} 
            className="inline-flex items-center p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 transition-all active:scale-[0.98] ml-1" 
            title="Clear all data"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Mobile Tabs */}
      <div className="mobile-tabs text-sm">
        <button 
          onClick={() => setActiveTab('edit')} 
          className={`flex-1 py-3 font-semibold transition-colors ${activeTab === 'edit' ? 'border-b-2 border-indigo-500 text-slate-850 dark:text-white' : 'text-slate-400'}`}
        >
          Editor
        </button>
        <button 
          onClick={() => setActiveTab('preview')} 
          className={`flex-1 py-3 font-semibold transition-colors ${activeTab === 'preview' ? 'border-b-2 border-indigo-500 text-slate-850 dark:text-white' : 'text-slate-400'}`}
        >
          Preview
        </button>
      </div>

      {/* Main Split View */}
      <div className="main-content flex-1 overflow-hidden">
        
        {/* EDITOR PANEL */}
        <div className={`editor-pane ${activeTab === 'edit' ? '' : 'hidden lg:flex'}`}>
          <div className="editor-header flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">Builder Panels</span>
            <button onClick={loadExample} className="text-[10px] inline-flex items-center px-2.5 py-1 font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-[0.98] md:hidden">Load Example</button>
          </div>

          <div className="editor-scroll space-y-3">
            {/* Resume Strength Gauge */}
            <div className="mb-4 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[10px] font-extrabold tracking-wider uppercase opacity-70">Resume Strength</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="text-2xl font-black">{progress}%</div>
                  <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-white rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <div className="text-[10px] mt-2 opacity-90 font-medium">
                  {progress < 40 && "🌱 Fill in details to boost your score!"}
                  {progress >= 40 && progress < 75 && "⚡ Keep going, your CV is taking shape!"}
                  {progress >= 75 && progress < 100 && "🔥 Great strength! Highly competitive layout."}
                  {progress === 100 && "👑 Perfect! Your CV is fully optimized."}
                </div>
              </div>
              <div className="absolute right-[-15px] bottom-[-15px] w-20 h-20 bg-white/10 rounded-full blur-xl" />
              <div className="absolute left-[-15px] top-[-15px] w-12 h-12 bg-white/10 rounded-full blur-lg" />
            </div>

            {/* Accordion 1: Personal */}
            {renderAccordionItem(
              'personal',
              'Personal Information',
              <User className="w-4 h-4" />,
              cv.personal.fullName ? 'Completed' : 'Add details',
              <>
                {/* Photo Uploader */}
                <div className="photo-uploader">
                  {cv.personal.photo ? (
                    <div className="relative">
                      <img src={cv.personal.photo} alt="Profile" className="photo-preview" />
                      <button onClick={removePhoto} className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center shadow">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-[0.985]">
                      <Upload className="w-3.5 h-3.5" />
                      {cv.personal.photo ? 'Change photo' : 'Upload photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">JPG or PNG • Max 2MB</div>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input className="input" value={cv.personal.fullName} onChange={e => updatePersonal('fullName', e.target.value)} placeholder="Alex Rivera" />
                  </div>
                  <div>
                    <label className="form-label">Job Title</label>
                    <input className="input" value={cv.personal.jobTitle} onChange={e => updatePersonal('jobTitle', e.target.value)} placeholder="Senior Product Designer" />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="form-label">Email Address</label>
                    <input className="input" value={cv.personal.email} onChange={e => updatePersonal('email', e.target.value)} placeholder="you@email.com" />
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input className="input" value={cv.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="form-label">Location</label>
                    <input className="input" value={cv.personal.location} onChange={e => updatePersonal('location', e.target.value)} placeholder="San Francisco, CA" />
                  </div>
                  <div>
                    <label className="form-label">Website Portfolio</label>
                    <input className="input" value={cv.personal.website} onChange={e => updatePersonal('website', e.target.value)} placeholder="yourwebsite.design" />
                  </div>
                </div>

                <div>
                  <label className="form-label">LinkedIn URL</label>
                  <input className="input" value={cv.personal.linkedin} onChange={e => updatePersonal('linkedin', e.target.value)} placeholder="linkedin.com/in/username" />
                </div>

                <div>
                  <label className="form-label">Professional Summary</label>
                  <textarea 
                    className="textarea" 
                    value={cv.personal.summary} 
                    onChange={e => updatePersonal('summary', e.target.value)} 
                    placeholder="Short description of your strengths, background and experience..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Accordion 2: Experience */}
            {renderAccordionItem(
              'experience',
              'Work Experience',
              <Briefcase className="w-4 h-4" />,
              `${cv.experience.length} ${cv.experience.length === 1 ? 'position' : 'positions'}`,
              <>
                <div className="flex justify-end">
                  <button onClick={addExperience} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98]">
                    <Plus className="w-3.5 h-3.5 text-indigo-500" /> Add Position
                  </button>
                </div>

                {cv.experience.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                    No positions added yet.
                  </div>
                )}

                {cv.experience.map((exp, idx) => (
                  <div key={exp.id} className="entry-card relative group">
                    <button 
                      onClick={() => removeExperience(exp.id)} 
                      className="absolute top-2 right-2 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                      title="Delete experience"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Position #{idx + 1}</div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">Position / Job Title</label>
                        <input className="input text-xs" placeholder="e.g. Lead Designer" value={exp.position} onChange={e => updateExperience(exp.id, 'position', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Company / Employer</label>
                        <input className="input text-xs" placeholder="e.g. Figma" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} />
                      </div>
                    </div>

                    <div className="flex gap-3 items-end mt-3">
                      <div className="flex-1">
                        <label className="form-label">Start Date</label>
                        <input type="month" className="input text-xs" value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <label className="form-label">End Date</label>
                        <input type="month" className="input text-xs" value={exp.endDate} disabled={exp.current} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer select-none pb-2 pt-1 h-10">
                        <input 
                          type="checkbox" 
                          checked={exp.current} 
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          onChange={e => {
                            updateExperience(exp.id, 'current', e.target.checked);
                            if (e.target.checked) updateExperience(exp.id, 'endDate', '');
                          }} 
                        /> Present
                      </label>
                    </div>

                    {/* Bullet Points */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Key achievements</span>
                        <button onClick={() => addBullet(exp.id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all">
                          <Plus className="w-3 h-3" /> Add point
                        </button>
                      </div>
                      {exp.bullets.map((bullet, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input 
                            className="input text-xs flex-1" 
                            placeholder="e.g. Reduced user onboarding time by 30%..." 
                            value={bullet} 
                            onChange={e => updateBullet(exp.id, i, e.target.value)} 
                          />
                          <button 
                            onClick={() => removeBullet(exp.id, i)} 
                            className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" 
                            disabled={exp.bullets.length === 1}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Accordion 3: Education */}
            {renderAccordionItem(
              'education',
              'Education',
              <GraduationCap className="w-4 h-4" />,
              `${cv.education.length} ${cv.education.length === 1 ? 'degree' : 'degrees'}`,
              <>
                <div className="flex justify-end">
                  <button onClick={addEducation} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98]">
                    <Plus className="w-3.5 h-3.5 text-indigo-500" /> Add Education
                  </button>
                </div>

                {cv.education.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                    No education entries added yet.
                  </div>
                )}

                {cv.education.map((edu, idx) => (
                  <div key={edu.id} className="entry-card relative">
                    <button 
                      onClick={() => removeEducation(edu.id)} 
                      className="absolute top-2 right-2 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Education #{idx + 1}</div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">School / University</label>
                        <input className="input text-xs" placeholder="e.g. Stanford University" value={edu.school} onChange={e => updateEducation(edu.id, 'school', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Degree (e.g. Master of Science)</label>
                        <input className="input text-xs" placeholder="e.g. M.S." value={edu.degree} onChange={e => updateEducation(edu.id, 'degree', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="form-label">Field of Study</label>
                        <input className="input text-xs" placeholder="e.g. Computer Science" value={edu.field} onChange={e => updateEducation(edu.id, 'field', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Grade / GPA (optional)</label>
                        <input className="input text-xs" placeholder="e.g. 3.8 / 4.0" value={edu.gpa || ''} onChange={e => updateEducation(edu.id, 'gpa', e.target.value)} />
                      </div>
                    </div>

                    <div className="flex gap-3 items-end mt-3">
                      <div className="flex-1">
                        <label className="form-label">Start Date</label>
                        <input type="month" className="input text-xs" value={edu.startDate} onChange={e => updateEducation(edu.id, 'startDate', e.target.value)} />
                      </div>
                      <div className="flex-1">
                        <label className="form-label">End Date</label>
                        <input type="month" className="input text-xs" value={edu.endDate} disabled={edu.current} onChange={e => updateEducation(edu.id, 'endDate', e.target.value)} />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer select-none pb-2 pt-1 h-10">
                        <input type="checkbox" checked={edu.current} onChange={e => updateEducation(edu.id, 'current', e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500" /> Current
                      </label>
                    </div>

                    <div className="mt-3">
                      <label className="form-label">Description / Extra details</label>
                      <input className="input text-xs" placeholder="e.g. Minor in Data Science, honors list..." value={edu.description || ''} onChange={e => updateEducation(edu.id, 'description', e.target.value)} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Accordion 4: Skills */}
            {renderAccordionItem(
              'skills',
              'Skills & Competencies',
              <Award className="w-4 h-4" />,
              `${cv.skills.length} ${cv.skills.length === 1 ? 'skill' : 'skills'} added`,
              <>
                <div className="flex gap-2">
                  <input 
                    className="input flex-1" 
                    value={skillInput} 
                    onChange={e => setSkillInput(e.target.value)} 
                    onKeyDown={handleSkillKeyDown}
                    placeholder="e.g. Figma, React, Python" 
                  />
                  <button onClick={addSkill} className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm transition-all active:scale-[0.985]">Add</button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {cv.skills.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">No skills added yet.</span>}
                  {cv.skills.map((skill, i) => (
                    <div key={i} className="chip">
                      <span>{skill}</span>
                      <button onClick={() => removeSkill(skill)} className="p-0.5 text-slate-400 hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Accordion 5: Projects */}
            {renderAccordionItem(
              'projects',
              'Projects & Creations',
              <FileText className="w-4 h-4" />,
              `${cv.projects.length} ${cv.projects.length === 1 ? 'project' : 'projects'}`,
              <>
                <div className="flex justify-end">
                  <button onClick={addProject} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98]">
                    <Plus className="w-3.5 h-3.5 text-indigo-500" /> Add Project
                  </button>
                </div>

                {cv.projects.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                    No project entries added yet.
                  </div>
                )}

                {cv.projects.map((proj, idx) => (
                  <div key={proj.id} className="entry-card relative">
                    <button 
                      onClick={() => removeProject(proj.id)} 
                      className="absolute top-2 right-2 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Project #{idx + 1}</div>

                    <input className="input text-xs mb-2.5" placeholder="Project Name" value={proj.name} onChange={e => updateProject(proj.id, 'name', e.target.value)} />
                    <textarea className="textarea text-xs" placeholder="Briefly describe what you built, stack used and project impact..." rows={2.5} value={proj.description} onChange={e => updateProject(proj.id, 'description', e.target.value)} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                      <div>
                        <label className="form-label">Link (optional)</label>
                        <input className="input text-xs" placeholder="e.g. github.com/username/project" value={proj.url || ''} onChange={e => updateProject(proj.id, 'url', e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Technologies Used</label>
                        <input className="input text-xs" placeholder="e.g. React, Next.js, Node" value={proj.technologies || ''} onChange={e => updateProject(proj.id, 'technologies', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* PREVIEW PANEL - Rebuilt Clean & Elegant */}
        <div className={`preview-pane ${activeTab === 'preview' ? '' : 'hidden lg:flex'}`}>
          {/* Clean Centered Top Bar */}
          <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <div className="max-w-[920px] mx-auto px-6 py-2.5 flex items-center justify-center gap-8">
              {/* Templates - Modern Pills */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-widest text-slate-500">TEMPLATE</span>
                <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => changeTemplate(t.id)}
                      className={`px-3.5 py-1 text-xs font-semibold rounded-xl transition-all ${template === t.id ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Colors */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-widest text-slate-500">COLOR</span>
                <div className="flex gap-1.5">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => changeAccent(color)}
                      className={`w-5 h-5 rounded-full border transition-all ${accentColor === color ? 'border-slate-900 dark:border-white ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400' : 'border-slate-200 dark:border-slate-700 hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">−</button>
                <span className="font-mono w-8 text-center tabular-nums text-slate-500">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">+</button>
                <button onClick={() => setZoom(0.9)} className="px-2 py-1 text-xs rounded-lg bg-slate-200 dark:bg-slate-700">Fit</button>
              </div>
            </div>
          </div>

          {/* Slate Preview Area */}
          <div className="preview-scroll-area">
            <div 
              className="resume-preview-wrapper"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                width: '100%',
                maxWidth: '860px',
                margin: '0 auto',
                flexShrink: 0
              }}
            >
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
