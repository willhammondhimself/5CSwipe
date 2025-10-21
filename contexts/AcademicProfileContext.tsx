import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AcademicProfile, Major, DegreeRequirement, majors, createDefaultRequirements } from '@/data/academicData';

interface AcademicProfileContextType {
  profile: AcademicProfile;
  updateMajor: (major: Major | null) => void;
  updateMinor: (minor: Major | null) => void;
  updateGraduationYear: (year: number) => void;
  updateCredits: (credits: number) => void;
  updateGPA: (gpa: number) => void;
  calculateProgress: (completedCourses: string[]) => void;
  resetProfile: () => void;
}

const AcademicProfileContext = createContext<AcademicProfileContextType | undefined>(undefined);

const STORAGE_KEY = 'academic_profile';

const defaultProfile: AcademicProfile = {
  major: null,
  minor: null,
  graduationYear: new Date().getFullYear() + 4,
  totalCreditsEarned: 0,
  gpa: 0,
  requirements: createDefaultRequirements(null),
};

export function AcademicProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AcademicProfile>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load profile from AsyncStorage on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedProfile = JSON.parse(stored);
          setProfile({
            ...parsedProfile,
            requirements: createDefaultRequirements(parsedProfile.major),
          });
        }
      } catch (error) {
        console.error('Error loading academic profile:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadProfile();
  }, []);

  // Save profile to AsyncStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      const saveProfile = async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (error) {
          console.error('Error saving academic profile:', error);
        }
      };

      saveProfile();
    }
  }, [profile, isLoaded]);

  const updateMajor = (major: Major | null) => {
    setProfile(prev => ({
      ...prev,
      major,
      requirements: createDefaultRequirements(major),
    }));
  };

  const updateMinor = (minor: Major | null) => {
    setProfile(prev => ({
      ...prev,
      minor,
    }));
  };

  const updateGraduationYear = (year: number) => {
    setProfile(prev => ({
      ...prev,
      graduationYear: year,
    }));
  };

  const updateCredits = (credits: number) => {
    setProfile(prev => ({
      ...prev,
      totalCreditsEarned: credits,
    }));
  };

  const updateGPA = (gpa: number) => {
    setProfile(prev => ({
      ...prev,
      gpa: Math.max(0, Math.min(4.0, gpa)), // Clamp between 0 and 4.0
    }));
  };

  const calculateProgress = (completedCourses: string[]) => {
    setProfile(prev => {
      const updatedRequirements = prev.requirements.map(req => {
        const completedCoursesInReq = req.courses.filter(course =>
          completedCourses.includes(course)
        ).length;

        return {
          ...req,
          completedCredits: completedCoursesInReq * 4, // Assume 4 credits per course
        };
      });

      return {
        ...prev,
        requirements: updatedRequirements,
      };
    });
  };

  const resetProfile = () => {
    setProfile(defaultProfile);
  };

  const value: AcademicProfileContextType = {
    profile,
    updateMajor,
    updateMinor,
    updateGraduationYear,
    updateCredits,
    updateGPA,
    calculateProgress,
    resetProfile,
  };

  return (
    <AcademicProfileContext.Provider value={value}>
      {children}
    </AcademicProfileContext.Provider>
  );
}

export function useAcademicProfile() {
  const context = useContext(AcademicProfileContext);
  if (context === undefined) {
    throw new Error('useAcademicProfile must be used within an AcademicProfileProvider');
  }
  return context;
}
