export interface Major {
  id: string;
  name: string;
  school: 'HMC' | 'Pomona' | 'CMC' | 'Pitzer' | 'Scripps';
  department: string;
  totalCredits: number;
  requiredCourses: string[]; // Course codes
  electiveCourses: string[]; // Course codes
  description: string;
}

export interface DegreeRequirement {
  id: string;
  name: string;
  category: 'major' | 'minor' | 'general_education' | 'elective';
  requiredCredits: number;
  completedCredits: number;
  courses: string[]; // Course codes that satisfy this requirement
  description: string;
}

export interface AcademicProfile {
  major: Major | null;
  minor: Major | null;
  graduationYear: number;
  totalCreditsEarned: number;
  gpa: number;
  requirements: DegreeRequirement[];
}

// Sample majors data
export const majors: Major[] = [
  {
    id: 'cs_hmc',
    name: 'Computer Science',
    school: 'HMC',
    department: 'Computer Science',
    totalCredits: 120,
    requiredCourses: ['CSCI 5', 'CSCI 6', 'CSCI 60', 'CSCI 81', 'CSCI 121', 'CSCI 131'],
    electiveCourses: ['CSCI 105', 'CSCI 109', 'CSCI 137', 'CSCI 141', 'CSCI 151'],
    description: 'Study of computation, algorithms, and software systems'
  },
  {
    id: 'math_hmc',
    name: 'Mathematics',
    school: 'HMC',
    department: 'Mathematics',
    totalCredits: 112,
    requiredCourses: ['MATH 11', 'MATH 12', 'MATH 21', 'MATH 22', 'MATH 31', 'MATH 32'],
    electiveCourses: ['MATH 41', 'MATH 42', 'MATH 51', 'MATH 52', 'MATH 61'],
    description: 'Study of mathematical theory and applications'
  },
  {
    id: 'physics_hmc',
    name: 'Physics',
    school: 'HMC',
    department: 'Physics',
    totalCredits: 120,
    requiredCourses: ['PHYS 11', 'PHYS 12', 'PHYS 21', 'PHYS 22', 'PHYS 31', 'PHYS 32'],
    electiveCourses: ['PHYS 41', 'PHYS 42', 'PHYS 51', 'PHYS 52', 'PHYS 61'],
    description: 'Study of physical laws and phenomena'
  },
  {
    id: 'economics_pomona',
    name: 'Economics',
    school: 'Pomona',
    department: 'Economics',
    totalCredits: 128,
    requiredCourses: ['ECON 51', 'ECON 52', 'ECON 101', 'ECON 102', 'ECON 103'],
    electiveCourses: ['ECON 104', 'ECON 105', 'ECON 106', 'ECON 107', 'ECON 108'],
    description: 'Study of economic theory and policy'
  },
  {
    id: 'psychology_pomona',
    name: 'Psychology',
    school: 'Pomona',
    department: 'Psychology',
    totalCredits: 120,
    requiredCourses: ['PSYC 10', 'PSYC 51', 'PSYC 52', 'PSYC 101', 'PSYC 102'],
    electiveCourses: ['PSYC 103', 'PSYC 104', 'PSYC 105', 'PSYC 106', 'PSYC 107'],
    description: 'Study of human behavior and mental processes'
  },
  {
    id: 'biology_pomona',
    name: 'Biology',
    school: 'Pomona',
    department: 'Biology',
    totalCredits: 120,
    requiredCourses: ['BIOL 51', 'BIOL 52', 'BIOL 101', 'BIOL 102', 'BIOL 103'],
    electiveCourses: ['BIOL 104', 'BIOL 105', 'BIOL 106', 'BIOL 107', 'BIOL 108'],
    description: 'Study of living organisms and life processes'
  }
];

// Sample degree requirements
export const createDefaultRequirements = (major: Major | null): DegreeRequirement[] => [
  {
    id: 'major_req',
    name: major ? `${major.name} Major` : 'Major Requirements',
    category: 'major',
    requiredCredits: major?.totalCredits || 0,
    completedCredits: 0,
    courses: major?.requiredCourses || [],
    description: major ? `Complete all required courses for ${major.name}` : 'Select a major to see requirements'
  },
  {
    id: 'general_ed',
    name: 'General Education',
    category: 'general_education',
    requiredCredits: 64,
    completedCredits: 0,
    courses: [],
    description: 'Complete general education requirements across all schools'
  },
  {
    id: 'electives',
    name: 'Electives',
    category: 'elective',
    requiredCredits: 32,
    completedCredits: 0,
    courses: [],
    description: 'Free electives to reach total credit requirements'
  }
];
