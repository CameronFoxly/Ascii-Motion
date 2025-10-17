import { create } from 'zustand';

interface ProjectMetadataState {
  projectName: string;
  projectDescription: string;
  
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  resetProject: () => void;
}

export const useProjectMetadataStore = create<ProjectMetadataState>((set) => ({
  projectName: 'Untitled Project',
  projectDescription: '',
  
  setProjectName: (name) => set({ projectName: name }),
  setProjectDescription: (description) => set({ projectDescription: description }),
  resetProject: () => set({ 
    projectName: 'Untitled Project', 
    projectDescription: '' 
  }),
}));
