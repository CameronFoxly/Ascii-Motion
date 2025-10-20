import { create } from 'zustand';

interface ProjectMetadataState {
  projectName: string;
  projectDescription: string;
  currentProjectId: string | null; // Cloud project ID (null for unsaved projects)
  
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  setCurrentProjectId: (id: string | null) => void;
  resetProject: () => void;
}

export const useProjectMetadataStore = create<ProjectMetadataState>((set) => ({
  projectName: 'Untitled Project',
  projectDescription: '',
  currentProjectId: null,
  
  setProjectName: (name) => set({ projectName: name }),
  setProjectDescription: (description) => set({ projectDescription: description }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  resetProject: () => set({ 
    projectName: 'Untitled Project', 
    projectDescription: '',
    currentProjectId: null
  }),
}));
