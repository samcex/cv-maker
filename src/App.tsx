import { useState, useEffect } from 'react';
import { 
  Download, Upload, Trash2, Plus, X, FileText, Star, 
  Briefcase, GraduationCap, Award, User 
} from 'lucide-react';
import { SectionHeader } from './components/SectionHeader';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ImageRun } from 'docx';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
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

const ACCENT_COLORS = ['#2563eb', '#0ea47a', '#7c3aed', '#c2410f', '#334155'];

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
  const [accentColor, setAccentColor] = useState<string>('#2563eb');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

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
    const data = { cv, template, accentColor };
    localStorage.setItem('cv-maker-data', JSON.stringify(data));
  }, [cv, template, accentColor]);

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
  };

  // Templates & color
  const changeTemplate = (t: Template) => {
    setTemplate(t);
    toast.success(`Switched to ${TEMPLATES.find(x => x.id === t)?.label}`);
  };

  const changeAccent = (color: string) => {
    setAccentColor(color);
  };

  // Load example / reset
  const loadExample = () => {
    setCv(defaultCV);
    setTemplate('professional');
    setAccentColor('#2563eb');
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
    toast.success('CV data exported');
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
          toast.error('Invalid CV file');
        }
      } catch (err) {
        toast.error('Failed to parse file');
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  // Native print (great for quick paper / browser PDF)
  const printResume = () => {
    const resumeEl = document.getElementById('resume-preview');
    if (!resumeEl) return;

    // Temporarily apply print-friendly class to body
    document.body.classList.add('printing-resume');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-resume');
    }, 200);
  };

  // PDF Export
  const exportPDF = async () => {
    const resumeEl = document.getElementById('resume-preview');
    if (!resumeEl) {
      toast.error('Preview not found');
      return;
    }

    const name = cv.personal.fullName || 'My-CV';
    const filename = `${name.replace(/\s+/g, '-')}.pdf`;

    toast.loading('Generating PDF...', { id: 'pdf' });

    try {
      // Temporarily remove box-shadow for clean export
      const originalShadow = resumeEl.style.boxShadow;
      resumeEl.style.boxShadow = 'none';

      const canvas = await html2canvas(resumeEl, {
        scale: 2.2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: resumeEl.scrollWidth,
        windowHeight: resumeEl.scrollHeight,
      });

      resumeEl.style.boxShadow = originalShadow;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Fit image
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page if needed (rare for CV)
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      toast.success('PDF downloaded!', { id: 'pdf' });
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF', { id: 'pdf' });
    }
  };

  // DOCX Export
  const exportDOCX = async () => {
    const { personal, experience, education, skills, projects } = cv;
    const name = personal.fullName || 'My-CV';
    const filename = `${name.replace(/\s+/g, '-')}.docx`;

    toast.loading('Generating DOCX...', { id: 'docx' });

    try {
      const children: any[] = [];

      // Photo buffer (if exists)
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

      // Helper for section headers
      const sectionHeader = (text: string) =>
        new Paragraph({
          spacing: { before: 220, after: 60 },
          children: [
            new TextRun({ text, bold: true, size: 22, color: accentColor.replace('#', '') }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: accentColor.replace('#', '') } }
        });

      // Header
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

      // Contact line
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

      // Summary
      if (personal.summary) {
        children.push(sectionHeader('PROFESSIONAL SUMMARY'));
        children.push(new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: personal.summary, size: 20 })]
        }));
      }

      // Experience
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

      // Education
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

      // Projects
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

      // Skills
      if (skills.length > 0) {
        children.push(sectionHeader('SKILLS'));
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: skills.join('  •  '), size: 19 })]
        }));
      }

      // Create document
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

      // Generate and download
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

  // Render the live preview
  const renderPreview = () => {
    const { personal, experience, education, skills, projects } = cv;
    const accent = accentColor;
    const hasPhoto = !!personal.photo;

    const contactItems = [
      personal.email, personal.phone, personal.location, 
      personal.website, personal.linkedin
    ].filter(Boolean);

    // Common header without photo
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
          <span key={i}>{item}</span>
        ))}
      </div>
    );

    const Summary = personal.summary && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent, borderBottomColor: '#e5e7eb' }}>Summary</div>
        <p className="resume-summary">{personal.summary}</p>
      </div>
    );

    const ExperienceSection = experience.length > 0 && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent }}>Experience</div>
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
        <div className="resume-section-title" style={{ color: accent }}>Education</div>
        {education.map((edu) => (
          <div key={edu.id} className="education-item">
            <div className="item-header">
              <div>
                <span className="item-title">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
                {edu.school && <span className="item-subtitle">  •  {edu.school}</span>}
              </div>
              <span className="item-date">{getDateRange(edu)}</span>
            </div>
            {edu.description && <p className="text-[9pt] mt-0.5 text-[var(--resume-muted)]">{edu.description}</p>}
          </div>
        ))}
      </div>
    );

    const ProjectsSection = projects.length > 0 && projects.some(p => p.name) && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent }}>Projects</div>
        {projects.filter(p => p.name).map((proj) => (
          <div key={proj.id} className="project-item">
            <div className="item-header">
              <div>
                <span className="item-title">{proj.name}</span>
                {proj.url && (
                  <a href={`https://${proj.url.replace(/^https?:\/\//, '')}`} target="_blank" className="ml-1.5 text-[9pt]" style={{ color: accent }}>↗</a>
                )}
              </div>
              {(proj.startDate || proj.endDate) && (
                <span className="item-date">{getDateRange({ startDate: proj.startDate || '', endDate: proj.endDate || '', current: false })}</span>
              )}
            </div>
            {proj.technologies && <div className="text-[8.5pt] text-[var(--resume-muted)] mb-0.5">{proj.technologies}</div>}
            <p className="text-[9pt]">{proj.description}</p>
          </div>
        ))}
      </div>
    );

    const SkillsSection = skills.length > 0 && (
      <div className="resume-section">
        <div className="resume-section-title" style={{ color: accent }}>Skills</div>
        <div className="skills-list">
          {skills.map((skill, index) => (
            <span key={index} className="skill-tag" style={{ background: `${accent}15`, color: accent }}>{skill}</span>
          ))}
        </div>
      </div>
    );

    // PHOTO ELEMENT
    const PhotoEl = hasPhoto ? (
      <img src={personal.photo} alt="Profile" className="resume-photo" />
    ) : null;

    // ===== TEMPLATE-SPECIFIC LAYOUTS =====
    if (template === 'sidebar') {
      // Two-column sidebar layout (photo + info on left)
      return (
        <div 
          id="resume-preview" 
          className="resume-paper resume-sidebar"
          style={{ '--resume-accent': accent } as React.CSSProperties}
        >
          <div className="sidebar">
            {hasPhoto && <div className="mb-3">{PhotoEl}</div>}
            
            <div className="mb-4">
              <h1 className="resume-name" style={{ fontSize: '15pt' }}>{personal.fullName || "Your Name"}</h1>
              {personal.jobTitle && <div className="resume-title" style={{ color: accent }}>{personal.jobTitle}</div>}
            </div>

            <div className="sidebar-section">
              <div className="sidebar-title">Contact</div>
              {contactItems.map((c, i) => <div key={i} className="text-[8pt] mb-0.5">{c}</div>)}
            </div>

            {skills.length > 0 && (
              <div className="sidebar-section">
                <div className="sidebar-title">Skills</div>
                <div className="flex flex-wrap gap-1">
                  {skills.map((s, i) => (
                    <span key={i} className="skill-tag text-[7.5pt]" style={{ background: `${accent}18`, color: accent }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {personal.summary && (
              <div className="sidebar-section">
                <div className="sidebar-title">Summary</div>
                <p className="text-[8pt] leading-snug">{personal.summary}</p>
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
          <div className="resume-header flex items-start gap-3" style={{ borderBottomColor: accent }}>
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
            {hasPhoto && <div className="flex justify-center mb-2"><img src={personal.photo} alt="" className="resume-photo square w-20 h-20" /></div>}
            <h1 className="resume-name" style={{ fontSize: '20pt', letterSpacing: '-0.3px' }}>{personal.fullName || "Your Name"}</h1>
            {personal.jobTitle && <div style={{ color: accent, fontWeight: 500, fontSize: '10.5pt' }}>{personal.jobTitle}</div>}
            <div className="text-[8.5pt] text-[var(--resume-muted)] mt-1">{contactItems.join('  •  ')}</div>
          </div>

          <div style={{ borderTop: `1px solid ${accent}`, margin: '6px 0 10px' }} />

          {Summary}
          {ExperienceSection}
          {EducationSection}
          {ProjectsSection}
          {SkillsSection}
        </div>
      );
    }

    // Default layouts: professional, minimal, modern (single column with photo support)
    const templateClass = template === 'minimal' ? 'minimal' : template === 'modern' ? 'modern' : 'professional';

    const headerWithPhoto = (
      <div className="resume-header flex gap-4 items-start" style={{ borderBottomColor: accent }}>
        {hasPhoto && <div>{PhotoEl}</div>}
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
          '--resume-accent': accent,
          fontFamily: template === 'minimal' ? 'system-ui, sans-serif' : undefined 
        } as React.CSSProperties}
      >
        {hasPhoto ? headerWithPhoto : (
          <div className="resume-header" style={{ borderBottomColor: accent }}>
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

  return (
    <div className="app-container flex flex-col">
      <Toaster position="top-center" richColors closeButton />

      {/* Modern Navbar */}
      <nav className="navbar px-5 md:px-7 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="logo">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-xl tracking-tight text-[var(--text-strong)]">CV Maker</div>
              <div className="text-[10px] text-[var(--text-muted)] -mt-1">Professional resumes, instantly</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadExample} 
            className="btn btn-secondary hidden md:flex items-center gap-1.5 text-sm"
          >
            <Star className="w-4 h-4" /> Example
          </button>

          <label className="btn btn-secondary cursor-pointer text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Import
            <input type="file" accept=".json" className="hidden" onChange={importJSON} />
          </label>

          <button onClick={exportJSON} className="btn btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> JSON
          </button>

          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
            <button onClick={exportPDF} className="btn btn-primary text-sm font-semibold flex items-center gap-1.5">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={exportDOCX} className="btn btn-secondary text-sm flex items-center gap-1.5">
              <Download className="w-4 h-4" /> DOCX
            </button>
          </div>

          <button onClick={printResume} className="btn btn-secondary hidden md:flex text-sm">Print</button>

          <button 
            onClick={clearAll} 
            className="btn btn-ghost text-red-500 hover:text-red-600 ml-1 p-1.5" 
            title="Clear all data"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Elegant Design Toolbar */}
      <div className="toolbar px-5 md:px-7 py-2 flex items-center gap-x-5 gap-y-1.5 flex-wrap border-b bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[9px] font-semibold tracking-[0.5px] text-[var(--text-muted)] mb-0.5">TEMPLATE</div>
            <div className="flex gap-px bg-[var(--surface-2)] rounded-md p-0.5 border border-[var(--border)]">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => changeTemplate(t.id)}
                  className={`template-btn px-2.5 py-0.5 text-xs ${template === t.id ? 'active' : ''}`}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[9px] font-semibold tracking-[0.5px] text-[var(--text-muted)] mb-0.5">COLOR</div>
            <div className="flex gap-1 items-center">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => changeAccent(color)}
                  className={`w-5 h-5 rounded border transition-all ${accentColor === color ? 'ring-1 ring-offset-1 ring-offset-white ring-[var(--accent)] scale-110' : 'border-[var(--border)] hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Accent ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="ml-auto hidden md:block text-[10px] text-[var(--text-muted)] font-medium">
          Changes saved automatically
        </div>
      </div>

      {/* Mobile Tabs - Elegant */}
      <div className="mobile-tabs text-sm">
        <button 
          onClick={() => setActiveTab('edit')} 
          className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'edit' ? 'border-b-2 border-[var(--accent)] text-[var(--text-strong)]' : 'text-[var(--text-muted)]'}`}
        >
          Edit
        </button>
        <button 
          onClick={() => setActiveTab('preview')} 
          className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'preview' ? 'border-b-2 border-[var(--accent)] text-[var(--text-strong)]' : 'text-[var(--text-muted)]'}`}
        >
          Preview
        </button>
      </div>

      {/* Main Split View - Spacious Elegant Layout */}
      <div className="main-content flex-1 overflow-hidden">
        
        {/* EDITOR PANE */}
        <div className={`editor-pane ${activeTab === 'edit' ? '' : 'hidden lg:flex'}`}>
          <div className="editor-header flex items-center justify-between">
            <div>Edit your CV</div>
            <button onClick={loadExample} className="text-xs btn btn-secondary py-1 px-2.5 hidden lg:flex">Load example</button>
          </div>

          <div className="editor-scroll space-y-6">
            
            {/* Personal */}
            <div className="section">
              <div className="section-title"><User className="w-3.5 h-3.5" /> Personal Information</div>
              
              {/* Photo */}
              <div className="photo-uploader">
                {cv.personal.photo ? (
                  <div className="relative">
                    <img src={cv.personal.photo} alt="Profile" className="photo-preview" />
                    <button onClick={removePhoto} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] border-2 border-dashed border-[var(--border)] flex items-center justify-center">
                    <User className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                )}
                <div>
                  <label className="btn btn-secondary cursor-pointer upload-btn">
                    <Upload className="w-3.5 h-3.5" />
                    {cv.personal.photo ? 'Change photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">JPG or PNG • Max 2MB</div>
                </div>
              </div>

              <div className="form-grid">
                <div>
                  <label className="form-label">Full name</label>
                  <input className="input" value={cv.personal.fullName} onChange={e => updatePersonal('fullName', e.target.value)} placeholder="Jane Cooper" />
                </div>
                <div>
                  <label className="form-label">Job title</label>
                  <input className="input" value={cv.personal.jobTitle} onChange={e => updatePersonal('jobTitle', e.target.value)} placeholder="Senior Designer" />
                </div>
              </div>

              <div className="form-grid mt-2.5">
                <div>
                  <label className="form-label">Email</label>
                  <input className="input" value={cv.personal.email} onChange={e => updatePersonal('email', e.target.value)} placeholder="you@email.com" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="input" value={cv.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div className="form-grid mt-2.5">
                <div>
                  <label className="form-label">Location</label>
                  <input className="input" value={cv.personal.location} onChange={e => updatePersonal('location', e.target.value)} placeholder="San Francisco, CA" />
                </div>
                <div>
                  <label className="form-label">Website</label>
                  <input className="input" value={cv.personal.website} onChange={e => updatePersonal('website', e.target.value)} placeholder="yourwebsite.com" />
                </div>
              </div>

              <div className="mt-2.5">
                <label className="form-label">LinkedIn</label>
                <input className="input" value={cv.personal.linkedin} onChange={e => updatePersonal('linkedin', e.target.value)} placeholder="linkedin.com/in/yourname" />
              </div>

              <div className="mt-2.5">
                <label className="form-label">Professional summary</label>
                <textarea 
                  className="textarea" 
                  value={cv.personal.summary} 
                  onChange={e => updatePersonal('summary', e.target.value)} 
                  placeholder="Write a short professional summary..."
                  rows={3}
                />
              </div>
            </div>

            {/* Experience */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <SectionHeader 
                  title="Experience" 
                  icon={<Briefcase className="w-3.5 h-3.5" />} 
                  action={
                    <button onClick={addExperience} className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 -mr-1">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  } 
                />
              </div>

              {cv.experience.length === 0 && (
                <div className="text-xs text-[var(--text-muted)] py-1">No experience yet. Click Add to get started.</div>
              )}

              {cv.experience.map((exp, idx) => (
                <div key={exp.id} className="entry-card">
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="font-medium text-sm">Experience #{idx + 1}</div>
                    <button onClick={() => removeExperience(exp.id)} className="btn btn-ghost text-red-500 p-0.5"><X className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 sm:col-span-1">
                      <input className="input text-sm" placeholder="Position / Title" value={exp.position} onChange={e => updateExperience(exp.id, 'position', e.target.value)} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <input className="input text-sm" placeholder="Company" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input 
                      type="month" 
                      className="input text-sm flex-1" 
                      value={exp.startDate} 
                      onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} 
                    />
                    <input 
                      type="month" 
                      className="input text-sm flex-1 disabled:bg-gray-100" 
                      value={exp.endDate} 
                      disabled={exp.current} 
                      onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} 
                    />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer select-none pt-1">
                      <input 
                        type="checkbox" 
                        checked={exp.current} 
                        onChange={e => {
                          updateExperience(exp.id, 'current', e.target.checked);
                          if (e.target.checked) updateExperience(exp.id, 'endDate', '');
                        }} 
                      /> Present
                    </label>
                  </div>

                  {/* Bullets */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-medium text-[var(--text-muted)]">Achievements / Responsibilities</span>
                      <button onClick={() => addBullet(exp.id)} className="text-xs flex items-center gap-0.5 text-[var(--accent)] hover:underline">
                        <Plus className="w-3 h-3" /> Add bullet
                      </button>
                    </div>
                    {exp.bullets.map((bullet, i) => (
                      <div key={i} className="flex gap-1.5 mb-1.5">
                        <input 
                          className="input text-sm flex-1" 
                          placeholder="Led a team of..." 
                          value={bullet} 
                          onChange={e => updateBullet(exp.id, i, e.target.value)} 
                        />
                        <button 
                          onClick={() => removeBullet(exp.id, i)} 
                          className="btn btn-ghost px-1 text-red-400" 
                          disabled={exp.bullets.length === 1}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Education */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <GraduationCap className="w-3.5 h-3.5" /> Education
                </div>
                <button onClick={addEducation} className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {cv.education.map((edu, idx) => (
                <div key={edu.id} className="entry-card">
                  <div className="flex justify-between mb-2">
                    <div className="font-medium text-sm">Education #{idx + 1}</div>
                    <button onClick={() => removeEducation(edu.id)} className="btn btn-ghost text-red-500 p-0.5"><X className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input className="input text-sm" placeholder="School / University" value={edu.school} onChange={e => updateEducation(edu.id, 'school', e.target.value)} />
                    <input className="input text-sm" placeholder="Degree (B.S., M.S.)" value={edu.degree} onChange={e => updateEducation(edu.id, 'degree', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input className="input text-sm" placeholder="Field of Study" value={edu.field} onChange={e => updateEducation(edu.id, 'field', e.target.value)} />
                    <input className="input text-sm" placeholder="GPA (optional)" value={edu.gpa || ''} onChange={e => updateEducation(edu.id, 'gpa', e.target.value)} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input type="month" className="input text-sm flex-1" value={edu.startDate} onChange={e => updateEducation(edu.id, 'startDate', e.target.value)} />
                    <input type="month" className="input text-sm flex-1" value={edu.endDate} disabled={edu.current} onChange={e => updateEducation(edu.id, 'endDate', e.target.value)} />
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer pt-1">
                      <input type="checkbox" checked={edu.current} onChange={e => updateEducation(edu.id, 'current', e.target.checked)} /> Current
                    </label>
                  </div>
                </div>
              ))}

              {cv.education.length === 0 && (
                <button onClick={addEducation} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add education
                </button>
              )}
            </div>

            {/* Skills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <Award className="w-3.5 h-3.5" /> Skills
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                <input 
                  className="input flex-1" 
                  value={skillInput} 
                  onChange={e => setSkillInput(e.target.value)} 
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Add a skill (e.g. React, Figma)" 
                />
                <button onClick={addSkill} className="btn btn-secondary">Add</button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {cv.skills.length === 0 && <span className="text-xs text-[var(--text-muted)]">No skills added yet.</span>}
                {cv.skills.map((skill, i) => (
                  <div key={i} className="chip">
                    {skill}
                    <button onClick={() => removeSkill(skill)}><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Projects
                </div>
                <button onClick={addProject} className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {cv.projects.map((proj, idx) => (
                <div key={proj.id} className="entry-card">
                  <div className="flex justify-between mb-2">
                    <div className="font-medium text-sm">Project #{idx + 1}</div>
                    <button onClick={() => removeProject(proj.id)} className="btn btn-ghost text-red-500 p-0.5"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <input className="input text-sm mb-2" placeholder="Project name" value={proj.name} onChange={e => updateProject(proj.id, 'name', e.target.value)} />
                  <textarea className="textarea text-sm" placeholder="Short description of what you built and the impact" rows={2} value={proj.description} onChange={e => updateProject(proj.id, 'description', e.target.value)} />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input className="input text-sm" placeholder="Link (optional)" value={proj.url || ''} onChange={e => updateProject(proj.id, 'url', e.target.value)} />
                    <input className="input text-sm" placeholder="Tech stack" value={proj.technologies || ''} onChange={e => updateProject(proj.id, 'technologies', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 text-center">
              <button onClick={clearAll} className="text-xs text-red-500 hover:underline flex items-center gap-1 mx-auto">
                <Trash2 className="w-3 h-3" /> Clear everything
              </button>
            </div>
          </div>
        </div>

        {/* PREVIEW PANE - Spacious & Elegant */}
        <div className={`preview-pane ${activeTab === 'preview' ? '' : 'hidden lg:flex'}`}>
          <div className="preview-container w-full max-w-[820px]">
            <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-[var(--text-muted)] tracking-wider">
              <span>LIVE PREVIEW</span>
              <div className="hidden md:flex gap-1.5">
                <button onClick={exportPDF} className="btn btn-primary text-xs px-3 py-0.5">PDF</button>
                <button onClick={exportDOCX} className="btn btn-secondary text-xs px-3 py-0.5">DOCX</button>
              </div>
            </div>
            <div className="resume-frame">
              {renderPreview()}
            </div>
            <div className="mt-2 text-center text-[9px] text-[var(--text-muted)] hidden md:block">
              A4 format • Professional &amp; ATS-ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

