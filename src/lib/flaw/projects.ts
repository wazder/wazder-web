import data from '../../data/flaw/projects.json';
import type { Project } from './types';

export function loadProjects(): Project[] {
  return data as Project[];
}

export function getProject(slug: string): Project | undefined {
  return loadProjects().find((p) => p.id === slug);
}
